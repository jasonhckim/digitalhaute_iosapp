import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { SettingsStorage } from "@/lib/storage";
import { AppSettings } from "@/types";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [markupText, setMarkupText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loaded = await SettingsStorage.get();
    setSettings(loaded);
    setMarkupText(loaded.markupMultiplier.toString());
  };

  const handleSave = async () => {
    if (!settings) return;

    const multiplier = parseFloat(markupText) || 2.5;
    const updatedSettings: AppSettings = {
      ...settings,
      markupMultiplier: multiplier,
    };

    setIsSaving(true);
    await SettingsStorage.save(updatedSettings);
    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const toggleRoundUp = () => {
    if (!settings) return;
    Haptics.selectionAsync();
    setSettings({ ...settings, roundUpPrices: !settings.roundUpPrices });
  };

  const exampleWholesale = 14.97;
  const multiplier = parseFloat(markupText) || 0;
  const rawRetail = exampleWholesale * multiplier;
  const exampleRetail = settings?.roundUpPrices
    ? Math.ceil(rawRetail)
    : Math.round(rawRetail * 100) / 100;

  if (!settings) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={BrandColors.gold} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${BrandColors.gold}15` }]}>
              <Feather name="percent" size={20} color={BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>Pricing Markup</ThemedText>
          </View>

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Markup Multiplier
          </ThemedText>
          <View style={[styles.inputRow, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={markupText}
              onChangeText={setMarkupText}
              keyboardType="decimal-pad"
              placeholder="2.5"
              placeholderTextColor={theme.textTertiary}
            />
            <ThemedText style={[styles.inputSuffix, { color: theme.textSecondary }]}>
              x wholesale
            </ThemedText>
          </View>
          <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
            Retail price = Wholesale price x {markupText || "0"}
          </ThemedText>

          <View style={styles.divider} />

          <Pressable style={styles.toggleRow} onPress={toggleRoundUp}>
            <View style={styles.toggleInfo}>
              <ThemedText style={styles.toggleLabel}>Round Up Prices</ThemedText>
              <ThemedText style={[styles.toggleHint, { color: theme.textSecondary }]}>
                Round retail prices to the next whole dollar
              </ThemedText>
            </View>
            <Switch
              value={settings.roundUpPrices}
              onValueChange={toggleRoundUp}
              trackColor={{ false: theme.border, true: BrandColors.gold }}
              thumbColor="#fff"
            />
          </Pressable>
        </View>

        <View style={[styles.previewCard, { backgroundColor: `${BrandColors.gold}10` }]}>
          <View style={styles.previewHeader}>
            <Feather name="eye" size={16} color={BrandColors.gold} />
            <ThemedText style={[styles.previewTitle, { color: BrandColors.gold }]}>
              Preview
            </ThemedText>
          </View>
          <View style={styles.previewRow}>
            <ThemedText style={[styles.previewLabel, { color: theme.textSecondary }]}>
              Wholesale:
            </ThemedText>
            <ThemedText style={styles.previewValue}>
              ${exampleWholesale.toFixed(2)}
            </ThemedText>
          </View>
          <View style={styles.previewRow}>
            <ThemedText style={[styles.previewLabel, { color: theme.textSecondary }]}>
              Retail:
            </ThemedText>
            <ThemedText style={[styles.previewValue, { color: BrandColors.gold }]}>
              ${multiplier > 0 ? exampleRetail.toFixed(2) : "—"}
            </ThemedText>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: BrandColors.gold, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Settings</ThemedText>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  inputSuffix: {
    fontSize: 15,
  },
  hint: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: Spacing.xl,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 13,
  },
  previewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  previewLabel: {
    fontSize: 15,
  },
  previewValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
