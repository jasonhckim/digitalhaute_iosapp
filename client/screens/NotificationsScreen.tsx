import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
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
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleRow({ label, value, onToggle }: ToggleRowProps) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: BrandColors.creamDark },
      ]}
    >
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
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
  const [settings, setSettings] = useState<NotificationSettings>(defaults);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        setSettings({ ...defaults, ...JSON.parse(raw) });
      }
    });
  }, []);

  const update = (key: keyof NotificationSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
      <View style={styles.list}>
        <ToggleRow
          label="Delivery Alerts"
          value={settings.deliveryAlerts}
          onToggle={(v) => update("deliveryAlerts", v)}
        />
        <ToggleRow
          label="Budget Alerts"
          value={settings.budgetAlerts}
          onToggle={(v) => update("budgetAlerts", v)}
        />
        <ToggleRow
          label="Order Status Updates"
          value={settings.orderStatusUpdates}
          onToggle={(v) => update("orderStatusUpdates", v)}
        />
        <ToggleRow
          label="Weekly Summary"
          value={settings.weeklySummary}
          onToggle={(v) => update("weeklySummary", v)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  rowLabel: {
    fontSize: 17,
    fontWeight: "500",
    flex: 1,
  },
});
