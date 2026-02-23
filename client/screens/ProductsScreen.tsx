import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  Pressable,
  Alert,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import {
  ProductStorage,
  VendorStorage,
  SettingsStorage,
  calculateRetailPrice,
} from "@/lib/storage";
import { checkShopifyStatus, exportToShopify } from "@/lib/shopify";
import { Product, Vendor, CATEGORIES, AppSettings } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { hasGrowthFeature } from "@/lib/plans";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { requireAuth } = useRequireAuth();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingShopify, setIsExportingShopify] = useState(false);
  const [showShopifyUpgradeModal, setShowShopifyUpgradeModal] = useState(false);

  const canUseShopifyExport = hasGrowthFeature(user?.subscriptionPlan);

  const loadData = useCallback(async () => {
    try {
      const [productsData, vendorsData, settingsData] = await Promise.all([
        ProductStorage.getAll(),
        VendorStorage.getAll(),
        SettingsStorage.get(),
      ]);
      setProducts(productsData);
      setVendors(vendorsData);
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const handleAddProduct = () => {
    requireAuth(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("QuickAddProduct");
    });
  };

  const toggleSelection = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterSelectionMode = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    Haptics.selectionAsync();
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  };

  const generateShopifyCSV = async () => {
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    if (selectedProducts.length === 0) return;

    const headers = [
      "Title",
      "Handle",
      "Body (HTML)",
      "Vendor",
      "Product Category",
      "Type",
      "Tags",
      "Published",
      "Option1 Name",
      "Option1 Value",
      "Option2 Name",
      "Option2 Value",
      "Variant SKU",
      "Variant Grams",
      "Variant Inventory Tracker",
      "Variant Inventory Qty",
      "Variant Inventory Policy",
      "Variant Fulfillment Service",
      "Variant Price",
      "Variant Compare At Price",
      "Variant Requires Shipping",
      "Variant Taxable",
      "Image Src",
      "Image Position",
      "Cost per item",
    ];

    const rows: string[][] = [];

    for (const product of selectedProducts) {
      const handle = product.styleNumber
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const retailPrice =
        product.retailPrice ||
        calculateRetailPrice(product.wholesalePrice, settings);
      const colors = product.selectedColors?.length
        ? product.selectedColors
        : product.colors;
      const sizes = product.sizes || [];
      const packRatio = product.packRatio;

      let isFirstRow = true;

      for (const color of colors) {
        for (let sizeIdx = 0; sizeIdx < sizes.length; sizeIdx++) {
          const size = sizes[sizeIdx];
          let qty = 0;

          if (packRatio && product.packs) {
            const qtyPerSize = packRatio.quantities[sizeIdx] || 0;
            qty = qtyPerSize * product.packs;
          } else {
            qty = Math.floor(product.quantity / (colors.length * sizes.length));
          }

          const sku = `${product.styleNumber}-${color.substring(0, 3).toUpperCase()}-${size.substring(0, 2).toUpperCase()}`;

          const row = [
            isFirstRow ? product.name : "",
            handle,
            isFirstRow ? product.notes || "" : "",
            isFirstRow ? product.vendorName : "",
            isFirstRow ? product.category : "",
            isFirstRow ? product.category : "",
            isFirstRow ? `${product.season}, ${product.category}` : "",
            isFirstRow ? "TRUE" : "",
            "Color",
            color,
            "Size",
            size,
            sku,
            "0",
            "shopify",
            qty.toString(),
            "deny",
            "manual",
            retailPrice.toFixed(2),
            "",
            "TRUE",
            "TRUE",
            isFirstRow && product.imageUri ? product.imageUri : "",
            isFirstRow ? "1" : "",
            product.wholesalePrice.toFixed(2),
          ];

          rows.push(row);
          isFirstRow = false;
        }
      }
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return escaped.includes(",") ||
              escaped.includes('"') ||
              escaped.includes("\n")
              ? `"${escaped}"`
              : escaped;
          })
          .join(","),
      ),
    ].join("\n");

    return csvContent;
  };

  const handleCSVExport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert(
        "No Products Selected",
        "Please select at least one product to export.",
      );
      return;
    }

    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const csv = await generateShopifyCSV();
      if (!csv) return;

      const fileName = `shopify-products-${Date.now()}.csv`;
      const filePath = `${cacheDirectory}${fileName}`;

      await writeAsStringAsync(filePath, csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/csv",
          dialogTitle: "Export Shopify Products",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Export Complete", `File saved: ${fileName}`);
      }

      exitSelectionMode();
    } catch (error) {
      console.error("Error exporting:", error);
      Alert.alert(
        "Export Failed",
        "There was an error creating the export file.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShopifyExport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert(
        "No Products Selected",
        "Please select at least one product to export.",
      );
      return;
    }

    if (!canUseShopifyExport) {
      setShowShopifyUpgradeModal(true);
      return;
    }

    setIsExportingShopify(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const status = await checkShopifyStatus();
      if (!status.connected || !status.shopDomain) {
        Alert.alert(
          "Shopify Not Connected",
          "Connect your Shopify store in Settings first.",
        );
        return;
      }

      const result = await exportToShopify(
        Array.from(selectedIds),
        status.shopDomain,
      );

      Alert.alert(
        "Export Successful",
        `${result.count} product${result.count !== 1 ? "s" : ""} exported to Shopify.`,
      );
      exitSelectionMode();
    } catch (error) {
      console.error("Shopify export error:", error);
      Alert.alert(
        "Export Failed",
        error instanceof Error
          ? error.message
          : "There was an error exporting to Shopify.",
      );
    } finally {
      setIsExportingShopify(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.styleNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === null || product.category === selectedCategory;

    const matchesVendor =
      selectedVendor === null || product.vendorId === selectedVendor;

    return matchesSearch && matchesCategory && matchesVendor;
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      selectionMode={selectionMode}
      isSelected={selectedIds.has(item.id)}
      onPress={() => {
        if (selectionMode) {
          toggleSelection(item.id);
        } else {
          navigation.navigate("ProductDetail", { productId: item.id });
        }
      }}
      onLongPress={() => {
        if (!selectionMode) {
          enterSelectionMode(item.id);
        }
      }}
    />
  );

  const renderFilterChip = ({ item }: { item: string }) => {
    const isSelected = selectedCategory === item;
    return (
      <Pressable
        style={[
          styles.filterChip,
          {
            backgroundColor: isSelected
              ? `${BrandColors.gold}15`
              : "transparent",
            borderColor: isSelected ? BrandColors.gold : theme.border,
          },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          setSelectedCategory(isSelected ? null : item);
        }}
      >
        <ThemedText
          style={[
            styles.filterText,
            { color: isSelected ? BrandColors.gold : theme.textSecondary },
          ]}
        >
          {item}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {selectionMode ? (
        <View
          style={[
            styles.selectionBar,
            {
              paddingTop: headerHeight + Spacing.md,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <View style={styles.selectionBarContent}>
            <Pressable
              onPress={exitSelectionMode}
              style={styles.selectionBarButton}
            >
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
            <ThemedText style={styles.selectionCount}>
              {selectedIds.size} selected
            </ThemedText>
            <Pressable onPress={selectAll} style={styles.selectionBarButton}>
              <ThemedText
                style={[styles.selectAllText, { color: BrandColors.gold }]}
              >
                Select All
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.searchContainer,
            { paddingTop: headerHeight + Spacing.md },
          ]}
        >
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search products..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              selectionColor={BrandColors.gold}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color={theme.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES as unknown as string[]}
            keyExtractor={(item) => item}
            style={styles.filterList}
            contentContainerStyle={styles.filterContent}
            renderItem={renderFilterChip}
          />

          {vendors.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={vendors}
              keyExtractor={(item) => item.id}
              style={styles.vendorFilterList}
              contentContainerStyle={styles.filterContent}
              renderItem={({ item }) => {
                const isSelected = selectedVendor === item.id;
                return (
                  <Pressable
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected
                          ? `${BrandColors.gold}15`
                          : "transparent",
                        borderColor: isSelected
                          ? BrandColors.gold
                          : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedVendor(isSelected ? null : item.id);
                    }}
                  >
                    <Feather
                      name="briefcase"
                      size={12}
                      color={
                        isSelected ? BrandColors.gold : theme.textSecondary
                      }
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[
                        styles.filterText,
                        {
                          color: isSelected
                            ? BrandColors.gold
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {item.name}
                    </ThemedText>
                  </Pressable>
                );
              }}
            />
          ) : null}
        </View>
      )}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing["5xl"] + 56,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.gold}
          />
        }
        ListEmptyComponent={
          <EmptyState
            image={require("../../assets/images/empty-products.png")}
            title={
              searchQuery || selectedCategory || selectedVendor
                ? "No Results"
                : "No Products Yet"
            }
            message={
              searchQuery || selectedCategory || selectedVendor
                ? "Try adjusting your search or filters."
                : "Scan your first label to start tracking your wholesale purchases."
            }
            actionLabel={
              searchQuery || selectedCategory || selectedVendor
                ? "Clear Filters"
                : "Scan Label"
            }
            onAction={
              searchQuery || selectedCategory || selectedVendor
                ? () => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                    setSelectedVendor(null);
                  }
                : handleAddProduct
            }
          />
        }
      />

      {selectionMode ? (
        <View
          style={[
            styles.exportBar,
            {
              paddingBottom: tabBarHeight + Spacing.md,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.exportSelectionCount,
              { color: theme.textSecondary },
            ]}
          >
            {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </ThemedText>
          <View style={styles.exportButtonRow}>
            <Button
              onPress={handleCSVExport}
              style={styles.exportButtonHalf}
              disabled={isExporting}
            >
              <View style={styles.exportButtonContent}>
                <Feather name="download" size={18} color="#fff" />
                <ThemedText style={styles.exportButtonText}>
                  {isExporting ? "Exporting..." : "Export as CSV"}
                </ThemedText>
              </View>
            </Button>
            <Button
              onPress={handleShopifyExport}
              style={styles.exportButtonHalf}
              disabled={isExportingShopify}
            >
              <View style={styles.exportButtonContent}>
                <Feather name="shopping-bag" size={18} color="#fff" />
                <ThemedText style={styles.exportButtonText}>
                  {isExportingShopify ? "Exporting..." : "Export to Shopify"}
                </ThemedText>
              </View>
            </Button>
          </View>
        </View>
      ) : null}

      <UpgradePromptModal
        visible={showShopifyUpgradeModal}
        featureId="shopifyUpload"
        onDismiss={() => setShowShopifyUpgradeModal(false)}
        onUpgrade={() => {
          setShowShopifyUpgradeModal(false);
          // Navigate to Account tab > Billing screen
          const tabNav = navigation.getParent()?.getParent();
          if (tabNav) {
            (tabNav as { navigate: (a: string, b?: object) => void }).navigate(
              "AccountTab",
              { screen: "Billing" },
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  filterList: {
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  vendorFilterList: {
    marginTop: Spacing.sm,
    marginHorizontal: -Spacing.lg,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectionBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  selectionBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  selectionBarButton: {
    padding: Spacing.sm,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  exportBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadows.card,
  },
  exportSelectionCount: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  exportButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  exportButton: {
    flex: 1,
    backgroundColor: BrandColors.gold,
    height: 52,
    borderRadius: BorderRadius.md,
  },
  exportButtonHalf: {
    flex: 1,
    backgroundColor: BrandColors.gold,
    height: 52,
    borderRadius: BorderRadius.md,
  },
  exportButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
