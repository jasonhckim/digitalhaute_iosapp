import React, { useState } from "react";
import { View, TextInput, StyleSheet, TextInputProps } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, BrandColors } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText style={[styles.label, { color: BrandColors.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: BrandColors.cream,
            borderColor: error
              ? BrandColors.error
              : isFocused
                ? BrandColors.camel
                : BrandColors.border,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        selectionColor={BrandColors.camel}
        {...props}
      />

      {error ? (
        <ThemedText style={[styles.error, { color: BrandColors.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
