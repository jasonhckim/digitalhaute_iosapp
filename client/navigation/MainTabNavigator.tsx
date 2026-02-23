import React from "react";
import { StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import ProductsStackNavigator from "@/navigation/ProductsStackNavigator";
import VendorsStackNavigator from "@/navigation/VendorsStackNavigator";
import AccountStackNavigator from "@/navigation/AccountStackNavigator";
import { FABMenu } from "@/components/FABMenu";
import { useTheme } from "@/hooks/useTheme";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export type MainTabParamList = {
  HomeTab: undefined;
  ProductsTab: undefined;
  AddTab: undefined;
  VendorsTab: undefined;
  AccountTab: { screen?: string } | undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function PlaceholderScreen() {
  return null;
}

function CenterFABButton() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { requireAuth } = useRequireAuth();

  const fabMenuItems = [
    {
      icon: "layers" as const,
      label: "Multiple Product Scan",
      onPress: () => requireAuth(() => navigation.navigate("MultiScan")),
    },
    {
      icon: "zap" as const,
      label: "Quick Add (Scan Label)",
      onPress: () => requireAuth(() => navigation.navigate("QuickAddProduct")),
    },
    {
      icon: "edit" as const,
      label: "Manual Entry",
      onPress: () => requireAuth(() => navigation.navigate("AddProduct")),
    },
  ];

  return <FABMenu items={fabMenuItems} bottom={0} centerTab />;
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: BrandColors.gold,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsStackNavigator}
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Feather name="package" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={PlaceholderScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => <CenterFABButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="VendorsTab"
        component={VendorsStackNavigator}
        options={{
          title: "Vendors",
          tabBarIcon: ({ color, size }) => (
            <Feather name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStackNavigator}
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
