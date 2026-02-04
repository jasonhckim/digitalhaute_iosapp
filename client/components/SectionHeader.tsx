import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      
      {actionLabel && onAction ? (
        <Pressable 
          style={styles.action} 
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={[styles.actionLabel, { color: BrandColors.gold }]}>
            {actionLabel}
          </ThemedText>
          <Feather name="chevron-right" size={16} color={BrandColors.gold} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
