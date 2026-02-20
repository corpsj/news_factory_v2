import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

const CONTENT_SELECTORS = [
  ".bbs_content",
  ".view_content",
  ".board_view_con",
  ".board_view",
  ".content",
  "article",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBody(html: string): string {
  const $ = load(html);
  for (const selector of CONTENT_SELECTORS) {
    const node = $(selector).first();
    if (node.length === 0) {
      continue;
    }
    node.find("script, style").remove();
    const content = node.html()?.trim();
    if (content) {
      return content;
    }
  }
  return "";
}

function extractDateFromDetail(html: string): string {
  const $ = load(html);
  const selectors = [
    "th:contains('작성일') + td",
    "th:contains('등록일') + td",
    ".date",
    "span.date",
    "dd.date",
    ".view_info .date",
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(text)) {
      return text;
    }
  }

  const bodyText = $("body").text();
  const match = bodyText.match(/(?:작성일|등록일|게시일)[^\d]*(\d{4}[./-]\d{1,2}[./-]\d{1,2})/);
  return match ? match[1] : "";
}

function extractImages(html: string, detailUrl: string): string[] {
  const $ = load(html);
  const urls = new Set<string>();
  for (const selector of CONTENT_SELECTORS) {
    const node = $(selector).first();
    if (node.length === 0) {
      continue;
    }
    node.find("img").each((_, img) => {
      const src = $(img).attr("src");
      if (!src) {
        return;
      }
      try {
        urls.add(new URL(src, detailUrl).toString());
      } catch {
      }
    });
    if (urls.size > 0) {
      break;
    }
  }
  return Array.from(urls);
}

export const parseBoseong: SiteParser = async (ctx) => {
  const $ = load(ctx.listHtml);
  const seen = new Set<string>();
  const idxPattern = /idx=(\d+)/;
  const items: Array<{ id: string; title: string }> = [];

  $("a[href*='idx=']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.includes("mode=view")) {
      return;
    }
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text || text.length < 3) {
      return;
    }
    const match = href.match(idxPattern);
    if (!match) {
      return;
    }

    const id = match[1];
    if (seen.has(id)) {
      return;
    }
    seen.add(id);

    const title = text.replace(/^\d{1,2}:\d{2}/, "").replace(/\([^)]+\)\s*$/, "").trim();
    if (title) {
      items.push({ id, title });
    }
  });

  const articles: ParsedArticle[] = [];
  for (const item of items) {
    if (articles.length >= ctx.limit) {
      break;
    }

    const detailUrl = ctx.site.detailUrlTemplate.replace("{id}", item.id);
    try {
      const detailHtml = await ctx.fetchHtml(detailUrl);
      articles.push({
        originId: `${ctx.site.id}-${item.id}`,
        source: ctx.site.name,
        title: item.title,
        body: extractBody(detailHtml),
        imageUrls: extractImages(detailHtml, detailUrl),
        attachmentUrls: [],
        date: parseKoreanDate(extractDateFromDetail(detailHtml)),
        originalLink: detailUrl,
      });
    } catch (error) {
      console.error(`[${ctx.site.id}] Failed to parse detail:`, error);
    }

    if (ctx.delayMs > 0) {
      await sleep(ctx.delayMs);
    }
  }

  return articles;
};
