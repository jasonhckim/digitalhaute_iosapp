import React from "react";
import { View, StyleSheet, Pressable, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as AppleAuthentication from "expo-apple-authentication";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BrandColors, FontFamilies } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { enterGuestMode, loginWithApple } = useAuth();

  const handleGuest = () => {
    enterGuestMode();
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(
        "Apple Sign In Failed",
        err.message || "Please try again.",
      );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: BrandColors.cream,
          paddingTop: insets.top + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing["3xl"],
        },
      ]}
    >
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <ThemedText style={styles.title}>Digital Haute</ThemedText>

        <ThemedText style={[styles.tagline, { color: theme.textSecondary }]}>
          Wholesale buying, simplified.{"\n"}Track products, vendors, and
          budgets — all in one place.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button onPress={() => navigation.navigate("Register")}>
          Get Started
        </Button>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />

        <Pressable
          style={styles.loginLink}
          onPress={() => navigation.navigate("Login")}
        >
          <ThemedText
            style={[styles.loginText, { color: theme.textSecondary }]}
          >
            Already have an account?{" "}
          </ThemedText>
          <ThemedText
            style={[styles.loginTextBold, { color: BrandColors.camel }]}
          >
            Log In
          </ThemedText>
        </Pressable>

        <Pressable style={styles.guestLink} onPress={handleGuest}>
          <ThemedText style={[styles.guestText, { color: theme.textTertiary }]}>
            Browse as Guest
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing["2xl"],
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 34,
    lineHeight: 46,
    fontFamily: FontFamilies.serif,
    color: BrandColors.textPrimary,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 300,
  },
  actions: {
    gap: Spacing.lg,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loginText: {
    fontSize: 15,
  },
  loginTextBold: {
    fontSize: 15,
    fontWeight: "600",
  },
  guestLink: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  guestText: {
    fontSize: 14,
  },
});
