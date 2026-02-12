import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseYeonggwang: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: [".board_list tbody tr", "table tbody tr"],
    titleSelectors: ["td a"],
    dateSelectors: ["td"],
    dateColumnIndex: 3,
    contentSelectors: [".board_view_content", ".view_content"],
  });
};
