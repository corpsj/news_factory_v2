import { load } from "cheerio";
import { parseKoreanDate } from "@/lib/crawl/date";
import { cleanBodyHtml, isNonContentImage, stripTitleFromBody } from "@/lib/crawl/parsers/common";
import type { ParsedArticle, SiteParser } from "@/types/crawler";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractDetailBody(html: string): string {
  const $ = load(html);
  // 신안군청 상세: #content 내 실제 본문 텍스트 블록
  // 메타 테이블(번호/조회/등록부서/등록일/제목) 이후 본문만 추출
  const content = $("#content").first();
  if (!content.length) return "";

  // 메타 테이블 제거
  content.find("table").remove();
  content.find("script, style").remove();

  const bodyText = content.text().replace(/\s+/g, " ").trim();
  // "내용" 키워드 이후 실제 본문
  const idx = bodyText.indexOf("내용");
  const text = idx >= 0 ? bodyText.slice(idx + 2).trim() : bodyText;

  if (!text || text.length < 10) return "";
  return `<p>${text.replace(/\n+/g, "</p><p>").trim()}</p>`;
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
