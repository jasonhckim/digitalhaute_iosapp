import React, { useState, useEffect } from "react";
import { StyleSheet, Alert, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  Typography,
  BrandColors,
  BorderRadius,
} from "@/constants/theme";
import { VendorStorage } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { PackRatio } from "@/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "EditVendor">;

export default function EditVendorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [packRatioString, setPackRatioString] = useState("");
  const [packSizesString, setPackSizesString] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadVendor();
  }, [route.params.vendorId]);

  const loadVendor = async () => {
    try {
      const vendor = await VendorStorage.getById(route.params.vendorId);
      if (!vendor) {
        Alert.alert("Error", "Vendor not found");
        navigation.goBack();
        return;
      }

      // Pre-populate form fields
      setName(vendor.name);
      setContactName(vendor.contactName || "");
      setEmail(vendor.email || "");
      setPhone(vendor.phone || "");
      setWebsite(vendor.website || "");
      setPaymentTerms(vendor.paymentTerms || "");
      setNotes(vendor.notes || "");

      // Convert packRatio to string format
      if (vendor.packRatio) {
        setPackSizesString(vendor.packRatio.sizes.join(", "));
        setPackRatioString(vendor.packRatio.quantities.join("-"));
      } else {
        setPackSizesString("S, M, L");
        setPackRatioString("");
      }
    } catch (error) {
      console.error("Error loading vendor:", error);
      Alert.alert("Error", "Failed to load vendor data");
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const parsePackRatio = (): PackRatio | undefined => {
    if (!packRatioString.trim()) return undefined;
    const sizes = packSizesString
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const quantities = packRatioString
      .split("-")
      .map((q) => parseInt(q.trim(), 10))
      .filter((n) => !isNaN(n));
    if (sizes.length !== quantities.length || sizes.length === 0)
      return undefined;
    return { sizes, quantities };
  };

  const getTotalUnitsPerPack = (): number => {
    const ratio = parsePackRatio();
    if (!ratio) return 0;
    return ratio.quantities.reduce((sum, q) => sum + q, 0);
  };

  const validateForm = () => {
    if (!name.trim()) return "Vendor name is required";
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
      await VendorStorage.update(route.params.vendorId, {
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        packRatio: parsePackRatio(),
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error updating vendor:", error);
      Alert.alert("Error", "Failed to update vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Input
        label="Vendor Name"
        placeholder="Enter vendor/brand name"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Contact Name"
        placeholder="Sales rep name"
        value={contactName}
        onChangeText={setContactName}
      />

      <Input
        label="Email"
        placeholder="contact@vendor.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Phone"
        placeholder="+1 (555) 123-4567"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Input
        label="Website"
        placeholder="https://vendor.com"
        value={website}
        onChangeText={setWebsite}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Input
        label="Payment Terms"
        placeholder="e.g., Net 30"
        value={paymentTerms}
        onChangeText={setPaymentTerms}
      />

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Pack Ratio (Optional)
        </ThemedText>
        <ThemedText
          style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
        >
          If this vendor uses prepacks, enter the size breakdown
        </ThemedText>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Sizes"
            placeholder="S, M, L"
            value={packSizesString}
            onChangeText={setPackSizesString}
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="Pack Ratio"
            placeholder="2-2-2"
            value={packRatioString}
            onChangeText={setPackRatioString}
          />
        </View>
      </View>

      {packRatioString.trim() ? (
        <View
          style={[
            styles.packPreview,
            { backgroundColor: BrandColors.goldLight },
          ]}
        >
          <ThemedText
            style={[styles.packPreviewText, { color: BrandColors.gold }]}
          >
            {parsePackRatio() ? (
              <>
                {parsePackRatio()
                  ?.sizes.map(
                    (size, i) => `${parsePackRatio()?.quantities[i]} ${size}`,
                  )
                  .join(" + ")}{" "}
                = {getTotalUnitsPerPack()} units per pack
              </>
            ) : (
              "Enter matching sizes and quantities (e.g., S,M,L with 2-2-2)"
            )}
          </ThemedText>
        </View>
      ) : null}

      <Input
        label="Notes"
        placeholder="Any additional notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.notesInput}
      />

      <Button onPress={handleSave} disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Vendor"}
      </Button>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: "600",
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  packPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  packPreviewText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
    textAlign: "center",
  },
});
