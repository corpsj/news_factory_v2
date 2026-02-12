import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseDamyang: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: [".board_list li", "table tbody tr"],
    titleSelectors: [".subject a", "a:first", "td a"],
    dateSelectors: [".date", "td"],
    dateColumnIndex: 3,
    contentSelectors: [".board_view_content", ".view_cont"],
  });
};
