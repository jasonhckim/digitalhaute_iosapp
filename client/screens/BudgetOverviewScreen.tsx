import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BrandColors,
  BorderRadius,
  FontFamilies,
} from "@/constants/theme";
import { BudgetStorage, VendorStorage, ProductStorage } from "@/lib/storage";
import { Budget, Vendor, Product } from "@/types";

type FilterMode = "category" | "vendor" | "season";

interface GroupedBudget {
  label: string;
  totalBudget: number;
  totalSpent: number;
}

export default function BudgetOverviewScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("category");

  const loadData = useCallback(async () => {
    const [budgetsData, vendorsData] = await Promise.all([
      BudgetStorage.getAll(),
      VendorStorage.getAll(),
    ]);
    setBudgets(budgetsData);
    setVendors(vendorsData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

  const grouped: GroupedBudget[] = (() => {
    const map = new Map<string, { budget: number; spent: number }>();

    for (const b of budgets) {
      let key: string;
      switch (filterMode) {
        case "category":
          key = b.category || "All Categories";
          break;
        case "vendor":
          key = b.vendorId
            ? vendorMap.get(b.vendorId) || "Unknown Vendor"
            : "All Vendors";
          break;
        case "season":
          key = b.season;
          break;
      }

      const existing = map.get(key) || { budget: 0, spent: 0 };
      existing.budget += b.amount;
      existing.spent += b.spent;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([label, data]) => ({
        label,
        totalBudget: data.budget,
        totalSpent: data.spent,
      }))
      .sort((a, b) => b.totalBudget - a.totalBudget);
  })();

  const grandTotalBudget = grouped.reduce((s, g) => s + g.totalBudget, 0);
  const grandTotalSpent = grouped.reduce((s, g) => s + g.totalSpent, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
    { key: "category", label: "By Category" },
    { key: "vendor", label: "By Vendor" },
    { key: "season", label: "By Season" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={BrandColors.camel}
        />
      }
    >
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => {
          const isSelected = filterMode === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? BrandColors.textPrimary
                    : "transparent",
                  borderColor: isSelected
                    ? BrandColors.textPrimary
                    : BrandColors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilterMode(opt.key);
              }}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  {
                    color: isSelected
                      ? BrandColors.white
                      : BrandColors.textPrimary,
                  },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue}>
              {formatCurrency(grandTotalBudget)}
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: theme.textSecondary }]}
            >
              Total Budget
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue}>
              {formatCurrency(grandTotalSpent)}
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: theme.textSecondary }]}
            >
              Total Spent
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText
              style={[
                styles.summaryValue,
                {
                  color:
                    grandTotalBudget - grandTotalSpent < 0
                      ? BrandColors.error
                      : BrandColors.success,
                },
              ]}
            >
              {formatCurrency(grandTotalBudget - grandTotalSpent)}
            </ThemedText>
            <ThemedText
              style={[styles.summaryLabel, { color: theme.textSecondary }]}
            >
              Remaining
            </ThemedText>
          </View>
        </View>
      </View>

      {grouped.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            No budgets found. Add budgets from the Dashboard.
          </ThemedText>
        </View>
      ) : (
        grouped.map((group) => {
          const remaining = group.totalBudget - group.totalSpent;
          const pct =
            group.totalBudget > 0
              ? Math.min((group.totalSpent / group.totalBudget) * 100, 100)
              : 0;

          const barColor =
            pct >= 100
              ? BrandColors.error
              : pct >= 75
                ? "#D4A574"
                : BrandColors.camel;

          return (
            <View key={group.label} style={styles.groupCard}>
              <ThemedText style={styles.groupLabel}>{group.label}</ThemedText>
              <View
                style={[
                  styles.progressBg,
                  { backgroundColor: BrandColors.creamDarker },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${pct}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              <View style={styles.groupStats}>
                <View style={styles.groupStat}>
                  <ThemedText style={styles.groupStatValue}>
                    {formatCurrency(group.totalBudget)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.groupStatLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Budget
                  </ThemedText>
                </View>
                <View style={styles.groupStat}>
                  <ThemedText style={styles.groupStatValue}>
                    {formatCurrency(group.totalSpent)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.groupStatLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Spent
                  </ThemedText>
                </View>
                <View style={styles.groupStat}>
                  <ThemedText
                    style={[
                      styles.groupStatValue,
                      {
                        color:
                          remaining < 0 ? BrandColors.error : BrandColors.textPrimary,
                      },
                    ]}
                  >
                    {formatCurrency(remaining)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.groupStatLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Remaining
                  </ThemedText>
                </View>
                <View style={styles.groupStat}>
                  <ThemedText style={styles.groupStatValue}>
                    {Math.round(pct)}%
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.groupStatLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Used
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryCard: {
    backgroundColor: BrandColors.creamDark,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
  groupCard: {
    backgroundColor: BrandColors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  groupStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  groupStat: {
    alignItems: "center",
    flex: 1,
  },
  groupStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  groupStatLabel: {
    fontSize: 11,
  },
});
