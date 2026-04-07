import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BrandColors } from "@/constants/theme";

type Variant = "signin" | "signup";

type Props = {
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

const LABELS: Record<Variant, string> = {
  signin: "Sign in with Google",
  signup: "Sign up with Google",
};

/**
 * Custom button (Google does not provide a system component).
 * Light surface, neutral border — aligns with common Google sign-in patterns.
 */
export function GoogleSignInButton({
  onPress,
  variant = "signin",
  disabled = false,
  loading = false,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LABELS[variant]}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={BrandColors.textPrimary} />
      ) : (
        <View style={styles.row}>
          <FontAwesome name="google" size={22} color="#4285F4" />
          <ThemedText style={styles.label}>{LABELS[variant]}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BrandColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
    color: BrandColors.textPrimary,
    letterSpacing: -0.2,
  },
});
