import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
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
import { clearAllData } from "@/lib/seedData";

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({ icon, label, onPress, danger, disabled }: MenuItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: theme.backgroundRoot,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
        Shadows.card,
      ]}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: `${danger ? BrandColors.error : BrandColors.gold}15`,
          },
        ]}
      >
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
      {disabled ? (
        <ThemedText style={{ fontSize: 12, color: theme.textTertiary }}>
          Coming Soon
        </ThemedText>
      ) : (
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      )}
    </Pressable>
  );
}

type AccountScreenNavProp = NativeStackNavigationProp<
  AccountStackParamList,
  "Account"
>;

export default function AccountScreen() {
  const navigation = useNavigation<AccountScreenNavProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const handleLogOut = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out? Your local data will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

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
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: `${BrandColors.gold}15` },
          ]}
        >
          <ThemedText style={[styles.roleText, { color: BrandColors.gold }]}>
            Owner
          </ThemedText>
        </View>
      </View>

      <View style={styles.menuSection}>
        <MenuItem
          icon="settings"
          label="Settings"
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuItem icon="users" label="Team Members" disabled />
        <MenuItem icon="credit-card" label="Billing & Plan" disabled />
        <MenuItem icon="bell" label="Notifications" disabled />
        <MenuItem icon="shield" label="Data & Privacy" disabled />
      </View>

      <View style={styles.menuSection}>
        <MenuItem
          icon="log-out"
          label="Log Out"
          danger
          onPress={handleLogOut}
        />
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
