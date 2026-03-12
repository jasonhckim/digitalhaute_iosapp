import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, FontFamilies } from "@/constants/theme";

interface SectionAction {
  label: string;
  onPress: () => void;
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actions?: SectionAction[];
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  actions,
}: SectionHeaderProps) {
  const { theme } = useTheme();

  const allActions: SectionAction[] = [];
  if (actions) {
    allActions.push(...actions);
  } else if (actionLabel && onAction) {
    allActions.push({ label: actionLabel, onPress: onAction });
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>

      {allActions.length > 0 && (
        <View style={styles.actionsRow}>
          {allActions.map((action, idx) => (
            <Pressable
              key={action.label}
              style={[styles.action, idx > 0 && styles.actionSpacing]}
              onPress={action.onPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ThemedText
                style={[styles.actionLabel, { color: BrandColors.textPrimary }]}
              >
                {action.label}
              </ThemedText>
              <Feather
                name="chevron-right"
                size={16}
                color={BrandColors.textPrimary}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    marginTop: Spacing["2xl"],
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamilies.serifSemiBold,
    color: BrandColors.textPrimary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionSpacing: {
    marginLeft: Spacing.lg,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
