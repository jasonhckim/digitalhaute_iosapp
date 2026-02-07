import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, BrandColors } from "@/constants/theme";

interface BudgetCardProps {
  title: string;
  budget: number;
  spent: number;
  onPress?: () => void;
}

export function BudgetCard({ title, budget, spent, onPress }: BudgetCardProps) {
  const { theme } = useTheme();
  const remaining = budget - spent;
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const getProgressColor = () => {
    if (percentage >= 100) return BrandColors.error;
    if (percentage >= 90) return "#F59E0B";
    if (percentage >= 75) return "#F59E0B";
    return BrandColors.gold;
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
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundRoot, opacity: pressed ? 0.9 : 1 },
        Shadows.card,
      ]}
      onPress={onPress}
    >
      <ThemedText style={styles.title}>{title}</ThemedText>

      <View style={styles.amounts}>
        <View>
          <ThemedText
            style={[styles.amountLabel, { color: theme.textTertiary }]}
          >
            Budget
          </ThemedText>
          <ThemedText style={[styles.amount, { color: BrandColors.gold }]}>
            {formatCurrency(budget)}
          </ThemedText>
        </View>
        <View>
          <ThemedText
            style={[styles.amountLabel, { color: theme.textTertiary }]}
          >
            Spent
          </ThemedText>
          <ThemedText style={styles.amount}>{formatCurrency(spent)}</ThemedText>
        </View>
        <View>
          <ThemedText
            style={[styles.amountLabel, { color: theme.textTertiary }]}
          >
            Remaining
          </ThemedText>
          <ThemedText
            style={[
              styles.amount,
              {
                color: remaining >= 0 ? BrandColors.success : BrandColors.error,
              },
            ]}
          >
            {formatCurrency(remaining)}
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.progressBackground,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: getProgressColor() },
          ]}
        />
      </View>

      <ThemedText style={[styles.percentage, { color: theme.textTertiary }]}>
        {percentage.toFixed(0)}% used
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  amounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  percentage: {
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: "right",
  },
});
