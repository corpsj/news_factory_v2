import type { ParserType, SiteParser } from "@/types/crawler";
import { parseDamyang } from "./damyang";
import { parseGangjin } from "./gangjin";
import { parseGokseong } from "./gokseong";
import { parseGwangjuDo } from "./gwangju-do";
import { parseGwangjuEs } from "./gwangju-es";
import { parseHaenam } from "./haenam";
import { parseHwasun } from "./hwasun";
import { parseJeonnamDo } from "./jeonnam-do";
import { parseJeonnamSi } from "./jeonnam-si";
import { parseNamgu } from "./namgu";
import { parseSuncheon } from "./suncheon";
import { parseWando } from "./wando";
import { parseYeonggwang } from "./yeonggwang";

export const PARSERS: Record<ParserType, SiteParser> = {
  "gwangju-do": parseGwangjuDo,
  "gwangju-es": parseGwangjuEs,
  namgu: parseNamgu,
  "jeonnam-do": parseJeonnamDo,
  "jeonnam-si": parseJeonnamSi,
  suncheon: parseSuncheon,
  damyang: parseDamyang,
  gokseong: parseGokseong,
  hwasun: parseHwasun,
  gangjin: parseGangjin,
  haenam: parseHaenam,
  yeonggwang: parseYeonggwang,
  wando: parseWando,
};
