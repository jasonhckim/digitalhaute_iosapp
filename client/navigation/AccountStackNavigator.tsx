import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AccountScreen from "@/screens/AccountScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import CollaborationScreen from "@/screens/CollaborationScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import DataPrivacyScreen from "@/screens/DataPrivacyScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import TermsOfServiceScreen from "@/screens/TermsOfServiceScreen";
import BillingScreen from "@/screens/BillingScreen";
import TeamMembersScreen from "@/screens/TeamMembersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { BrandColors } from "@/constants/theme";

export type AccountStackParamList = {
  Account: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Collaboration: undefined;
  Notifications: undefined;
  DataPrivacy: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  Billing: undefined;
  TeamMembers: undefined;
};

const Stack = createNativeStackNavigator<AccountStackParamList>();

export default function AccountStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerTitle: "Edit Profile",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="Collaboration"
        component={CollaborationScreen}
        options={{
          headerTitle: "Collaboration",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerTitle: "Notifications",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="DataPrivacy"
        component={DataPrivacyScreen}
        options={{
          headerTitle: "Data & Privacy",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          headerTitle: "Privacy Policy",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{
          headerTitle: "Terms of Service",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          headerTitle: "Billing & Plan",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
      <Stack.Screen
        name="TeamMembers"
        component={TeamMembersScreen}
        options={{
          headerTitle: "Team Members",
          headerTransparent: false,
          headerStyle: { backgroundColor: BrandColors.cream },
        }}
      />
    </Stack.Navigator>
  );
}
