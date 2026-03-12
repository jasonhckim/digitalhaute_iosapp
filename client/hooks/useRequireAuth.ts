import { useCallback } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/contexts/AuthContext";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export function useRequireAuth() {
  const { isAuthenticated, isGuest } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }

      Alert.alert(
        "Account Required",
        "Create a free account to add products, vendors, and budgets.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Up",
            onPress: () => navigation.navigate("Register"),
          },
          {
            text: "Log In",
            onPress: () => navigation.navigate("Login"),
          },
        ],
      );
    },
    [isAuthenticated, navigation],
  );

  return { requireAuth };
}
