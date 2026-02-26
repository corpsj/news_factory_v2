import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import { cleanBodyHtml, cleanTitle, extractAttachments, isNonContentImage, stripTitleFromBody } from "@/lib/crawl/parsers/common";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

const CONTENT_SELECTORS = [
  ".board_view_con",
  ".view_content",
  ".board_view",
  ".other_site_view",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractDetailBody(html: string): string {
  const $ = load(html);
  for (const selector of CONTENT_SELECTORS) {
    const node = $(selector).first();
    if (node.length === 0) {
      continue;
    }
    node.find("script, style").remove();
    node.find("[style]").removeAttr("style");
    const content = node.html()?.trim();
    if (content) {
      return content;
    }
  }
  return "";
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
        const abs = new URL(src, detailUrl).toString();
        if (!isNonContentImage(abs, $(img).attr("alt"))) {
          urls.add(abs);
        }
      } catch {
      }
    });
    if (urls.size > 0) {
      break;
    }
  }
  return Array.from(urls);
}

export const parseGurye: SiteParser = async (ctx) => {
  const $ = load(ctx.listHtml);
  const articles: ParsedArticle[] = [];
  const items = $(".board_photo li");

  for (let i = 0; i < items.length && articles.length < ctx.limit; i += 1) {
    const li = items.eq(i);
    const link = li.find("a[href]").first();
    const href = link.attr("href") ?? "";
    if (!href) {
      continue;
    }

    const idMatch = href.match(/nttId=(\d+)/);
    if (!idMatch) {
      continue;
    }
    const articleId = idMatch[1];

    const rawText = link.text().replace(/\s+/g, " ").trim();
    const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})\s*$/);
    const title = cleanTitle(dateMatch ? rawText.replace(dateMatch[0], "").trim() : rawText);
    const dateText = dateMatch ? dateMatch[1] : "";

    if (!title || title.length < 3) {
      continue;
    }

    const detailUrl = ctx.site.detailUrlTemplate.replace("{id}", articleId);
    try {
      const detailHtml = await ctx.fetchHtml(detailUrl);
      articles.push({
        originId: `${ctx.site.id}-${articleId}`,
        source: ctx.site.name,
        title,
        body: stripTitleFromBody(cleanBodyHtml(extractDetailBody(detailHtml)), title),
        imageUrls: extractImages(detailHtml, detailUrl),
        attachmentUrls: extractAttachments(detailHtml, detailUrl),
        date: parseKoreanDate(dateText),
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
