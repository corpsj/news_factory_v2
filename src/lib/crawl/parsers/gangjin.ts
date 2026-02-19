import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseGangjin: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["#news.md_list > li", ".md_list li", ".bbs_list_n tbody tr", "table tbody tr"],
    titleSelectors: ["a"],
    dateSelectors: [".date", ".c_exp li:nth-child(2)", "td"],
    dateColumnIndex: 3,
    contentSelectors: [".bbs_content", ".view_content", ".board_view", ".detail_view"],
  });
};
