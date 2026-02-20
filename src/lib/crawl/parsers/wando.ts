import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseWando: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["div.tbl_type", "table tbody tr"],
    titleSelectors: ["span.span_tit a", "a"],
    dateSelectors: ["span.span_date", "td"],
    dateColumnIndex: 0,
    contentSelectors: [".board_cont", ".board_view", ".view_content", ".wrap_cont", ".con"],
  });
};
