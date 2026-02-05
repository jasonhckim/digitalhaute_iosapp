import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";
import { AccountStackParamList } from "@/navigation/AccountStackNavigator";

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: theme.backgroundRoot, opacity: pressed ? 0.9 : 1 },
        Shadows.card,
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${danger ? BrandColors.error : BrandColors.gold}15` }]}>
        <Feather
          name={icon}
          size={20}
          color={danger ? BrandColors.error : BrandColors.gold}
        />
      </View>
      <ThemedText
        style={[styles.menuLabel, danger && { color: BrandColors.error }]}
      >
        {label}
      </ThemedText>
      <Feather name="chevron-right" size={20} color={theme.textTertiary} />
    </Pressable>
  );
}

type AccountScreenNavProp = NativeStackNavigationProp<AccountStackParamList, "Account">;

export default function AccountScreen() {
  const navigation = useNavigation<AccountScreenNavProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing["3xl"],
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { borderColor: BrandColors.gold }]}>
          <ThemedText style={[styles.avatarText, { color: BrandColors.gold }]}>
            DH
          </ThemedText>
        </View>
        <ThemedText style={styles.userName}>Fashion Boutique</ThemedText>
        <View style={[styles.roleBadge, { backgroundColor: `${BrandColors.gold}15` }]}>
          <ThemedText style={[styles.roleText, { color: BrandColors.gold }]}>
            Owner
          </ThemedText>
        </View>
      </View>

      <View style={styles.menuSection}>
        <MenuItem icon="settings" label="Settings" onPress={() => navigation.navigate("Settings")} />
        <MenuItem icon="users" label="Team Members" />
        <MenuItem icon="credit-card" label="Billing & Plan" />
        <MenuItem icon="bell" label="Notifications" />
        <MenuItem icon="shield" label="Data & Privacy" />
      </View>

      <View style={styles.menuSection}>
        <MenuItem icon="log-out" label="Log Out" danger />
      </View>

      <ThemedText style={[styles.version, { color: theme.textTertiary }]}>
        Digital Haute v1.0.0
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
  },
  userName: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
  },
  version: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
});
