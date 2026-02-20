import axios from "axios";
import https from "node:https";
import { load } from "cheerio";
import { SITES } from "@/config/sites";
import { PARSERS } from "@/lib/crawl/parsers";

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function fetchHtml(url: string): Promise<string> {
  const r = await axios.get<string>(url, {
    timeout: 25_000,
    headers: HEADERS,
    responseType: "text",
    transformResponse: [(v: string) => v],
    httpsAgent,
    maxRedirects: 5,
    validateStatus: (s: number) => s >= 200 && s < 400,
  });
  return r.data;
}

const CONTENT_SELECTORS_TO_TRY = [
  ".board_view_con", ".board_view_contents", ".view_cont", ".view_content",
  ".bbs_content", ".bbs_content_detail", ".board_view_content", ".board_view",
  ".boardView_con", "#board_contents", ".se-main-container", ".board_contents",
  ".board_txt", ".cts_view_cont", ".article_cont", ".content_view",
  ".brd_detail_area", ".tbl_detail", ".view_article", ".detail_cont",
  ".txt_area", ".editor_area", ".data_area", ".content_body",
  ".view_body", ".viwe_cont", ".viewbody", ".board_view_area",
  ".text_viewbox", ".viewbox", ".contents", ".content",
  "#contents", "#content", ".sub_content", ".board_area",
  ".view_con", ".vContent", ".viewContent", ".bbsDetailCon",
  "#bbsDetail", ".bbsView", ".writeView", ".detailView",
  ".board_content", "#boardContent", ".view_box", ".view_area",
  ".con_area", ".bbs_view", "#bbs_view", ".article_view",
  ".board_detail", ".boardDetail", ".detail_content", ".detail_area",
  // Korean municipality specific
  ".text_viewbox", ".viewbox", ".viewer", ".board_viewer",
  ".board_view_txt", ".board_view_detail", ".boardViewCon",
  ".bbsV_cont", ".bbsV_content", ".view_bbs", ".news_view",
  ".press_view", ".press_cont", ".news_cont",
  // Namo/Web editor embedded content
  ".namo_content", "div[id^='divView']", "#divViewContent",
  // ES type sites
  ".es_board_view", ".es_view_cont", ".boardViewArea",
  ".board_view_data", ".view_data",
];

async function main() {
  const skipOk = new Set(["suncheon", "damyang", "gangjin", "shinan"]);
  const targets = SITES.filter((s) => !skipOk.has(s.id));

  console.log(`Diagnosing detail pages for ${targets.length} sites...\n`);

  for (let i = 0; i < targets.length; i += 3) {
    const batch = targets.slice(i, i + 3);
    await Promise.all(batch.map(async (site) => {
      try {
        const listHtml = await fetchHtml(site.listUrl);
        const parser = PARSERS[site.type];
        const articles = await parser({
          site,
          listHtml,
          fetchHtml,
          limit: 1,
          delayMs: 0,
        });

        if (articles.length === 0) {
          console.log(`\n[${site.id}] ❌ NO ARTICLES from parser (${site.type})`);
          return;
        }

        const article = articles[0];
        const bodyTextLen = load(article.body).text().trim().length;
        const bodyHtmlLen = article.body.length;
        const ratio = bodyHtmlLen / Math.max(bodyTextLen, 1);

        console.log(`\n[${site.id}] "${article.title.substring(0, 40)}"`);
        console.log(`  body: html=${bodyHtmlLen} text=${bodyTextLen} ratio=${ratio.toFixed(1)} imgs=${article.imageUrls.length}`);

        if (bodyTextLen > 100 && ratio < 4) {
          console.log(`  ✅ LOOKS OK`);
          return;
        }

        if (bodyTextLen === 0) {
          console.log(`  ❌ EMPTY BODY - need to find correct content selector`);
        } else if (ratio > 5) {
          console.log(`  ⚠️  HTML_HEAVY or PAGE_DUMP`);
        }

        // Fetch detail page directly to analyze
        const detailUrl = article.originalLink;
        const detailHtml = await fetchHtml(detailUrl);
        const $ = load(detailHtml);

        console.log(`  Analyzing: ${detailUrl}`);

        // Test all known selectors
        const matches: Array<{sel: string; text: number; html: number; ratio: number; preview: string}> = [];
        for (const sel of CONTENT_SELECTORS_TO_TRY) {
          const node = $(sel).first();
          if (node.length === 0) continue;
          node.find("script, style").remove();
          const text = node.text().trim().length;
          const html = node.html()?.trim().length || 0;
          if (text > 20) {
            matches.push({
              sel,
              text,
              html,
              ratio: html / text,
              preview: node.text().trim().substring(0, 80).replace(/\s+/g, " "),
            });
          }
        }

        // Also scan all divs with class
        $("div[class]").each((_, el) => {
          const cls = $(el).attr("class") || "";
          const sel = "." + cls.split(/\s+/).join(".");
          if (matches.some((m) => m.sel === sel)) return;
          $(el).find("script, style").remove();
          const text = $(el).text().trim().length;
          const html = $(el).html()?.trim().length || 0;
          if (text > 100 && text < 8000 && html / text < 3) {
            matches.push({
              sel,
              text,
              html,
              ratio: html / text,
              preview: $(el).text().trim().substring(0, 80).replace(/\s+/g, " "),
            });
          }
        });

        matches.sort((a, b) => a.ratio - b.ratio);
        console.log(`  Best content candidates:`);
        matches.slice(0, 10).forEach((m) => {
          console.log(`    ${m.sel}  text=${m.text} html=${m.html} ratio=${m.ratio.toFixed(1)} "${m.preview.substring(0, 60)}"`);
        });

        // Check images inside top candidate
        if (matches.length > 0) {
          const topSel = matches[0].sel;
          const imgs = $(topSel).first().find("img").length;
          console.log(`  Images in ${topSel}: ${imgs}`);
        }

      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`\n[${site.id}] ❌ ERROR: ${msg.substring(0, 100)}`);
      }
    }));

    if (i + 3 < targets.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("\n\nDiagnosis complete.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
