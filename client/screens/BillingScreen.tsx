import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOfferings,
  getOfferingById,
  restorePurchases,
  getCustomerInfo,
  getPlanFromCustomerInfo,
  type TierOfferings,
  ENTITLEMENT_STARTER,
  ENTITLEMENT_GROWTH,
} from "@/lib/purchases";
import {
  PLANS,
  FREE_FEATURES,
  STARTER_FEATURES,
  GROWTH_FEATURES,
  VIP_FEATURES,
  type PlanId,
} from "@/lib/plans";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";
import type { SubscriptionPlan } from "@/types";

const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "vip"];

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: FREE_FEATURES,
  starter: STARTER_FEATURES,
  growth: GROWTH_FEATURES,
  vip: VIP_FEATURES,
};

const PLAN_ENTITLEMENTS: Record<string, string> = {
  starter: ENTITLEMENT_STARTER,
  growth: ENTITLEMENT_GROWTH,
};

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();

  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const [offerings, setOfferings] = useState<TierOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tierOfferings, customerInfo] = await Promise.all([
        getOfferings(),
        getCustomerInfo(),
      ]);
      setOfferings(tierOfferings);
      const plan = getPlanFromCustomerInfo(customerInfo);
      setCurrentPlan(plan);
    } catch (err: unknown) {
      console.warn("Failed to load billing data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubscribe = useCallback(
    async (planId: PlanId) => {
      Haptics.selectionAsync();
      const entitlement = PLAN_ENTITLEMENTS[planId];
      if (!entitlement) return;

      const offeringTier = offerings?.[planId as keyof TierOfferings];

      if (!offeringTier?.monthly && !offeringTier?.yearly) {
        Alert.alert(
          "Unavailable",
          "This plan is currently unavailable. Please try again later.",
        );
        return;
      }

      try {
        const offering = await getOfferingById(planId);
        const result = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: entitlement,
          offering: offering ?? undefined,
        });

        if (
          result === PAYWALL_RESULT.PURCHASED ||
          result === PAYWALL_RESULT.RESTORED
        ) {
          const info = await getCustomerInfo();
          setCurrentPlan(getPlanFromCustomerInfo(info));
          await refreshUser();
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        Alert.alert(
          "Subscription Error",
          error.message || "Something went wrong. Please try again.",
        );
      }
    },
    [refreshUser, offerings],
  );

  const handleManageSubscription = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (err) {
      console.warn("Customer Center error:", err);
      Alert.alert(
        "Manage Subscription",
        "To manage your subscription, go to Settings > Apple ID > Subscriptions on your device.",
      );
    }
  }, []);

  const handleRestore = useCallback(async () => {
    Haptics.selectionAsync();
    setIsRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      const restored = getPlanFromCustomerInfo(customerInfo);
      setCurrentPlan(restored);
      await refreshUser();

      if (restored !== "free") {
        Alert.alert(
          "Purchases Restored",
          `Your ${PLANS[restored].name} subscription has been restored.`,
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore.",
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert(
        "Restore Failed",
        error.message || "Could not restore purchases. Please try again.",
      );
    } finally {
      setIsRestoring(false);
    }
  }, [refreshUser]);

  const isPaidPlan = currentPlan !== "free";

  const getPriceText = (planId: PlanId) => {
    const plan = PLANS[planId];
    if (planId === "free") return "$0";
    // Try to get price from offerings
    const offeringTier = offerings?.[planId as keyof TierOfferings];
    return offeringTier?.monthly?.product.priceString ?? `$${plan.monthlyPrice}`;
  };

  const getYearlyPriceText = (planId: PlanId) => {
    const plan = PLANS[planId];
    if (planId === "free") return null;
    const offeringTier = offerings?.[planId as keyof TierOfferings];
    return offeringTier?.yearly?.product.priceString ?? `$${plan.yearlyPrice}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: Spacing.lg,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ThemedText style={[styles.title, { color: theme.textSecondary }]}>
        Choose the plan that fits your business
      </ThemedText>

      {isLoading && (
        <ActivityIndicator
          color={BrandColors.gold}
          style={{ marginBottom: Spacing.lg }}
        />
      )}

      {PLAN_ORDER.map((planId) => {
        const plan = PLANS[planId];
        const isCurrent = currentPlan === planId;
        const isVip = planId === "vip";
        const features = PLAN_FEATURES[planId];
        const yearlyPrice = getYearlyPriceText(planId);

        return (
          <View
            key={planId}
            style={[
              styles.planCard,
              {
                backgroundColor: theme.backgroundRoot,
                borderColor: isCurrent ? BrandColors.gold : theme.border,
                borderWidth: isCurrent ? 2 : 1,
                opacity: isVip ? 0.85 : 1,
              },
              Shadows.card,
            ]}
          >
            <View style={styles.planHeader}>
              <View style={styles.planNameRow}>
                <ThemedText style={styles.planName}>{plan.name}</ThemedText>
                {isVip && (
                  <View
                    style={[
                      styles.comingSoonBadge,
                      { backgroundColor: `${theme.textTertiary}20` },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.comingSoonText,
                        { color: theme.textTertiary },
                      ]}
                    >
                      Coming Soon
                    </ThemedText>
                  </View>
                )}
                {planId !== "free" && !isVip && (
                  <View
                    style={[styles.tierBadge, { backgroundColor: BrandColors.gold }]}
                  >
                    <ThemedText style={styles.tierBadgeText}>
                      {planId.toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.pricingOptions}>
                <View style={styles.priceOption}>
                  <ThemedText style={[styles.price, { color: BrandColors.gold }]}>
                    {getPriceText(planId)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.perMonth, { color: theme.textSecondary }]}
                  >
                    /mo
                  </ThemedText>
                </View>
                {yearlyPrice && (
                  <View style={styles.priceOption}>
                    <ThemedText
                      style={[styles.yearlyPrice, { color: theme.textSecondary }]}
                    >
                      or {yearlyPrice}/yr
                    </ThemedText>
                    <View
                      style={[
                        styles.saveBadge,
                        { backgroundColor: `${BrandColors.gold}15` },
                      ]}
                    >
                      <ThemedText
                        style={[styles.saveText, { color: BrandColors.gold }]}
                      >
                        Save 10%
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>

              {isCurrent && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: `${BrandColors.gold}20` },
                  ]}
                >
                  <ThemedText
                    style={[styles.badgeText, { color: BrandColors.gold }]}
                  >
                    Current Plan
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.featuresList}>
              {features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Feather
                    name="check"
                    size={16}
                    color={BrandColors.gold}
                    style={styles.featureIcon}
                  />
                  <ThemedText
                    style={[styles.featureText, { color: theme.textSecondary }]}
                  >
                    {feature}
                  </ThemedText>
                </View>
              ))}
            </View>

            {!isCurrent && !isVip && planId !== "free" && (
              <Button
                onPress={() => handleSubscribe(planId)}
                style={styles.ctaButton}
              >
                Upgrade to {plan.name}
              </Button>
            )}

            {isCurrent && isPaidPlan && (
              <Button
                onPress={handleManageSubscription}
                style={styles.ctaButton}
              >
                Manage Subscription
              </Button>
            )}
          </View>
        );
      })}

      {/* Restore Purchases */}
      <Pressable onPress={handleRestore} disabled={isRestoring}>
        <ThemedText style={[styles.restoreLink, { color: BrandColors.gold }]}>
          {isRestoring ? "Restoring..." : "Restore Purchases"}
        </ThemedText>
      </Pressable>

      <ThemedText style={[styles.footer, { color: theme.textTertiary }]}>
        Have questions? Contact us at support@digitalhaute.com
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  planCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  planHeader: {
    marginBottom: Spacing.lg,
  },
  planName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tierBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  comingSoonBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pricingOptions: {
    marginTop: Spacing.sm,
  },
  priceOption: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
  },
  perMonth: {
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
  yearlyPrice: {
    fontSize: 16,
  },
  saveBadge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  saveText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  featuresList: {
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    marginRight: Spacing.sm,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  ctaButton: {
    width: "100%",
  },
  restoreLink: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    textDecorationLine: "underline",
  },
  footer: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
