import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, BrandColors } from "@/constants/theme";
import { Vendor } from "@/types";

interface VendorCardProps {
  vendor: Vendor;
  productCount?: number;
  totalSpend?: number;
  onPress?: () => void;
}

export function VendorCard({
  vendor,
  productCount = 0,
  totalSpend = 0,
  onPress,
}: VendorCardProps) {
  const { theme } = useTheme();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundRoot, opacity: pressed ? 0.95 : 1 },
        Shadows.card,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View
          style={[styles.avatar, { backgroundColor: `${BrandColors.gold}15` }]}
        >
          <ThemedText style={[styles.avatarText, { color: BrandColors.gold }]}>
            {vendor.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>

        <View style={styles.details}>
          <ThemedText style={styles.name}>{vendor.name}</ThemedText>

          {vendor.contactName ? (
            <ThemedText
              style={[styles.contact, { color: theme.textSecondary }]}
            >
              {vendor.contactName}
            </ThemedText>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Feather name="package" size={12} color={theme.textTertiary} />
              <ThemedText
                style={[styles.statText, { color: theme.textTertiary }]}
              >
                {productCount} products
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.spendContainer}>
          <ThemedText
            style={[styles.spendLabel, { color: theme.textTertiary }]}
          >
            Total Spend
          </ThemedText>
          <ThemedText style={[styles.spendValue, { color: BrandColors.gold }]}>
            {formatCurrency(totalSpend)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.chevron}>
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  details: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  contact: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  spendContainer: {
    alignItems: "flex-end",
  },
  spendLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  spendValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  chevron: {
    paddingRight: Spacing.md,
  },
});
