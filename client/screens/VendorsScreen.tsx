import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { VendorCard } from "@/components/VendorCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BrandColors,
  BorderRadius,
  FontFamilies,
} from "@/constants/theme";
import { VendorStorage, ProductStorage } from "@/lib/storage";
import { Vendor } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SortMode = "az" | "spent" | "products" | "favorites";
type SortDirection = "asc" | "desc";

interface VendorWithStats extends Vendor {
  productCount: number;
  totalSpend: number;
}

const SORT_OPTIONS: { key: SortMode; label: string; toggleable: boolean }[] = [
  { key: "az", label: "A-Z", toggleable: false },
  { key: "spent", label: "Spent", toggleable: true },
  { key: "products", label: "Products", toggleable: true },
  { key: "favorites", label: "Favorites", toggleable: false },
];

export default function VendorsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const { requireAuth } = useRequireAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<VendorWithStats[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [vendorsData, productsData] = await Promise.all([
        VendorStorage.getAll(),
        ProductStorage.getAll(),
      ]);

      const vendorsWithStats: VendorWithStats[] = vendorsData.map((vendor) => {
        const vendorProducts = productsData.filter(
          (p) => p.vendorId === vendor.id && p.status !== "cancelled",
        );
        const totalSpend = vendorProducts.reduce(
          (sum, p) => sum + p.wholesalePrice * p.quantity,
          0,
        );
        return {
          ...vendor,
          productCount: vendorProducts.length,
          totalSpend,
        };
      });

      setVendors(vendorsWithStats);
    } catch (error) {
      console.error("Error loading vendors:", error);
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

  const handleToggleFavorite = async (vendor: VendorWithStats) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await VendorStorage.update(vendor.id, {
      isFavorite: !vendor.isFavorite,
    });
    if (updated) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendor.id ? { ...v, isFavorite: updated.isFavorite } : v,
        ),
      );
    }
  };

  const displayedVendors = (() => {
    let list = [...vendors];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q));
    }

    if (sortMode === "favorites") {
      list = list.filter((v) => v.isFavorite);
    }

    list.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortMode) {
        case "spent":
          return (a.totalSpend - b.totalSpend) * dir;
        case "products":
          return (a.productCount - b.productCount) * dir;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return list;
  })();

  const renderVendor = ({ item }: { item: VendorWithStats }) => (
    <VendorCard
      vendor={item}
      productCount={item.productCount}
      totalSpend={item.totalSpend}
      onPress={() => navigation.navigate("VendorDetail", { vendorId: item.id })}
      onToggleFavorite={() => handleToggleFavorite(item)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: BrandColors.cream }]}>
      <View style={{ paddingTop: insets.top }}>
        <PageHeader />
      </View>

      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.pageTitle}>Vendors</ThemedText>
          <Pressable
            style={styles.addVendorButton}
            onPress={handleAddVendor}
            hitSlop={8}
          >
            <Feather name="plus" size={20} color={BrandColors.camel} />
            <ThemedText style={styles.addVendorText}>Add</ThemedText>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={16}
            color={BrandColors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors..."
            placeholderTextColor={BrandColors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.key}
          style={styles.filterList}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const isSelected = sortMode === item.key;
            const showArrow = isSelected && item.toggleable;
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
                  if (isSelected && item.toggleable) {
                    setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
                  } else {
                    setSortMode(item.key);
                    setSortDirection("desc");
                  }
                }}
              >
                <View style={styles.filterChipInner}>
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
                    {item.label}
                  </ThemedText>
                  {showArrow && (
                    <Feather
                      name={sortDirection === "desc" ? "arrow-down" : "arrow-up"}
                      size={14}
                      color={BrandColors.white}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={displayedVendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendor}
        contentContainerStyle={{
          paddingTop: Spacing.sm,
          paddingBottom: tabBarHeight + Spacing["5xl"] + 56,
          paddingHorizontal: Spacing.lg,
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
            image={require("../../assets/images/empty-vendors.png")}
            title="No Vendors Yet"
            message="Add your first vendor to start building your wholesale network."
            actionLabel="Add Vendor"
            onAction={handleAddVendor}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: FontFamilies.serifSemiBold,
    color: BrandColors.textPrimary,
  },
  addVendorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  addVendorText: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.camel,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BrandColors.creamDark,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: BrandColors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  filterList: {
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
  filterChipInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
