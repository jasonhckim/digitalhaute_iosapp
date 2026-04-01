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
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BrandColors, FontFamilies } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Register">;

const ROLE_OPTIONS = [
  { label: "Owner", value: "owner" },
  { label: "Buyer", value: "buyer" },
  { label: "Assistant", value: "assistant" },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { register, loginWithApple } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("owner");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!businessName.trim()) e.businessName = "Business name is required";
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (password !== confirmPassword)
      e.confirmPassword = "Passwords don't match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({
        businessName: businessName.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
    } catch (error) {
      Alert.alert(
        "Registration Failed",
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
          paddingTop: insets.top + Spacing["3xl"],
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing["2xl"],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.title}>Create Account</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Set up your wholesale buying profile
        </ThemedText>

        <View style={styles.form}>
          <Input
            label="Business Name"
            placeholder="My Fashion Boutique"
            value={businessName}
            onChangeText={setBusinessName}
            error={errors.businessName}
            autoCapitalize="words"
          />
          <Input
            label="Your Name"
            placeholder="Jane Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="words"
          />
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
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            textContentType="none"
            autoComplete="off"
          />
          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            textContentType="none"
            autoComplete="off"
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
          />

          <Button onPress={handleRegister} disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
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
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />

        <Pressable
          style={styles.loginLink}
          onPress={() => navigation.navigate("Login")}
        >
          <ThemedText style={[styles.linkText, { color: theme.textSecondary }]}>
            Already have an account?{" "}
          </ThemedText>
          <ThemedText
            style={[styles.linkTextBold, { color: BrandColors.camel }]}
          >
            Log In
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
    paddingTop: 4,
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
  loginLink: {
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
