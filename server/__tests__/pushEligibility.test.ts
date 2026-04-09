import { describe, it, expect } from "vitest";

/**
 * Pure-function tests for push notification channel eligibility logic.
 * These mirror the filtering rules in server/pushNotifications.ts without
 * importing the module (which depends on storage/db).
 */

type NotificationChannel =
  | "deliveryAlerts"
  | "budgetAlerts"
  | "orderStatusUpdates"
  | "weeklySummary";

function getDefaultForChannel(channel: NotificationChannel): boolean {
  return channel !== "weeklySummary";
}

interface Prefs {
  deliveryAlerts: boolean;
  budgetAlerts: boolean;
  orderStatusUpdates: boolean;
  weeklySummary: boolean;
}

function shouldReceive(prefs: Prefs | undefined, channel: NotificationChannel): boolean {
  if (!prefs) return getDefaultForChannel(channel);
  return prefs[channel];
}

describe("push eligibility", () => {
  it("defaults delivery/budget/order to true, weekly to false", () => {
    expect(getDefaultForChannel("deliveryAlerts")).toBe(true);
    expect(getDefaultForChannel("budgetAlerts")).toBe(true);
    expect(getDefaultForChannel("orderStatusUpdates")).toBe(true);
    expect(getDefaultForChannel("weeklySummary")).toBe(false);
  });

  it("uses user prefs when available", () => {
    const prefs: Prefs = {
      deliveryAlerts: false,
      budgetAlerts: true,
      orderStatusUpdates: false,
      weeklySummary: true,
    };
    expect(shouldReceive(prefs, "deliveryAlerts")).toBe(false);
    expect(shouldReceive(prefs, "budgetAlerts")).toBe(true);
    expect(shouldReceive(prefs, "weeklySummary")).toBe(true);
  });

  it("falls back to defaults when prefs are undefined", () => {
    expect(shouldReceive(undefined, "deliveryAlerts")).toBe(true);
    expect(shouldReceive(undefined, "weeklySummary")).toBe(false);
  });
});
