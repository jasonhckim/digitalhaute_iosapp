import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const subscriptionPlanEnum = ["free", "starter", "growth", "vip"] as const;
export type SubscriptionPlan = (typeof subscriptionPlanEnum)[number];

export const users = sqliteTable("users", {
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
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const affiliateProfiles = sqliteTable("affiliate_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const referrals = sqliteTable("referrals", {
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
    .default(sql`(datetime('now'))`),
});

export const commissionStatusEnum = [
  "pending",
  "available",
  "requested",
  "approved",
  "paid",
  "reversed",
] as const;

export const commissionLedger = sqliteTable("commission_ledger", {
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
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const payoutStatusEnum = [
  "requested",
  "approved",
  "rejected",
  "paid",
] as const;

export const payoutMethodEnum = ["paypal", "stripe", "other"] as const;

export const payoutRequests = sqliteTable("payout_requests", {
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
    .default(sql`(datetime('now'))`),
  reviewedAt: text("reviewed_at"),
  paidAt: text("paid_at"),
  reviewedByAdminUserId: text("reviewed_by_admin_user_id"),
  externalTransferId: text("external_transfer_id"),
  note: text("note"),
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
