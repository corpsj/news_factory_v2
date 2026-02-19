import { SITES } from "@/config/sites";
import { CrawlForm } from "./crawl-form";

export default function CrawlPage() {
  const sites = SITES.map((s) => ({ id: s.id, name: s.name }));
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          수동 크롤링
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          원하는 기관과 기간을 선택하여 크롤링을 실행합니다
        </p>
      </div>
      <CrawlForm sites={sites} />
    </div>
  );
}
