import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Pressable,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";
import { ProductStorage, BudgetStorage } from "@/lib/storage";
import { Product, ProductStatus, STATUS_LABELS } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "ProductDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [route.params.productId]);

  const loadProduct = async () => {
    try {
      const data = await ProductStorage.getById(route.params.productId);
      setProduct(data);
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!product) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const updated = await ProductStorage.update(product.id, {
        status: newStatus as ProductStatus,
        receivedDate:
          newStatus === "received" ? new Date().toISOString() : undefined,
      });
      if (updated) {
        setProduct(updated);
        const products = await ProductStorage.getAll();
        await BudgetStorage.updateSpent(products);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!product) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await ProductStorage.delete(product.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading || !product) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      {product.imageUri ? (
        <Image source={{ uri: product.imageUri }} style={styles.image} />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="image" size={48} color={theme.textTertiary} />
        </View>
      )}

      <View style={styles.header}>
        <ThemedText style={styles.productName}>{product.name}</ThemedText>
        <StatusBadge status={product.status} />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundRoot },
          Shadows.card,
        ]}
      >
        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Vendor
          </ThemedText>
          <ThemedText style={styles.detailValue}>
            {product.vendorName}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Style #
          </ThemedText>
          <ThemedText style={styles.detailValue}>
            {product.styleNumber}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Category
          </ThemedText>
          <ThemedText style={styles.detailValue}>{product.category}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Season
          </ThemedText>
          <ThemedText style={styles.detailValue}>{product.season}</ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundRoot },
          Shadows.card,
        ]}
      >
        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Wholesale Price
          </ThemedText>
          <ThemedText style={[styles.priceValue, { color: BrandColors.gold }]}>
            {formatCurrency(product.wholesalePrice)}
          </ThemedText>
        </View>

        {product.retailPrice ? (
          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Retail Price
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatCurrency(product.retailPrice)}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Quantity
          </ThemedText>
          <ThemedText style={styles.detailValue}>{product.quantity}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Total Cost
          </ThemedText>
          <ThemedText style={[styles.priceValue, { color: BrandColors.gold }]}>
            {formatCurrency(product.wholesalePrice * product.quantity)}
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundRoot },
          Shadows.card,
        ]}
      >
        <View style={styles.detailRow}>
          <ThemedText
            style={[styles.detailLabel, { color: theme.textSecondary }]}
          >
            Delivery Date
          </ThemedText>
          <ThemedText style={styles.detailValue}>
            {formatDate(product.deliveryDate)}
          </ThemedText>
        </View>

        {product.receivedDate ? (
          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Received Date
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatDate(product.receivedDate)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {product.notes ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <ThemedText
            style={[
              styles.detailLabel,
              { color: theme.textSecondary, marginBottom: Spacing.sm },
            ]}
          >
            Notes
          </ThemedText>
          <ThemedText style={styles.notesText}>{product.notes}</ThemedText>
        </View>
      ) : null}

      <Select
        label="Update Status"
        options={statusOptions}
        value={product.status}
        onChange={handleStatusChange}
      />

      <Button
        variant="secondary"
        onPress={handleDelete}
        style={styles.deleteButton}
      >
        Delete Product
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    marginRight: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontSize: 15,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  deleteButton: {
    marginTop: Spacing.md,
    borderColor: BrandColors.error,
  },
});
