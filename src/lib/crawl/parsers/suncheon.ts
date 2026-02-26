import axios from "axios";
import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

/**
 * Suncheon's eGovFrame requires a JSESSIONID cookie for detail page access.
 * Without it, detail pages return an error page instead of article content.
 */
export const parseSuncheon: SiteParser = async (ctx) => {
  // Step 1: Fetch list page directly to capture session cookie
  const listResp = await axios.get<string>(ctx.site.listUrl, {
    headers: { ...DEFAULT_HEADERS, Referer: "https://www.google.com/" },
    responseType: "text",
    transformResponse: [(v) => v],
    timeout: 25_000,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const sessionCookies =
    listResp.headers["set-cookie"]
      ?.map((c) => c.split(";")[0])
      .join("; ") ?? "";

  // Step 2: Create cookie-aware fetch for detail pages
  const fetchWithSession = async (url: string): Promise<string> => {
    const resp = await axios.get<string>(url, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: ctx.site.listUrl,
        Cookie: sessionCookies,
      },
      responseType: "text",
      transformResponse: [(v) => v],
      timeout: 25_000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    return resp.data;
  };

  // Step 3: Parse with correct selectors and cookie-aware fetch
  return parseWithPattern(
    { ...ctx, fetchHtml: fetchWithSession },
    {
      listSelectors: ["table tbody tr"],
      titleSelectors: ["td.title_minwon a", "td.subject a", "td a"],
      dateSelectors: ["td.created", "td"],
      dateColumnIndex: 3,
      contentSelectors: ["div.content", "td.content", ".bbs_content_detail", ".view_content"],
    },
  );
};
