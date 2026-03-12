import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as AppleAuthentication from "expo-apple-authentication";

import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BrandColors, FontFamilies } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { login, loginWithApple } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email address";
    if (!password) e.password = "Password is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      // Don't show alert if user cancelled
      if (err.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(
        "Apple Sign In Failed",
        err.message || "Please try again.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: BrandColors.cream }]}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing["2xl"],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.title}>Welcome Back</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Log in to your account
        </ThemedText>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="jane@boutique.com"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            textContentType="none"
            autoComplete="off"
          />

          <Button onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? "Logging In..." : "Log In"}
          </Button>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: BrandColors.border }]} />
          <ThemedText style={[styles.dividerText, { color: theme.textTertiary }]}>
            or
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: BrandColors.border }]} />
        </View>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />

        <Pressable
          style={styles.registerLink}
          onPress={() => navigation.navigate("Register")}
        >
          <ThemedText style={[styles.linkText, { color: theme.textSecondary }]}>
            Don&apos;t have an account?{" "}
          </ThemedText>
          <ThemedText
            style={[styles.linkTextBold, { color: BrandColors.camel }]}
          >
            Register
          </ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamilies.serif,
    color: BrandColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing["3xl"],
  },
  form: {
    gap: 0,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 14,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  registerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing["2xl"],
  },
  linkText: {
    fontSize: 15,
  },
  linkTextBold: {
    fontSize: 15,
    fontWeight: "600",
  },
});
