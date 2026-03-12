import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
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
  gridMode?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onLongPress,
  isSelected,
  selectionMode,
  gridMode = false,
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

  if (gridMode) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.gridCard,
          {
            opacity: pressed ? 0.9 : 1,
            borderWidth: isSelected ? 2 : 0,
            borderColor: isSelected ? BrandColors.camel : "transparent",
          },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        {selectionMode ? (
          <View style={styles.gridCheckbox}>
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected ? (
                <Feather name="check" size={14} color="#fff" />
              ) : null}
            </View>
          </View>
        ) : null}
        {product.imageUri ? (
          <Image
            source={{ uri: product.imageUri }}
            style={styles.gridImage}
          />
        ) : (
          <View
            style={[
              styles.gridImagePlaceholder,
              { backgroundColor: BrandColors.creamDarker },
            ]}
          >
            <Feather name="image" size={28} color={BrandColors.sand} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: BrandColors.creamDark,
          opacity: pressed ? 0.95 : 1,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? BrandColors.camel : "transparent",
        },
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
              { backgroundColor: BrandColors.creamDarker },
            ]}
          >
            <Feather name="image" size={24} color={BrandColors.sand} />
          </View>
        )}

        <View style={styles.details}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {product.name}
          </ThemedText>

          {product.scanStatus === "processing" ? (
            <View style={styles.scanBadge}>
              <ActivityIndicator size={10} color={BrandColors.camel} />
              <ThemedText style={styles.scanBadgeText}>
                Processing...
              </ThemedText>
            </View>
          ) : product.scanStatus === "failed" ? (
            <View style={styles.scanBadge}>
              <Feather name="alert-circle" size={10} color="#e74c3c" />
              <ThemedText style={[styles.scanBadgeText, { color: "#e74c3c" }]}>
                Scan failed
              </ThemedText>
            </View>
          ) : null}

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
                { backgroundColor: `${BrandColors.camel}15` },
              ]}
            >
              <ThemedText
                style={[styles.categoryText, { color: BrandColors.camel }]}
              >
                {product.category}
              </ThemedText>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.priceContainer}>
              <ThemedText style={[styles.price, { color: BrandColors.camel }]}>
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
    backgroundColor: BrandColors.creamDarker,
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
  scanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  scanBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: BrandColors.camel,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BrandColors.camel,
    marginRight: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: BrandColors.camel,
  },
  // Grid mode styles
  gridCard: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    margin: Spacing.xs,
  },
  gridCheckbox: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
  },
  gridImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
