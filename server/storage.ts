import {
  affiliateProfiles,
  type AffiliateProfile,
  commissionLedger,
  type InsertUser,
  payoutRequests,
  payoutMethodEnum,
  type PayoutRequest,
  payoutStatusEnum,
  referrals,
  type User,
  users,
} from "@shared/schema";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: string,
    data: Partial<
      Pick<
        User,
        "businessName" | "name" | "role" | "avatarUrl" | "subscriptionPlan"
      >
    >,
  ): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getOrCreateAffiliateProfile(userId: string): Promise<AffiliateProfile>;
  findUserByReferralCode(code: string): Promise<User | undefined>;
  applyReferralCodeToUser(
    referredUserId: string,
    code: string,
  ): Promise<{ applied: boolean; reason?: string }>;
  getAffiliateStats(userId: string): Promise<{
    totalReferrals: number;
    activePaidReferrals: number;
    pendingCents: number;
    availableCents: number;
    requestedCents: number;
    paidCents: number;
  }>;
  listAffiliateReferrals(userId: string): Promise<
    Array<{
      referredUserId: string;
      codeUsed: string;
      createdAt: string;
      referredName: string;
      referredEmail: string;
      referredSubscriptionPlan: string;
    }>
  >;
  listAffiliatePayoutRequests(userId: string): Promise<PayoutRequest[]>;
  createAffiliatePayoutRequest(input: {
    referrerUserId: string;
    amountCents: number;
    method: (typeof payoutMethodEnum)[number];
    destination: string;
  }): Promise<PayoutRequest>;
  rollPendingCommissionsToAvailable(): Promise<void>;
  createCommissionFromRevenueCatEvent(input: {
    referredUserId: string;
    revenuecatEventId?: string | null;
    eventType: string;
    currency?: string;
    netRevenueCents: number;
    note?: string;
  }): Promise<void>;
  getAdminOverview(): Promise<{
    totalReferredSignups: number;
    activePaidReferrals: number;
    pendingCents: number;
    availableCents: number;
    requestedCents: number;
    paidThisMonthCents: number;
  }>;
  listAdminReferrals(): Promise<
    Array<{
      id: string;
      createdAt: string;
      codeUsed: string;
      referrerUserId: string;
      referrerName: string;
      referrerEmail: string;
      referredUserId: string;
      referredName: string;
      referredEmail: string;
      referredSubscriptionPlan: string;
    }>
  >;
  listAdminPayoutRequests(status?: (typeof payoutStatusEnum)[number]): Promise<
    Array<
      PayoutRequest & {
        referrerName: string;
        referrerEmail: string;
      }
    >
  >;
  approvePayoutRequest(id: string, adminUserId: string): Promise<PayoutRequest | undefined>;
  rejectPayoutRequest(
    id: string,
    adminUserId: string,
    note?: string,
  ): Promise<PayoutRequest | undefined>;
  markPayoutRequestPaid(input: {
    id: string;
    adminUserId: string;
    provider: (typeof payoutMethodEnum)[number];
    externalTransferId: string;
    note?: string;
  }): Promise<PayoutRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  private readonly bootstrapPromise: Promise<void>;

  constructor() {
    this.bootstrapPromise = this.bootstrapAffiliateTables();
  }

  private async ready(): Promise<void> {
    await this.bootstrapPromise;
  }

  private async bootstrapAffiliateTables(): Promise<void> {
    // Keep tables available in existing environments even before drizzle db:push runs.
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS affiliate_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        referral_code TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        code_used TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS commission_ledger (
        id TEXT PRIMARY KEY,
        revenuecat_event_id TEXT UNIQUE,
        referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        net_revenue_cents INTEGER NOT NULL,
        commission_cents INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        available_at TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id TEXT PRIMARY KEY,
        referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL,
        method TEXT NOT NULL,
        destination TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested',
        requested_at TEXT NOT NULL DEFAULT (datetime('now')),
        reviewed_at TEXT,
        paid_at TEXT,
        reviewed_by_admin_user_id TEXT,
        external_transfer_id TEXT,
        note TEXT
      )
    `);
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 20; i += 1) {
      const code = `DH${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const existing = await db
        .select({ userId: users.id })
        .from(users)
        .innerJoin(affiliateProfiles, eq(affiliateProfiles.userId, users.id))
        .where(eq(affiliateProfiles.referralCode, code));
      if (existing.length === 0) return code;
    }
    throw new Error("Unable to generate unique referral code");
  }

  private getAvailableDateString(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  }

  private isBusinessDay(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  async getUserById(id: string): Promise<User | undefined> {
    await this.ready();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ready();
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.ready();
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(
    id: string,
    data: Partial<
      Pick<
        User,
        "businessName" | "name" | "role" | "avatarUrl" | "subscriptionPlan"
      >
    >,
  ): Promise<User | undefined> {
    await this.ready();
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await this.ready();
    await db.delete(users).where(eq(users.id, id));
  }

  async getOrCreateAffiliateProfile(userId: string): Promise<AffiliateProfile> {
    await this.ready();
    const existing = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId));
    if (existing[0]) return existing[0];

    const referralCode = await this.generateUniqueReferralCode();
    const created = await db
      .insert(affiliateProfiles)
      .values({
        userId,
        referralCode,
      })
      .returning();

    return created[0];
  }

  async findUserByReferralCode(code: string): Promise<User | undefined> {
    await this.ready();
    const normalized = this.normalizeCode(code);
    const rows = await db
      .select({ user: users })
      .from(affiliateProfiles)
      .innerJoin(users, eq(users.id, affiliateProfiles.userId))
      .where(
        and(
          eq(affiliateProfiles.referralCode, normalized),
          eq(affiliateProfiles.isActive, true),
        ),
      );
    return rows[0]?.user;
  }

  async applyReferralCodeToUser(
    referredUserId: string,
    code: string,
  ): Promise<{ applied: boolean; reason?: string }> {
    await this.ready();
    const normalized = this.normalizeCode(code);
    const existingReferral = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, referredUserId));
    if (existingReferral[0]) {
      return { applied: false, reason: "already_attributed" };
    }

    const profile = await db
      .select()
      .from(affiliateProfiles)
      .where(
        and(
          eq(affiliateProfiles.referralCode, normalized),
          eq(affiliateProfiles.isActive, true),
        ),
      );

    const referrer = profile[0];
    if (!referrer) return { applied: false, reason: "invalid_code" };
    if (referrer.userId === referredUserId) {
      return { applied: false, reason: "self_referral" };
    }

    await db.insert(referrals).values({
      id: randomUUID(),
      referrerUserId: referrer.userId,
      referredUserId,
      codeUsed: normalized,
    });

    return { applied: true };
  }

  async rollPendingCommissionsToAvailable(): Promise<void> {
    await this.ready();
    await db
      .update(commissionLedger)
      .set({
        status: "available",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(commissionLedger.status, "pending"),
          lte(commissionLedger.availableAt, new Date().toISOString()),
        ),
      );
  }

  async createCommissionFromRevenueCatEvent(input: {
    referredUserId: string;
    revenuecatEventId?: string | null;
    eventType: string;
    currency?: string;
    netRevenueCents: number;
    note?: string;
  }): Promise<void> {
    await this.ready();
    const referral = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, input.referredUserId));
    const link = referral[0];
    if (!link) return;

    const isPurchaseEvent =
      input.eventType === "INITIAL_PURCHASE" || input.eventType === "RENEWAL";
    const isRefundEvent = input.eventType === "REFUND";
    if (!isPurchaseEvent && !isRefundEvent) return;

    if (input.revenuecatEventId) {
      const existing = await db
        .select()
        .from(commissionLedger)
        .where(eq(commissionLedger.revenuecatEventId, input.revenuecatEventId));
      if (existing[0]) return;
    }

    const commissionBase = Math.max(0, input.netRevenueCents);
    const commissionCents = Math.floor(commissionBase * 0.25);
    if (commissionCents <= 0 && isPurchaseEvent) return;

    const amount = isRefundEvent ? -Math.abs(commissionCents) : commissionCents;
    const status = isRefundEvent ? "reversed" : "pending";
    const availableAt = isRefundEvent
      ? new Date().toISOString()
      : this.getAvailableDateString(30);

    await db.insert(commissionLedger).values({
      id: randomUUID(),
      revenuecatEventId: input.revenuecatEventId ?? null,
      referrerUserId: link.referrerUserId,
      referredUserId: input.referredUserId,
      eventType: input.eventType,
      currency: input.currency || "USD",
      netRevenueCents: input.netRevenueCents,
      commissionCents: amount,
      status,
      availableAt,
      note: input.note,
    });
  }

  async getAffiliateStats(userId: string): Promise<{
    totalReferrals: number;
    activePaidReferrals: number;
    pendingCents: number;
    availableCents: number;
    requestedCents: number;
    paidCents: number;
  }> {
    await this.ready();
    await this.rollPendingCommissionsToAvailable();

    const referralRows = await db
      .select({
        referredUserId: referrals.referredUserId,
        subscriptionPlan: users.subscriptionPlan,
      })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.referredUserId))
      .where(eq(referrals.referrerUserId, userId));

    const ledgerRows = await db
      .select({
        status: commissionLedger.status,
        commissionCents: commissionLedger.commissionCents,
      })
      .from(commissionLedger)
      .where(eq(commissionLedger.referrerUserId, userId));

    let pendingCents = 0;
    let availableCents = 0;
    let requestedCents = 0;
    let paidCents = 0;
    for (const row of ledgerRows) {
      if (row.status === "pending") pendingCents += row.commissionCents;
      if (row.status === "available") availableCents += row.commissionCents;
      if (row.status === "requested" || row.status === "approved") {
        requestedCents += row.commissionCents;
      }
      if (row.status === "paid") paidCents += row.commissionCents;
    }

    const activePaidReferrals = referralRows.filter(
      (r) => r.subscriptionPlan !== "free",
    ).length;

    return {
      totalReferrals: referralRows.length,
      activePaidReferrals,
      pendingCents,
      availableCents,
      requestedCents,
      paidCents,
    };
  }

  async listAffiliateReferrals(userId: string): Promise<
    Array<{
      referredUserId: string;
      codeUsed: string;
      createdAt: string;
      referredName: string;
      referredEmail: string;
      referredSubscriptionPlan: string;
    }>
  > {
    await this.ready();
    const rows = await db
      .select({
        referredUserId: referrals.referredUserId,
        codeUsed: referrals.codeUsed,
        createdAt: referrals.createdAt,
        referredName: users.name,
        referredEmail: users.email,
        referredSubscriptionPlan: users.subscriptionPlan,
      })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.referredUserId))
      .where(eq(referrals.referrerUserId, userId))
      .orderBy(desc(referrals.createdAt));

    return rows.map((r) => ({
      ...r,
      referredSubscriptionPlan: r.referredSubscriptionPlan ?? "free",
    }));
  }

  async listAffiliatePayoutRequests(userId: string): Promise<PayoutRequest[]> {
    await this.ready();
    return db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.referrerUserId, userId))
      .orderBy(desc(payoutRequests.requestedAt));
  }

  async createAffiliatePayoutRequest(input: {
    referrerUserId: string;
    amountCents: number;
    method: (typeof payoutMethodEnum)[number];
    destination: string;
  }): Promise<PayoutRequest> {
    await this.ready();
    await this.rollPendingCommissionsToAvailable();

    const minPayoutCents = parseInt(process.env.MIN_PAYOUT_CENTS || "5000", 10);
    if (input.amountCents < minPayoutCents) {
      throw new Error(
        `Minimum payout request is $${(minPayoutCents / 100).toFixed(2)}`,
      );
    }

    const availableRows = await db
      .select()
      .from(commissionLedger)
      .where(
        and(
          eq(commissionLedger.referrerUserId, input.referrerUserId),
          eq(commissionLedger.status, "available"),
        ),
      )
      .orderBy(asc(commissionLedger.createdAt));

    const availableTotal = availableRows.reduce(
      (sum, row) => sum + row.commissionCents,
      0,
    );
    if (availableTotal < input.amountCents) {
      throw new Error("Insufficient available balance");
    }

    let remaining = input.amountCents;
    for (const row of availableRows) {
      if (remaining <= 0) break;
      await db
        .update(commissionLedger)
        .set({
          status: "requested",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(commissionLedger.id, row.id));
      remaining -= row.commissionCents;
    }

    const created = await db
      .insert(payoutRequests)
      .values({
        id: randomUUID(),
        referrerUserId: input.referrerUserId,
        amountCents: input.amountCents,
        method: input.method,
        destination: input.destination.trim(),
      })
      .returning();

    return created[0];
  }

  async getAdminOverview(): Promise<{
    totalReferredSignups: number;
    activePaidReferrals: number;
    pendingCents: number;
    availableCents: number;
    requestedCents: number;
    paidThisMonthCents: number;
  }> {
    await this.ready();
    await this.rollPendingCommissionsToAvailable();

    const referredCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals);
    const activePaidRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.referredUserId))
      .where(sql`${users.subscriptionPlan} != 'free'`);
    const ledgerRows = await db
      .select({
        status: commissionLedger.status,
        commissionCents: commissionLedger.commissionCents,
      })
      .from(commissionLedger);

    let pendingCents = 0;
    let availableCents = 0;
    let requestedCents = 0;
    for (const row of ledgerRows) {
      if (row.status === "pending") pendingCents += row.commissionCents;
      if (row.status === "available") availableCents += row.commissionCents;
      if (row.status === "requested" || row.status === "approved") {
        requestedCents += row.commissionCents;
      }
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const paidRows = await db
      .select({
        paidAt: payoutRequests.paidAt,
        amountCents: payoutRequests.amountCents,
      })
      .from(payoutRequests)
      .where(eq(payoutRequests.status, "paid"));

    const paidThisMonthCents = paidRows.reduce((sum, row) => {
      if (!row.paidAt) return sum;
      return new Date(row.paidAt) >= monthStart ? sum + row.amountCents : sum;
    }, 0);

    return {
      totalReferredSignups: referredCountRows[0]?.count ?? 0,
      activePaidReferrals: activePaidRows[0]?.count ?? 0,
      pendingCents,
      availableCents,
      requestedCents,
      paidThisMonthCents,
    };
  }

  async listAdminReferrals(): Promise<
    Array<{
      id: string;
      createdAt: string;
      codeUsed: string;
      referrerUserId: string;
      referrerName: string;
      referrerEmail: string;
      referredUserId: string;
      referredName: string;
      referredEmail: string;
      referredSubscriptionPlan: string;
    }>
  > {
    await this.ready();
    const rows = await db
      .select({
        id: referrals.id,
        createdAt: referrals.createdAt,
        codeUsed: referrals.codeUsed,
        referrerUserId: referrals.referrerUserId,
        referredUserId: referrals.referredUserId,
        referrerName: sql<string>`(select name from users u where u.id = ${referrals.referrerUserId})`,
        referrerEmail: sql<string>`(select email from users u where u.id = ${referrals.referrerUserId})`,
        referredName: sql<string>`(select name from users u where u.id = ${referrals.referredUserId})`,
        referredEmail: sql<string>`(select email from users u where u.id = ${referrals.referredUserId})`,
        referredSubscriptionPlan: sql<string>`(select subscription_plan from users u where u.id = ${referrals.referredUserId})`,
      })
      .from(referrals)
      .orderBy(desc(referrals.createdAt));

    return rows.map((row) => ({
      ...row,
      referredSubscriptionPlan: row.referredSubscriptionPlan ?? "free",
    }));
  }

  async listAdminPayoutRequests(
    status?: (typeof payoutStatusEnum)[number],
  ): Promise<
    Array<
      PayoutRequest & {
        referrerName: string;
        referrerEmail: string;
      }
    >
  > {
    await this.ready();
    const rows = await db
      .select({
        id: payoutRequests.id,
        referrerUserId: payoutRequests.referrerUserId,
        amountCents: payoutRequests.amountCents,
        method: payoutRequests.method,
        destination: payoutRequests.destination,
        status: payoutRequests.status,
        requestedAt: payoutRequests.requestedAt,
        reviewedAt: payoutRequests.reviewedAt,
        paidAt: payoutRequests.paidAt,
        reviewedByAdminUserId: payoutRequests.reviewedByAdminUserId,
        externalTransferId: payoutRequests.externalTransferId,
        note: payoutRequests.note,
        referrerName: sql<string>`(select name from users u where u.id = ${payoutRequests.referrerUserId})`,
        referrerEmail: sql<string>`(select email from users u where u.id = ${payoutRequests.referrerUserId})`,
      })
      .from(payoutRequests)
      .where(status ? eq(payoutRequests.status, status) : sql`1 = 1`)
      .orderBy(desc(payoutRequests.requestedAt));

    return rows;
  }

  async approvePayoutRequest(
    id: string,
    adminUserId: string,
  ): Promise<PayoutRequest | undefined> {
    await this.ready();
    const existing = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, id));
    const request = existing[0];
    if (!request || request.status !== "requested") return undefined;

    let remaining = request.amountCents;
    const requestedRows = await db
      .select()
      .from(commissionLedger)
      .where(
        and(
          eq(commissionLedger.referrerUserId, request.referrerUserId),
          eq(commissionLedger.status, "requested"),
        ),
      )
      .orderBy(asc(commissionLedger.createdAt));
    for (const row of requestedRows) {
      if (remaining <= 0) break;
      await db
        .update(commissionLedger)
        .set({
          status: "approved",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(commissionLedger.id, row.id));
      remaining -= row.commissionCents;
    }

    const updated = await db
      .update(payoutRequests)
      .set({
        status: "approved",
        reviewedAt: new Date().toISOString(),
        reviewedByAdminUserId: adminUserId,
      })
      .where(eq(payoutRequests.id, id))
      .returning();

    return updated[0];
  }

  async rejectPayoutRequest(
    id: string,
    adminUserId: string,
    note?: string,
  ): Promise<PayoutRequest | undefined> {
    await this.ready();
    const existing = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, id));
    const request = existing[0];
    if (!request || (request.status !== "requested" && request.status !== "approved")) {
      return undefined;
    }

    let remaining = request.amountCents;
    const requestedRows = await db
      .select()
      .from(commissionLedger)
      .where(
        and(
          eq(commissionLedger.referrerUserId, request.referrerUserId),
          request.status === "approved"
            ? eq(commissionLedger.status, "approved")
            : eq(commissionLedger.status, "requested"),
        ),
      )
      .orderBy(desc(commissionLedger.createdAt));
    for (const row of requestedRows) {
      if (remaining <= 0) break;
      await db
        .update(commissionLedger)
        .set({
          status: "available",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(commissionLedger.id, row.id));
      remaining -= row.commissionCents;
    }

    const updated = await db
      .update(payoutRequests)
      .set({
        status: "rejected",
        reviewedAt: new Date().toISOString(),
        reviewedByAdminUserId: adminUserId,
        note: note?.trim() || "Rejected by admin",
      })
      .where(eq(payoutRequests.id, id))
      .returning();
    return updated[0];
  }

  async markPayoutRequestPaid(input: {
    id: string;
    adminUserId: string;
    provider: (typeof payoutMethodEnum)[number];
    externalTransferId: string;
    note?: string;
  }): Promise<PayoutRequest | undefined> {
    await this.ready();
    const now = new Date();
    if (!this.isBusinessDay(now)) {
      throw new Error("Payouts can only be marked paid on business days");
    }

    const existing = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, input.id));
    const request = existing[0];
    if (!request) return undefined;
    if (request.status !== "approved" && request.status !== "requested") {
      throw new Error("Only requested or approved payouts can be marked paid");
    }

    let remaining = request.amountCents;
    const rows = await db
      .select()
      .from(commissionLedger)
      .where(
        and(
          eq(commissionLedger.referrerUserId, request.referrerUserId),
          request.status === "approved"
            ? eq(commissionLedger.status, "approved")
            : eq(commissionLedger.status, "requested"),
        ),
      )
      .orderBy(asc(commissionLedger.createdAt));

    for (const row of rows) {
      if (remaining <= 0) break;
      await db
        .update(commissionLedger)
        .set({
          status: "paid",
          updatedAt: now.toISOString(),
          note: `${input.provider}:${input.externalTransferId}`,
        })
        .where(eq(commissionLedger.id, row.id));
      remaining -= row.commissionCents;
    }

    const updated = await db
      .update(payoutRequests)
      .set({
        status: "paid",
        paidAt: now.toISOString(),
        reviewedAt: now.toISOString(),
        reviewedByAdminUserId: input.adminUserId,
        externalTransferId: input.externalTransferId.trim(),
        note: input.note?.trim() || `Paid via ${input.provider}`,
      })
      .where(eq(payoutRequests.id, input.id))
      .returning();
    return updated[0];
  }
}

export const storage = new DatabaseStorage();
