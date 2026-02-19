import { loadEnvConfig } from "@next/env";
import { SITES } from "@/config/sites";
import { PARSERS } from "@/lib/crawl/parsers";
import { createHttpClient } from "@/lib/crawl/http";

loadEnvConfig(process.cwd());

const http = createHttpClient();

type Result = {
  id: string;
  name: string;
  listUrl: string;
  httpOk: boolean;
  httpError?: string;
  articlesParsed: number;
  parseError?: string;
  sampleTitle?: string;
};

async function verifySite(site: (typeof SITES)[number]): Promise<Result> {
  const result: Result = {
    id: site.id,
    name: site.name,
    listUrl: site.listUrl,
    httpOk: false,
    articlesParsed: 0,
  };

  let listHtml: string;
  try {
    listHtml = await http.fetchHtml(site.listUrl);
    result.httpOk = true;
  } catch (e) {
    result.httpError = e instanceof Error ? e.message : String(e);
    return result;
  }

  try {
    const parser = PARSERS[site.type];
    const articles = await parser({
      site,
      listHtml,
      fetchHtml: http.fetchHtml,
      limit: 5,
      delayMs: 300,
    });
    result.articlesParsed = articles.length;
    if (articles.length > 0) {
      result.sampleTitle = articles[0].title.slice(0, 50);
    }
  } catch (e) {
    result.parseError = e instanceof Error ? e.message : String(e);
  }

  return result;
}

async function main() {
  console.log(`Verifying ${SITES.length} sites...\n`);

  const results: Result[] = [];

  for (const site of SITES) {
    process.stdout.write(`  ${site.name} ... `);
    const r = await verifySite(site);
    results.push(r);

    if (!r.httpOk) {
      console.log(`HTTP FAIL`);
    } else if (r.parseError) {
      console.log(`PARSE FAIL (${r.parseError.slice(0, 60)})`);
    } else if (r.articlesParsed === 0) {
      console.log(`NO ARTICLES`);
    } else {
      console.log(`OK (${r.articlesParsed} articles)`);
    }
  }

  console.log("\n=== SUMMARY ===\n");

  const ok = results.filter((r) => r.httpOk && !r.parseError && r.articlesParsed > 0);
  const httpFail = results.filter((r) => !r.httpOk);
  const parseFail = results.filter((r) => r.httpOk && r.parseError);
  const noArticles = results.filter((r) => r.httpOk && !r.parseError && r.articlesParsed === 0);

  console.log(`OK: ${ok.length}/${SITES.length}`);

  if (httpFail.length > 0) {
    console.log(`\nHTTP FAILURES (${httpFail.length}):`);
    for (const r of httpFail) {
      console.log(`  ${r.name} (${r.id})`);
      console.log(`    URL: ${r.listUrl}`);
      console.log(`    Error: ${r.httpError}`);
    }
  }

  if (parseFail.length > 0) {
    console.log(`\nPARSE FAILURES (${parseFail.length}):`);
    for (const r of parseFail) {
      console.log(`  ${r.name} (${r.id})`);
      console.log(`    URL: ${r.listUrl}`);
      console.log(`    Error: ${r.parseError}`);
    }
  }

  if (noArticles.length > 0) {
    console.log(`\nNO ARTICLES FOUND (${noArticles.length}):`);
    for (const r of noArticles) {
      console.log(`  ${r.name} (${r.id})`);
      console.log(`    URL: ${r.listUrl}`);
    }
  }

  if (ok.length > 0) {
    console.log(`\nSUCCESS (${ok.length}):`);
    for (const r of ok) {
      console.log(`  ${r.name}: ${r.articlesParsed} articles - "${r.sampleTitle}"`);
    }
  }

  process.exitCode = httpFail.length + parseFail.length + noArticles.length > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exitCode = 1;
});
