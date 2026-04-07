import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
  TextInput,
  Modal,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";

interface AffiliateProfile {
  referralCode: string;
  isActive: boolean;
}

interface AffiliateStats {
  totalReferrals: number;
  activePaidReferrals: number;
  pendingCents: number;
  availableCents: number;
  requestedCents: number;
  paidCents: number;
}

interface AffiliateMeResponse {
  profile: AffiliateProfile;
  stats: AffiliateStats;
  shareText: string;
}

interface ReferralEntry {
  referredUserId: string;
  codeUsed: string;
  createdAt: string;
  referredName: string;
  referredEmail: string;
  referredSubscriptionPlan: string;
}

type PayoutMethod = "paypal" | "stripe" | "other";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: "share" as const,
    title: "Share Your Code",
    description: "Grab your unique referral code and share it with boutique owners.",
  },
  {
    step: "2",
    icon: "user-plus" as const,
    title: "They Sign Up",
    description: "When they create an account with your code, they're linked to you.",
  },
  {
    step: "3",
    icon: "dollar-sign" as const,
    title: "You Earn 25%",
    description: "Earn 25% of the revenue from every referred subscriber. No cap.",
  },
];

export default function CollaborationScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("paypal");
  const [payoutDestination, setPayoutDestination] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const {
    data: affiliateData,
    isLoading: isLoadingProfile,
    error: affiliateError,
  } = useQuery<AffiliateMeResponse>({
    queryKey: ["api", "affiliates", "me"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: referralsData, isLoading: isLoadingReferrals } = useQuery<{
    referrals: ReferralEntry[];
  }>({
    queryKey: ["api", "affiliates", "me", "referrals"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const payoutMutation = useMutation({
    mutationFn: async (input: {
      amountCents: number;
      method: PayoutMethod;
      destination: string;
    }) => {
      const res = await apiRequest("POST", "/api/affiliates/me/payout-requests", input);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api", "affiliates", "me"] });
      setShowPayoutModal(false);
      setPayoutAmount("");
      setPayoutDestination("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Request Submitted", "Your payout request has been submitted for review.");
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "Failed to submit payout request.");
    },
  });

  const handleCopyCode = useCallback(async () => {
    if (!affiliateData?.profile.referralCode) return;
    await Clipboard.setStringAsync(affiliateData.profile.referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [affiliateData]);

  const handleShare = useCallback(async () => {
    if (!affiliateData) return;
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: affiliateData.shareText,
      });
    } catch {
      // User cancelled
    }
  }, [affiliateData]);

  const handleSubmitPayout = () => {
    const dollars = parseFloat(payoutAmount);
    if (!dollars || dollars <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid dollar amount.");
      return;
    }
    if (!payoutDestination.trim()) {
      Alert.alert("Missing Destination", "Please enter your payout email or account ID.");
      return;
    }
    payoutMutation.mutate({
      amountCents: Math.round(dollars * 100),
      method: payoutMethod,
      destination: payoutDestination.trim(),
    });
  };

  const stats = affiliateData?.stats;
  const referrals = referralsData?.referrals ?? [];
  const isLoading = isLoadingProfile;

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={BrandColors.gold} />
      </ThemedView>
    );
  }

  if (affiliateError && !affiliateData) {
    const errMsg =
      affiliateError instanceof Error
        ? affiliateError.message
        : String(affiliateError);
    const isAuthError = errMsg.includes("401");
    const isDbHint =
      errMsg.includes("does not exist") || errMsg.includes("relation");
    const isNetwork =
      errMsg.includes("Network") || errMsg.includes("fetch");
    const isTimeout = errMsg.includes("timed out") || errMsg.includes("aborted");
    const isGateway = errMsg.includes("502") || errMsg.includes("503");

    let headline: string;
    if (isAuthError) {
      headline =
        "Your session has expired. Please log out and log back in to access your referral code.";
    } else if (isDbHint) {
      headline =
        "The server database is still updating. Wait a minute after deploy, force-quit, and try again.";
    } else if (isTimeout) {
      headline =
        "The request timed out. The server may be restarting — wait a moment and try again.";
    } else if (isNetwork) {
      headline =
        "Could not reach the server. Check your internet connection and try again.";
    } else if (isGateway) {
      headline =
        "The server is temporarily unavailable (502/503). It may be restarting — try again in a minute.";
    } else {
      headline =
        "Unable to load referral data. Please check your connection and try again.";
    }

    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather
          name={isAuthError ? "lock" : "alert-circle"}
          size={40}
          color={theme.textTertiary}
        />
        <ThemedText
          style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center", paddingHorizontal: Spacing.xl }}
        >
          {headline}
        </ThemedText>
        <ThemedText
          style={{
            color: theme.textTertiary,
            marginTop: Spacing.sm,
            fontSize: 12,
            textAlign: "center",
            paddingHorizontal: Spacing.lg,
          }}
        >
          {errMsg.length > 180 ? `${errMsg.slice(0, 180)}…` : errMsg}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Referral Code Card */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
            >
              <Feather name="gift" size={20} color={BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>Your Referral Code</ThemedText>
          </View>

          <View style={[styles.codeCard, { backgroundColor: `${BrandColors.gold}10` }]}>
            <ThemedText style={[styles.codeText, { color: BrandColors.gold }]}>
              {affiliateData?.profile.referralCode ?? "—"}
            </ThemedText>
          </View>

          <View style={styles.codeActions}>
            <Pressable
              style={({ pressed }) => [
                styles.codeActionButton,
                {
                  backgroundColor: codeCopied ? BrandColors.success : BrandColors.gold,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleCopyCode}
            >
              <Feather
                name={codeCopied ? "check" : "copy"}
                size={16}
                color="#fff"
              />
              <ThemedText style={styles.codeActionText}>
                {codeCopied ? "Copied!" : "Copy Code"}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.codeActionButton,
                styles.shareButton,
                {
                  borderColor: BrandColors.gold,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleShare}
            >
              <Feather name="share-2" size={16} color={BrandColors.gold} />
              <ThemedText style={[styles.codeActionText, { color: BrandColors.gold }]}>
                Share
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* How It Works */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
            >
              <Feather name="info" size={20} color={BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>How It Works</ThemedText>
          </View>

          {HOW_IT_WORKS.map((item, index) => (
            <View key={item.step} style={styles.stepRow}>
              <View
                style={[styles.stepNumber, { backgroundColor: `${BrandColors.gold}15` }]}
              >
                <Feather name={item.icon} size={18} color={BrandColors.gold} />
              </View>
              <View style={styles.stepContent}>
                <ThemedText style={styles.stepTitle}>{item.title}</ThemedText>
                <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
                  {item.description}
                </ThemedText>
              </View>
              {index < HOW_IT_WORKS.length - 1 && (
                <View style={[styles.stepConnector, { borderColor: `${BrandColors.gold}30` }]} />
              )}
            </View>
          ))}
        </View>

        {/* Earnings Dashboard */}
        {stats && (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.backgroundRoot },
              Shadows.card,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View
                style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
              >
                <Feather name="trending-up" size={20} color={BrandColors.gold} />
              </View>
              <ThemedText style={styles.sectionTitle}>Earnings</ThemedText>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: `${BrandColors.gold}08` }]}>
                <ThemedText style={[styles.statValue, { color: BrandColors.gold }]}>
                  {stats.totalReferrals}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Total Referrals
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: `${BrandColors.success}08` }]}>
                <ThemedText style={[styles.statValue, { color: BrandColors.success }]}>
                  {stats.activePaidReferrals}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Active Paid
                </ThemedText>
              </View>
            </View>

            <View style={styles.earningsBreakdown}>
              <View style={styles.earningsRow}>
                <ThemedText style={[styles.earningsLabel, { color: theme.textSecondary }]}>
                  Available Balance
                </ThemedText>
                <ThemedText style={[styles.earningsValue, { color: BrandColors.success }]}>
                  {formatCents(stats.availableCents)}
                </ThemedText>
              </View>
              <View style={[styles.earningsDivider, { backgroundColor: theme.border }]} />
              <View style={styles.earningsRow}>
                <ThemedText style={[styles.earningsLabel, { color: theme.textSecondary }]}>
                  Pending (30-day hold)
                </ThemedText>
                <ThemedText style={styles.earningsValue}>
                  {formatCents(stats.pendingCents)}
                </ThemedText>
              </View>
              <View style={[styles.earningsDivider, { backgroundColor: theme.border }]} />
              <View style={styles.earningsRow}>
                <ThemedText style={[styles.earningsLabel, { color: theme.textSecondary }]}>
                  Requested
                </ThemedText>
                <ThemedText style={styles.earningsValue}>
                  {formatCents(stats.requestedCents)}
                </ThemedText>
              </View>
              <View style={[styles.earningsDivider, { backgroundColor: theme.border }]} />
              <View style={styles.earningsRow}>
                <ThemedText style={[styles.earningsLabel, { color: theme.textSecondary }]}>
                  Total Paid
                </ThemedText>
                <ThemedText style={styles.earningsValue}>
                  {formatCents(stats.paidCents)}
                </ThemedText>
              </View>
            </View>

            {stats.availableCents > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.payoutButton,
                  { backgroundColor: BrandColors.gold, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPayoutModal(true);
                }}
              >
                <Feather name="download" size={16} color="#fff" />
                <ThemedText style={styles.payoutButtonText}>Request Payout</ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {/* Referrals List */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}
            >
              <Feather name="users" size={20} color={BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>Your Referrals</ThemedText>
          </View>

          {isLoadingReferrals ? (
            <ActivityIndicator color={BrandColors.gold} />
          ) : referrals.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="user-plus" size={32} color={theme.textTertiary} />
              <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
                No referrals yet. Share your code to start earning!
              </ThemedText>
            </View>
          ) : (
            referrals.map((referral) => (
              <View
                key={referral.referredUserId}
                style={[styles.referralRow, { borderColor: theme.border }]}
              >
                <View style={[styles.referralAvatar, { backgroundColor: `${BrandColors.gold}15` }]}>
                  <ThemedText style={[styles.referralInitial, { color: BrandColors.gold }]}>
                    {referral.referredName?.[0]?.toUpperCase() ?? "?"}
                  </ThemedText>
                </View>
                <View style={styles.referralInfo}>
                  <ThemedText style={styles.referralName}>{referral.referredName}</ThemedText>
                  <ThemedText style={[styles.referralDate, { color: theme.textTertiary }]}>
                    Joined {formatDate(referral.createdAt)}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.planBadge,
                    {
                      backgroundColor:
                        referral.referredSubscriptionPlan !== "free"
                          ? `${BrandColors.success}15`
                          : `${theme.textTertiary}15`,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.planBadgeText,
                      {
                        color:
                          referral.referredSubscriptionPlan !== "free"
                            ? BrandColors.success
                            : theme.textTertiary,
                      },
                    ]}
                  >
                    {referral.referredSubscriptionPlan.charAt(0).toUpperCase() +
                      referral.referredSubscriptionPlan.slice(1)}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Payout Request Modal */}
      <Modal
        visible={showPayoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPayoutModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Request Payout</ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Available: {formatCents(stats?.availableCents ?? 0)}
            </ThemedText>

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Amount ($)
            </ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              keyboardType="decimal-pad"
              placeholder="50.00"
              placeholderTextColor={theme.textTertiary}
            />

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Payout Method
            </ThemedText>
            <View style={styles.methodRow}>
              {(["paypal", "stripe", "other"] as PayoutMethod[]).map((method) => (
                <Pressable
                  key={method}
                  style={[
                    styles.methodOption,
                    {
                      borderColor: payoutMethod === method ? BrandColors.gold : theme.border,
                      backgroundColor:
                        payoutMethod === method ? `${BrandColors.gold}10` : "transparent",
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPayoutMethod(method);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.methodText,
                      payoutMethod === method && { color: BrandColors.gold, fontWeight: "600" },
                    ]}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              {payoutMethod === "paypal"
                ? "PayPal Email"
                : payoutMethod === "stripe"
                  ? "Stripe Account ID"
                  : "Account Details"}
            </ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={payoutDestination}
              onChangeText={setPayoutDestination}
              placeholder={
                payoutMethod === "paypal"
                  ? "you@example.com"
                  : payoutMethod === "stripe"
                    ? "acct_..."
                    : "Enter account details"
              }
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              keyboardType={payoutMethod === "paypal" ? "email-address" : "default"}
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: BrandColors.gold,
                  opacity: pressed || payoutMutation.isPending ? 0.8 : 1,
                },
              ]}
              onPress={handleSubmitPayout}
              disabled={payoutMutation.isPending}
            >
              {payoutMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Submit Request</ThemedText>
              )}
            </Pressable>

            <Pressable onPress={() => setShowPayoutModal(false)}>
              <ThemedText
                style={[styles.cancelLink, { color: theme.textSecondary }]}
              >
                Cancel
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  codeCard: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  codeText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 3,
  },
  codeActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  codeActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  shareButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  codeActionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  stepConnector: {
    position: "absolute",
    left: 17,
    top: 36,
    bottom: -Spacing.lg,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: "dashed",
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  earningsBreakdown: {
    marginBottom: Spacing.lg,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  earningsLabel: {
    fontSize: 15,
  },
  earningsValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  earningsDivider: {
    height: 1,
  },
  payoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  payoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  referralInitial: {
    fontSize: 16,
    fontWeight: "700",
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 15,
    fontWeight: "500",
  },
  referralDate: {
    fontSize: 12,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  methodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  methodOption: {
    flex: 1,
    height: 40,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: {
    fontSize: 14,
  },
  submitButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelLink: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
});
