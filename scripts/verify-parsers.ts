import { loadEnvConfig } from "@next/env";
import { SITES } from "@/config/sites";
import { createHttpClient } from "@/lib/crawl/http";
import { PARSERS } from "@/lib/crawl/parsers";

loadEnvConfig(process.cwd());

const SKIP = new Set(["damyang"]);
const http = createHttpClient({ timeoutMs: 30_000, attempts: 2 });

async function testSite(site: (typeof SITES)[number]) {
  const parser = PARSERS[site.type];
  const start = Date.now();

  try {
    const listHtml = await http.fetchHtml(site.listUrl);
    const articles = await parser({
      site,
      listHtml,
      fetchHtml: http.fetchHtml,
      limit: 2,
      delayMs: 300,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const titles = articles.map((a) => a.title.slice(0, 50));
    return { id: site.id, name: site.name, count: articles.length, titles, elapsed, error: null };
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = error instanceof Error ? error.message : String(error);
    return { id: site.id, name: site.name, count: 0, titles: [], elapsed, error: msg.slice(0, 100) };
  }
}

async function main() {
  const sites = SITES.filter((s) => !SKIP.has(s.id));
  console.log(`Testing ${sites.length} sites with actual parsers (limit=2 per site)\n`);

  const BATCH_SIZE = 5;
  const results: Awaited<ReturnType<typeof testSite>>[] = [];

  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE);
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map((s) => s.id).join(", ")}`);
    const batchResults = await Promise.all(batch.map(testSite));
    results.push(...batchResults);
  }

  const ok = results.filter((r) => r.count > 0);
  const fail = results.filter((r) => r.count === 0 && !r.error);
  const err = results.filter((r) => r.error);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`OK=${ok.length} | EMPTY=${fail.length} | ERROR=${err.length}`);
  console.log(`${"=".repeat(70)}`);

  if (ok.length > 0) {
    console.log(`\n--- OK (${ok.length}) ---`);
    for (const r of ok) {
      console.log(`  [${r.id}] ${r.name} | ${r.count} articles | ${r.elapsed}s`);
      for (const t of r.titles) console.log(`    "${t}"`);
    }
  }

  if (fail.length > 0) {
    console.log(`\n--- EMPTY (${fail.length}) --- PARSER FOUND 0 ARTICLES ---`);
    for (const r of fail) {
      console.log(`  [${r.id}] ${r.name} | ${r.elapsed}s`);
    }
  }

  if (err.length > 0) {
    console.log(`\n--- ERROR (${err.length}) ---`);
    for (const r of err) {
      console.log(`  [${r.id}] ${r.name} | ${r.elapsed}s | ${r.error}`);
    }
  }

  process.exitCode = fail.length + err.length > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
