import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseJeonnamSi: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: [".bbs_list_n tbody tr", "table tbody tr", "div.board_list > div", "#content li"],
    titleSelectors: [".td_subject a", "td a", "a"],
    dateSelectors: [".td_date", "td"],
    dateColumnIndex: 3,
    contentSelectors: [".bbs_content", ".view_content"],
  });
};
