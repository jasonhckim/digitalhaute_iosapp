import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, BrandColors } from "@/constants/theme";

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatCard({ icon, label, value, sublabel }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
      <View style={styles.iconContainer}>
        <Feather name={icon} size={20} color={BrandColors.gold} />
      </View>
      <ThemedText style={[styles.value, { color: BrandColors.gold }]}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      {sublabel ? (
        <ThemedText style={[styles.sublabel, { color: theme.textTertiary }]}>
          {sublabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    minHeight: 100,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  sublabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
