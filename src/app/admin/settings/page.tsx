import { createClient } from "@supabase/supabase-js";
import { SettingsForm } from "./settings-form";

type CrawlSettings = {
  enabled_site_ids: string[];
  schedule_hours: number[];
  updated_at: string;
};

async function getCrawlSettings(): Promise<CrawlSettings | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return null;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("crawl_settings")
    .select("enabled_site_ids,schedule_hours,updated_at")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CrawlSettings;
}

export default async function SettingsPage() {
  const settings = await getCrawlSettings();

  return (
    <div>
      <div className="mb-8">
         <h2 className="text-[28px] font-semibold tracking-tight text-white">정기 크롤링 설정</h2>
         <p className="mt-1 text-sm text-white/40">
           수집 시간과 대상 지역을 설정합니다
         </p>
       </div>

      <SettingsForm initial={settings} />
    </div>
  );
}
