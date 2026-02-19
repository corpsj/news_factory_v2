import { loadEnvConfig } from "@next/env";
import { load } from "cheerio";
import { SITES } from "@/config/sites";
import { createHttpClient } from "@/lib/crawl/http";

loadEnvConfig(process.cwd());

const http = createHttpClient();

const FAILED_IDS = [
  "donggu", "seogu", "namgu", "bukgu",
  "mokpo", "damyang", "gokseong", "gurye",
  "goheung", "boseong", "hwasun", "jangheung",
  "gangjin", "haenam", "yeonggwang", "jangseong",
  "wando", "shinan",
];

const BOARD_SELECTORS = [
  "table tbody tr",
  ".board_list tbody tr",
  ".board_list_body .body_row",
  ".bbs_list_n tbody tr",
  ".bbs_default tbody tr",
  ".board_list li",
  "ul.board_list li",
  ".boardList tbody tr",
  ".list_wrap tbody tr",
  ".tb_list tbody tr",
  ".tbl_list tbody tr",
  ".bbs_list tbody tr",
  ".listForm tbody tr",
  "#boardList tbody tr",
  ".board-list tbody tr",
  ".table_list tbody tr",
  ".news_list li",
  ".press_list li",
  ".bbsListTbl tbody tr",
  "div.list table tbody tr",
  ".board_area table tbody tr",
];

const TITLE_SELECTORS = [
  "td.subject a", "td a", ".subject a", "a.subject",
  ".td_subject a", ".title a", "td.title a",
  ".bbsTitle a", ".tit a", ".list_tit a",
  "a:first-child",
];

async function diagnoseSite(site: (typeof SITES)[number]) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${site.name} (${site.id}) — type: ${site.type}`);
  console.log(`URL: ${site.listUrl}`);
  console.log(`${"=".repeat(60)}`);

  let html: string;
  try {
    html = await http.fetchHtml(site.listUrl);
  } catch (e) {
    console.log(`HTTP FAIL: ${e instanceof Error ? e.message : e}`);
    return;
  }

  console.log(`HTML length: ${html.length} chars`);

  const $ = load(html);

  console.log(`\n--- Board row selectors ---`);
  for (const sel of BOARD_SELECTORS) {
    const count = $(sel).length;
    if (count > 0) {
      console.log(`  "${sel}" → ${count} rows`);
    }
  }

  console.log(`\n--- Title link selectors (first matching board row) ---`);
  let foundRows = false;
  for (const boardSel of BOARD_SELECTORS) {
    const rows = $(boardSel);
    if (rows.length === 0) continue;
    foundRows = true;

    const firstRow = rows.first();
    for (const titleSel of TITLE_SELECTORS) {
      const link = firstRow.find(titleSel).first();
      if (link.length > 0) {
        const text = link.text().trim().slice(0, 60);
        const href = link.attr("href") ?? "(no href)";
        console.log(`  board="${boardSel}" title="${titleSel}"`);
        console.log(`    text: "${text}"`);
        console.log(`    href: ${href}`);
      }
    }
    break;
  }

  if (!foundRows) {
    console.log(`  No matching board structure found!`);
    console.log(`\n--- Page structure dump ---`);
    console.log(`  <table> count: ${$("table").length}`);
    console.log(`  <ul> count: ${$("ul").length}`);
    console.log(`  <a> count: ${$("a").length}`);

    const tables = $("table");
    tables.each((i, t) => {
      const id = $(t).attr("id") ?? "";
      const cls = $(t).attr("class") ?? "";
      const rows = $(t).find("tr").length;
      if (rows > 2) {
        console.log(`  table[${i}] id="${id}" class="${cls}" rows=${rows}`);
        const firstTd = $(t).find("td a").first();
        if (firstTd.length) {
          console.log(`    first <td a>: "${firstTd.text().trim().slice(0, 50)}" href=${firstTd.attr("href")}`);
        }
      }
    });

    const uls = $("ul");
    uls.each((i, u) => {
      const id = $(u).attr("id") ?? "";
      const cls = $(u).attr("class") ?? "";
      const lis = $(u).find("li").length;
      if (lis > 3) {
        console.log(`  ul[${i}] id="${id}" class="${cls}" items=${lis}`);
        const firstA = $(u).find("li a").first();
        if (firstA.length) {
          console.log(`    first <li a>: "${firstA.text().trim().slice(0, 50)}" href=${firstA.attr("href")}`);
        }
      }
    });
  }

  console.log(`\n--- Date extraction check ---`);
  for (const boardSel of BOARD_SELECTORS) {
    const rows = $(boardSel);
    if (rows.length === 0) continue;
    const firstRow = rows.first();
    const tds = firstRow.find("td");
    if (tds.length > 0) {
      console.log(`  TD count: ${tds.length}`);
      tds.each((i, td) => {
        const text = $(td).text().trim().replace(/\s+/g, " ").slice(0, 40);
        console.log(`    td[${i}]: "${text}"`);
      });
    }
    break;
  }
}

async function main() {
  const failedSites = SITES.filter((s) => FAILED_IDS.includes(s.id));
  console.log(`Diagnosing ${failedSites.length} failed sites...\n`);

  for (const site of failedSites) {
    await diagnoseSite(site);
  }
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exitCode = 1;
});
