import {
  affiliateProfiles,
  type AffiliateProfile,
  budgets,
  commissionLedger,
  events,
  type InsertUser,
  payoutRequests,
  payoutMethodEnum,
  type PayoutRequest,
  payoutStatusEnum,
  products,
  referrals,
  teamInvitations,
  type TeamInvitation,
  teamMembers,
  type TeamMember,
  teamRoleEnum,
  type User,
  users,
  userSettings,
  vendors,
} from "@shared/schema";
import { and, asc, desc, eq, isNull, lte, sql } from "drizzle-orm";
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

  createTeamInvitation(
    inviterUserId: string,
    email: string,
    role: (typeof teamRoleEnum)[number],
  ): Promise<TeamInvitation>;
  listTeamInvitations(
    ownerUserId: string,
  ): Promise<TeamInvitation[]>;
  cancelTeamInvitation(
    ownerUserId: string,
    invitationId: string,
  ): Promise<boolean>;
  acceptTeamInvitation(
    token: string,
    acceptingUserId: string,
  ): Promise<{ success: boolean; reason?: string }>;
  declineTeamInvitation(token: string): Promise<boolean>;
  listTeamMembers(
    ownerUserId: string,
  ): Promise<
    Array<
      TeamMember & {
        memberName: string;
        memberEmail: string;
      }
    >
  >;
  removeTeamMember(ownerUserId: string, memberId: string): Promise<boolean>;
  updateTeamMemberRole(
    ownerUserId: string,
    memberId: string,
    role: (typeof teamRoleEnum)[number],
  ): Promise<boolean>;
  getTeamMemberCount(ownerUserId: string): Promise<number>;
  getTeamForUser(
    userId: string,
  ): Promise<{ ownerUserId: string; role: string } | undefined>;
}

export class DatabaseStorage implements IStorage {
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

  // ── User CRUD ──────────────────────────────────────────────────

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
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
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // ── Affiliate ──────────────────────────────────────────────────

  async getOrCreateAffiliateProfile(userId: string): Promise<AffiliateProfile> {
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
      totalReferredSignups: Number(referredCountRows[0]?.count ?? 0),
      activePaidReferrals: Number(activePaidRows[0]?.count ?? 0),
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

  // ── Team Members ──────────────────────────────────────────────────

  private getMaxTeamMembers(plan: string | null | undefined): number {
    switch (plan) {
      case "vip":
        return 6;
      case "growth":
        return 4;
      default:
        return 1;
    }
  }

  async getTeamMemberCount(ownerUserId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.ownerUserId, ownerUserId),
          isNull(teamMembers.removedAt),
        ),
      );
    return Number(rows[0]?.count ?? 0);
  }

  async createTeamInvitation(
    inviterUserId: string,
    email: string,
    role: (typeof teamRoleEnum)[number],
  ): Promise<TeamInvitation> {
    const normalizedEmail = email.trim().toLowerCase();

    const owner = await this.getUserById(inviterUserId);
    if (!owner) throw new Error("User not found");

    const maxMembers = this.getMaxTeamMembers(owner.subscriptionPlan);
    const currentCount = await this.getTeamMemberCount(inviterUserId);
    const pendingInvites = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.inviterUserId, inviterUserId),
          eq(teamInvitations.status, "pending"),
        ),
      );
    const pendingCount = Number(pendingInvites[0]?.count ?? 0);

    if (currentCount + pendingCount + 1 >= maxMembers) {
      throw new Error(
        `Team limit reached. Your ${owner.subscriptionPlan} plan supports up to ${maxMembers} users (including yourself).`,
      );
    }

    const existingMember = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(
        and(
          eq(teamMembers.ownerUserId, inviterUserId),
          isNull(teamMembers.removedAt),
          eq(users.email, normalizedEmail),
        ),
      );
    if (existingMember.length > 0) {
      throw new Error("This person is already on your team.");
    }

    const existingInvite = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.inviterUserId, inviterUserId),
          eq(teamInvitations.email, normalizedEmail),
          eq(teamInvitations.status, "pending"),
        ),
      );
    if (existingInvite.length > 0) {
      throw new Error("An invitation has already been sent to this email.");
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const created = await db
      .insert(teamInvitations)
      .values({
        id: randomUUID(),
        inviterUserId,
        email: normalizedEmail,
        role,
        token,
        expiresAt: expiresAt.toISOString(),
      })
      .returning();

    return created[0];
  }

  async listTeamInvitations(ownerUserId: string): Promise<TeamInvitation[]> {
    return db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.inviterUserId, ownerUserId))
      .orderBy(desc(teamInvitations.createdAt));
  }

  async cancelTeamInvitation(
    ownerUserId: string,
    invitationId: string,
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, invitationId),
          eq(teamInvitations.inviterUserId, ownerUserId),
          eq(teamInvitations.status, "pending"),
        ),
      );
    if (!existing[0]) return false;

    await db
      .update(teamInvitations)
      .set({ status: "expired" })
      .where(eq(teamInvitations.id, invitationId));
    return true;
  }

  async acceptTeamInvitation(
    token: string,
    acceptingUserId: string,
  ): Promise<{ success: boolean; reason?: string }> {
    const rows = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token));
    const invitation = rows[0];

    if (!invitation) return { success: false, reason: "Invitation not found." };
    if (invitation.status !== "pending") {
      return { success: false, reason: "This invitation is no longer valid." };
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      await db
        .update(teamInvitations)
        .set({ status: "expired" })
        .where(eq(teamInvitations.id, invitation.id));
      return { success: false, reason: "This invitation has expired." };
    }

    if (invitation.inviterUserId === acceptingUserId) {
      return { success: false, reason: "You cannot accept your own invitation." };
    }

    const accepter = await this.getUserById(acceptingUserId);
    const accepterEmail = accepter?.email?.trim().toLowerCase() ?? "";
    if (!accepterEmail || accepterEmail !== invitation.email.trim().toLowerCase()) {
      return {
        success: false,
        reason:
          "Sign in with the email address this invitation was sent to, then open the link again.",
      };
    }

    const alreadyMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.ownerUserId, invitation.inviterUserId),
          eq(teamMembers.memberUserId, acceptingUserId),
          isNull(teamMembers.removedAt),
        ),
      );
    if (alreadyMember.length > 0) {
      await db
        .update(teamInvitations)
        .set({ status: "accepted" })
        .where(eq(teamInvitations.id, invitation.id));
      return { success: false, reason: "You are already on this team." };
    }

    const otherTeam = await this.getTeamForUser(acceptingUserId);
    if (otherTeam && otherTeam.ownerUserId !== invitation.inviterUserId) {
      return {
        success: false,
        reason:
          "You are already on another team. Ask that workspace owner to remove you before joining this one.",
      };
    }

    await db.insert(teamMembers).values({
      id: randomUUID(),
      ownerUserId: invitation.inviterUserId,
      memberUserId: acceptingUserId,
      role: invitation.role,
    });

    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(eq(teamInvitations.id, invitation.id));

    return { success: true };
  }

  async declineTeamInvitation(token: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.token, token),
          eq(teamInvitations.status, "pending"),
        ),
      );
    if (!rows[0]) return false;

    await db
      .update(teamInvitations)
      .set({ status: "declined" })
      .where(eq(teamInvitations.id, rows[0].id));
    return true;
  }

  async listTeamMembers(
    ownerUserId: string,
  ): Promise<
    Array<
      TeamMember & {
        memberName: string;
        memberEmail: string;
      }
    >
  > {
    const rows = await db
      .select({
        id: teamMembers.id,
        ownerUserId: teamMembers.ownerUserId,
        memberUserId: teamMembers.memberUserId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        removedAt: teamMembers.removedAt,
        memberName: users.name,
        memberEmail: users.email,
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.memberUserId))
      .where(
        and(
          eq(teamMembers.ownerUserId, ownerUserId),
          isNull(teamMembers.removedAt),
        ),
      )
      .orderBy(asc(teamMembers.joinedAt));

    return rows;
  }

  async removeTeamMember(ownerUserId: string, memberId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.ownerUserId, ownerUserId),
          isNull(teamMembers.removedAt),
        ),
      );
    if (!existing[0]) return false;

    await db
      .update(teamMembers)
      .set({ removedAt: new Date().toISOString() })
      .where(eq(teamMembers.id, memberId));
    return true;
  }

  async updateTeamMemberRole(
    ownerUserId: string,
    memberId: string,
    role: (typeof teamRoleEnum)[number],
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.ownerUserId, ownerUserId),
          isNull(teamMembers.removedAt),
        ),
      );
    if (!existing[0]) return false;

    await db
      .update(teamMembers)
      .set({ role })
      .where(eq(teamMembers.id, memberId));
    return true;
  }

  /** Active membership as a non-owner; at most one workspace should apply (enforced on invite accept). */
  async getTeamForUser(
    userId: string,
  ): Promise<{ ownerUserId: string; role: string } | undefined> {
    const rows = await db
      .select({
        ownerUserId: teamMembers.ownerUserId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.memberUserId, userId),
          isNull(teamMembers.removedAt),
        ),
      );
    return rows[0];
  }

  // ── Products ──────────────────────────────────────────────────

  async listProducts(userId: string) {
    return db
      .select()
      .from(products)
      .where(eq(products.userId, userId))
      .orderBy(desc(products.createdAt));
  }

  async getProductById(userId: string, id: string) {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)));
    return rows[0];
  }

  async createProduct(
    userId: string,
    data: Omit<typeof products.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">,
  ) {
    const now = new Date().toISOString();
    const result = await db
      .insert(products)
      .values({
        ...data,
        id: randomUUID(),
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async updateProduct(
    userId: string,
    id: string,
    data: Partial<Omit<typeof products.$inferInsert, "id" | "userId" | "createdAt">>,
  ) {
    const result = await db
      .update(products)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteProduct(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getProductsByVendor(userId: string, vendorId: string) {
    return db
      .select()
      .from(products)
      .where(and(eq(products.userId, userId), eq(products.vendorId, vendorId)))
      .orderBy(desc(products.createdAt));
  }

  async bulkCreateProducts(
    userId: string,
    items: Array<Omit<typeof products.$inferInsert, "userId" | "createdAt" | "updatedAt">>,
  ) {
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    const values = items.map((item) => ({
      ...item,
      id: item.id || randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    }));
    return db.insert(products).values(values).returning();
  }

  // ── Vendors ──────────────────────────────────────────────────

  async listVendors(userId: string) {
    return db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, userId))
      .orderBy(desc(vendors.createdAt));
  }

  async getVendorById(userId: string, id: string) {
    const rows = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.userId, userId)));
    return rows[0];
  }

  async createVendor(
    userId: string,
    data: Omit<typeof vendors.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">,
  ) {
    const now = new Date().toISOString();
    const result = await db
      .insert(vendors)
      .values({
        ...data,
        id: randomUUID(),
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async updateVendor(
    userId: string,
    id: string,
    data: Partial<Omit<typeof vendors.$inferInsert, "id" | "userId" | "createdAt">>,
  ) {
    const result = await db
      .update(vendors)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(vendors.id, id), eq(vendors.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteVendor(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async bulkCreateVendors(
    userId: string,
    items: Array<Omit<typeof vendors.$inferInsert, "userId" | "createdAt" | "updatedAt">>,
  ) {
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    const values = items.map((item) => ({
      ...item,
      id: item.id || randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    }));
    return db.insert(vendors).values(values).returning();
  }

  // ── Budgets ──────────────────────────────────────────────────

  async listBudgets(userId: string) {
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt));
  }

  async getBudgetById(userId: string, id: string) {
    const rows = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    return rows[0];
  }

  async createBudget(
    userId: string,
    data: Omit<typeof budgets.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">,
  ) {
    const now = new Date().toISOString();
    const result = await db
      .insert(budgets)
      .values({
        ...data,
        id: randomUUID(),
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async updateBudget(
    userId: string,
    id: string,
    data: Partial<Omit<typeof budgets.$inferInsert, "id" | "userId" | "createdAt">>,
  ) {
    const result = await db
      .update(budgets)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteBudget(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async updateBudgetSpent(userId: string): Promise<void> {
    const [allBudgets, allProducts] = await Promise.all([
      this.listBudgets(userId),
      this.listProducts(userId),
    ]);

    for (const budget of allBudgets) {
      let spent = 0;
      for (const product of allProducts) {
        if (product.season !== budget.season) continue;
        if (budget.category && product.category !== budget.category) continue;
        if (budget.vendorId && product.vendorId !== budget.vendorId) continue;
        if (product.status !== "cancelled") {
          spent += Number(product.wholesalePrice) * product.quantity;
        }
      }
      await db
        .update(budgets)
        .set({ spent: String(spent), updatedAt: new Date().toISOString() })
        .where(eq(budgets.id, budget.id));
    }
  }

  async bulkCreateBudgets(
    userId: string,
    items: Array<Omit<typeof budgets.$inferInsert, "userId" | "createdAt" | "updatedAt">>,
  ) {
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    const values = items.map((item) => ({
      ...item,
      id: item.id || randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    }));
    return db.insert(budgets).values(values).returning();
  }

  // ── Events ──────────────────────────────────────────────────

  async listEvents(userId: string): Promise<string[]> {
    const rows = await db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.createdAt));
    return rows.map((r) => r.name);
  }

  async addEvent(userId: string, name: string): Promise<string[]> {
    const existing = await this.listEvents(userId);
    const exists = existing.some(
      (e) => e.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!exists && name.trim()) {
      await db.insert(events).values({
        id: randomUUID(),
        userId,
        name: name.trim(),
      });
    }
    return this.listEvents(userId);
  }

  async deleteEvent(userId: string, name: string): Promise<string[]> {
    await db
      .delete(events)
      .where(
        and(
          eq(events.userId, userId),
          sql`lower(${events.name}) = ${name.toLowerCase()}`,
        ),
      );
    return this.listEvents(userId);
  }

  async bulkCreateEvents(userId: string, names: string[]) {
    if (names.length === 0) return;
    const values = names.map((name) => ({
      id: randomUUID(),
      userId,
      name: name.trim(),
    }));
    await db.insert(events).values(values);
  }

  // ── User Settings ──────────────────────────────────────────────────

  async getUserSettings(userId: string) {
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    if (rows[0]) {
      return {
        markupMultiplier: Number(rows[0].markupMultiplier),
        roundingMode: rows[0].roundingMode as "none" | "up" | "even",
      };
    }
    return { markupMultiplier: 2.5, roundingMode: "none" as const };
  }

  async upsertUserSettings(
    userId: string,
    data: { markupMultiplier: number; roundingMode: "none" | "up" | "even" },
  ) {
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (existing[0]) {
      await db
        .update(userSettings)
        .set({
          markupMultiplier: String(data.markupMultiplier),
          roundingMode: data.roundingMode,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({
        userId,
        markupMultiplier: String(data.markupMultiplier),
        roundingMode: data.roundingMode,
      });
    }

    return data;
  }

  // ── Dashboard Stats ──────────────────────────────────────────────────

  async getDashboardStats(userId: string) {
    const [allProducts, allVendors, allBudgets] = await Promise.all([
      this.listProducts(userId),
      this.listVendors(userId),
      this.listBudgets(userId),
    ]);

    const activeProducts = allProducts.filter((p) => p.status !== "cancelled");

    const upcomingDeliveries = activeProducts
      .filter((p) => p.deliveryDate && new Date(p.deliveryDate) >= new Date())
      .sort(
        (a, b) =>
          new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime(),
      );

    const totalBudget = allBudgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = allBudgets.reduce((sum, b) => sum + Number(b.spent), 0);

    return {
      totalProducts: activeProducts.length,
      totalVendors: allVendors.length,
      nextDeliveryDate: upcomingDeliveries[0]?.deliveryDate,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
    };
  }
}

export const storage = new DatabaseStorage();
