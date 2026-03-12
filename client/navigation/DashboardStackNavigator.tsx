import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DashboardScreen from "@/screens/DashboardScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type DashboardStackParamList = {
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
