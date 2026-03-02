import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import axios from "axios";
import { SITES } from "../src/config/sites";
import { isNonContentImage } from "../src/lib/crawl/parsers/common";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
);

const httpClient = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "ko-KR,ko;q=0.9",
  },
  responseType: "text",
  maxRedirects: 5,
});

interface ArticleRow {
  id: string;
  title: string;
  body: string;
  images: string[];
  source_url: string;
  source: string;
  created_at: string;
  press_release_id: string;
}

interface PrRow {
  id: string;
  title: string;
  content: string;
  images: string[];
  link: string;
  attachments: string[];
}

interface LivePageAnalysis {
  pageTitle: string | null;
  bodyImages: string[];
  allImages: string[];
  copyrightImages: string[];
  smallImages: string[];
  attachmentLinks: string[];
  fetchError: string | null;
}

interface SiteAuditResult {
  siteId: string;
  siteName: string;
  articleCount: number;
  issues: string[];
  articles: ArticleAudit[];
}

interface ArticleAudit {
  articleId: string;
  dbTitle: string;
  dbImageCount: number;
  dbImages: string[];
  sourceUrl: string;
  live: LivePageAnalysis | null;
  titleIssue: string | null;
  imageIssues: string[];
}

function extractAllImagesFromHtml(html: string, baseUrl: string): {
  bodyImages: string[];
  allImages: string[];
  copyrightImages: string[];
  smallImages: string[];
} {
  const $ = load(html);
  const bodyImages: string[] = [];
  const allImages: string[] = [];
  const copyrightImages: string[] = [];
  const smallImages: string[] = [];

  const contentSelectors = [
    ".board_view_con", ".view_cont", ".boardContents", ".d_cont_description",
    ".bd_view_cont", ".board_view_contents", ".board_view", ".bbs_view_contnet",
    ".view_content", ".bbs_content", ".text_viewbox", ".viewbox", ".view_box",
    ".board_cont", ".con_detail", ".show_info", ".contbox",
    ".bbs_content_detail", ".board_view_content", ".boardR", ".board_contents",
    ".data_cont", "#contents", ".sub_content", "article", ".content",
  ];

  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    let abs: string;
    try {
      abs = new URL(src, baseUrl).toString();
    } catch {
      return;
    }
    allImages.push(abs);

    const alt = $(el).attr("alt") ?? "";
    if (isNonContentImage(abs, alt)) {
      if (/open_?type|gongnuri|ccl|copyright|저작권|공공누리/i.test(abs + " " + alt)) {
        copyrightImages.push(abs);
      }
      return;
    }

    const width = parseInt($(el).attr("width") ?? "0", 10);
    const height = parseInt($(el).attr("height") ?? "0", 10);
    if ((width > 0 && width < 200) || (height > 0 && height < 200)) {
      smallImages.push(abs);
    }
  });

  for (const selector of contentSelectors) {
    const node = $(selector).first();
    if (node.length === 0) continue;
    node.find("img").each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      try {
        const abs = new URL(src, baseUrl).toString();
        const alt = $(el).attr("alt") ?? "";
        if (!isNonContentImage(abs, alt)) {
          bodyImages.push(abs);
        }
      } catch { /* skip */ }
    });
    if (bodyImages.length > 0) break;
  }

  return { bodyImages, allImages, copyrightImages, smallImages };
}

function extractAttachmentLinks(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const links: string[] = [];
  const filePattern = /\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|zip|rar|7z|ppt|pptx|jpg|jpeg|png|gif|bmp)$/i;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (!href) return;
    try {
      const abs = new URL(href, baseUrl).toString();
      if (filePattern.test(abs) || /첨부|다운로드|download/i.test(text)) {
        links.push(abs);
      }
    } catch { /* skip */ }
  });

  return links;
}

function extractPageTitle(html: string): string | null {
  const $ = load(html);

  const titleSelectors = [
    ".board_view_title", ".view_title", "h3.subject", "h2.subject",
    ".board_view h3", ".board_view h2", ".view_top h3",
    ".bbs_title", ".subject_title", ".ttl", "h1.title",
    "td.subject", ".board_view_header h3", ".bbs_view_title",
  ];

  for (const sel of titleSelectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 5) return text;
  }

  return null;
}

async function fetchPage(url: string): Promise<LivePageAnalysis> {
  try {
    const resp = await httpClient.get(url);
    const html = resp.data as string;
    const { bodyImages, allImages, copyrightImages, smallImages } = extractAllImagesFromHtml(html, url);
    const attachmentLinks = extractAttachmentLinks(html, url);
    const pageTitle = extractPageTitle(html);

    return { pageTitle, bodyImages, allImages, copyrightImages, smallImages, attachmentLinks, fetchError: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pageTitle: null, bodyImages: [], allImages: [], copyrightImages: [], smallImages: [], attachmentLinks: [], fetchError: msg };
  }
}

async function auditSite(site: typeof SITES[number]): Promise<SiteAuditResult> {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, body, images, source_url, source, created_at, press_release_id")
    .eq("source", site.name)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !articles || articles.length === 0) {
    return {
      siteId: site.id,
      siteName: site.name,
      articleCount: 0,
      issues: [error ? `DB 조회 오류: ${error.message}` : "기사 없음"],
      articles: [],
    };
  }

  const typedArticles = articles as ArticleRow[];
  const issues: string[] = [];
  const articleAudits: ArticleAudit[] = [];

  for (const art of typedArticles) {
    const dbImages = Array.isArray(art.images) ? art.images : [];
    const audit: ArticleAudit = {
      articleId: art.id,
      dbTitle: art.title,
      dbImageCount: dbImages.length,
      dbImages,
      sourceUrl: art.source_url,
      live: null,
      titleIssue: null,
      imageIssues: [],
    };

    if (art.title.endsWith("...") || art.title.endsWith("…")) {
      audit.titleIssue = "제목이 잘림 (말줄임)";
    }

    const live = await fetchPage(art.source_url);
    audit.live = live;

    if (live.fetchError) {
      audit.imageIssues.push(`원문 페이지 접근 실패: ${live.fetchError}`);
    } else {
      if (live.pageTitle) {
        const cleanLiveTitle = live.pageTitle.replace(/\s+/g, " ").trim();
        const cleanDbTitle = art.title.replace(/\s+/g, " ").trim();
        if (cleanLiveTitle.length > cleanDbTitle.length + 5) {
          audit.titleIssue = `제목 잘림 가능성: DB="${cleanDbTitle}" vs 원문="${cleanLiveTitle}"`;
        }
      }

      if (live.bodyImages.length > dbImages.length) {
        audit.imageIssues.push(
          `본문 이미지 누락: 원문 ${live.bodyImages.length}개 vs DB ${dbImages.length}개`,
        );
      }

      if (live.bodyImages.length === 0 && dbImages.length === 0) {
        const imageAttachments = live.attachmentLinks.filter(
          (l) => /\.(jpg|jpeg|png|gif|bmp)$/i.test(l),
        );
        if (imageAttachments.length > 0) {
          audit.imageIssues.push(
            `이미지가 첨부파일에만 존재 (${imageAttachments.length}개): 본문에 이미지 없음`,
          );
        }
      }

      if (live.copyrightImages.length > 0) {
        audit.imageIssues.push(
          `저작권 표시 이미지 ${live.copyrightImages.length}개 감지: ${live.copyrightImages[0]}`,
        );
      }

      if (live.smallImages.length > 0) {
        audit.imageIssues.push(
          `소형 이미지 (200px 미만) ${live.smallImages.length}개 감지`,
        );
      }

      if (live.bodyImages.length >= 2 && dbImages.length === 1) {
        audit.imageIssues.push(
          `다중 이미지(${live.bodyImages.length}개) 중 1개만 수집됨`,
        );
      }

      if (live.bodyImages.length >= 1 && dbImages.length === 0) {
        audit.imageIssues.push(
          `원문에 이미지 ${live.bodyImages.length}개 있지만 DB에 0개`,
        );
      }
    }

    articleAudits.push(audit);
    await new Promise((r) => setTimeout(r, 300));
  }

  const totalDbImages = articleAudits.reduce((s, a) => s + a.dbImageCount, 0);
  const zeroImageArticles = articleAudits.filter((a) => a.dbImageCount === 0).length;
  const titleIssues = articleAudits.filter((a) => a.titleIssue).length;
  const imageIssueArticles = articleAudits.filter((a) => a.imageIssues.length > 0).length;

  if (zeroImageArticles === typedArticles.length) {
    issues.push("모든 기사에 이미지 없음");
  } else if (zeroImageArticles > 0) {
    issues.push(`${zeroImageArticles}/${typedArticles.length} 기사에 이미지 없음`);
  }

  if (titleIssues > 0) {
    issues.push(`${titleIssues}/${typedArticles.length} 기사에 제목 문제`);
  }

  if (imageIssueArticles > 0) {
    issues.push(`${imageIssueArticles}/${typedArticles.length} 기사에 이미지 문제`);
  }

  return {
    siteId: site.id,
    siteName: site.name,
    articleCount: typedArticles.length,
    issues,
    articles: articleAudits,
  };
}

async function main() {
  console.log("=".repeat(80));
  console.log("기사 품질 감사 보고서");
  console.log(`실행 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);
  console.log(`대상: ${SITES.length}개 지자체, 각 최근 5건`);
  console.log("=".repeat(80));

  const results: SiteAuditResult[] = [];

  for (const site of SITES) {
    console.log(`\n감사 중: ${site.name} (${site.id})...`);
    const result = await auditSite(site);
    results.push(result);

    console.log(`  기사 수: ${result.articleCount}`);
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`  ⚠️  ${issue}`);
      }
    } else {
      console.log(`  ✅ 문제 없음`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("상세 보고서");
  console.log("=".repeat(80));

  for (const result of results) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📋 ${result.siteName} (${result.siteId})`);
    console.log(`   기사 수: ${result.articleCount}`);
    if (result.issues.length > 0) {
      console.log(`   요약 이슈: ${result.issues.join(", ")}`);
    }

    for (const art of result.articles) {
      console.log(`\n   📰 제목: ${art.dbTitle}`);
      console.log(`      DB 이미지: ${art.dbImageCount}개`);
      console.log(`      원문 URL: ${art.sourceUrl}`);

      if (art.titleIssue) {
        console.log(`      ❌ 제목: ${art.titleIssue}`);
      }

      if (art.live) {
        if (art.live.fetchError) {
          console.log(`      ❌ 원문 접근 실패: ${art.live.fetchError}`);
        } else {
          console.log(`      원문 본문 이미지: ${art.live.bodyImages.length}개`);
          console.log(`      원문 전체 이미지: ${art.live.allImages.length}개`);
          console.log(`      원문 첨부파일: ${art.live.attachmentLinks.length}개`);

          if (art.live.copyrightImages.length > 0) {
            console.log(`      ⚠️  저작권 이미지: ${art.live.copyrightImages.join(", ")}`);
          }
        }
      }

      for (const issue of art.imageIssues) {
        console.log(`      ❌ ${issue}`);
      }

      if (!art.titleIssue && art.imageIssues.length === 0) {
        console.log(`      ✅ 정상`);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("종합 요약");
  console.log("=".repeat(80));

  const sitesWithIssues = results.filter((r) => r.issues.length > 0);
  const sitesNoArticles = results.filter((r) => r.articleCount === 0);
  const sitesOk = results.filter((r) => r.issues.length === 0 && r.articleCount > 0);

  console.log(`\n정상: ${sitesOk.length}개 지자체`);
  console.log(`문제 발견: ${sitesWithIssues.length}개 지자체`);
  if (sitesNoArticles.length > 0) {
    console.log(`기사 없음: ${sitesNoArticles.length}개 지자체`);
    for (const s of sitesNoArticles) {
      console.log(`  - ${s.siteName}`);
    }
  }

  const allTitleIssues: { site: string; title: string; issue: string }[] = [];
  const allImageIssues: { site: string; title: string; issues: string[] }[] = [];
  const allCopyrightSites: string[] = [];
  const allAttachmentOnlySites: string[] = [];
  const allMultiImageIssues: { site: string; title: string; issue: string }[] = [];

  for (const result of results) {
    for (const art of result.articles) {
      if (art.titleIssue) {
        allTitleIssues.push({ site: result.siteName, title: art.dbTitle, issue: art.titleIssue });
      }
      if (art.imageIssues.length > 0) {
        allImageIssues.push({ site: result.siteName, title: art.dbTitle, issues: art.imageIssues });
      }
      for (const issue of art.imageIssues) {
        if (issue.includes("저작권") && !allCopyrightSites.includes(result.siteName)) {
          allCopyrightSites.push(result.siteName);
        }
        if (issue.includes("첨부파일에만") && !allAttachmentOnlySites.includes(result.siteName)) {
          allAttachmentOnlySites.push(result.siteName);
        }
        if (issue.includes("다중 이미지") || issue.includes("1개만")) {
          allMultiImageIssues.push({ site: result.siteName, title: art.dbTitle, issue });
        }
      }
    }
  }

  if (allTitleIssues.length > 0) {
    console.log(`\n📝 제목 문제 (${allTitleIssues.length}건):`);
    for (const t of allTitleIssues) {
      console.log(`  [${t.site}] ${t.issue}`);
    }
  }

  if (allCopyrightSites.length > 0) {
    console.log(`\n©️  저작권 이미지 감지 사이트 (${allCopyrightSites.length}개):`);
    for (const s of allCopyrightSites) {
      console.log(`  - ${s}`);
    }
  }

  if (allAttachmentOnlySites.length > 0) {
    console.log(`\n📎 이미지가 첨부파일에만 있는 사이트 (${allAttachmentOnlySites.length}개):`);
    for (const s of allAttachmentOnlySites) {
      console.log(`  - ${s}`);
    }
  }

  if (allMultiImageIssues.length > 0) {
    console.log(`\n🖼️  다중 이미지 누락 (${allMultiImageIssues.length}건):`);
    for (const m of allMultiImageIssues) {
      console.log(`  [${m.site}] ${m.issue}`);
    }
  }

  if (allImageIssues.length > 0) {
    console.log(`\n🔍 전체 이미지 문제 상세 (${allImageIssues.length}건):`);
    for (const i of allImageIssues) {
      console.log(`  [${i.site}] "${i.title}"`);
      for (const issue of i.issues) {
        console.log(`    → ${issue}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
