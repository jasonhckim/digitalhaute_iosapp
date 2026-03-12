import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";

export default function TeamMembersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: Spacing["3xl"],
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      <View style={styles.placeholder}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${BrandColors.gold}15` },
          ]}
        >
          <Feather name="users" size={48} color={BrandColors.gold} />
        </View>
        <ThemedText style={styles.title}>Team Members</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Invite and manage your team. This feature is coming soon.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
