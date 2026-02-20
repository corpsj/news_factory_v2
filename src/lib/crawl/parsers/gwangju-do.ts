import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseGwangjuDo: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: [".board_list_body .body_row", "table tbody tr", ".board_list li"],
    titleSelectors: [".subject a", "td.subject a", "td a", "dt a", "a"],
    dateSelectors: [".date", "dd.date", "dd", "td"],
    dateColumnIndex: 3,
    contentSelectors: [".board_view_con", ".view_cont"],
  });
};
