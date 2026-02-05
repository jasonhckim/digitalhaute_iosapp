import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { SettingsStorage } from "@/lib/storage";
import { AppSettings, RoundingMode, ShopifyStatus } from "@/types";
import { checkShopifyStatus } from "@/lib/shopify";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [markupText, setMarkupText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatus | null>(null);
  const [shopifyLoading, setShopifyLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadShopifyStatus = useCallback(async () => {
    setShopifyLoading(true);
    try {
      const status = await checkShopifyStatus();
      setShopifyStatus(status);
    } catch {
      setShopifyStatus(null);
    } finally {
      setShopifyLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShopifyStatus();
    }, [loadShopifyStatus])
  );

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

  const setRoundingMode = (mode: RoundingMode) => {
    if (!settings) return;
    Haptics.selectionAsync();
    setSettings({ ...settings, roundingMode: mode });
  };

  const exampleWholesale = 14.97;
  const multiplier = parseFloat(markupText) || 0;
  const rawRetail = exampleWholesale * multiplier;
  
  const calculatePreviewPrice = (): number => {
    if (!settings) return rawRetail;
    switch (settings.roundingMode) {
      case 'up':
        return Math.ceil(rawRetail);
      case 'even':
        const rounded = Math.ceil(rawRetail);
        return rounded % 2 === 0 ? rounded : rounded + 1;
      default:
        return Math.round(rawRetail * 100) / 100;
    }
  };
  const exampleRetail = calculatePreviewPrice();

  const roundingOptions: { mode: RoundingMode; label: string; hint: string }[] = [
    { mode: 'none', label: 'No Rounding', hint: '$41.92 stays $41.92' },
    { mode: 'up', label: 'Round Up', hint: '$41.92 becomes $42' },
    { mode: 'even', label: 'Round to Even', hint: '$41.92 becomes $42, $43 becomes $44' },
  ];

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

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Price Rounding
          </ThemedText>
          <View style={styles.roundingOptions}>
            {roundingOptions.map((option) => (
              <Pressable
                key={option.mode}
                style={[
                  styles.roundingOption,
                  { 
                    borderColor: settings.roundingMode === option.mode ? BrandColors.gold : theme.border,
                    backgroundColor: settings.roundingMode === option.mode ? `${BrandColors.gold}10` : 'transparent',
                  },
                ]}
                onPress={() => setRoundingMode(option.mode)}
              >
                <View style={styles.radioOuter}>
                  {settings.roundingMode === option.mode ? (
                    <View style={[styles.radioInner, { backgroundColor: BrandColors.gold }]} />
                  ) : null}
                </View>
                <View style={styles.roundingOptionText}>
                  <ThemedText style={styles.roundingOptionLabel}>{option.label}</ThemedText>
                  <ThemedText style={[styles.roundingOptionHint, { color: theme.textSecondary }]}>
                    {option.hint}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
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

        <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: shopifyStatus?.connected ? "#e6f4ea" : `${BrandColors.gold}15` }]}>
              <Feather name="shopping-bag" size={20} color={shopifyStatus?.connected ? "#34a853" : BrandColors.gold} />
            </View>
            <ThemedText style={styles.sectionTitle}>Shopify Integration</ThemedText>
          </View>

          {shopifyLoading ? (
            <View style={styles.shopifyLoadingContainer}>
              <ActivityIndicator size="small" color={BrandColors.gold} />
            </View>
          ) : shopifyStatus?.connected ? (
            <View>
              <View style={styles.shopifyConnectedRow}>
                <View style={[styles.shopifyStatusDot, { backgroundColor: "#34a853" }]} />
                <ThemedText style={styles.shopifyConnectedText}>Connected</ThemedText>
              </View>
              <ThemedText style={[styles.shopifyDomain, { color: theme.textSecondary }]}>
                {shopifyStatus.shopDomain}
              </ThemedText>
              {shopifyStatus.connectedAt ? (
                <ThemedText style={[styles.shopifyDate, { color: theme.textTertiary }]}>
                  Connected {new Date(shopifyStatus.connectedAt).toLocaleDateString()}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  Linking.openURL("https://digital-haute.replit.app/shopify");
                }}
                style={styles.shopifyDisconnectLink}
              >
                <ThemedText style={[styles.shopifyDisconnectText, { color: theme.textTertiary }]}>
                  Disconnect
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View>
              <ThemedText style={[styles.shopifyDescription, { color: theme.textSecondary }]}>
                Connect your Shopify store to export products directly from the app.
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.shopifyConnectButton,
                  { backgroundColor: BrandColors.gold, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Linking.openURL("https://digital-haute.replit.app/shopify");
                }}
              >
                <Feather name="shopping-bag" size={18} color="#fff" />
                <ThemedText style={styles.shopifyConnectButtonText}>Connect Store</ThemedText>
              </Pressable>
            </View>
          )}
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
  roundingOptions: {
    gap: Spacing.sm,
  },
  roundingOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BrandColors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roundingOptionText: {
    flex: 1,
  },
  roundingOptionLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  roundingOptionHint: {
    fontSize: 12,
    marginTop: 2,
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
  shopifyLoadingContainer: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  shopifyConnectedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  shopifyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  shopifyConnectedText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34a853",
  },
  shopifyDomain: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  shopifyDate: {
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  shopifyDisconnectLink: {
    paddingVertical: Spacing.xs,
  },
  shopifyDisconnectText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  shopifyDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  shopifyConnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  shopifyConnectButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
