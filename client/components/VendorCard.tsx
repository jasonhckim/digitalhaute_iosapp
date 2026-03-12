import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  BorderRadius,
  Spacing,
  BrandColors,
  FontFamilies,
} from "@/constants/theme";
import { Vendor } from "@/types";

interface VendorCardProps {
  vendor: Vendor;
  productCount?: number;
  totalSpend?: number;
  onPress?: () => void;
  onToggleFavorite?: () => void;
}

export function VendorCard({
  vendor,
  productCount = 0,
  totalSpend = 0,
  onPress,
  onToggleFavorite,
}: VendorCardProps) {
  const { theme } = useTheme();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: BrandColors.creamDark,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <ThemedText style={styles.name}>{vendor.name}</ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {productCount} products | Spent {formatCurrency(totalSpend)}
          </ThemedText>
        </View>
        {onToggleFavorite && (
          <Pressable
            onPress={() => onToggleFavorite()}
            hitSlop={8}
            style={styles.favoriteButton}
          >
            <Ionicons
              name={vendor.isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={vendor.isFavorite ? BrandColors.error : theme.textTertiary}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: FontFamilies.serif,
    color: BrandColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  favoriteButton: {
    padding: Spacing.xs,
  },
});
