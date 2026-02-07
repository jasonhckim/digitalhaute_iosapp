import React from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows, BrandColors } from "@/constants/theme";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onLongPress,
  isSelected,
  selectionMode,
}: ProductCardProps) {
  const { theme } = useTheme();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundRoot,
          opacity: pressed ? 0.95 : 1,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? BrandColors.gold : "transparent",
        },
        Shadows.card,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.content}>
        {selectionMode ? (
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected ? (
              <Feather name="check" size={16} color="#fff" />
            ) : null}
          </View>
        ) : null}
        {product.imageUri ? (
          <Image source={{ uri: product.imageUri }} style={styles.image} />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="image" size={24} color={theme.textTertiary} />
          </View>
        )}

        <View style={styles.details}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {product.name}
          </ThemedText>

          <ThemedText
            style={[styles.vendor, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {product.vendorName}
          </ThemedText>

          <View style={styles.metaRow}>
            <ThemedText
              style={[styles.styleNumber, { color: theme.textTertiary }]}
            >
              #{product.styleNumber}
            </ThemedText>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: `${BrandColors.gold}15` },
              ]}
            >
              <ThemedText
                style={[styles.categoryText, { color: BrandColors.gold }]}
              >
                {product.category}
              </ThemedText>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.priceContainer}>
              <ThemedText style={[styles.price, { color: BrandColors.gold }]}>
                {formatCurrency(product.wholesalePrice)}
              </ThemedText>
              <ThemedText
                style={[styles.quantity, { color: theme.textTertiary }]}
              >
                x{product.quantity}
              </ThemedText>
            </View>

            <StatusBadge status={product.status} />
          </View>

          <View style={styles.deliveryRow}>
            <Feather name="calendar" size={12} color={theme.textTertiary} />
            <ThemedText
              style={[styles.deliveryText, { color: theme.textTertiary }]}
            >
              {formatDate(product.deliveryDate)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    padding: Spacing.md,
  },
  image: {
    width: 80,
    height: 100,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#f0f0f0",
  },
  imagePlaceholder: {
    width: 80,
    height: 100,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  vendor: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  styleNumber: {
    fontSize: 12,
    marginRight: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  quantity: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryText: {
    fontSize: 11,
    marginLeft: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BrandColors.gold,
    marginRight: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: BrandColors.gold,
  },
});
