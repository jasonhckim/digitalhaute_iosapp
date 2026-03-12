import type { SubscriptionPlan } from "@/types";

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 1,
    maxProducts: 10,
    available: true,
  },
  starter: {
    id: "starter" as const,
    name: "Starter",
    monthlyPrice: 29.99,
    yearlyPrice: 323.89, // 10% off ($29.99 × 12 = $359.88 → $323.89)
    maxUsers: 1,
    maxProducts: Infinity,
    available: true,
  },
  growth: {
    id: "growth" as const,
    name: "Growth",
    monthlyPrice: 69.99,
    yearlyPrice: 755.89, // 10% off ($69.99 × 12 = $839.88 → $755.89)
    maxUsers: 4,
    maxProducts: Infinity,
    available: true,
  },
  vip: {
    id: "vip" as const,
    name: "VIP",
    monthlyPrice: 99.99,
    yearlyPrice: 1079.89, // 10% off ($99.99 × 12 = $1,199.88 → $1,079.89)
    maxUsers: 6,
    maxProducts: Infinity,
    available: false, // Coming Soon
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  vip: 3,
};

/** Check if user's plan meets or exceeds the required plan */
export function hasPlanOrHigher(
  userPlan: SubscriptionPlan | undefined,
  requiredPlan: SubscriptionPlan,
): boolean {
  const current = PLAN_RANK[userPlan ?? "free"];
  const required = PLAN_RANK[requiredPlan];
  return current >= required;
}

/** Feature → minimum plan required */
export const FEATURE_REQUIRED_PLAN: Record<string, SubscriptionPlan> = {
  unlimitedProducts: "starter",
  printCatalog: "starter",
  seeOnModel: "growth",
  shopifyUpload: "growth",
  teamMembers: "growth",
  importWholesale: "growth",
  phoneSupport: "growth",
  automatedOrderReport: "vip",
  importOrderPdfs: "vip",
  productGallery: "vip",
  customShopify: "vip",
};

/** Check if a plan has access to a specific feature */
export function hasFeature(
  plan: SubscriptionPlan | undefined,
  featureId: string,
): boolean {
  const requiredPlan = FEATURE_REQUIRED_PLAN[featureId];
  if (!requiredPlan) return true; // Unknown features are allowed
  return hasPlanOrHigher(plan, requiredPlan);
}

/** Get the CTA text for upgrading to a specific plan */
export function getUpgradeCtaText(requiredPlan: SubscriptionPlan): string {
  const plan = PLANS[requiredPlan];
  return `Upgrade to ${plan.name}`;
}

// Backward compat alias
export function hasGrowthFeature(plan: SubscriptionPlan | undefined): boolean {
  return hasPlanOrHigher(plan, "growth");
}

export const FEATURE_UPGRADE_COPY: Record<
  string,
  { title: string; description: string; requiredPlan: SubscriptionPlan }
> = {
  seeOnModel: {
    title: "See on Model",
    description:
      "See on Model uses AI to generate a realistic photo of a model wearing your product. Perfect for lookbooks, social media, and buyer presentations.",
    requiredPlan: "growth",
  },
  shopifyUpload: {
    title: "Upload to Shopify",
    description:
      "Upload products directly to your Shopify store with one tap.",
    requiredPlan: "growth",
  },
  teamMembers: {
    title: "Team Members",
    description:
      "Invite team members to collaborate on products, vendors, and budgets. Growth plan supports up to 4 users.",
    requiredPlan: "growth",
  },
  importWholesale: {
    title: "Import Wholesale Orders",
    description:
      "Import orders from FashionGo, Faire, ShopB2Z, and other wholesale sites.",
    requiredPlan: "growth",
  },
  unlimitedProducts: {
    title: "Unlimited Products",
    description:
      "Free plan is limited to 10 products. Upgrade to Starter for unlimited product tracking.",
    requiredPlan: "starter",
  },
};

export const FREE_FEATURES = [
  "10 Products (soft limit)",
  "Tag Scanner",
  "Buying Budget",
  "Export to Excel",
  "1 User",
];

export const STARTER_FEATURES = [
  "Unlimited Products",
  "Tag Scanner",
  "Buying Budget",
  "Export to Excel",
  "Print Product Catalog",
  "In-app & Email Support",
  "1 User",
  "iPhone/iPad",
];

export const GROWTH_FEATURES = [
  "All Starter features",
  "See on Model (AI)",
  "Import Online Orders",
  "Upload to Shopify",
  "Team Members (up to 4)",
  "Phone Support",
];

export const VIP_FEATURES = [
  "All Growth features",
  "Automated Order Report",
  "Import Order PDFs",
  "Product Gallery",
  "Custom Shopify Integration",
  "6+ Users",
  "Priority Support",
  "iPhone/iPad & Computer",
];
