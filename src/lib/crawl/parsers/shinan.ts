import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import { cleanBodyHtml, isNonContentImage, stripTitleFromBody } from "@/lib/crawl/parsers/common";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractDetailBody(html: string): string {
  // 신안군청 상세: 본문은 JS 주석 다음 <span>에 직접 포함됨
  // 패턴: <!-- 자바스크립트가 작동하면 --> 이후 <span>본문텍스트</span>
  const markerIdx = html.indexOf("자바스크립트가 작동하면");
  if (markerIdx > 0) {
    const spanStart = html.indexOf("<span>", markerIdx);
    const spanEnd = html.indexOf("</span>", spanStart);
    if (spanStart > 0 && spanEnd > spanStart) {
      const innerHtml = html.slice(spanStart + 6, spanEnd);
      // 저작권 표시 이전까지
      const copyIdx = innerHtml.indexOf("저작물은 공공누리");
      const body = copyIdx >= 0 ? innerHtml.slice(0, copyIdx) : innerHtml;
      // <br> → 단락 구분
      return body
        .replace(/<br\s*\/?>/gi, "\n")
        .split(/\n{2,}/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter((p) => p.length > 0)
        .map((p) => `<p>${p}</p>`)
        .join("\n");
    }
  }

  // fallback: #content 테이블 제거 후 텍스트
  const $ = load(html);
  const content = $("#content").first();
  if (!content.length) return "";
  content.find("table, script, style").remove();
  const text = content.text().replace(/\s+/g, " ").trim();
  const idx = text.indexOf("내용");
  const bodyText = idx >= 0 ? text.slice(idx + 2).trim() : text;
  const copyIdx = bodyText.indexOf("저작물은 공공누리");
  const final = copyIdx >= 0 ? bodyText.slice(0, copyIdx).trim() : bodyText;
  if (!final || final.length < 10) return "";
  return `<p>${final}</p>`;
}

function extractImages(html: string, detailUrl: string): string[] {
  const $ = load(html);
  const urls = new Set<string>();
  $("#content img").each((_, img) => {
    const src = $(img).attr("src");
    if (!src) return;
    try {
      const abs = new URL(src, detailUrl).toString();
      if (!isNonContentImage(abs, $(img).attr("alt"))) {
        urls.add(abs);
      }
    } catch {
      // ignore
    }
  });
  return Array.from(urls);
}

export const parseShinan: SiteParser = async (ctx) => {
  const $ = load(ctx.listHtml);
  const articles: ParsedArticle[] = [];

  const rows = $("table tbody tr");
  for (let i = 0; i < rows.length && articles.length < ctx.limit; i++) {
    const row = rows.eq(i);
    const link = row.find("td a").first();
    const href = link.attr("href");
    if (!href) continue;

    const idMatch = href.match(/show\/(\d+)/);
    if (!idMatch) continue;
    const articleId = idMatch[1];

    const title = link.text().replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) continue;

    // 날짜: td 순서상 4번째 (0-indexed: 3)
    const dateTd = row.find("td").eq(3);
    const dateText = dateTd.text().trim();

    const detailUrl = ctx.site.detailUrlTemplate.replace("{id}", articleId);
    try {
      const detailHtml = await ctx.fetchHtml(detailUrl);
      articles.push({
        originId: `${ctx.site.id}-${articleId}`,
        source: ctx.site.name,
        title,
        body: stripTitleFromBody(cleanBodyHtml(extractDetailBody(detailHtml)), title),
        imageUrls: extractImages(detailHtml, detailUrl),
        attachmentUrls: [],
        date: parseKoreanDate(dateText),
        originalLink: detailUrl,
      });
    } catch (error) {
      console.error(`[${ctx.site.id}] Failed detail:`, error);
    }

    if (ctx.delayMs > 0) await sleep(ctx.delayMs);
  }

  return articles;
};
