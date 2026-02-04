import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VendorsScreen from "@/screens/VendorsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

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
          headerTitle: "Vendors",
        }}
      />
    </Stack.Navigator>
  );
}
