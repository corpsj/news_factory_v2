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

/**
 * URL or alt-text patterns for images that are NOT article content:
 * - 공공누리 (Korea Open Government License) badges
 * - SNS share icons
 * - File-type icons (hwp.png, jpg.png, etc.)
 * - Site logos, watermarks, layout decorations
 */
const NON_CONTENT_URL_PATTERNS = [
  // 공공누리 license badges
  /img_open(?:type|code)\d*/i,
  /new_img_open(?:type|code)\d*/i,
  /gongnuri/i,
  /open_?type/i,
  /ccl[_/.\-]/i,
  // SNS / share icons
  /ico_sns_/i,
  /icon_sns/i,
  /btn_(?:facebook|twitter|kakao|naver|blog|share)/i,
  // File-extension icons (e.g. /skin/board/basic/hwp.png)
  /\/skin\/.*\/(?:hwp|pdf|doc|docx|xls|xlsx|zip|jpg|png|gif|ppt|pptx)\.(?:png|gif|jpg)$/i,
  // Logos, watermarks, layout images
  /\/logo[_.\-/]/i,
  /watermark/i,
  /copyright/i,
  // QR code images
  /qr[_\-.]?code/i,
  /qrcode/i,
  /qr[_\-]img/i,
  // Tiny images: WxHxQ format where H ≤ 5 (e.g. 924x1x85)
  /\/\d+x[1-5]x\d+\//,
];

const NON_CONTENT_ALT_PATTERNS = [
  /공공누리/,
  /저작권/,
  /CCL/i,
  /크리에이티브\s*커먼즈/,
  /creative\s*commons/i,
  /open\s*government/i,
  /QR/i,
  /큐알/,
  /포스터/,
  /배너/,
];

/** Returns true if the image is NOT article content (copyright badge, icon, etc.) */
export function isNonContentImage(url: string, alt?: string): boolean {
  if (NON_CONTENT_URL_PATTERNS.some((p) => p.test(url))) {
    return true;
  }

  if (alt && NON_CONTENT_ALT_PATTERNS.some((p) => p.test(alt))) {
    return true;
  }

  return false;
}


const NOISE_TEXT_PATTERNS: RegExp[] = [
  /【[^】]*】/g,
  /\([^)]*사진\s*\d*\s*장?\s*첨부\)/g,
  /\([^)]*첨부\)/g,
];

const GONGNURI_PATTERN = /(?:본\s*저작물은|이\s*(?:저작물|글)은?)\s*["「]?공공누리["」]?[\s\S]*?(?:이용\s*할?\s*수\s*있습니다\.?|, (?:출처|자유이용)[\s\S]*?\.)/g;

const NAV_LABEL_PATTERN = /^(?:다음글|이전글|다음\s*글|이전\s*글|이전|다음|next|prev|previous|인쇄|목록|print|list|첫\s*페이지|마지막\s*페이지|top)$/i;

export function stripNoiseFromBody(bodyHtml: string): string {
  if (!bodyHtml) return "";

  const $ = load(`<div id="__wrap">${bodyHtml}</div>`);
  const container = $("#__wrap");

  container.find("a, span, td, th, p, div, li, strong, em, b").each((_, el) => {
    const node = $(el);
    const text = node.text().replace(/\s+/g, " ").trim();
    if (text && NAV_LABEL_PATTERN.test(text)) {
      const parent = node.closest("tr, li, div, p");
      if (parent.length > 0 && parent.text().replace(/\s+/g, " ").trim().length < 200) {
        parent.remove();
      } else {
        node.remove();
      }
    }
  });

  container.find("*").each((_, el) => {
    const node = $(el);
    const text = node.text();
    if (/공공누리/.test(text) && node.children().length <= 3 && text.length < 500) {
      node.remove();
    }
  });

  container.find("table").each((_, el) => {
    const table = $(el);
    const text = table.text().replace(/\s+/g, " ").trim();
    const hasNav = /(?:다음글|이전글|다음\s*글|이전\s*글)/.test(text);
    const hasDate = /\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/.test(text);
    if (hasNav && hasDate && text.length < 500) {
      table.remove();
    }
  });

  let html = container.html()?.trim() || "";

  html = html.replace(GONGNURI_PATTERN, "");

  for (const pattern of NOISE_TEXT_PATTERNS) {
    html = html.replace(pattern, "");
  }

  html = html
    .replace(/<(?:p|div|span|br\s*\/?)>\s*<\/(?:p|div|span)>/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/^\s+|\s+$/gm, "")
    .trim();

  return html;
}

export function cleanBodyHtml(bodyHtml: string): string {
  if (!bodyHtml) return "";
  const $ = load(`<div id="__wrap">${bodyHtml}</div>`);
  const container = $("#__wrap");
  container.find("script, style").remove();
  container.find("[style]").removeAttr("style");
  container.find("[class]").removeAttr("class");
  container.find("[id]").removeAttr("id");
  container.find("[align]").removeAttr("align");
  container.find("[valign]").removeAttr("valign");
  container.find("span:empty, p:empty, div:empty, font:empty").remove();
  container.find("span, font").each((_, el) => {
    const w = $(el);
    if (!((el as any).attribs) || Object.keys((el as any).attribs).length === 0) {
      w.replaceWith(w.contents());
    }
  });
  return container.html()?.trim() || "";
}

export function stripTitleFromBody(bodyHtml: string, title: string): string {
  if (!bodyHtml || !title) return bodyHtml;
  const $ = load(`<div id="__wrap">${bodyHtml}</div>`);
  const container = $("#__wrap");
  const titleNorm = title.replace(/\s+/g, "");
  if (titleNorm.length < 5) return bodyHtml;

  const children = container.children();
  for (let i = 0; i < Math.min(children.length, 3); i++) {
    const child = children.eq(i);
    const childText = child.text().replace(/\s+/g, "");
    if (childText.length < 5) continue;
    const shorter = childText.length <= titleNorm.length ? childText : titleNorm;
    const longer = childText.length <= titleNorm.length ? titleNorm : childText;
    if (longer.startsWith(shorter) && shorter.length / longer.length > 0.8) {
      child.remove();
      break;
    }
  }
  return container.html()?.trim() || bodyHtml;
}

const DEFAULT_CONTENT_SELECTORS = [
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
    const nodes = $(selector);
    if (nodes.length === 0) {
      continue;
    }

    let bestHtml = "";
    let bestTextLen = 0;

    nodes.each((_, el) => {
      const node = $(el);
      node.find("script, style").remove();
      node.find("[style]").removeAttr("style");
      node.find("span:empty, p:empty, div:empty, font:empty").remove();
      node.find("[class]").removeAttr("class");
      node.find("[id]").removeAttr("id");
      node.find("[align]").removeAttr("align");
      node.find("[valign]").removeAttr("valign");
      node.find("span, font").each((_, wrapper) => {
        const w = $(wrapper);
        if (!((wrapper as any).attribs) || Object.keys((wrapper as any).attribs).length === 0) {
          w.replaceWith(w.contents());
        }
      });
      const html = node.html()?.trim();
      const textLen = node.text().trim().length;
      if (html && textLen > bestTextLen) {
        bestHtml = html;
        bestTextLen = textLen;
      }
    });

    if (bestHtml) {
      return bestHtml;
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
        body: stripNoiseFromBody(stripTitleFromBody(body, title)),
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
