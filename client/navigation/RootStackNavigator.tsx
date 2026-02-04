import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddProductScreen from "@/screens/AddProductScreen";
import AddVendorScreen from "@/screens/AddVendorScreen";
import AddBudgetScreen from "@/screens/AddBudgetScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import VendorDetailScreen from "@/screens/VendorDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { BrandColors } from "@/constants/theme";

export type RootStackParamList = {
  Main: { screen?: string } | undefined;
  AddProduct: undefined;
  AddVendor: undefined;
  AddBudget: undefined;
  ProductDetail: { productId: string };
  VendorDetail: { vendorId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={({ navigation }) => ({
          headerTitle: "Add Product",
          presentation: "modal",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              <Feather name="x" size={24} color={theme.text} />
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="AddVendor"
        component={AddVendorScreen}
        options={({ navigation }) => ({
          headerTitle: "Add Vendor",
          presentation: "modal",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              <Feather name="x" size={24} color={theme.text} />
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="AddBudget"
        component={AddBudgetScreen}
        options={({ navigation }) => ({
          headerTitle: "Add Budget",
          presentation: "modal",
          headerLeft: () => (
            <HeaderButton onPress={() => navigation.goBack()}>
              <Feather name="x" size={24} color={theme.text} />
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          headerTitle: "Product Details",
        }}
      />
      <Stack.Screen
        name="VendorDetail"
        component={VendorDetailScreen}
        options={{
          headerTitle: "Vendor Details",
        }}
      />
    </Stack.Navigator>
  );
}
