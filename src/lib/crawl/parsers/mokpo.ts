import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseMokpo: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["div.board_thumb > div.item", "div.board_list div.item"],
    titleSelectors: ["h3", "a"],
    dateSelectors: ["dd.date", ".date"],
    dateColumnIndex: 0,
    contentSelectors: [".bbs_content", ".view_content", ".board_view_con"],
  });
};
