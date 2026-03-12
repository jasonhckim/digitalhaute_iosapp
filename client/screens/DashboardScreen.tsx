import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { BudgetCard } from "@/components/BudgetCard";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BrandColors,
  FontFamilies,
  BorderRadius,
} from "@/constants/theme";
import {
  ProductStorage,
  BudgetStorage,
  getDashboardStats,
} from "@/lib/storage";
import { Product, Budget, DashboardStats } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashboardSeason {
  label: string;
  full: string;
  matchSeasons: string[];
}

const SEASONS: DashboardSeason[] = [
  { label: "All", full: "All Seasons", matchSeasons: [] },
  {
    label: "S/S 26",
    full: "Spring/Summer 2026",
    matchSeasons: ["Spring 2026", "Summer 2026"],
  },
  {
    label: "F/W 25",
    full: "Fall/Winter 2025",
    matchSeasons: ["Fall 2025", "Winter 2025"],
  },
  {
    label: "S/S 25",
    full: "Spring/Summer 2025",
    matchSeasons: ["Spring 2025", "Summer 2025"],
  },
  {
    label: "F/W 24",
    full: "Fall/Winter 2024",
    matchSeasons: ["Fall 2024", "Winter 2024"],
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { requireAuth } = useRequireAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[1]);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [statsData, productsData, budgetsData] = await Promise.all([
        getDashboardStats(),
        ProductStorage.getAll(),
        BudgetStorage.getAll(),
      ]);
      setStats(statsData);
      setAllProducts(productsData);
      setProducts(productsData.slice(0, 6));
      setBudgets(budgetsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
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

  const handleAddVendor = () => {
    requireAuth(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("AddVendor");
    });
  };

  const handleAddBudget = () => {
    requireAuth(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("AddBudget");
    });
  };

  const isAllSeasons = selectedSeason.matchSeasons.length === 0;

  const filteredBudgets = isAllSeasons
    ? budgets
    : budgets.filter((b) => selectedSeason.matchSeasons.includes(b.season));

  const filteredProducts = isAllSeasons
    ? products
    : products.filter((p) => selectedSeason.matchSeasons.includes(p.season));

  const filteredAllProducts = isAllSeasons
    ? allProducts.filter((p) => p.status !== "cancelled")
    : allProducts.filter(
        (p) =>
          p.status !== "cancelled" &&
          selectedSeason.matchSeasons.includes(p.season),
      );

  const filteredProductCount = filteredAllProducts.length;
  const filteredVendorCount = new Set(
    filteredAllProducts.map((p) => p.vendorId),
  ).size;

  const hasData = products.length > 0 || budgets.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: BrandColors.cream }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: tabBarHeight + Spacing["5xl"] + 56,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.camel}
          />
        }
      >
        <PageHeader />

        {!hasData && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../assets/images/empty-products.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <ThemedText style={styles.emptyTitle}>Start Your Season</ThemedText>
            <ThemedText
              style={[styles.emptyMessage, { color: theme.textSecondary }]}
            >
              Add vendors and set your budget to begin tracking your wholesale
              purchases and deliveries.
            </ThemedText>
            <View style={styles.emptyButtonRow}>
              <Button onPress={handleAddVendor} style={styles.emptyButton}>
                Add Vendors
              </Button>
              <Button
                onPress={handleAddBudget}
                variant="secondary"
                style={styles.emptyButton}
              >
                Add Budget
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.contentArea}>
            <View style={styles.dashboardHeader}>
              <ThemedText style={styles.dashboardTitle}>Dashboard</ThemedText>
              <Pressable
                style={styles.seasonSelector}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowSeasonPicker(true);
                }}
              >
                <ThemedText style={styles.seasonLabel}>
                  {selectedSeason.label}
                </ThemedText>
                <Feather
                  name="chevron-down"
                  size={16}
                  color={BrandColors.textSecondary}
                />
              </Pressable>
            </View>

            <ThemedText style={styles.summaryText}>
              You have a total of{" "}
              <ThemedText style={styles.summaryBold}>
                {filteredProductCount} products
              </ThemedText>{" "}
              with{" "}
              <ThemedText style={styles.summaryBold}>
                {filteredVendorCount} vendors
              </ThemedText>{" "}
              for{" "}
              <ThemedText style={styles.summaryBold}>
                {selectedSeason.full}
              </ThemedText>
              .
            </ThemedText>

            {filteredBudgets.length > 0 ? (
              <>
                <SectionHeader
                  title="Budget Overview"
                  actions={[
                    {
                      label: "Overview",
                      onPress: () => navigation.navigate("BudgetOverview"),
                    },
                    {
                      label: "Manage",
                      onPress: () => navigation.navigate("AddBudget"),
                    },
                  ]}
                />
                {filteredBudgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    title={
                      budget.category
                        ? `${budget.season} - ${budget.category}`
                        : budget.season
                    }
                    budget={budget.amount}
                    spent={budget.spent}
                    onEdit={() =>
                      navigation.navigate("EditBudget", {
                        budgetId: budget.id,
                      })
                    }
                  />
                ))}
              </>
            ) : (
              <View style={styles.addBudgetSection}>
                <SectionHeader title="Budget Overview" />
                <Pressable
                  style={styles.addBudgetCard}
                  onPress={handleAddBudget}
                >
                  <Feather
                    name="plus-circle"
                    size={20}
                    color={BrandColors.camel}
                  />
                  <ThemedText style={styles.addBudgetText}>
                    Add Budget
                  </ThemedText>
                </Pressable>
              </View>
            )}

            {filteredProducts.length > 0 ? (
              <>
                <SectionHeader
                  title="Recent Products"
                  actionLabel="View All"
                  onAction={() =>
                    navigation.navigate("Main", { screen: "ProductsTab" })
                  }
                />
                <View style={styles.productGrid}>
                  {filteredProducts.map((product) => (
                    <View key={product.id} style={styles.gridItem}>
                      <ProductCard
                        product={product}
                        gridMode
                        onPress={() =>
                          navigation.navigate("ProductDetail", {
                            productId: product.id,
                          })
                        }
                      />
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showSeasonPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSeasonPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSeasonPicker(false)}
        >
          <View style={styles.seasonPickerContainer}>
            <View style={styles.seasonPickerHeader}>
              <ThemedText style={styles.seasonPickerTitle}>
                Select Season
              </ThemedText>
              <Pressable onPress={() => setShowSeasonPicker(false)}>
                <Feather name="x" size={24} color={BrandColors.textPrimary} />
              </Pressable>
            </View>
            {SEASONS.map((season) => (
              <Pressable
                key={season.label}
                style={[
                  styles.seasonOption,
                  selectedSeason.label === season.label && {
                    backgroundColor: `${BrandColors.camel}10`,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedSeason(season);
                  setShowSeasonPicker(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.seasonOptionText,
                    selectedSeason.label === season.label && {
                      color: BrandColors.camel,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {season.label === "All"
                    ? "All Seasons"
                    : `${season.label} — ${season.full}`}
                </ThemedText>
                {selectedSeason.label === season.label ? (
                  <Feather name="check" size={20} color={BrandColors.camel} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentArea: {
    paddingHorizontal: Spacing.lg,
  },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  dashboardTitle: {
    fontSize: 20,
    fontFamily: FontFamilies.serifSemiBold,
    color: BrandColors.textPrimary,
  },
  seasonSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  seasonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: BrandColors.textSecondary,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  summaryBold: {
    fontSize: 15,
    fontWeight: "700",
    color: BrandColors.textPrimary,
  },
  addBudgetSection: {},
  addBudgetCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.creamDark,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderStyle: "dashed",
  },
  addBudgetText: {
    fontSize: 16,
    fontWeight: "500",
    color: BrandColors.camel,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  gridItem: {
    width: "50%",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing["4xl"],
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: Spacing["2xl"],
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FontFamilies.serifSemiBold,
    textAlign: "center",
    marginBottom: Spacing.sm,
    color: BrandColors.textPrimary,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing["2xl"],
  },
  emptyButtonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  emptyButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  seasonPickerContainer: {
    backgroundColor: BrandColors.cream,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing["3xl"],
  },
  seasonPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
  },
  seasonPickerTitle: {
    fontSize: 18,
    fontFamily: FontFamilies.serifSemiBold,
    color: BrandColors.textPrimary,
  },
  seasonOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BrandColors.border,
  },
  seasonOptionText: {
    fontSize: 16,
    color: BrandColors.textPrimary,
  },
});
