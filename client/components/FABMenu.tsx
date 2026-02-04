import React, { useState } from "react";
import { StyleSheet, Pressable, View, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

import { GoldGradient } from "@/components/GoldGradient";
import { ThemedText } from "@/components/ThemedText";
import { Shadows, Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface MenuItem {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}

interface FABMenuProps {
  items: MenuItem[];
  bottom?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FABMenu({ items, bottom = 0 }: FABMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scale = useSharedValue(1);
  const { theme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleItemPress = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(false);
    setTimeout(() => item.onPress(), 200);
  };

  return (
    <>
      <AnimatedPressable
        style={[
          styles.fab,
          { bottom: bottom + Spacing.lg },
          Shadows.fab,
          animatedStyle,
        ]}
        onPress={handleOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GoldGradient style={styles.gradient}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </GoldGradient>
      </AnimatedPressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <BlurView intensity={20} style={styles.blur}>
            <View style={styles.menuContainer}>
              {items.map((item, index) => (
                <Pressable
                  key={index}
                  style={[styles.menuItem, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: BrandColors.goldLight }]}>
                    <Feather name={item.icon} size={20} color={BrandColors.gold} />
                  </View>
                  <ThemedText style={[styles.menuLabel, { color: theme.text }]}>
                    {item.label}
                  </ThemedText>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              ))}
            </View>
          </BlurView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 100,
  },
  blur: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  menuContainer: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
});
