import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseHwasun: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["table tbody tr"],
    titleSelectors: ["td a"],
    dateSelectors: ["td"],
    dateColumnIndex: 4,
    contentSelectors: [".boardR", ".view_content", ".board_contents"],
  });
};
