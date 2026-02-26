import { loadEnvConfig } from "@next/env";
import { SITES, SITES_BY_ID } from "@/config/sites";
import { createHttpClient } from "@/lib/crawl/http";
import { PARSERS } from "@/lib/crawl/parsers";
import type { SiteConfig } from "@/types/crawler";

loadEnvConfig(process.cwd());

const http = createHttpClient({ timeoutMs: 30_000, attempts: 2 });

function parseArgs(argv: string[]): { siteIds?: string[]; limit: number } {
  let siteIds: string[] | undefined;
  let limit = 5;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--site" && next) { siteIds = [next]; i += 1; }
    else if (arg === "--sites" && next) { siteIds = next.split(",").map((s) => s.trim()).filter(Boolean); i += 1; }
    else if (arg === "--limit" && next) { limit = Number(next); i += 1; }
  }

  return { siteIds, limit };
}

async function testSite(site: SiteConfig, limit: number) {
  const parser = PARSERS[site.type];
  const start = Date.now();

  try {
    const listHtml = await http.fetchHtml(site.listUrl);
    const articles = await parser({
      site,
      listHtml,
      fetchHtml: http.fetchHtml,
      limit,
      delayMs: 500,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    return {
      id: site.id,
      name: site.name,
      type: site.type,
      count: articles.length,
      articles: articles.map((a) => ({
        originId: a.originId,
        title: a.title,
        date: a.date,
        bodyLength: a.body.length,
        imageCount: a.imageUrls.length,
        attachmentCount: a.attachmentUrls.length,
        bodyPreview: a.body.substring(0, 150).replace(/\n/g, " "),
      })),
      elapsed,
      error: null,
    };
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = error instanceof Error ? error.message : String(error);
    return { id: site.id, name: site.name, type: site.type, count: 0, articles: [], elapsed, error: msg.slice(0, 200) };
  }
}

async function main() {
  const { siteIds, limit } = parseArgs(process.argv.slice(2));

  let sites: SiteConfig[];
  if (siteIds && siteIds.length > 0) {
    sites = siteIds.map((id) => {
      const site = SITES_BY_ID.get(id);
      if (!site) throw new Error(`Unknown site: ${id}`);
      return site;
    });
  } else {
    sites = [...SITES];
  }

  console.log(`Testing ${sites.length} site(s) with parsers (limit=${limit} per site)\n`);

  const results: Awaited<ReturnType<typeof testSite>>[] = [];

  for (const site of sites) {
    const result = await testSite(site, limit);
    results.push(result);
    // Print progress immediately
    if (result.error) {
      console.log(`❌ [${result.id}] ${result.name} (${result.type}) — ERROR: ${result.error} (${result.elapsed}s)`);
    } else {
      console.log(`✅ [${result.id}] ${result.name} (${result.type}) — ${result.count} articles (${result.elapsed}s)`);
      for (const a of result.articles) {
        console.log(`   ${a.date} | ${a.title}`);
        console.log(`     body=${a.bodyLength}c imgs=${a.imageCount} attach=${a.attachmentCount}`);
      }
    }
    console.log();
  }

  const ok = results.filter((r) => r.count > 0);
  const empty = results.filter((r) => r.count === 0 && !r.error);
  const err = results.filter((r) => r.error);

  console.log(`${"=".repeat(70)}`);
  console.log(`SUMMARY: OK=${ok.length} | EMPTY=${empty.length} | ERROR=${err.length} / total=${results.length}`);
  console.log(`${"=".repeat(70)}`);

  if (empty.length > 0) {
    console.log(`\nEMPTY parsers (found 0 articles):`);
    for (const r of empty) console.log(`  [${r.id}] ${r.name}`);
  }
  if (err.length > 0) {
    console.log(`\nERROR parsers:`);
    for (const r of err) console.log(`  [${r.id}] ${r.name}: ${r.error}`);
  }

  process.exitCode = empty.length + err.length > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
