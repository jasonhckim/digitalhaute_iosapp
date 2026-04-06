import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const subscriptionPlanEnum = ["free", "starter", "growth", "vip"] as const;
export type SubscriptionPlan = (typeof subscriptionPlanEnum)[number];

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  businessName: text("business_name").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["owner", "buyer", "assistant"] })
    .notNull()
    .default("owner"),
  avatarUrl: text("avatar_url"),
  subscriptionPlan: text("subscription_plan", {
    enum: ["free", "starter", "growth", "vip"],
  })
    .notNull()
    .default("free"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const affiliateProfiles = pgTable("affiliate_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const referrals = pgTable("referrals", {
  id: text("id").primaryKey(),
  referrerUserId: text("referrer_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  codeUsed: text("code_used").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const commissionStatusEnum = [
  "pending",
  "available",
  "requested",
  "approved",
  "paid",
  "reversed",
] as const;

export const commissionLedger = pgTable("commission_ledger", {
  id: text("id").primaryKey(),
  revenuecatEventId: text("revenuecat_event_id").unique(),
  referrerUserId: text("referrer_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  currency: text("currency").notNull().default("USD"),
  netRevenueCents: integer("net_revenue_cents").notNull(),
  commissionCents: integer("commission_cents").notNull(),
  status: text("status", { enum: commissionStatusEnum })
    .notNull()
    .default("pending"),
  availableAt: text("available_at").notNull(),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const payoutStatusEnum = [
  "requested",
  "approved",
  "rejected",
  "paid",
] as const;

export const payoutMethodEnum = ["paypal", "stripe", "other"] as const;

export const payoutRequests = pgTable("payout_requests", {
  id: text("id").primaryKey(),
  referrerUserId: text("referrer_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  method: text("method", { enum: payoutMethodEnum }).notNull(),
  destination: text("destination").notNull(),
  status: text("status", { enum: payoutStatusEnum })
    .notNull()
    .default("requested"),
  requestedAt: text("requested_at")
    .notNull()
    .default(sql`now()`),
  reviewedAt: text("reviewed_at"),
  paidAt: text("paid_at"),
  reviewedByAdminUserId: text("reviewed_by_admin_user_id"),
  externalTransferId: text("external_transfer_id"),
  note: text("note"),
});

export const teamInvitationStatusEnum = [
  "pending",
  "accepted",
  "declined",
  "expired",
] as const;

export const teamRoleEnum = ["buyer", "assistant"] as const;

export const teamInvitations = pgTable("team_invitations", {
  id: text("id").primaryKey(),
  inviterUserId: text("inviter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: teamRoleEnum }).notNull().default("buyer"),
  status: text("status", { enum: teamInvitationStatusEnum })
    .notNull()
    .default("pending"),
  token: text("token").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  expiresAt: text("expires_at").notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberUserId: text("member_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: teamRoleEnum }).notNull().default("buyer"),
  joinedAt: text("joined_at")
    .notNull()
    .default(sql`now()`),
  removedAt: text("removed_at"),
});

// ── Phase 2: Product / Vendor / Budget / Event / Settings tables ──

export const productStatusEnum = [
  "maybe",
  "ordered",
  "shipped",
  "delivered",
  "received",
  "cancelled",
] as const;

export const scanStatusEnum = [
  "pending",
  "processing",
  "complete",
  "failed",
] as const;

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  styleNumber: text("style_number").notNull().default(""),
  vendorId: text("vendor_id").notNull().default(""),
  vendorName: text("vendor_name").notNull().default(""),
  category: text("category").notNull().default(""),
  subcategory: text("subcategory"),
  wholesalePrice: numeric("wholesale_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  retailPrice: numeric("retail_price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").notNull().default(0),
  packs: integer("packs"),
  packRatio: jsonb("pack_ratio"),
  colors: jsonb("colors").notNull().default(sql`'[]'::jsonb`),
  selectedColors: jsonb("selected_colors"),
  sizes: jsonb("sizes").notNull().default(sql`'[]'::jsonb`),
  deliveryDate: text("delivery_date").notNull().default(""),
  receivedDate: text("received_date"),
  season: text("season").notNull().default(""),
  collection: text("collection"),
  event: text("event"),
  notes: text("notes"),
  status: text("status", { enum: productStatusEnum })
    .notNull()
    .default("maybe"),
  scanStatus: text("scan_status", { enum: scanStatusEnum }),
  imageUri: text("image_uri"),
  modelImageUri: text("model_image_uri"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  paymentTerms: text("payment_terms"),
  packRatio: jsonb("pack_ratio"),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  season: text("season").notNull(),
  category: text("category"),
  vendorId: text("vendor_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  spent: numeric("spent", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  markupMultiplier: numeric("markup_multiplier", { precision: 6, scale: 3 })
    .notNull()
    .default("2.5"),
  roundingMode: text("rounding_mode", { enum: ["none", "up", "even"] })
    .notNull()
    .default("none"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const profileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["owner", "buyer", "assistant"]).default("owner"),
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type AffiliateProfile = typeof affiliateProfiles.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type CommissionLedgerEntry = typeof commissionLedger.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type DbProduct = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type DbVendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;
export type DbBudget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;
export type DbEvent = typeof events.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
