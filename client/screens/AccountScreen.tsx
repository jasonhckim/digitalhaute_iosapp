import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { hasFeature } from "@/lib/plans";
import {
  Spacing,
  BorderRadius,
  BrandColors,
  FontFamilies,
} from "@/constants/theme";
import { AccountStackParamList } from "@/navigation/AccountStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  disabled,
  disabledLabel = "Coming Soon",
}: MenuItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: BrandColors.creamDark,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
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
            backgroundColor: danger
              ? `${BrandColors.error}15`
              : `${BrandColors.camel}15`,
          },
        ]}
      >
        <Feather
          name={icon}
          size={20}
          color={danger ? BrandColors.error : BrandColors.camel}
        />
      </View>
      <ThemedText
        style={[styles.menuLabel, danger && { color: BrandColors.error }]}
      >
        {label}
      </ThemedText>
      {disabled ? (
        <ThemedText style={{ fontSize: 12, color: theme.textTertiary }}>
          {disabledLabel}
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
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const [showTeamUpgradeModal, setShowTeamUpgradeModal] = useState(false);

  const canUseTeamMembers = hasFeature(user?.subscriptionPlan, "teamMembers");

  const handleTeamMembersPress = () => {
    if (canUseTeamMembers) {
      navigation.navigate("TeamMembers");
    } else {
      setShowTeamUpgradeModal(true);
    }
  };

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
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const getInitials = (): string => {
    if (!user) return "G";
    const parts = user.businessName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.businessName.substring(0, 2).toUpperCase();
  };

  const displayName = user?.businessName || "Guest";
  const personalName = user?.name || "";
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Guest";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: BrandColors.cream }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing["3xl"],
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.profileSection}>
        <Pressable
          onPress={() =>
            isAuthenticated ? navigation.navigate("EditProfile") : undefined
          }
          style={styles.avatarWrapper}
        >
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={[styles.avatarImage, { borderColor: BrandColors.camel }]}
            />
          ) : (
            <View style={[styles.avatar, { borderColor: BrandColors.camel }]}>
              <ThemedText
                style={[styles.avatarText, { color: BrandColors.camel }]}
              >
                {getInitials()}
              </ThemedText>
            </View>
          )}
          {isAuthenticated && (
            <View style={styles.editBadge}>
              <Feather name="edit-2" size={12} color={BrandColors.cream} />
            </View>
          )}
        </Pressable>
        <ThemedText style={styles.userName}>{displayName}</ThemedText>
        {personalName ? (
          <ThemedText
            style={[styles.personalName, { color: theme.textSecondary }]}
          >
            {personalName}
          </ThemedText>
        ) : null}
        {user?.email ? (
          <ThemedText
            style={[styles.emailText, { color: theme.textTertiary }]}
          >
            {user.email}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: `${BrandColors.camel}15` },
          ]}
        >
          <ThemedText style={[styles.roleText, { color: BrandColors.camel }]}>
            {displayRole}
          </ThemedText>
        </View>
      </View>

      {isGuest && !isAuthenticated ? (
        <View style={styles.menuSection}>
          <Button onPress={() => rootNavigation.navigate("Register")}>
            Log In or Create Account
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.menuSection}>
            <MenuItem
              icon="user"
              label="Edit Profile"
              onPress={() => navigation.navigate("EditProfile")}
            />
            <MenuItem
              icon="settings"
              label="Settings"
              onPress={() => navigation.navigate("Settings")}
            />
            <MenuItem
              icon="gift"
              label="Collaboration"
              onPress={() => navigation.navigate("Collaboration")}
            />
            <MenuItem
              icon="users"
              label="Team Members"
              onPress={handleTeamMembersPress}
            />
            <MenuItem
              icon="credit-card"
              label="Billing & Plan"
              onPress={() => navigation.navigate("Billing")}
            />
            <MenuItem
              icon="bell"
              label="Notifications"
              onPress={() => navigation.navigate("Notifications")}
            />
            <MenuItem
              icon="shield"
              label="Data & Privacy"
              onPress={() => navigation.navigate("DataPrivacy")}
            />
          </View>

          <View style={styles.menuSection}>
            <MenuItem
              icon="log-out"
              label="Log Out"
              danger
              onPress={handleLogOut}
            />
          </View>
        </>
      )}

      <ThemedText style={[styles.version, { color: theme.textTertiary }]}>
        Digital Haute v1.0.0
      </ThemedText>

      <UpgradePromptModal
        visible={showTeamUpgradeModal}
        featureId="teamMembers"
        onDismiss={() => setShowTeamUpgradeModal(false)}
        onUpgrade={() => {
          setShowTeamUpgradeModal(false);
          navigation.navigate("Billing");
        }}
      />
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
  avatarWrapper: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BrandColors.camel,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BrandColors.cream,
  },
  userName: {
    fontSize: 22,
    fontFamily: FontFamilies.serifSemiBold,
    marginBottom: 2,
    color: BrandColors.textPrimary,
  },
  personalName: {
    fontSize: 15,
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
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
    gap: Spacing.sm,
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
