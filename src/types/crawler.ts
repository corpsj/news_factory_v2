import type { CheerioAPI } from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ParserType =
  | "gwangju-do"
  | "gwangju-es"
  | "namgu"
  | "jeonnam-do"
  | "jeonnam-si"
  | "suncheon"
  | "damyang"
  | "gokseong"
  | "hwasun"
  | "gangjin"
  | "haenam"
  | "yeonggwang"
  | "wando";

export type SiteSelectorConfig = {
  list: string[];
  title: string[];
  date?: string[];
  dateColumnIndex?: number;
  content: string[];
};

export type SiteConfig = {
  id: string;
  name: string;
  type: ParserType;
  listUrl: string;
  detailUrlTemplate: string;
  idPattern: RegExp;
  selectors: SiteSelectorConfig;
  paginationParam?: string;
};

export type ParsedArticle = {
  originId: string;
  source: string;
  title: string;
  body: string;
  imageUrls: string[];
  attachmentUrls: string[];
  date: string;
  originalLink: string;
};

export type SiteParserContext = {
  site: SiteConfig;
  listHtml: string;
  fetchHtml: (url: string) => Promise<string>;
  limit: number;
  delayMs: number;
};

export type SiteParser = (ctx: SiteParserContext) => Promise<ParsedArticle[]>;

export type CrawlOptions = {
  siteIds?: string[];
  limitPerSite?: number;
  delayMs?: number;
  siteConcurrency?: number;
  maxPages?: number;
  dateRange?: { from: string; to: string };
};

export type CrawlSiteResult = {
  siteId: string;
  siteName: string;
  found: number;
  inserted: number;
  failed: number;
  status: "success" | "failed" | "partial";
  errorMessage?: string;
};

export type CrawlRunResult = {
  totalSites: number;
  totalFound: number;
  totalInserted: number;
  totalFailed: number;
  results: CrawlSiteResult[];
};

export type CrawlerDependencies = {
  supabase: SupabaseClient;
  fetchHtml: (url: string) => Promise<string>;
};

export type RowTransformContext = {
  $: CheerioAPI;
  row: unknown;
};
