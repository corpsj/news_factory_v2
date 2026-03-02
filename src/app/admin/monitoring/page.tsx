import { SITES } from "@/config/sites";
import { getAllSiteCrawlStatus } from "@/lib/services/crawl-monitor";
import type { HealthStatus } from "@/lib/services/crawl-monitor";
import { MonitoringPanel } from "./monitoring-panel";

export const dynamic = "force-dynamic";

async function getMonitoringData() {
  try {
    const sites = await getAllSiteCrawlStatus();
    const summary: Record<HealthStatus, number> = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
    for (const s of sites) {
      summary[s.health]++;
    }
    return { sites, summary };
  } catch {
    const emptySites = SITES.map((s) => ({
      site_id: s.id,
      site_name: s.name,
      site_url: s.listUrl,
      health: "unknown" as HealthStatus,
      status: null,
      last_crawl_at: null,
      articles_found: 0,
      articles_new: 0,
      consecutive_failures: 0,
      crawl_duration_ms: null,
      error_message: null,
      failure_reason: null,
    }));
    return { sites: emptySites, summary: { healthy: 0, warning: 0, critical: 0, unknown: SITES.length } };
  }
}

export default async function MonitoringPage() {
  const data = await getMonitoringData();
  return <MonitoringPanel initial={data} />;
}
