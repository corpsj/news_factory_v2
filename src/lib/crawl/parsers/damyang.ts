import axios from "axios";
import { load } from "cheerio";
import https from "node:https";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

type DamyangApiArticle = {
  dataSid?: number | string;
  dataTitle?: string;
  dataContent?: string;
  registerDate?: string;
  officeNm?: string;
  viewCount?: number;
};

type DamyangApiResponse = {
  RSLT_CD?: string;
  RSLT_DATA?: {
    boardContentsList?: DamyangApiArticle[] | null;
  };
};

type DamyangListParams = {
  boardId: string;
  domainId: string;
  contentsSid: string;
  menuCd: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string): string {
  const $ = load(`<p>${value}</p>`);
  return $("p").text();
}

function toAbsoluteUrl(href: string | undefined, base: string): string | null {
  if (!href) {
    return null;
  }

  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractRequiredParams(listUrl: string): DamyangListParams {
  const parsed = new URL(listUrl);
  const boardId = parsed.searchParams.get("boardId")?.trim();
  const domainId = parsed.searchParams.get("domainId")?.trim();
  const contentsSid = parsed.searchParams.get("contentsSid")?.trim();
  const menuCd = parsed.searchParams.get("menuCd")?.trim();

  if (!boardId || !domainId || !contentsSid || !menuCd) {
    throw new Error("Damyang listUrl is missing required board parameters");
  }

  return { boardId, domainId, contentsSid, menuCd };
}

function extractJSessionIdCookie(setCookieHeader: string[] | undefined): string {
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error("Failed to obtain Set-Cookie header from damyang list page");
  }

  const cookie = setCookieHeader
    .map((entry) => entry.split(";")[0]?.trim())
    .find((entry) => entry?.startsWith("JSESSIONID="));

  if (!cookie) {
    throw new Error("Failed to obtain JSESSIONID cookie from damyang list page");
  }

  return cookie;
}

function extractImageUrlsFromHtml(contentHtml: string, baseUrl: string): string[] {
  const $ = load(contentHtml);
  const urls = new Set<string>();

  $("img").each((_, image) => {
    const src = $(image).attr("src");
    const abs = toAbsoluteUrl(src, baseUrl);
    if (abs) {
      urls.add(abs);
    }
  });

  return Array.from(urls);
}

function buildDetailUrl(baseOrigin: string, params: DamyangListParams, dataSid: string): string {
  const detailUrl = new URL("/board/detail", baseOrigin);
  detailUrl.searchParams.set("boardId", params.boardId);
  detailUrl.searchParams.set("domainId", params.domainId);
  detailUrl.searchParams.set("menuCd", params.menuCd);
  detailUrl.searchParams.set("contentsSid", params.contentsSid);
  detailUrl.searchParams.set("dataSid", dataSid);
  return detailUrl.toString();
}

export const parseDamyang: SiteParser = async (ctx) => {
  if (ctx.limit <= 0) {
    return [];
  }

  const listUrl = new URL(ctx.site.listUrl);
  const baseOrigin = listUrl.origin;
  const listParams = extractRequiredParams(ctx.site.listUrl);
  const allowInsecureTls = process.env.ALLOW_INSECURE_TLS === "1";
  const httpsAgent = allowInsecureTls
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  const baseHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: ctx.site.listUrl,
  };

  const listResponse = await axios.get<string>(ctx.site.listUrl, {
    headers: {
      ...baseHeaders,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    responseType: "text",
    transformResponse: [(value) => value],
    maxRedirects: 5,
    timeout: 25_000,
    httpsAgent,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const jsessionCookie = extractJSessionIdCookie(listResponse.headers["set-cookie"]);
  const ajaxUrl = new URL("/board/getContentsList", baseOrigin).toString();
  const ajaxHeaders: Record<string, string> = {
    ...baseHeaders,
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    Cookie: jsessionCookie,
  };

  await axios.get<DamyangApiResponse>(ajaxUrl, {
    headers: ajaxHeaders,
    params: {
      boardId: listParams.boardId,
      domainId: listParams.domainId,
      contentsSid: listParams.contentsSid,
      menuCd: listParams.menuCd,
      pageIndex: 1,
      recordCountPerPage: 10,
    },
    timeout: 25_000,
    httpsAgent,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const dataResponse = await axios.get<DamyangApiResponse>(ajaxUrl, {
    headers: ajaxHeaders,
    params: {
      boardId: listParams.boardId,
      domainId: listParams.domainId,
      contentsSid: listParams.contentsSid,
      menuCd: listParams.menuCd,
      pageIndex: 1,
      recordCountPerPage: ctx.limit,
      orderCondition: "",
      searchCondition: "",
      searchKeyword: "",
      getOfficeNm: true,
      ROW_CNT: ctx.limit,
      BEGIN_ROW_IDX: 1,
      CUR_PAGE_IDX: 1,
    },
    timeout: 25_000,
    httpsAgent,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const boardContents = dataResponse.data.RSLT_DATA?.boardContentsList;
  if (!Array.isArray(boardContents) || boardContents.length === 0) {
    return [];
  }

  const articles: ParsedArticle[] = [];

  for (const item of boardContents) {
    if (articles.length >= ctx.limit) {
      break;
    }

    const sid = typeof item.dataSid === "number" ? String(item.dataSid) : item.dataSid?.trim();
    const rawTitle = item.dataTitle ?? "";
    const title = normalizeWhitespace(decodeHtmlEntities(rawTitle));

    if (!sid || !title) {
      continue;
    }

    const body = item.dataContent?.trim() ?? "";
    const date = (item.registerDate ?? "").trim();

    articles.push({
      originId: `damyang-${sid}`,
      source: ctx.site.name,
      title,
      body,
      imageUrls: extractImageUrlsFromHtml(body, baseOrigin),
      attachmentUrls: [],
      date,
      originalLink: buildDetailUrl(baseOrigin, listParams, sid),
    });
  }

  return articles;
};
