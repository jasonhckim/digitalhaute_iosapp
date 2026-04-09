import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BrandColors, FontFamilies } from "@/constants/theme";

interface HeaderTitleProps {
  title?: string;
  showProfileIcon?: boolean;
}

export function HeaderTitle({
  title = "Digital Haute",
  showProfileIcon = false,
}: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText style={styles.brandText}>{title}</ThemedText>
      </View>
    </View>
  );
}

export function PageHeader({
  showProfileIcon = true,
}: {
  showProfileIcon?: boolean;
}) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.pageHeader}>
      <View style={styles.brandRow}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText style={styles.brandText}>Digital Haute</ThemedText>
      </View>
      {showProfileIcon ? (
        <Pressable
          onPress={() => {
            try {
              navigation.navigate("AccountTab");
            } catch {
              // Fallback if not in tab navigator
            }
          }}
          hitSlop={12}
        >
          <Feather name="user" size={22} color={BrandColors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: Spacing.md,
  },
  brandText: {
    fontSize: 22,
    fontFamily: FontFamilies.serif,
    color: BrandColors.textPrimary,
    letterSpacing: -0.3,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
});
