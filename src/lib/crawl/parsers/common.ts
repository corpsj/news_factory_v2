import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import type { ParsedArticle, SiteParserContext } from "@/types/crawler";

type ParserOverrides = {
  listSelectors?: string[];
  titleSelectors?: string[];
  dateSelectors?: string[];
  dateColumnIndex?: number;
  contentSelectors?: string[];
  idPattern?: RegExp;
};

const FILE_LINK_PATTERN = /\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|zip|rar|7z|ppt|pptx)$/i;
const DEFAULT_CONTENT_SELECTORS = [
  ".board_view_con",
  ".board_view_contents",
  ".view_cont",
  ".view_content",
  ".bbs_content",
  ".bbs_content_detail",
  ".board_view_content",
  ".board_view",
  ".content",
  "article",
  "main",
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

function pickRows(listHtml: string, selectors: string[]) {
  const $ = load(listHtml);
  for (const selector of selectors) {
    const rows = $(selector);
    if (rows.length > 0) {
      return { $, rows };
    }
  }

  return { $, rows: $([]) };
}

function pickFirstText($row: ReturnType<ReturnType<typeof load>>, selectors: string[]): string {
  for (const selector of selectors) {
    const value = normalizeWhitespace($row.find(selector).first().text());
    if (value) {
      return value;
    }
  }

  return "";
}

function pickHref($row: ReturnType<ReturnType<typeof load>>, selectors: string[]): string {
  for (const selector of selectors) {
    const href = $row.find(selector).first().attr("href");
    if (href) {
      return href;
    }
  }

  return "";
}

function extractDate(
  $row: ReturnType<ReturnType<typeof load>>,
  dateSelectors: string[],
  dateColumnIndex: number,
): string {
  for (const selector of dateSelectors) {
    if (selector === "td") {
      const fromColumn = normalizeWhitespace($row.find("td").eq(dateColumnIndex).text());
      if (fromColumn) {
        return fromColumn;
      }
      continue;
    }

    const value = normalizeWhitespace($row.find(selector).first().text());
    if (value) {
      return value;
    }
  }

  const allCells = $row
    .find("td")
    .toArray()
    .map((cell) => normalizeWhitespace(load(cell).text()));
  const matched = allCells.find((text) => /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.test(text));
  return matched ?? "";
}

function extractArticleId(href: string, idPattern: RegExp): string | null {
  const match = href.match(idPattern);
  return match?.[1] ?? null;
}

function extractDetailBody(detailHtml: string, contentSelectors: string[]): string {
  const $ = load(detailHtml);
  const selectors = Array.from(new Set([...contentSelectors, ...DEFAULT_CONTENT_SELECTORS]));

  for (const selector of selectors) {
    const contentNode = $(selector).first();
    if (contentNode.length === 0) {
      continue;
    }

    contentNode.find("script, style").remove();
    const html = contentNode.html()?.trim();
    if (html) {
      return html;
    }
  }

  return "";
}

function extractImages(detailHtml: string, contentSelectors: string[], detailUrl: string): string[] {
  const $ = load(detailHtml);
  const urls = new Set<string>();
  const selectors = Array.from(new Set([...contentSelectors, ...DEFAULT_CONTENT_SELECTORS]));

  for (const selector of selectors) {
    const contentNode = $(selector).first();
    if (contentNode.length === 0) {
      continue;
    }

    contentNode.find("img").each((_, image) => {
      const src = $(image).attr("src");
      const abs = toAbsoluteUrl(src, detailUrl);
      if (abs) {
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

function buildDetailUrl(template: string, id: string, href: string, listUrl: string): string {
  if (template.includes("{id}")) {
    return template.replace("{id}", id);
  }

  const fromHref = toAbsoluteUrl(href, listUrl);
  if (fromHref) {
    return fromHref;
  }

  return template;
}

export async function parseWithPattern(
  ctx: SiteParserContext,
  overrides: ParserOverrides = {},
): Promise<ParsedArticle[]> {
  const listSelectors = overrides.listSelectors ?? ctx.site.selectors.list;
  const titleSelectors = overrides.titleSelectors ?? ctx.site.selectors.title;
  const dateSelectors = overrides.dateSelectors ?? ctx.site.selectors.date ?? ["td"];
  const dateColumnIndex = overrides.dateColumnIndex ?? ctx.site.selectors.dateColumnIndex ?? 3;
  const contentSelectors = overrides.contentSelectors ?? ctx.site.selectors.content;
  const idPattern = overrides.idPattern ?? ctx.site.idPattern;

  const { rows } = pickRows(ctx.listHtml, listSelectors);
  const articles: ParsedArticle[] = [];

  for (let index = 0; index < rows.length && articles.length < ctx.limit; index += 1) {
    const row = rows.eq(index);
    const title = pickFirstText(row, titleSelectors);
    const href = pickHref(row, titleSelectors);
    if (!title || !href) {
      continue;
    }

    const articleId = extractArticleId(href, idPattern);
    if (!articleId) {
      continue;
    }

    const detailUrl = buildDetailUrl(ctx.site.detailUrlTemplate, articleId, href, ctx.site.listUrl);
    const dateText = extractDate(row, dateSelectors, dateColumnIndex);

    try {
      const detailHtml = await ctx.fetchHtml(detailUrl);
      const body = extractDetailBody(detailHtml, contentSelectors);

      articles.push({
        originId: `${ctx.site.id}-${articleId}`,
        source: ctx.site.name,
        title,
        body,
        imageUrls: extractImages(detailHtml, contentSelectors, detailUrl),
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
}
