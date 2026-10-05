/**
 * INFORA — Relational data model (PostgreSQL / Drizzle ORM)
 *
 * Design notes
 * - Multi-tenant by `organization_id`. Every tenant-scoped table carries it so
 *   queries can always be filtered by the caller's organization.
 * - Marketplace / affiliates tables are intentionally *prepared* (creators,
 *   commissions) but not exposed in the MVP UI.
 * - No card data is ever stored: payments only keep provider references.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const now = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const upd = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/* ------------------------------------------------------------------ IDENTITY */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("USER"), // USER | ADMIN | SUPER_ADMIN
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    creatorType: text("creator_type"),
    goal: text("goal"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: uuid("owner_id").notNull(),
    planCode: text("plan_code").notNull().default("FREE"),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [uniqueIndex("orgs_slug_uq").on(t.slug)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id").notNull(),
    role: text("role").notNull().default("OWNER"), // OWNER | ADMIN | MEMBER
    createdAt: now(),
  },
  (t) => [uniqueIndex("memberships_uq").on(t.userId, t.organizationId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: now(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: now(),
});

/* ------------------------------------------------------------------ WORKSPACE */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    createdBy: uuid("created_by").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    audience: text("audience"),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [index("projects_org_idx").on(t.organizationId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    createdBy: uuid("created_by").notNull(),
    type: text("type").notNull().default("EBOOK"), // EBOOK | GUIDE | PLANNER | TEMPLATE | COURSE | BUNDLE
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    slug: text("slug").notNull(),
    idea: text("idea"),
    audience: text("audience"),
    objective: text("objective"),
    problem: text("problem"),
    promise: text("promise"),
    concept: text("concept"),
    designStyle: text("design_style").notNull().default("PREMIUM"),
    coverPalette: text("cover_palette").notNull().default("MIDNIGHT"),
    status: text("status").notNull().default("DRAFT"), // DRAFT | IN_PRODUCTION | READY | PUBLISHED | ARCHIVED
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("BRL"),
    isDemo: boolean("is_demo").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_org_idx").on(t.organizationId),
    index("products_project_idx").on(t.projectId),
  ],
);

export const productVersions = pgTable(
  "product_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    productId: uuid("product_id").notNull(),
    version: integer("version").notNull().default(1),
    label: text("label"),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: uuid("created_by"),
    createdAt: now(),
  },
  (t) => [index("pv_product_idx").on(t.productId)],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    productId: uuid("product_id").notNull(),
    position: integer("position").notNull().default(0),
    title: text("title").notNull(),
    summary: text("summary"),
    content: text("content").notNull().default(""),
    kind: text("kind").notNull().default("CHAPTER"), // CHAPTER | INTRO | BONUS | CONCLUSION | CTA
    status: text("status").notNull().default("DRAFT"), // DRAFT | GENERATED | REVIEWED
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [index("chapters_product_idx").on(t.productId, t.position)],
);

export const chapterBlocks = pgTable(
  "chapter_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    chapterId: uuid("chapter_id").notNull(),
    position: integer("position").notNull().default(0),
    type: text("type").notNull().default("TEXT"),
    content: text("content"),
    assetId: uuid("asset_id"),
    metadata: jsonb("metadata"),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [
    index("chapter_blocks_org_idx").on(t.organizationId),
    index("chapter_blocks_chapter_idx").on(t.chapterId, t.position),
  ],
);

export const salesPages = pgTable(
  "sales_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    productId: uuid("product_id").notNull(),
    headline: text("headline").notNull(),
    subheadline: text("subheadline"),
    problem: text("problem"),
    solution: text("solution"),
    benefits: jsonb("benefits").$type<string[]>().notNull().default([]),
    contents: jsonb("contents").$type<string[]>().notNull().default([]),
    differentials: jsonb("differentials").$type<string[]>().notNull().default([]),
    bonuses: jsonb("bonuses").$type<string[]>().notNull().default([]),
    faq: jsonb("faq").$type<{ q: string; a: string }[]>().notNull().default([]),
    guarantee: text("guarantee"),
    ctaLabel: text("cta_label").notNull().default("Quero agora"),
    published: boolean("published").notNull().default(false),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [uniqueIndex("sales_pages_product_uq").on(t.productId)],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    productId: uuid("product_id"),
    kind: text("kind").notNull(), // COVER | EXPORT | PROMO | UPLOAD
    format: text("format").notNull().default("svg"),
    name: text("name").notNull(),
    storageDriver: text("storage_driver").notNull().default("db"),
    payload: text("payload"), // inline payload (svg/markup) for db driver
    url: text("url"),
    sizeBytes: integer("size_bytes"),
    createdAt: now(),
  },
  (t) => [index("assets_org_idx").on(t.organizationId), index("assets_product_idx").on(t.productId)],
);

/* ------------------------------------------------------------------ AI LAYER */

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    productId: uuid("product_id"),
    operation: text("operation").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull().default("QUEUED"), // QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED
    input: jsonb("input"),
    output: jsonb("output"),
    error: text("error"),
    latencyMs: integer("latency_ms"),
    createdAt: now(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("ai_gen_org_idx").on(t.organizationId), index("ai_gen_product_idx").on(t.productId)],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    generationId: uuid("generation_id"),
    operation: text("operation").notNull(),
    model: text("model").notNull(),
    credits: integer("credits").notNull().default(0),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }),
    periodKey: text("period_key").notNull(), // YYYY-MM
    createdAt: now(),
  },
  (t) => [index("ai_usage_org_period_idx").on(t.organizationId, t.periodKey)],
);

/* ------------------------------------------------------------------ MARKETING */

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    productId: uuid("product_id"),
    name: text("name").notNull(),
    objective: text("objective"),
    status: text("status").notNull().default("DRAFT"),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [index("campaigns_org_idx").on(t.organizationId)],
);

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    campaignId: uuid("campaign_id"),
    productId: uuid("product_id"),
    channel: text("channel").notNull(), // INSTAGRAM | FACEBOOK | EMAIL | ADS
    format: text("format").notNull(), // POST | STORY | REEL | EMAIL | AD
    title: text("title").notNull(),
    body: text("body").notNull(),
    cta: text("cta"),
    status: text("status").notNull().default("DRAFT"), // DRAFT | AWAITING_APPROVAL | SCHEDULED | PUBLISHED | FAILED
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [index("content_org_idx").on(t.organizationId), index("content_sched_idx").on(t.scheduledFor)],
);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    provider: text("provider").notNull(), // INSTAGRAM | FACEBOOK
    externalId: text("external_id"),
    displayName: text("display_name"),
    status: text("status").notNull().default("NOT_CONFIGURED"), // NOT_CONFIGURED | CONNECTED | ERROR
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    createdAt: now(),
  },
  (t) => [uniqueIndex("social_accounts_uq").on(t.organizationId, t.provider)],
);

export const socialPublications = pgTable("social_publications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  contentItemId: uuid("content_item_id").notNull(),
  socialAccountId: uuid("social_account_id"),
  status: text("status").notNull().default("QUEUED"),
  message: text("message"),
  createdAt: now(),
});

/* ------------------------------------------------------------------ COMMERCE */

export const plans = pgTable(
  "plans",
  {
    code: text("code").primaryKey(), // FREE | STARTER | CREATOR | PRO | BUSINESS
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("BRL"),
    monthlyCredits: integer("monthly_credits").notNull().default(0),
    maxProducts: integer("max_products").notNull().default(1),
    maxProjects: integer("max_projects").notNull().default(1),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
  },
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    planCode: text("plan_code").notNull(),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | PAST_DUE | CANCELLED
    provider: text("provider").notNull().default("none"),
    providerRef: text("provider_ref"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: now(),
    updatedAt: upd(),
  },
  (t) => [index("subs_org_idx").on(t.organizationId)],
);

export const usageLimits = pgTable(
  "usage_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    periodKey: text("period_key").notNull(),
    creditsIncluded: integer("credits_included").notNull().default(0),
    creditsUsed: integer("credits_used").notNull().default(0),
    updatedAt: upd(),
  },
  (t) => [uniqueIndex("usage_limits_uq").on(t.organizationId, t.periodKey)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    source: text("source"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: now(),
  },
  (t) => [index("customers_org_idx").on(t.organizationId)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    customerId: uuid("customer_id"),
    productId: uuid("product_id"),
    status: text("status").notNull().default("PENDING"), // PENDING | PAID | REFUNDED | CANCELLED
    totalCents: integer("total_cents").notNull().default(0),
    currency: text("currency").notNull().default("BRL"),
    couponCode: text("coupon_code"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: now(),
  },
  (t) => [index("orders_org_idx").on(t.organizationId)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  orderId: uuid("order_id").notNull(),
  provider: text("provider").notNull().default("none"),
  providerRef: text("provider_ref"),
  status: text("status").notNull().default("PENDING"),
  amountCents: integer("amount_cents").notNull().default(0),
  createdAt: now(),
});

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    code: text("code").notNull(),
    percentOff: integer("percent_off").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: now(),
  },
  (t) => [uniqueIndex("coupons_uq").on(t.organizationId, t.code)],
);

/* --------------------------------------------- MARKETPLACE / AFFILIATES (prep) */

export const creators = pgTable("creators", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  status: text("status").notNull().default("PENDING"),
  createdAt: now(),
});

export const affiliates = pgTable("affiliates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  userId: uuid("user_id"),
  referralCode: text("referral_code").notNull(),
  commissionPercent: integer("commission_percent").notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  createdAt: now(),
});

export const commissions = pgTable("commissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull(),
  orderId: uuid("order_id").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  createdAt: now(),
});

/* ------------------------------------------------------------------ PLATFORM */

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id"),
    userId: uuid("user_id"),
    productId: uuid("product_id"),
    campaignId: uuid("campaign_id"),
    type: text("type").notNull(),
    source: text("source"),
    metadata: jsonb("metadata"),
    valueCents: integer("value_cents").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: now(),
  },
  (t) => [
    index("events_org_type_idx").on(t.organizationId, t.type),
    index("events_created_idx").on(t.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id"),
    title: text("title").notNull(),
    body: text("body"),
    level: text("level").notNull().default("INFO"), // INFO | SUCCESS | WARNING | ERROR
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: now(),
  },
  (t) => [index("notif_org_idx").on(t.organizationId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id"),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    ip: text("ip"),
    metadata: jsonb("metadata"),
    createdAt: now(),
  },
  (t) => [index("audit_org_idx").on(t.organizationId)],
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: text("level").notNull().default("info"), // info | warn | error
    scope: text("scope").notNull(),
    message: text("message").notNull(),
    organizationId: uuid("organization_id"),
    userId: uuid("user_id"),
    metadata: jsonb("metadata"),
    createdAt: now(),
  },
  (t) => [index("syslogs_level_idx").on(t.level)],
);

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("QUEUED"), // QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED
  progress: integer("progress").notNull().default(0),
  refId: uuid("ref_id"),
  message: text("message"),
  createdAt: now(),
  updatedAt: upd(),
});

export const organizationCounters = pgTable(
  "organization_counters",
  {
    organizationId: uuid("organization_id").notNull(),
    key: text("key").notNull(),
    value: integer("value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.key] })],
);
