import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseWando: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["table tbody tr"],
    titleSelectors: ["td a"],
    dateSelectors: ["td"],
    dateColumnIndex: 3,
    contentSelectors: [".board_view", ".view_content"],
  });
};
