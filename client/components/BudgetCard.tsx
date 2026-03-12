import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  BorderRadius,
  Spacing,
  Shadows,
  BrandColors,
  FontFamilies,
} from "@/constants/theme";

interface BudgetCardProps {
  title: string;
  budget: number;
  spent: number;
  onPress?: () => void;
  onEdit?: () => void;
}

export function BudgetCard({ title, budget, spent, onPress, onEdit }: BudgetCardProps) {
  const { theme } = useTheme();
  const remaining = budget - spent;
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const getProgressColor = () => {
    if (percentage >= 100) return BrandColors.error;
    if (percentage >= 75) return "#D4A574";
    return BrandColors.camel;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {onEdit && (
          <Pressable onPress={onEdit} hitSlop={8} style={styles.editButton}>
            <Feather name="settings" size={16} color={BrandColors.textSecondary} />
          </Pressable>
        )}
      </View>
      <View
        style={[
          styles.progressBackground,
          { backgroundColor: BrandColors.creamDarker },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: getProgressColor() },
          ]}
        />
      </View>

      <View style={styles.amounts}>
        <View style={[styles.statBox, { backgroundColor: BrandColors.creamDark }]}>
          <ThemedText style={styles.statValue}>
            {formatCurrency(budget)}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            Budget
          </ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: BrandColors.creamDark }]}>
          <ThemedText style={styles.statValue}>
            {formatCurrency(spent)}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            Spent
          </ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: BrandColors.creamDark }]}>
          <ThemedText style={styles.statValue}>
            {formatCurrency(remaining)}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            Remaining
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    flex: 1,
  },
  editButton: {
    padding: Spacing.xs,
  },
  amounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statBox: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  progressBackground: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
});
