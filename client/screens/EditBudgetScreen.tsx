import React, { useState, useEffect } from "react";
import { StyleSheet, Alert, View, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";
import { BudgetStorage, VendorStorage, ProductStorage } from "@/lib/storage";
import { Vendor, CATEGORIES, SEASONS } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, "EditBudget">;

export default function EditBudgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { budgetId } = route.params;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [season, setSeason] = useState("");
  const [category, setCategory] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [budget, vendorsData] = await Promise.all([
        BudgetStorage.getById(budgetId),
        VendorStorage.getAll(),
      ]);
      setVendors(vendorsData);
      if (budget) {
        setSeason(budget.season);
        setCategory(budget.category || "");
        setVendorId(budget.vendorId || "");
        setAmount(budget.amount.toString());
      }
      setLoaded(true);
    }
    load();
  }, [budgetId]);

  const validateForm = () => {
    if (!season) return "Please select a season";
    if (!amount || isNaN(parseFloat(amount)))
      return "Valid budget amount is required";
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
      await BudgetStorage.update(budgetId, {
        season,
        category: category || undefined,
        vendorId: vendorId || undefined,
        amount: parseFloat(amount),
      });

      const products = await ProductStorage.getAll();
      await BudgetStorage.updateSpent(products);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      console.error("Error updating budget:", err);
      Alert.alert("Error", "Failed to update budget. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await BudgetStorage.delete(budgetId);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              navigation.goBack();
            } catch (err) {
              console.error("Error deleting budget:", err);
              Alert.alert("Error", "Failed to delete budget.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
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

  if (!loaded) return null;

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
        {isSubmitting ? "Saving..." : "Update Budget"}
      </Button>

      <Pressable
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={isDeleting}
      >
        <ThemedText style={styles.deleteText}>
          {isDeleting ? "Deleting..." : "Delete Budget"}
        </ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "500",
    color: BrandColors.error,
  },
});
