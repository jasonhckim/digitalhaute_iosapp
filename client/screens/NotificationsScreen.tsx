import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Switch, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import type { NotificationSettings } from "@/types";

const STORAGE_KEY = "@digitalhaute/notifications";

const defaults: NotificationSettings = {
  deliveryAlerts: true,
  budgetAlerts: true,
  orderStatusUpdates: true,
  weeklySummary: false,
};

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onToggle }: ToggleRowProps) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: BrandColors.creamDark },
      ]}
    >
      <View style={styles.rowTextCol}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText style={styles.rowDescription}>{description}</ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: BrandColors.border, true: BrandColors.camel }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSignedIn = !!user;

  const [settings, setSettings] = useState<NotificationSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (isSignedIn) {
          const res = await apiRequest("GET", "/api/notifications/preferences");
          const data = await res.json();
          setSettings({ ...defaults, ...data.preferences });
        } else {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
        }
      } catch {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  const update = useCallback(
    (key: keyof NotificationSettings, value: boolean) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      if (isSignedIn) {
        apiRequest("PATCH", "/api/notifications/preferences", { [key]: value }).catch((err) =>
          console.warn("Failed to sync notification preference:", err),
        );
      }
    },
    [settings, isSignedIn],
  );

  const handleEnablePush = useCallback(async () => {
    const token = await registerForPushNotifications();
    setPushEnabled(!!token);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: BrandColors.cream }]}>
        <ActivityIndicator size="small" color={BrandColors.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: BrandColors.cream }]}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      {isSignedIn && pushEnabled === null && (
        <Pressable
          style={({ pressed }) => [
            styles.enableButton,
            { backgroundColor: BrandColors.gold, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleEnablePush}
        >
          <ThemedText style={styles.enableButtonText}>Enable Push Notifications</ThemedText>
        </Pressable>
      )}

      {pushEnabled === false && (
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
          Push notifications were not enabled. You can enable them later in your device settings.
        </ThemedText>
      )}

      <View style={styles.list}>
        <ToggleRow
          label="Delivery Alerts"
          description="When products ship, arrive, or are received"
          value={settings.deliveryAlerts}
          onToggle={(v) => update("deliveryAlerts", v)}
        />
        <ToggleRow
          label="Budget Alerts"
          description="When a budget exceeds its limit"
          value={settings.budgetAlerts}
          onToggle={(v) => update("budgetAlerts", v)}
        />
        <ToggleRow
          label="Order Status Updates"
          description="Any product status change"
          value={settings.orderStatusUpdates}
          onToggle={(v) => update("orderStatusUpdates", v)}
        />
        <ToggleRow
          label="Weekly Summary"
          description="A digest of your products and budgets each week"
          value={settings.weeklySummary}
          onToggle={(v) => update("weeklySummary", v)}
        />
      </View>

      {!isSignedIn && (
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
          Sign in to receive remote push notifications. Preferences saved locally for now.
        </ThemedText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  rowTextCol: {
    flex: 1,
    marginRight: Spacing.md,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "500",
  },
  rowDescription: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  enableButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  enableButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
});
