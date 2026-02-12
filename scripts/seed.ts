import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const SAMPLE_PRESS_RELEASES = [
  {
    origin_id: "seed-gwangju-99999",
    source: "광주광역시",
    title: "광주시, 2026년 지역경제 활성화 종합계획 발표",
    content:
      "광주광역시는 12일 2026년 지역경제 활성화를 위한 종합계획을 발표했다. 이번 계획에는 AI 산업 육성, 청년 일자리 창출, 전통시장 현대화 등 3대 핵심과제가 포함되어 있다. 시는 올해 총 5,000억 원의 예산을 투입해 지역 경제 성장률 3.5%를 달성하겠다는 목표를 세웠다.",
    link: "https://www.gwangju.go.kr/boardView.do?pageId=www789&boardId=BD_0000000027&seq=99999",
    published_at: new Date().toISOString(),
  },
  {
    origin_id: "seed-jeonnam-88888",
    source: "전라남도",
    title: "전남도, 친환경 에너지 자립 마을 100곳 조성",
    content:
      "전라남도는 2026년까지 친환경 에너지 자립 마을 100곳을 조성한다고 밝혔다. 태양광·풍력 발전 시설을 갖춘 마을을 확대하고, 주민 참여형 에너지 협동조합을 지원한다. 총 사업비 1,200억 원이 투입되며, 탄소 배출량 연간 5만 톤 감축이 기대된다.",
    link: "https://www.jeonnam.go.kr/M7116/boardView.do?menuId=jeonnam0202000000&seq=88888",
    published_at: new Date().toISOString(),
  },
  {
    origin_id: "seed-suncheon-77777",
    source: "순천시",
    title: "순천만 생태관광 방문객 500만 명 돌파",
    content:
      "순천시는 순천만 국가정원과 순천만습지를 방문한 관광객이 올해 500만 명을 돌파했다고 발표했다. 이는 전년 대비 15% 증가한 수치로, 생태관광의 가치가 재조명되고 있다. 시는 관광 인프라 확충과 프로그램 다양화를 통해 600만 명 유치를 목표로 하고 있다.",
    link: "https://www.suncheon.go.kr/kr/news/0006/0001/?mode=view&seq=77777",
    published_at: new Date().toISOString(),
  },
];

const SAMPLE_ARTICLES = [
  {
    origin_id: "seed-gwangju-99999",
    title: "광주시, AI 산업 육성으로 지역경제 도약 선언",
    subtitle: "5천억 투입 종합계획 발표…청년 일자리·전통시장 현대화 포함",
    body: "광주광역시가 인공지능(AI) 산업 육성을 핵심 축으로 삼아 지역경제 활성화에 나선다. 시는 12일 2026년 지역경제 활성화 종합계획을 발표하고, 올해 총 5,000억 원의 예산을 투입해 경제 성장률 3.5% 달성을 목표로 하겠다고 밝혔다.\n\n계획에는 AI 산업 육성, 청년 일자리 창출, 전통시장 현대화 등 3대 핵심과제가 담겼다. 특히 AI 산업 클러스터 조성에 2,000억 원을 배정하고, 관련 스타트업 50곳을 유치할 계획이다.",
    category: "economy",
    source: "광주광역시",
    source_url: "https://www.gwangju.go.kr/boardView.do?pageId=www789&boardId=BD_0000000027&seq=99999",
    images: [],
    status: "available",
  },
  {
    origin_id: "seed-jeonnam-88888",
    title: "전남, 에너지 자립 마을 100곳 조성…탄소 5만t 감축 기대",
    subtitle: "태양광·풍력 기반 주민 참여 모델 확대",
    body: "전라남도가 친환경 에너지 전환에 속도를 낸다. 도는 2026년까지 에너지 자립 마을 100곳을 조성하겠다고 밝혔다. 총 사업비 1,200억 원이 투입되며, 연간 탄소 배출량 5만 톤 감축이 기대된다.\n\n마을별로 태양광·풍력 발전 시설을 설치하고, 주민 참여형 에너지 협동조합을 운영한다. 발전 수익은 마을 공동기금으로 활용될 예정이다.",
    category: "society",
    source: "전라남도",
    source_url: "https://www.jeonnam.go.kr/M7116/boardView.do?menuId=jeonnam0202000000&seq=88888",
    images: [],
    status: "available",
  },
];

async function main() {
  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  console.log("Seeding News Factory v2...\n");

  const apiKey = `nf_${randomBytes(32).toString("hex")}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 12);

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .insert({ name: "KJTIMES (test)", api_key_hash: apiKeyHash, is_active: true })
    .select("id, name")
    .single();

  if (clientErr) {
    console.error("Failed to create test client:", clientErr.message);
    process.exit(1);
  }

  console.log(`  Client: ${client.name} (${client.id})`);
  console.log(`  API Key: ${apiKey}\n`);

  const { data: prData, error: prErr } = await supabase
    .from("press_releases")
    .insert(
      SAMPLE_PRESS_RELEASES.map((pr) => ({
        ...pr,
        status: "processed",
      })),
    )
    .select("id, origin_id");

  if (prErr || !prData) {
    console.error("Failed to insert press releases:", prErr?.message);
    process.exit(1);
  }

  const prIdByOrigin = new Map(prData.map((pr) => [pr.origin_id, pr.id]));
  console.log(`  Press releases: ${prData.length} inserted`);

  const articlesToInsert = SAMPLE_ARTICLES.map(({ origin_id, ...art }) => ({
    ...art,
    press_release_id: prIdByOrigin.get(origin_id),
  }));

  const { error: artErr } = await supabase.from("articles").insert(articlesToInsert);

  if (artErr) {
    console.error("Failed to insert articles:", artErr.message);
    process.exit(1);
  }

  console.log(`  Articles: ${articlesToInsert.length} inserted`);

  const { error: logErr } = await supabase.from("crawl_logs").insert([
    {
      site_name: "광주광역시",
      site_url: "https://www.gwangju.go.kr/boardList.do?pageId=www789&boardId=BD_0000000027",
      status: "success",
      articles_found: 15,
      articles_new: 3,
      started_at: new Date(Date.now() - 5000).toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      site_name: "전라남도",
      site_url: "https://www.jeonnam.go.kr/M7116/boardList.do?menuId=jeonnam0202000000",
      status: "success",
      articles_found: 10,
      articles_new: 2,
      started_at: new Date(Date.now() - 8000).toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      site_name: "순천시",
      site_url: "https://www.suncheon.go.kr/kr/news/0006/0001/",
      status: "failed",
      articles_found: 0,
      articles_new: 0,
      error_message: "ECONNREFUSED: connection refused",
      started_at: new Date(Date.now() - 3000).toISOString(),
      completed_at: new Date().toISOString(),
    },
  ]);

  if (logErr) {
    console.error("Failed to insert crawl logs:", logErr.message);
    process.exit(1);
  }

  console.log("  Crawl logs: 3 inserted (2 success, 1 failed)\n");

  console.log("─".repeat(50));
  console.log("Seed complete!");
  console.log(`\nTest API key: ${apiKey}`);
  console.log("\nVerify with:");
  console.log(`  curl -H "Authorization: Bearer ${apiKey}" http://localhost:3000/api/v1/articles`);
  console.log("─".repeat(50));
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
