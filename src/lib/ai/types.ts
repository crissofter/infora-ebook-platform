export type ChapterKind = "INTRO" | "CHAPTER" | "BONUS" | "CONCLUSION" | "CTA";

export type BlueprintChapter = {
  title: string;
  kind: ChapterKind;
  summary: string;
  content: string;
};

export type Blueprint = {
  title: string;
  subtitle: string;
  promise: string;
  concept: string;
  audience: string;
  chapters: BlueprintChapter[];
  bonuses: string[];
  cta: string;
};

export type SalesPageDraft = {
  headline: string;
  subheadline: string;
  problem: string;
  solution: string;
  benefits: string[];
  contents: string[];
  differentials: string[];
  bonuses: string[];
  faq: { q: string; a: string }[];
  guarantee: string;
  ctaLabel: string;
};

export type MarketingItem = {
  channel: "INSTAGRAM" | "FACEBOOK" | "EMAIL" | "ADS";
  format: "POST" | "STORY" | "REEL" | "EMAIL" | "AD";
  title: string;
  body: string;
  cta: string;
};

export type MarketingPack = { items: MarketingItem[] };

export type AIOperation =
  | "product_blueprint"
  | "chapter_rewrite"
  | "chapter_expand"
  | "sales_page"
  | "marketing_pack"
  | "analytics_insights";

export const CREDIT_COST: Record<AIOperation, number> = {
  product_blueprint: 450,
  chapter_rewrite: 120,
  chapter_expand: 180,
  sales_page: 300,
  marketing_pack: 350,
  analytics_insights: 80,
};
