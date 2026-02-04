import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { VendorCard } from "@/components/VendorCard";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";
import { VendorStorage, ProductStorage } from "@/lib/storage";
import { Vendor, Product } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface VendorWithStats extends Vendor {
  productCount: number;
  totalSpend: number;
}

export default function VendorsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<VendorWithStats[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [vendorsData, productsData] = await Promise.all([
        VendorStorage.getAll(),
        ProductStorage.getAll(),
      ]);

      const vendorsWithStats: VendorWithStats[] = vendorsData.map((vendor) => {
        const vendorProducts = productsData.filter(
          (p) => p.vendorId === vendor.id && p.status !== "cancelled"
        );
        const totalSpend = vendorProducts.reduce(
          (sum, p) => sum + p.wholesalePrice * p.quantity,
          0
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
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const handleAddVendor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("AddVendor");
  };

  const renderVendor = ({ item }: { item: VendorWithStats }) => (
    <VendorCard
      vendor={item}
      productCount={item.productCount}
      totalSpend={item.totalSpend}
      onPress={() => navigation.navigate("VendorDetail", { vendorId: item.id })}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={vendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendor}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
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
            image={require("../../assets/images/empty-vendors.png")}
            title="No Vendors Yet"
            message="Add your first vendor to start building your wholesale network."
            actionLabel="Add Vendor"
            onAction={handleAddVendor}
          />
        }
      />

      <FAB onPress={handleAddVendor} bottom={tabBarHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
