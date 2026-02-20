import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

const CONTENT_SELECTORS = [
  ".tb_contents",
  ".board_view_contents",
  ".board_view_con",
  ".view_cont",
  ".view_content",
  ".bbs_content",
  ".board_view",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(href: string | undefined, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractDetailBody(detailHtml: string): string {
  const $ = load(detailHtml);
  for (const selector of CONTENT_SELECTORS) {
    const nodes = $(selector);
    if (nodes.length === 0) continue;

    let bestHtml = "";
    let bestTextLen = 0;
    nodes.each((_, el) => {
      const n = $(el);
      n.find("script, style").remove();
      n.find("[style]").removeAttr("style");
      n.find("span:empty, p:empty, div:empty").remove();
      const text = n.text().trim().length;
      const html = n.html()?.trim();
      if (html && text > bestTextLen) {
        bestHtml = html;
        bestTextLen = text;
      }
    });
    if (bestHtml) return bestHtml;
  }
  return "";
}

function extractDateFromDetail(detailHtml: string): string {
  const $ = load(detailHtml);
  const dateSelectors = [
    ".board_view_head .date",
    ".board_view_head td",
    ".view_head .date",
    "th:contains('작성일') + td",
    "th:contains('등록일') + td",
    ".write_info .date",
  ];

  for (const selector of dateSelectors) {
    const text = $(selector).first().text().trim();
    if (/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(text)) return text;
  }

  const headerArea = $(".board_view_head, .view_head, .bbs_view_head").first();
  if (headerArea.length) {
    const allText = headerArea.text();
    const match = allText.match(/(\d{4}[./-]\d{1,2}[./-]\d{1,2})/);
    if (match) return match[1];
  }

  const bodyText = $("body").text();
  const dateMatch = bodyText.match(
    /(?:작성일|등록일|게시일)[^\d]*(\d{4}[./-]\d{1,2}[./-]\d{1,2})/
  );
  if (dateMatch) return dateMatch[1];

  return "";
}

function extractImages(detailHtml: string, detailUrl: string): string[] {
  const $ = load(detailHtml);
  const urls = new Set<string>();

  for (const selector of CONTENT_SELECTORS) {
    const node = $(selector).first();
    if (node.length === 0) continue;

    node.find("img").each((_, img) => {
      const src = $(img).attr("src");
      const abs = toAbsoluteUrl(src, detailUrl);
      if (abs) urls.add(abs);
    });

    if (urls.size > 0) break;
  }

  return Array.from(urls);
}

export const parseGwangjuEsNolist: SiteParser = async (ctx) => {
  const $ = load(ctx.listHtml);
  const articles: ParsedArticle[] = [];
  const links: Array<{ title: string; articleId: string }> = [];
  const linkPattern = /act=view.*list_no=|list_no=.*act=view/;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!linkPattern.test(href)) return;

    const title = normalizeWhitespace($(el).text());
    if (!title || title.length < 3) return;

    const match = href.match(/list_no=(\d+)/);
    if (!match) return;

    links.push({ title, articleId: match[1] });
  });

  const seen = new Set<string>();

  for (const link of links) {
    if (articles.length >= ctx.limit) break;
    if (seen.has(link.articleId)) continue;
    seen.add(link.articleId);

    const detailUrl = ctx.site.detailUrlTemplate.replace("{id}", link.articleId);

    try {
      const detailHtml = await ctx.fetchHtml(detailUrl);
      const body = extractDetailBody(detailHtml);
      const dateText = extractDateFromDetail(detailHtml);

      articles.push({
        originId: `${ctx.site.id}-${link.articleId}`,
        source: ctx.site.name,
        title: link.title,
        body,
        imageUrls: extractImages(detailHtml, detailUrl),
        attachmentUrls: [],
        date: parseKoreanDate(dateText),
        originalLink: detailUrl,
      });
    } catch (error) {
      console.error(`[${ctx.site.id}] Failed to parse detail:`, error);
    }

    if (ctx.delayMs > 0) await sleep(ctx.delayMs);
  }

  return articles;
};
