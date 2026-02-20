import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseHaenam: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["div.press_list > div.item", "ul.board_list li:not(.thead)", "table tbody tr"],
    titleSelectors: ["div.right h4 a", "h4 a", "a:first", "td a"],
    dateSelectors: ["span.date", ".date", ".day", "td"],
    dateColumnIndex: 0,
    contentSelectors: [".data_cont", ".board_view"],
  });
};
