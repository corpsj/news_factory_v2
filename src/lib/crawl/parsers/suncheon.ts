import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseSuncheon: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: [".bbs_default tbody tr", "table tbody tr"],
    titleSelectors: ["td.subject a", "td a"],
    dateSelectors: ["td"],
    dateColumnIndex: 4,
    contentSelectors: [".bbs_content_detail", ".view_content", ".wrap_cont"],
  });
};
