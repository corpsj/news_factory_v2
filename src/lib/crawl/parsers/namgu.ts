import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import { cleanBodyHtml, cleanTitle, isNonContentImage, stripTitleFromBody } from "@/lib/crawl/parsers/common";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

const FILE_LINK_PATTERN = /\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|zip|rar|7z|ppt|pptx)$/i;
const CONTENT_SELECTORS = [
  ".board_view_con",
  ".board_view_contents",
  ".view_cont",
  ".view_content",
  ".bbs_content",
  ".bbs_content_detail",
  ".board_view_content",
  ".board_view",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

function extractDetailBody(detailHtml: string): string {
  const $ = load(detailHtml);

  const viewTable = $(".tstyle_view").first();
  if (viewTable.length) {
    let bestHtml = "";
    let bestLen = 0;
    viewTable.find("td").each((_, td) => {
      $(td).find("script, style").remove();
      $(td).find("[style]").removeAttr("style");
      const text = $(td).text().trim();
      if (text.length > bestLen) {
        bestLen = text.length;
        bestHtml = $(td).html()?.trim() ?? "";
      }
    });
    if (bestHtml) {
      return bestHtml;
    }
  }

  for (const selector of CONTENT_SELECTORS) {
    const contentNode = $(selector).first();
    if (contentNode.length === 0) {
      continue;
    }

    contentNode.find("script, style").remove();
    contentNode.find("[style]").removeAttr("style");
    const html = contentNode.html()?.trim();
    if (html) {
      return html;
    }
  }

  return "";
}

function extractImages(detailHtml: string, detailUrl: string): string[] {
  const $ = load(detailHtml);
  const urls = new Set<string>();

  for (const selector of CONTENT_SELECTORS) {
    const contentNode = $(selector).first();
    if (contentNode.length === 0) {
      continue;
    }

    contentNode.find("img").each((_, image) => {
      const src = $(image).attr("src");
      const abs = toAbsoluteUrl(src, detailUrl);
      if (abs && !isNonContentImage(abs, $(image).attr("alt"))) {
        urls.add(abs);
      }
    });
  }

  return Array.from(urls);
}

function extractAttachments(detailHtml: string, detailUrl: string): string[] {
  const $ = load(detailHtml);
  const attachments = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const linkText = normalizeWhitespace($(element).text());
    const abs = toAbsoluteUrl(href, detailUrl);
    if (!abs) {
      return;
    }

    if (FILE_LINK_PATTERN.test(abs) || /첨부|다운로드|download/i.test(linkText)) {
      attachments.add(abs);
    }
  });

  return Array.from(attachments);
}

export const parseNamgu: SiteParser = async (ctx) => {
  const $ = load(ctx.listHtml);
  const listSelectors = ["table.tbltype1 tbody tr", "table tbody tr"];
  const titleSelectors = ["td:nth-child(2) a", "td.AlignLeft a"];
  let rowSelector = "";

  for (const selector of listSelectors) {
    const selected = $(selector);
    if (selected.length > 0) {
      rowSelector = selector;
      break;
    }
  }

  if (!rowSelector) {
    return [];
  }

  const rows = $(rowSelector);

  const articles: ParsedArticle[] = [];

  for (let index = 0; index < rows.length && articles.length < ctx.limit; index += 1) {
    const row = rows.eq(index);

    let title = "";
    let onclick = "";

    for (const selector of titleSelectors) {
      const link = row.find(selector).first();
      title = cleanTitle(normalizeWhitespace(link.text()));
      onclick = link.attr("onclick") ?? "";
      if (title && onclick) {
        break;
      }
    }

    const idMatch = onclick.match(/searchDetail\('(\d+)'\)/);
    const articleId = idMatch?.[1];
    if (!title || !articleId) {
      continue;
    }

    const detailUrl = `https://www.namgu.gwangju.kr/api/eminwon/pressView.es?mid=a10605050000&news_epct_no=${articleId}`;
    const dateText = normalizeWhitespace(row.find("td:nth-child(4)").first().text());

    try {
      const detailHtml = await ctx.fetchHtml(detailUrl);
      const rawBody = extractDetailBody(detailHtml);
      const body = stripTitleFromBody(cleanBodyHtml(rawBody), title);

      articles.push({
        originId: `${ctx.site.id}-${articleId}`,
        source: ctx.site.name,
        title,
        body,
        imageUrls: extractImages(detailHtml, detailUrl),
        attachmentUrls: extractAttachments(detailHtml, detailUrl),
        date: parseKoreanDate(dateText),
        originalLink: detailUrl,
      });
    } catch (error) {
      console.error(`[${ctx.site.id}] Failed to parse detail page:`, error);
    }

    if (ctx.delayMs > 0) {
      await sleep(ctx.delayMs);
    }
  }

  return articles;
};
