import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProductsScreen from "@/screens/ProductsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProductsStackParamList = {
  Products: undefined;
};

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export default function ProductsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          headerTitle: "Products",
        }}
      />
    </Stack.Navigator>
  );
}
