import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";

interface GoldGradientProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GoldGradient({ style, children }: GoldGradientProps) {
  return (
    <LinearGradient
      colors={["#D4AF37", "#F4D03F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
