import React from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAccount, exportUserData } from "@/lib/auth";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import type { AccountStackParamList } from "@/navigation/AccountStackNavigator";

interface ActionRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function ActionRow({ icon, label, onPress, danger }: ActionRowProps) {
  return (
    <Pressable
      style={[
        styles.row,
        { backgroundColor: BrandColors.creamDark },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
    >
      <Feather
        name={icon}
        size={20}
        color={danger ? BrandColors.error : BrandColors.camel}
      />
      <ThemedText
        style={[styles.rowLabel, danger && { color: BrandColors.error }]}
      >
        {label}
      </ThemedText>
      <Feather name="chevron-right" size={20} color={BrandColors.textTertiary} />
    </Pressable>
  );
}

export default function DataPrivacyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const { logout, isAuthenticated } = useAuth();

  const handleExport = async () => {
    try {
      const storageKeys = [
        "@digitalhaute/products",
        "@digitalhaute/vendors",
        "@digitalhaute/budgets",
        "@digitalhaute/settings",
        "@digitalhaute/notifications",
      ];

      const pairs = await AsyncStorage.multiGet(storageKeys);
      const localData: Record<string, unknown> = {};
      for (const [key, value] of pairs) {
        if (value) {
          try {
            localData[key] = JSON.parse(value);
          } catch {
            localData[key] = value;
          }
        }
      }

      let serverData: Record<string, unknown> = {};
      if (isAuthenticated) {
        try {
          serverData = await exportUserData();
        } catch {
          // ignore server errors — still export local data
        }
      }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        serverProfile: serverData,
        localData,
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const fileName = `digitalhaute-export-${Date.now()}.json`;
      const filePath = `${cacheDirectory}${fileName}`;

      await writeAsStringAsync(filePath, json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/json",
          dialogTitle: "Export My Data",
        });
      } else {
        Alert.alert("Export Complete", "Data file created.");
      }
    } catch (error) {
      Alert.alert(
        "Export Failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "This is irreversible. All your data will be lost.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete My Account",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      await logout();
                    } catch (error) {
                      Alert.alert(
                        "Error",
                        error instanceof Error
                          ? error.message
                          : "Failed to delete account.",
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: BrandColors.cream }]}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.section}>
        <ActionRow
          icon="download"
          label="Export My Data"
          onPress={handleExport}
        />
        {isAuthenticated && (
          <ActionRow
            icon="trash-2"
            label="Delete My Account"
            onPress={handleDeleteAccount}
            danger
          />
        )}
      </View>

      <View style={styles.section}>
        <ActionRow
          icon="file-text"
          label="Privacy Policy"
          onPress={() => navigation.navigate("PrivacyPolicy")}
        />
        <ActionRow
          icon="book"
          label="Terms of Service"
          onPress={() => navigation.navigate("TermsOfService")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
  },
});
