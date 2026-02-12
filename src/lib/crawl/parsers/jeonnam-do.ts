import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseJeonnamDo: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["table tbody tr"],
    titleSelectors: ["td.title a", "td.subject a"],
    dateSelectors: ["td"],
    dateColumnIndex: 3,
    contentSelectors: [".view_content", ".board_view_con"],
  });
};
