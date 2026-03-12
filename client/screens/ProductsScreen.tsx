import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { PageHeader } from "@/components/HeaderTitle";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  Spacing,
  BorderRadius,
  BrandColors,
  Shadows,
  FontFamilies,
} from "@/constants/theme";
import {
  ProductStorage,
  VendorStorage,
  SettingsStorage,
  calculateRetailPrice,
} from "@/lib/storage";
import { checkShopifyStatus, exportToShopify } from "@/lib/shopify";
import { exportToExcel } from "@/lib/exportExcel";
import { printCatalog, shareCatalogPDF } from "@/lib/exportCatalog";
import { Product, Vendor, CATEGORIES, AppSettings } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { hasFeature } from "@/lib/plans";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
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
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingShopify, setIsExportingShopify] = useState(false);
  const [showShopifyUpgradeModal, setShowShopifyUpgradeModal] = useState(false);

  const canUseShopifyExport = hasFeature(user?.subscriptionPlan, "shopifyUpload");

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

  const handleExcelExport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert(
        "No Products Selected",
        "Please select at least one product to export.",
      );
      return;
    }

    setIsExportingExcel(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const selectedProducts = products.filter((p) => selectedIds.has(p.id));
      await exportToExcel(selectedProducts, settings);
      exitSelectionMode();
    } catch (error) {
      console.error("Excel export error:", error);
      Alert.alert(
        "Export Failed",
        "There was an error creating the Excel file.",
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrintCatalog = async () => {
    if (selectedIds.size === 0) {
      Alert.alert(
        "No Products Selected",
        "Please select at least one product to print.",
      );
      return;
    }

    setIsPrinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const selectedProducts = products.filter((p) => selectedIds.has(p.id));
      await printCatalog(selectedProducts, settings);
      exitSelectionMode();
    } catch (error) {
      console.error("Print catalog error:", error);
      Alert.alert(
        "Print Failed",
        "There was an error printing the catalog.",
      );
    } finally {
      setIsPrinting(false);
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

  const renderGridItem = ({
    item,
    index,
  }: {
    item: Product;
    index: number;
  }) => (
    <ProductCard
      product={item}
      gridMode
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

  return (
    <View style={[styles.container, { backgroundColor: BrandColors.cream }]}>
      <View style={{ paddingTop: insets.top }}>
        <PageHeader />
      </View>

      {selectionMode ? (
        <View style={styles.selectionBar}>
          <View style={styles.selectionBarContent}>
            <Pressable
              onPress={exitSelectionMode}
              style={styles.selectionBarButton}
            >
              <Feather name="x" size={22} color={BrandColors.textPrimary} />
            </Pressable>
            <ThemedText style={styles.selectionCount}>
              {selectedIds.size} selected
            </ThemedText>
            <Pressable onPress={selectAll} style={styles.selectionBarButton}>
              <ThemedText
                style={[styles.selectAllText, { color: BrandColors.camel }]}
              >
                Select All
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={BrandColors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: BrandColors.textPrimary }]}
              placeholder="Search Products"
              placeholderTextColor={BrandColors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              selectionColor={BrandColors.camel}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather
                  name="x"
                  size={18}
                  color={BrandColors.textTertiary}
                />
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
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item;
              return (
                <Pressable
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? BrandColors.textPrimary
                        : "transparent",
                      borderColor: isSelected
                        ? BrandColors.textPrimary
                        : BrandColors.border,
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
                      {
                        color: isSelected
                          ? BrandColors.white
                          : BrandColors.textPrimary,
                      },
                    ]}
                  >
                    {item}
                  </ThemedText>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <View style={styles.productsSectionHeader}>
        <ThemedText style={styles.productsTitle}>Products</ThemedText>
        {!selectionMode && filteredProducts.length > 0 ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setSelectionMode(true);
            }}
            hitSlop={8}
          >
            <ThemedText style={styles.selectButtonText}>Select</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderGridItem}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: Spacing.md,
          paddingBottom: tabBarHeight + Spacing["5xl"] + 56,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.camel}
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
              backgroundColor: BrandColors.cream,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.exportSelectionCount,
              { color: BrandColors.textSecondary },
            ]}
          >
            {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""}{" "}
            selected
          </ThemedText>
          <Button
            onPress={handleExcelExport}
            style={styles.exportButtonFull}
            disabled={isExportingExcel}
          >
            <View style={styles.exportButtonContent}>
              <Feather name="file-text" size={18} color="#fff" />
              <ThemedText style={styles.exportButtonText}>
                {isExportingExcel ? "Exporting..." : "Export to Excel"}
              </ThemedText>
            </View>
          </Button>
          <View style={styles.exportButtonRow}>
            <Button
              onPress={handleCSVExport}
              variant="secondary"
              style={styles.exportButtonHalf}
              disabled={isExporting}
            >
              <View style={styles.exportButtonContent}>
                <Feather
                  name="download"
                  size={16}
                  color={BrandColors.camel}
                />
                <ThemedText style={styles.exportButtonSecondaryText}>
                  {isExporting ? "Exporting..." : "CSV"}
                </ThemedText>
              </View>
            </Button>
            <Button
              onPress={handlePrintCatalog}
              variant="secondary"
              style={styles.exportButtonHalf}
              disabled={isPrinting}
            >
              <View style={styles.exportButtonContent}>
                <Feather
                  name="printer"
                  size={16}
                  color={BrandColors.camel}
                />
                <ThemedText style={styles.exportButtonSecondaryText}>
                  {isPrinting ? "Printing..." : "Print Catalog"}
                </ThemedText>
              </View>
            </Button>
          </View>
          <Button
            onPress={handleShopifyExport}
            variant="secondary"
            style={styles.exportButtonFull}
            disabled={isExportingShopify}
          >
            <View style={styles.exportButtonContent}>
              <Feather
                name="shopping-bag"
                size={16}
                color={BrandColors.camel}
              />
              <ThemedText style={styles.exportButtonSecondaryText}>
                {isExportingShopify ? "Exporting..." : "Export to Shopify"}
              </ThemedText>
            </View>
          </Button>
        </View>
      ) : null}

      <UpgradePromptModal
        visible={showShopifyUpgradeModal}
        featureId="shopifyUpload"
        onDismiss={() => setShowShopifyUpgradeModal(false)}
        onUpgrade={() => {
          setShowShopifyUpgradeModal(false);
          navigation.navigate("Main", {
            screen: "AccountTab",
            params: { screen: "Billing" },
          });
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
    borderRadius: BorderRadius["3xl"],
    paddingHorizontal: Spacing.lg,
    backgroundColor: BrandColors.creamDark,
    borderWidth: 1,
    borderColor: BrandColors.peach,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: Spacing.sm,
  },
  filterList: {
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  productsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
    marginBottom: Spacing.sm,
  },
  productsTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.serifSemiBold,
    color: BrandColors.textPrimary,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.camel,
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
    gap: Spacing.sm,
    ...Shadows.card,
  },
  exportSelectionCount: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  exportButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  exportButtonFull: {
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.md,
  },
  exportButtonHalf: {
    flex: 1,
    height: 44,
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
  exportButtonSecondaryText: {
    color: BrandColors.camel,
    fontSize: 14,
    fontWeight: "600",
  },
});
