import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseGwangjuEs: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: [".board_list tbody tr", "table tbody tr", "li.title"],
    titleSelectors: ["td.subject a", "td a", "a"],
    dateSelectors: ["td"],
    dateColumnIndex: 4,
    contentSelectors: [".board_view_contents", ".board_view_con"],
  });
};
