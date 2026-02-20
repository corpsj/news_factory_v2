import axios from "axios";
import https from "node:https";
import { load } from "cheerio";
import { SITES } from "@/config/sites";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const COMMON_ROW_SELECTORS = [
  "table tbody tr",
  "table.board_basic tbody tr",
  "table.tbltype1 tbody tr",
  ".board_list tbody tr",
  ".board_list_body .body_row",
  ".bbs_list_n tbody tr",
  ".bbs_default tbody tr",
  "ul.board_list li",
  "ul.board_list li:not(.thead)",
  ".board_list li",
  "div.board_list li",
  "div.board_list > div",
  "div.board_list > div.item",
  "div.board_thumb > div.item",
  "div.board_list > div.board_thumb > div.item",
  "div.board_list div.item",
  "#content li",
  ".md_list li",
  "#news.md_list > li",
  "div.press_list > div.item",
  "div.tbl_type",
  ".list_wrap tbody tr",
  ".tb_list tbody tr",
  ".tbl_list tbody tr",
  ".bbs_list tbody tr",
  "#boardList tbody tr",
  ".news_list li",
  ".press_list li",
  ".bbsListTbl tbody tr",
  "div.list table tbody tr",
  ".board_area table tbody tr",
  ".listBody li",
  "ul.listBody li",
  ".board_gallery li",
  "div.bbs_list li",
  "div.bbs_default li",
];

const COMMON_TITLE_SELECTORS = [
  "td.subject a",
  ".td_subject a",
  "td.title a",
  "td.title_minwon a",
  "td.align_left a",
  "td a",
  ".subject a",
  ".title a",
  "a.subject",
  "h3 a",
  "h4 a",
  "h3",
  "a",
  "dt a",
  "span.span_tit a",
  "a:first-child",
  ".item_cont h3",
  ".cont_box h3",
  ".title_box h3",
];

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 30_000,
    headers: HEADERS,
    responseType: "text",
    transformResponse: [(v: string) => v],
    httpsAgent,
    maxRedirects: 5,
    validateStatus: (s: number) => s >= 200 && s < 400,
  });
  return response.data;
}

type SiteType = (typeof SITES)[number];

type DiagResult = {
  id: string;
  name: string;
  type: string;
  status: "OK" | "FAIL" | "HTTP_ERROR";
  configRowMatch: boolean;
  configTitleMatch: boolean;
  configTitleHasHref: boolean;
  bestRow: string | null;
  bestRowCount: number;
  bestTitle: string | null;
  bestTitleCount: number;
  sampleTitles: string[];
  sampleHrefs: string[];
  idPatternMatch: boolean;
  dateText: string;
  allRows: Record<string, number>;
  allTitles: Record<string, number>;
  allHrefs: Record<string, number>;
  errorMsg?: string;
};

function diagnoseSite(html: string, site: SiteType): DiagResult {
  const $ = load(html);

  const allRowSelectors = [...new Set([...site.selectors.list, ...COMMON_ROW_SELECTORS])];
  const allTitleSelectors = [...new Set([...site.selectors.title, ...COMMON_TITLE_SELECTORS])];

  const allRows: Record<string, number> = {};
  for (const sel of allRowSelectors) {
    const count = $(sel).length;
    if (count > 0) allRows[sel] = count;
  }

  const configRowMatch = site.selectors.list.some((s) => allRows[s] > 0);

  let bestRow: string | null = null;
  let bestRowCount = 0;
  for (const [sel, count] of Object.entries(allRows)) {
    if (count > bestRowCount && count >= 3 && count <= 50) {
      bestRowCount = count;
      bestRow = sel;
    }
  }

  if (!bestRow) {
    for (const [sel, count] of Object.entries(allRows)) {
      if (count > bestRowCount) {
        bestRowCount = count;
        bestRow = sel;
      }
    }
  }

  const rowSelector = bestRow || "table tbody tr";
  const rows = $(rowSelector);

  const allTitles: Record<string, number> = {};
  const allHrefs: Record<string, number> = {};

  for (const tSel of allTitleSelectors) {
    let titleCount = 0;
    let hrefCount = 0;
    rows.each((_, row) => {
      const el = $(row).find(tSel).first();
      const txt = el.text().trim();
      if (txt && txt.length > 2) titleCount++;
      if (el.attr("href")) hrefCount++;
    });
    if (titleCount > 0) allTitles[tSel] = titleCount;
    if (hrefCount > 0) allHrefs[tSel] = hrefCount;
  }

  const configTitleMatch = site.selectors.title.some((s) => allTitles[s] > 0);
  const configTitleHasHref = site.selectors.title.some((s) => allHrefs[s] > 0);

  let bestTitle: string | null = null;
  let bestTitleCount = 0;
  for (const [sel, count] of Object.entries(allHrefs)) {
    if (count > bestTitleCount) {
      bestTitleCount = count;
      bestTitle = sel;
    }
  }

  const sampleTitles: string[] = [];
  const sampleHrefs: string[] = [];
  let idPatternMatch = false;
  let dateText = "";

  if (bestTitle) {
    rows.slice(0, 3).each((_, row) => {
      const el = $(row).find(bestTitle!).first();
      const txt = el.text().trim().replace(/\s+/g, " ").substring(0, 80);
      const href = el.attr("href") || "";
      if (txt) sampleTitles.push(txt);
      if (href) {
        sampleHrefs.push(href.substring(0, 150));
        if (site.idPattern.test(href)) idPatternMatch = true;
      }
    });
  }

  if (rows.length > 0) {
    const firstRow = rows.first();
    const tds = firstRow.find("td");
    const dateIdx = site.selectors.dateColumnIndex ?? 3;
    if (tds.length > dateIdx) {
      dateText = tds.eq(dateIdx).text().trim().replace(/\s+/g, " ").substring(0, 30);
    }
    if (!dateText || !/\d{4}/.test(dateText)) {
      tds.each((i, td) => {
        const t = $(td).text().trim();
        if (/\d{4}[./-]\d{1,2}[./-]\d{1,2}/.test(t)) {
          dateText = `[td${i}] ${t.substring(0, 30)}`;
        }
      });
    }
    if (!dateText) {
      const dateEl = firstRow.find(".date, .td_date, span.date, dd.date, td.created").first();
      if (dateEl.length) {
        dateText = `[class] ${dateEl.text().trim().substring(0, 30)}`;
      }
    }
  }

  const isOk = configRowMatch && configTitleHasHref && idPatternMatch;

  return {
    id: site.id,
    name: site.name,
    type: site.type,
    status: isOk ? "OK" : "FAIL",
    configRowMatch,
    configTitleMatch,
    configTitleHasHref,
    bestRow,
    bestRowCount,
    bestTitle,
    bestTitleCount,
    sampleTitles,
    sampleHrefs,
    idPatternMatch,
    dateText,
    allRows,
    allTitles,
    allHrefs,
  };
}

async function main() {
  const skipIds = new Set(["damyang"]);
  const targets = SITES.filter((s) => !skipIds.has(s.id));

  console.log(`\nDiagnosing ${targets.length} sites (skip: damyang=API-based)\n`);

  const results: DiagResult[] = [];

  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5);
    console.log(`Batch ${Math.floor(i / 5) + 1}: ${batch.map((s) => s.id).join(", ")}`);

    const batchResults = await Promise.allSettled(
      batch.map(async (site) => {
        try {
          const html = await fetchHtml(site.listUrl);
          return diagnoseSite(html, site);
        } catch (error) {
          return {
            id: site.id,
            name: site.name,
            type: site.type,
            status: "HTTP_ERROR" as const,
            configRowMatch: false,
            configTitleMatch: false,
            configTitleHasHref: false,
            bestRow: null,
            bestRowCount: 0,
            bestTitle: null,
            bestTitleCount: 0,
            sampleTitles: [],
            sampleHrefs: [],
            idPatternMatch: false,
            dateText: "",
            allRows: {},
            allTitles: {},
            allHrefs: {},
            errorMsg: error instanceof Error ? error.message : String(error),
          } satisfies DiagResult;
        }
      }),
    );

    for (const r of batchResults) {
      results.push(r.status === "fulfilled" ? r.value : {
        id: "?",
        name: "?",
        type: "?",
        status: "HTTP_ERROR" as const,
        configRowMatch: false,
        configTitleMatch: false,
        configTitleHasHref: false,
        bestRow: null,
        bestRowCount: 0,
        bestTitle: null,
        bestTitleCount: 0,
        sampleTitles: [],
        sampleHrefs: [],
        idPatternMatch: false,
        dateText: "",
        allRows: {},
        allTitles: {},
        allHrefs: {},
        errorMsg: String(r.reason),
      } satisfies DiagResult);
    }

    if (i + 5 < targets.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const ok = results.filter((r) => r.status === "OK");
  const fail = results.filter((r) => r.status === "FAIL");
  const err = results.filter((r) => r.status === "HTTP_ERROR");

  console.log(`\n${"=".repeat(70)}`);
  console.log(`RESULTS: OK=${ok.length} | FAIL=${fail.length} | HTTP_ERROR=${err.length}`);
  console.log(`${"=".repeat(70)}`);

  if (ok.length > 0) {
    console.log(`\n--- OK (${ok.length}) ---`);
    for (const r of ok) {
      console.log(`  [${r.id}] ${r.name} (${r.type}) | rows: ${r.bestRowCount} | date: ${r.dateText}`);
    }
  }

  if (fail.length > 0) {
    console.log(`\n--- FAIL (${fail.length}) --- NEED FIX ---`);
    for (const r of fail) {
      console.log(`\n  [${r.id}] "${r.name}" (type: ${r.type})`);
      console.log(`    configRowMatch=${r.configRowMatch} configTitleHref=${r.configTitleHasHref} idMatch=${r.idPatternMatch}`);
      if (r.bestRow) console.log(`    bestRow: "${r.bestRow}" (${r.bestRowCount})`);
      if (r.bestTitle) console.log(`    bestTitle: "${r.bestTitle}" (${r.bestTitleCount})`);
      if (r.sampleTitles.length) r.sampleTitles.forEach((t) => console.log(`    title: "${t}"`));
      if (r.sampleHrefs.length) r.sampleHrefs.forEach((h) => console.log(`    href: ${h}`));
      console.log(`    date: ${r.dateText || "(none)"}`);
      if (Object.keys(r.allRows).length > 0) {
        console.log(`    allRows: ${JSON.stringify(r.allRows)}`);
      }
      if (Object.keys(r.allHrefs).length > 0) {
        console.log(`    allHrefs: ${JSON.stringify(r.allHrefs)}`);
      }
    }
  }

  if (err.length > 0) {
    console.log(`\n--- HTTP ERRORS (${err.length}) ---`);
    for (const r of err) {
      console.log(`  [${r.id}] ${r.name}: ${r.errorMsg}`);
    }
  }

  console.log(`\n=== FULL JSON ===`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
