import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { FEATURE_UPGRADE_COPY, getUpgradeCtaText, type PlanId } from "@/lib/plans";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";

export type UpgradeFeatureId = keyof typeof FEATURE_UPGRADE_COPY;

interface UpgradePromptModalProps {
  visible: boolean;
  featureId: UpgradeFeatureId;
  requiredPlan?: PlanId;
  onDismiss: () => void;
  onUpgrade: () => void;
}

export function UpgradePromptModal({
  visible,
  featureId,
  requiredPlan = "growth",
  onDismiss,
  onUpgrade,
}: UpgradePromptModalProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const copy = FEATURE_UPGRADE_COPY[featureId];

  if (!copy) return null;

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
    onUpgrade();
  };

  const handleDismiss = () => {
    Haptics.selectionAsync();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        onPress={handleDismiss}
      >
        <Pressable
          style={[
            styles.content,
            {
              backgroundColor: theme.backgroundRoot,
              maxWidth: Math.min(width - Spacing.xl * 2, 360),
            },
            Shadows.card,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${BrandColors.gold}15` },
            ]}
          >
            <Feather name="zap" size={32} color={BrandColors.gold} />
          </View>

          <ThemedText style={styles.title}>{copy.title}</ThemedText>
          <ThemedText
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {copy.description}
          </ThemedText>

          <View style={styles.actions}>
            <Button
              variant="secondary"
              onPress={handleDismiss}
              style={styles.dismissButton}
            >
              Maybe Later
            </Button>
            <Button onPress={handleUpgrade} style={styles.upgradeButton}>
              {copy.requiredPlan ? getUpgradeCtaText(copy.requiredPlan) : `Upgrade to ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  content: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  actions: {
    width: "100%",
    gap: Spacing.md,
  },
  dismissButton: {
    width: "100%",
  },
  upgradeButton: {
    width: "100%",
  },
});
