import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Linking, Pressable } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";
import { VendorStorage, ProductStorage } from "@/lib/storage";
import { Vendor, Product } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "VendorDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function VendorDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [route.params.vendorId]);

  const loadData = async () => {
    try {
      const [vendorData, productsData] = await Promise.all([
        VendorStorage.getById(route.params.vendorId),
        ProductStorage.getByVendor(route.params.vendorId),
      ]);
      setVendor(vendorData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading vendor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Vendor",
      "Are you sure you want to delete this vendor? This will not delete associated products.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!vendor) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await VendorStorage.delete(vendor.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleContact = (type: "email" | "phone" | "website") => {
    if (!vendor) return;
    Haptics.selectionAsync();

    switch (type) {
      case "email":
        if (vendor.email) Linking.openURL(`mailto:${vendor.email}`);
        break;
      case "phone":
        if (vendor.phone) Linking.openURL(`tel:${vendor.phone}`);
        break;
      case "website":
        if (vendor.website) Linking.openURL(vendor.website);
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading || !vendor) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  const activeProducts = products.filter((p) => p.status !== "cancelled");
  const totalSpend = activeProducts.reduce(
    (sum, p) => sum + p.wholesalePrice * p.quantity,
    0
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${BrandColors.gold}15` }]}>
          <ThemedText style={[styles.avatarText, { color: BrandColors.gold }]}>
            {vendor.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText style={styles.vendorName}>{vendor.name}</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <ThemedText style={[styles.statValue, { color: BrandColors.gold }]}>
            {activeProducts.length}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            Products
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <ThemedText style={[styles.statValue, { color: BrandColors.gold }]}>
            {formatCurrency(totalSpend)}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Spend
          </ThemedText>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
        {vendor.contactName ? (
          <View style={styles.contactRow}>
            <Feather name="user" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.contactText}>{vendor.contactName}</ThemedText>
          </View>
        ) : null}
        
        {vendor.email ? (
          <Pressable style={styles.contactRow} onPress={() => handleContact("email")}>
            <Feather name="mail" size={18} color={BrandColors.gold} />
            <ThemedText style={[styles.contactText, { color: BrandColors.gold }]}>
              {vendor.email}
            </ThemedText>
          </Pressable>
        ) : null}
        
        {vendor.phone ? (
          <Pressable style={styles.contactRow} onPress={() => handleContact("phone")}>
            <Feather name="phone" size={18} color={BrandColors.gold} />
            <ThemedText style={[styles.contactText, { color: BrandColors.gold }]}>
              {vendor.phone}
            </ThemedText>
          </Pressable>
        ) : null}
        
        {vendor.website ? (
          <Pressable style={styles.contactRow} onPress={() => handleContact("website")}>
            <Feather name="globe" size={18} color={BrandColors.gold} />
            <ThemedText style={[styles.contactText, { color: BrandColors.gold }]} numberOfLines={1}>
              {vendor.website}
            </ThemedText>
          </Pressable>
        ) : null}
        
        {vendor.paymentTerms ? (
          <View style={styles.contactRow}>
            <Feather name="credit-card" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.contactText}>{vendor.paymentTerms}</ThemedText>
          </View>
        ) : null}
      </View>

      {vendor.notes ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <ThemedText style={[styles.notesLabel, { color: theme.textSecondary }]}>
            Notes
          </ThemedText>
          <ThemedText style={styles.notesText}>{vendor.notes}</ThemedText>
        </View>
      ) : null}

      {products.length > 0 ? (
        <>
          <SectionHeader title={`Products from ${vendor.name}`} />
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
            />
          ))}
        </>
      ) : null}

      <Button variant="secondary" onPress={handleDelete} style={styles.deleteButton}>
        Delete Vendor
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
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
  },
  vendorName: {
    fontSize: 24,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 13,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  contactText: {
    fontSize: 15,
    marginLeft: Spacing.md,
    flex: 1,
  },
  notesLabel: {
    fontSize: 13,
    marginBottom: Spacing.sm,
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
