import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddProductScreen from "@/screens/AddProductScreen";
import EditProductScreen from "@/screens/EditProductScreen";
import AddVendorScreen from "@/screens/AddVendorScreen";
import EditVendorScreen from "@/screens/EditVendorScreen";
import AddBudgetScreen from "@/screens/AddBudgetScreen";
import EditBudgetScreen from "@/screens/EditBudgetScreen";
import BudgetOverviewScreen from "@/screens/BudgetOverviewScreen";
import QuickAddProductScreen from "@/screens/QuickAddProductScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import VendorDetailScreen from "@/screens/VendorDetailScreen";
import TryOnScreen from "@/screens/TryOnScreen";
import MultiScanScreen from "@/screens/MultiScanScreen";
import WelcomeScreen from "@/screens/WelcomeScreen";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BrandColors, FontFamilies } from "@/constants/theme";
import { LoadingScreen } from "@/components/LoadingScreen";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: { screen?: string; params?: { screen?: string } } | undefined;
  AddProduct: undefined;
  EditProduct: { productId: string };
  AddVendor: undefined;
  EditVendor: { vendorId: string };
  AddBudget: undefined;
  EditBudget: { budgetId: string };
  BudgetOverview: undefined;
  QuickAddProduct: undefined;
  ProductDetail: { productId: string };
  VendorDetail: { vendorId: string };
  TryOn: { productId: string; imageUri: string; category?: string };
  MultiScan: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const showApp = isAuthenticated || isGuest;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!showApp ? (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
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
            name="EditProduct"
            component={EditProductScreen}
            options={({ navigation }) => ({
              headerTitle: "Edit Product",
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
            name="EditVendor"
            component={EditVendorScreen}
            options={({ navigation }) => ({
              headerTitle: "Edit Vendor",
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
            name="EditBudget"
            component={EditBudgetScreen}
            options={({ navigation }) => ({
              headerTitle: "Edit Budget",
              presentation: "modal",
              headerLeft: () => (
                <HeaderButton onPress={() => navigation.goBack()}>
                  <Feather name="x" size={24} color={theme.text} />
                </HeaderButton>
              ),
            })}
          />
          <Stack.Screen
            name="BudgetOverview"
            component={BudgetOverviewScreen}
            options={({ navigation }) => ({
              headerTitle: "Budget Overview",
              presentation: "modal",
              headerLeft: () => (
                <HeaderButton onPress={() => navigation.goBack()}>
                  <Feather name="x" size={24} color={theme.text} />
                </HeaderButton>
              ),
            })}
          />
          <Stack.Screen
            name="QuickAddProduct"
            component={QuickAddProductScreen}
            options={({ navigation }) => ({
              headerTitle: "Quick Add",
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
          <Stack.Screen
            name="TryOn"
            component={TryOnScreen}
            options={{
              headerTitle: "See on Model",
            }}
          />
          <Stack.Screen
            name="MultiScan"
            component={MultiScanScreen}
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          {/* Allow guest users to navigate to Login/Register as modals */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false, presentation: "modal" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
