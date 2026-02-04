import React, { useState, useEffect } from "react";
import { StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { BudgetStorage, VendorStorage, ProductStorage } from "@/lib/storage";
import { Vendor, CATEGORIES, SEASONS } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddBudgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    VendorStorage.getAll().then(setVendors);
  }, []);

  const validateForm = () => {
    if (!season) return "Please select a season";
    if (!amount || isNaN(parseFloat(amount))) return "Valid budget amount is required";
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Missing Information", error);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await BudgetStorage.create({
        season,
        category: category || undefined,
        vendorId: vendorId || undefined,
        amount: parseFloat(amount),
        spent: 0,
      });

      const products = await ProductStorage.getAll();
      await BudgetStorage.updateSpent(products);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving budget:", error);
      Alert.alert("Error", "Failed to save budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vendorOptions = [
    { label: "All Vendors", value: "" },
    ...vendors.map((v) => ({ label: v.name, value: v.id })),
  ];
  const categoryOptions = [
    { label: "All Categories", value: "" },
    ...CATEGORIES.map((c) => ({ label: c, value: c })),
  ];
  const seasonOptions = SEASONS.map((s) => ({ label: s, value: s }));

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Select
        label="Season"
        placeholder="Select season..."
        options={seasonOptions}
        value={season}
        onChange={setSeason}
      />

      <Select
        label="Category (Optional)"
        placeholder="All categories"
        options={categoryOptions}
        value={category}
        onChange={setCategory}
      />

      <Select
        label="Vendor (Optional)"
        placeholder="All vendors"
        options={vendorOptions}
        value={vendorId}
        onChange={setVendorId}
      />

      <Input
        label="Budget Amount"
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Button onPress={handleSave} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Budget"}
      </Button>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
