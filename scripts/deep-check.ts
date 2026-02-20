import axios from "axios";
import https from "node:https";
import { load } from "cheerio";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function fetchHtml(url: string): Promise<string> {
  const r = await axios.get<string>(url, {
    timeout: 30_000, headers: HEADERS, responseType: "text",
    transformResponse: [(v: string) => v], httpsAgent, maxRedirects: 5,
    validateStatus: (s: number) => s >= 200 && s < 400,
  });
  return r.data;
}

type Check = { id: string; url: string; analyze: (html: string) => void };

const checks: Check[] = [
  {
    id: "donggu",
    url: "https://www.donggu.kr/board.es?mid=a10102040100&bid=0243",
    analyze(html) {
      const $ = load(html);
      console.log("  Total <a> with list_no:", $('a[href*="list_no"]').length);
      $('a[href*="list_no"]').slice(0, 3).each((_, el) => {
        console.log(`    href="${$(el).attr("href")}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      console.log("  Total <a> with onclick goView:", $('a[onclick*="goView"]').length);
      $('a[onclick*="goView"]').slice(0, 3).each((_, el) => {
        console.log(`    onclick="${$(el).attr("onclick")}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      const boardDiv = $(".board_list, .boardList, [class*=board_list], [class*=boardList]");
      console.log("  board_list-like containers:", boardDiv.length);
      boardDiv.each((i, el) => {
        console.log(`    [${i}] tag=${el.tagName} class="${$(el).attr("class")}" children=${$(el).children().length}`);
      });
      $("ul, ol").each((i, el) => {
        const items = $(el).find("> li");
        if (items.length >= 5 && items.length <= 20) {
          const firstA = items.first().find("a").first();
          console.log(`  ul/ol[${i}] class="${$(el).attr("class") || ""}" items=${items.length} firstA="${firstA.text().trim().substring(0, 40)}" href="${firstA.attr("href") || ""}" onclick="${firstA.attr("onclick") || ""}"`);
        }
      });
    },
  },
  {
    id: "bukgu",
    url: "https://bukgu.gwangju.kr/board.es?mid=a10201020000&bid=0275",
    analyze(html) {
      const $ = load(html);
      console.log("  Total <a> with list_no:", $('a[href*="list_no"]').length);
      $('a[href*="list_no"]').slice(0, 3).each((_, el) => {
        console.log(`    href="${$(el).attr("href")}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      console.log("  Total <a> with onclick goView:", $('a[onclick*="goView"]').length);
      $('a[onclick*="goView"]').slice(0, 3).each((_, el) => {
        console.log(`    onclick="${$(el).attr("onclick")}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      $("ul, ol").each((i, el) => {
        const items = $(el).find("> li");
        if (items.length >= 5 && items.length <= 20) {
          const firstA = items.first().find("a").first();
          console.log(`  ul/ol[${i}] class="${$(el).attr("class") || ""}" items=${items.length} firstA="${firstA.text().trim().substring(0, 40)}" href="${firstA.attr("href") || ""}" onclick="${firstA.attr("onclick") || ""}"`);
        }
      });
    },
  },
  {
    id: "yeosu",
    url: "https://www.yeosu.go.kr/www/govt/news/release",
    analyze(html) {
      const $ = load(html);
      const tableRows = $("table tbody tr");
      console.log(`  table tbody tr: ${tableRows.length}`);
      tableRows.slice(0, 3).each((i, row) => {
        const tds = $(row).find("td");
        console.log(`  row[${i}] tds=${tds.length}`);
        tds.each((j, td) => {
          const text = $(td).text().trim().replace(/\s+/g, " ").substring(0, 50);
          const cls = $(td).attr("class") || "";
          const a = $(td).find("a").first();
          const href = a.attr("href") || "";
          console.log(`    td[${j}] class="${cls}" text="${text}" href="${href}"`);
        });
      });
    },
  },
  {
    id: "naju",
    url: "https://www.naju.go.kr/www/administration/reporting",
    analyze(html) {
      const $ = load(html);
      const tableRows = $("table tbody tr");
      console.log(`  table tbody tr: ${tableRows.length}`);
      tableRows.slice(0, 3).each((i, row) => {
        const tds = $(row).find("td");
        console.log(`  row[${i}] tds=${tds.length}`);
        tds.each((j, td) => {
          const text = $(td).text().trim().replace(/\s+/g, " ").substring(0, 50);
          const cls = $(td).attr("class") || "";
          const a = $(td).find("a").first();
          const href = a.attr("href") || "";
          console.log(`    td[${j}] class="${cls}" text="${text}" href="${href}"`);
        });
      });
      console.log("  <a> with idx:", $('a[href*="idx="]').length);
      $('a[href*="idx="]').slice(0, 3).each((_, el) => {
        console.log(`    href="${$(el).attr("href")}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      $("div.board_list, div.board_thumb, div[class*=board]").each((i, el) => {
        console.log(`  board div[${i}] class="${$(el).attr("class")}" children=${$(el).children().length}`);
      });
    },
  },
  {
    id: "gokseong",
    url: "https://www.gokseong.go.kr/kr/board/list.do?bbsId=BBS_000000000000151&menuNo=102001002000",
    analyze(html) {
      const $ = load(html);
      const tableRows = $("table tbody tr");
      console.log(`  table tbody tr: ${tableRows.length}`);
      tableRows.slice(0, 3).each((i, row) => {
        const tds = $(row).find("td");
        console.log(`  row[${i}] tds=${tds.length}`);
        tds.each((j, td) => {
          const text = $(td).text().trim().replace(/\s+/g, " ").substring(0, 50);
          const cls = $(td).attr("class") || "";
          const a = $(td).find("a").first();
          const href = a.attr("href") || "";
          const onclick = a.attr("onclick") || "";
          console.log(`    td[${j}] class="${cls}" text="${text}" href="${href}" onclick="${onclick}"`);
        });
      });
    },
  },
  {
    id: "gurye",
    url: "https://www.gurye.go.kr/board/list.do?bbsId=BBS_0000000000000300&menuNo=115004006000",
    analyze(html) {
      const $ = load(html);
      console.log("  <a> with nttId:", $('a[href*="nttId"]').length);
      $('a[href*="nttId"]').slice(0, 3).each((_, el) => {
        const parent = $(el).parent();
        console.log(`    parent="${parent.prop("tagName")}.${parent.attr("class") || ""}" href="${$(el).attr("href")?.substring(0, 100)}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      $("table, ul, div").each((_, el) => {
        const cls = $(el).attr("class") || "";
        if (cls.includes("board") || cls.includes("list") || cls.includes("bbs")) {
          const tag = el.tagName;
          console.log(`  ${tag}.${cls} children=${$(el).children().length}`);
        }
      });
    },
  },
  {
    id: "goheung",
    url: "https://www.goheung.go.kr/boardList.do?boardId=BD_00025&pageId=www102",
    analyze(html) {
      const $ = load(html);
      $("ul.board_list li").slice(0, 3).each((i, li) => {
        const a = $(li).find("a").first();
        const dt = $(li).find("dt a").first();
        const date = $(li).find(".date, dd.date, span.date").first();
        console.log(`  li[${i}]:`);
        console.log(`    dt a: text="${dt.text().trim().substring(0, 60)}" href="${dt.attr("href") || ""}"`);
        console.log(`    first a: text="${a.text().trim().substring(0, 60)}" href="${a.attr("href") || ""}"`);
        console.log(`    date: "${date.text().trim()}"`);
      });
    },
  },
  {
    id: "boseong",
    url: "https://www.boseong.go.kr/www/open_administration/city_news/press_release",
    analyze(html) {
      const $ = load(html);
      console.log("  <a> with idx:", $('a[href*="idx="]').length);
      $('a[href*="idx="]').slice(0, 5).each((_, el) => {
        const parent = $(el).parent();
        console.log(`    parent="${parent.prop("tagName")}.${parent.attr("class") || ""}" href="${$(el).attr("href")?.substring(0, 100)}" text="${$(el).text().trim().substring(0, 60)}"`);
      });
      $("table tbody tr").slice(0, 3).each((i, row) => {
        const tds = $(row).find("td");
        console.log(`  row[${i}] tds=${tds.length}`);
        tds.each((j, td) => {
          const text = $(td).text().trim().replace(/\s+/g, " ").substring(0, 50);
          const a = $(td).find("a").first();
          console.log(`    td[${j}] text="${text}" href="${a.attr("href") || ""}"`);
        });
      });
      $("[class*=board], [class*=list], [class*=thumb], [class*=item]").each((_, el) => {
        const tag = el.tagName;
        const cls = $(el).attr("class") || "";
        if ($(el).children().length >= 3) {
          console.log(`  ${tag}.${cls} children=${$(el).children().length}`);
        }
      });
    },
  },
  {
    id: "haenam",
    url: "https://www.haenam.go.kr/planweb/board/list.9is?contentUid=18e3368f5d745106015d877ab2850a94&boardUid=18e3368f5fb80fdc015fdc4c2ac203e7",
    analyze(html) {
      const $ = load(html);
      console.log("  <a> count:", $("a").length);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.includes("view") || href.includes("nttId") || href.includes("board")) {
          const text = $(el).text().trim().substring(0, 60);
          if (text.length > 5) {
            console.log(`    href="${href.substring(0, 100)}" text="${text}"`);
          }
        }
      });
      $(".press_list li, div.press_list > div.item").slice(0, 3).each((i, el) => {
        console.log(`  item[${i}] tag=${el.tagName} class="${$(el).attr("class") || ""}" html="${$(el).html()?.substring(0, 200)}"`);
      });
    },
  },
  {
    id: "hwasun-new",
    url: "https://www.hwasun.go.kr",
    analyze(html) {
      const $ = load(html);
      console.log(`  Title: ${$("title").text()}`);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if ((href.includes("board") || href.includes("bbs") || href.includes("news") || href.includes("press")) && text.length > 2) {
          console.log(`    href="${href.substring(0, 100)}" text="${text.substring(0, 40)}"`);
        }
      });
    },
  },
  {
    id: "namgu",
    url: "https://www.namgu.gwangju.kr/api/eminwon/pressList.es?mid=a10605050000",
    analyze(html) {
      const $ = load(html);
      const tableRows = $("table.tbltype1 tbody tr, table tbody tr");
      console.log(`  table rows: ${tableRows.length}`);
      tableRows.slice(0, 3).each((i, row) => {
        const tds = $(row).find("td");
        console.log(`  row[${i}] tds=${tds.length}`);
        tds.each((j, td) => {
          const text = $(td).text().trim().replace(/\s+/g, " ").substring(0, 50);
          const a = $(td).find("a").first();
          const onclick = a.attr("onclick") || "";
          const href = a.attr("href") || "";
          if (a.length) {
            console.log(`    td[${j}] text="${text}" onclick="${onclick}" href="${href}"`);
          } else {
            console.log(`    td[${j}] text="${text}"`);
          }
        });
      });
    },
  },
];

async function main() {
  for (const check of checks) {
    console.log(`\n=== ${check.id} ===`);
    try {
      const html = await fetchHtml(check.url);
      console.log(`  HTML: ${html.length} chars`);
      check.analyze(html);
    } catch (e) {
      console.log(`  ERROR: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch(console.error);
