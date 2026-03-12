import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
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

export const profileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["owner", "buyer", "assistant"]).default("owner"),
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
