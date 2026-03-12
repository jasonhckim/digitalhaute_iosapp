import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import VendorsScreen from "@/screens/VendorsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export type VendorsStackParamList = {
  Vendors: undefined;
};

const Stack = createNativeStackNavigator<VendorsStackParamList>();

export default function VendorsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Vendors"
        component={VendorsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
