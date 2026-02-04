import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { BudgetCard } from "@/components/BudgetCard";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";
import { ProductStorage, VendorStorage, BudgetStorage, getDashboardStats } from "@/lib/storage";
import { Product, Vendor, Budget, DashboardStats } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [statsData, productsData, budgetsData] = await Promise.all([
        getDashboardStats(),
        ProductStorage.getAll(),
        BudgetStorage.getAll(),
      ]);
      setStats(statsData);
      setProducts(productsData.slice(0, 5));
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
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const handleAddProduct = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("AddProduct");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "None";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const hasData = products.length > 0 || budgets.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing["5xl"] + 56,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BrandColors.gold}
          />
        }
      >
        {!hasData && !isLoading ? (
          <EmptyState
            image={require("../../assets/images/empty-products.png")}
            title="Start Your Season"
            message="Add your first product to begin tracking your wholesale purchases, budgets, and deliveries."
            actionLabel="Add Product"
            onAction={handleAddProduct}
          />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  icon="package"
                  label="Products"
                  value={stats?.totalProducts || 0}
                  sublabel="on order"
                />
                <View style={styles.statSpacer} />
                <StatCard
                  icon="briefcase"
                  label="Vendors"
                  value={stats?.totalVendors || 0}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  icon="calendar"
                  label="Next Delivery"
                  value={formatDate(stats?.nextDeliveryDate)}
                />
                <View style={styles.statSpacer} />
                <StatCard
                  icon="trending-up"
                  label="Budget Used"
                  value={`${(stats?.budgetUtilization || 0).toFixed(0)}%`}
                />
              </View>
            </View>

            {budgets.length > 0 ? (
              <>
                <SectionHeader
                  title="Budget Overview"
                  actionLabel="Manage"
                  onAction={() => navigation.navigate("AddBudget")}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.budgetScroll}
                  contentContainerStyle={styles.budgetContent}
                >
                  {budgets.map((budget) => (
                    <BudgetCard
                      key={budget.id}
                      title={budget.category ? `${budget.season} - ${budget.category}` : budget.season}
                      budget={budget.amount}
                      spent={budget.spent}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {products.length > 0 ? (
              <>
                <SectionHeader
                  title="Recent Products"
                  actionLabel="View All"
                  onAction={() => navigation.navigate("Main", { screen: "ProductsTab" })}
                />
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <FAB onPress={handleAddProduct} bottom={tabBarHeight} />
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
  statsGrid: {
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
  },
  statSpacer: {
    width: Spacing.md,
  },
  budgetScroll: {
    marginHorizontal: -Spacing.lg,
  },
  budgetContent: {
    paddingHorizontal: Spacing.lg,
  },
});
