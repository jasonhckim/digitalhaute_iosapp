import React from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { BrandColors, FontFamilies, Spacing } from "@/constants/theme";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ThemedText style={styles.brand}>Digital Haute</ThemedText>
      <ActivityIndicator
        size="small"
        color={BrandColors.camel}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BrandColors.cream,
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: Spacing.lg,
  },
  brand: {
    fontSize: 24,
    fontFamily: FontFamilies.serif,
    color: BrandColors.textPrimary,
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginTop: Spacing.sm,
  },
});
