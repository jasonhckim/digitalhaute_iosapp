import React, { ReactNode } from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, BrandColors } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  if (variant === "primary") {
    return (
      <AnimatedPressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          styles.primaryButton,
          { opacity: disabled ? 0.5 : 1 },
          style,
          animatedStyle,
        ]}
      >
        <ThemedText style={styles.primaryText}>{children}</ThemedText>
      </AnimatedPressable>
    );
  }

  if (variant === "secondary") {
    return (
      <AnimatedPressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          styles.secondaryButton,
          {
            borderColor: BrandColors.camel,
            opacity: disabled ? 0.5 : 1,
          },
          style,
          animatedStyle,
        ]}
      >
        <ThemedText style={[styles.secondaryText, { color: BrandColors.camel }]}>
          {children}
        </ThemedText>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.ghostButton,
        { opacity: disabled ? 0.5 : 1 },
        style,
        animatedStyle,
      ]}
    >
      <ThemedText style={[styles.ghostText, { color: BrandColors.camel }]}>
        {children}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  primaryButton: {
    backgroundColor: BrandColors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 17,
    fontWeight: "600",
  },
  ghostButton: {
    height: Spacing.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  ghostText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
