import type { SiteParser } from "@/types/crawler";
import { parseWithPattern } from "./common";

export const parseJeonnamDo: SiteParser = async (ctx) => {
  return parseWithPattern(ctx, {
    listSelectors: ["table tbody tr"],
    titleSelectors: ["td.title a", "td.subject a"],
    dateSelectors: ["td"],
    dateColumnIndex: 3,
    contentSelectors: [".bbs_view_contnet", ".view_content", ".board_view_con"], // Note: 'contnet' matches the actual CSS class on jeonnam.go.kr (their typo)
  });
};
