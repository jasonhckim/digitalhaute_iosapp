import Purchases, {
  type PurchasesOffering,
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";

// RevenueCat API key (public — safe to include in client code)
const REVENUECAT_API_KEY = "appl_JNnhLrSVijDFFJMorldIceVsQzD";

// Entitlement identifiers — must match what you configure in RevenueCat dashboard
export const ENTITLEMENT_STARTER = "Starter";
export const ENTITLEMENT_GROWTH = "Growth";
export const ENTITLEMENT_VIP = "VIP";

/**
 * Initialize RevenueCat SDK. Call once at app startup.
 */
export async function initPurchases(userId?: string): Promise<void> {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserID: userId || undefined,
  });
}

/**
 * Identify the user after login (links their purchases to your Firebase UID).
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/**
 * Log out the current RevenueCat user (call on sign-out).
 */
export async function logOutPurchases(): Promise<void> {
  await Purchases.logOut();
}

export interface TierOfferings {
  starter: { monthly: PurchasesPackage | null; yearly: PurchasesPackage | null };
  growth: { monthly: PurchasesPackage | null; yearly: PurchasesPackage | null };
  vip: { monthly: PurchasesPackage | null; yearly: PurchasesPackage | null };
}

/**
 * Get available subscription packages from RevenueCat, grouped by tier.
 */
export async function getOfferings(): Promise<TierOfferings> {
  const offerings = await Purchases.getOfferings();

  // Debug: log all offering keys so we can verify they match
  const allKeys = Object.keys(offerings.all);
  console.log("[RC Debug] All offering keys:", allKeys);
  console.log("[RC Debug] Current offering:", offerings.current?.identifier);

  const extract = (offeringId: string) => {
    const offering = offerings.all[offeringId];
    console.log(
      `[RC Debug] Offering "${offeringId}":`,
      offering
        ? `found (monthly: ${!!offering.monthly}, annual: ${!!offering.annual})`
        : "NOT FOUND",
    );
    return {
      monthly: offering?.monthly ?? null,
      yearly: offering?.annual ?? null,
    };
  };

  return {
    starter: extract("starter"),
    growth: extract("growth"),
    vip: extract("vip"),
  };
}

/**
 * Get raw offering keys from RevenueCat (for debugging).
 */
export async function getOfferingKeys(): Promise<string[]> {
  const offerings = await Purchases.getOfferings();
  return Object.keys(offerings.all);
}

/**
 * Get a specific offering object by ID (needed for presenting the correct paywall).
 */
export async function getOfferingById(
  offeringId: string,
): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.all[offeringId] ?? null;
}

/**
 * Purchase a specific package. Returns updated customer info.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * Restore purchases (e.g. when user reinstalls or switches device).
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

/**
 * Get the current customer info (subscription status).
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo;
}

/**
 * Derive the subscription plan from RevenueCat entitlements.
 * Checks from highest tier down: VIP > Growth > Starter > Free.
 */
export function getPlanFromCustomerInfo(
  customerInfo: CustomerInfo,
): "free" | "starter" | "growth" | "vip" {
  const active = customerInfo.entitlements.active;
  if (typeof active[ENTITLEMENT_VIP] !== "undefined") return "vip";
  if (typeof active[ENTITLEMENT_GROWTH] !== "undefined") return "growth";
  if (typeof active[ENTITLEMENT_STARTER] !== "undefined") return "starter";
  return "free";
}

/**
 * Listen for subscription status changes.
 * Returns a cleanup function that removes the listener.
 */
export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  // The SDK's addCustomerInfoUpdateListener returns an unsubscribe function
  // at runtime, but the types declare it as void. Cast to capture the return.
  const remove = Purchases.addCustomerInfoUpdateListener(listener) as
    | (() => void)
    | undefined;
  return () => {
    if (typeof remove === "function") {
      remove();
    }
  };
}
