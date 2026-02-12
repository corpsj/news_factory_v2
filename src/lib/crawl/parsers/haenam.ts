import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseHaenam: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["ul.board_list li:not(.thead)", "table tbody tr"],
    titleSelectors: ["a:first", "td a"],
    dateSelectors: [".date", ".day", "td"],
    dateColumnIndex: 3,
    contentSelectors: [".board_view"],
  });
};
