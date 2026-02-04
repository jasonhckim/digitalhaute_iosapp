import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Typography } from "@/constants/theme";
import { ProductStorage, VendorStorage } from "@/lib/storage";
import { Vendor, CATEGORIES, SEASONS, ProductStatus } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = "product_photo" | "label_photo" | "scanning" | "review";

interface ExtractedData {
  styleName?: string;
  styleNumber?: string;
  wholesalePrice?: number;
  retailPrice?: number;
  colors?: string[];
  sizes?: string[];
  category?: string;
  brandName?: string;
  season?: string;
  notes?: string;
}

export default function QuickAddProductScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [step, setStep] = useState<Step>("product_photo");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productImageUri, setProductImageUri] = useState<string | undefined>();
  const [labelImageUri, setLabelImageUri] = useState<string | undefined>();

  const [name, setName] = useState("");
  const [styleNumber, setStyleNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [category, setCategory] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [season, setSeason] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [colors, setColors] = useState("");
  const [sizes, setSizes] = useState("");

  useEffect(() => {
    VendorStorage.getAll().then(setVendors);
  }, []);

  const takePhoto = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take photos.");
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  };

  const handleTakeProductPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await takePhoto();
    if (uri) {
      setProductImageUri(uri);
      setStep("label_photo");
    }
  };

  const handleTakeLabelPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await takePhoto();
    if (uri) {
      setLabelImageUri(uri);
      await scanLabel(uri);
    }
  };

  const handleSkipLabel = () => {
    setStep("review");
  };

  const scanLabel = async (uri: string) => {
    setStep("scanning");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let base64: string;
      
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/scan-label", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan label");
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        applyExtractedData(result.data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error scanning label:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Scan Failed",
        "Could not read the label. You can still enter the details manually.",
        [{ text: "OK" }]
      );
    }

    setStep("review");
  };

  const applyExtractedData = (data: ExtractedData) => {
    if (data.styleName) setName(data.styleName);
    if (data.styleNumber) setStyleNumber(data.styleNumber);
    if (data.wholesalePrice) setWholesalePrice(data.wholesalePrice.toString());
    if (data.retailPrice) setRetailPrice(data.retailPrice.toString());
    if (data.colors && data.colors.length > 0) setColors(data.colors.join(", "));
    if (data.sizes && data.sizes.length > 0) setSizes(data.sizes.join(", "));
    if (data.notes) setNotes(data.notes);

    if (data.category) {
      const matchedCategory = CATEGORIES.find(
        (c) => c.toLowerCase() === data.category?.toLowerCase()
      );
      if (matchedCategory) setCategory(matchedCategory);
    }

    if (data.season) {
      const matchedSeason = SEASONS.find(
        (s) => s.toLowerCase().includes(data.season?.toLowerCase() || "")
      );
      if (matchedSeason) setSeason(matchedSeason);
    }

    if (data.brandName) {
      const matchedVendor = vendors.find(
        (v) => v.name.toLowerCase().includes(data.brandName?.toLowerCase() || "")
      );
      if (matchedVendor) setVendorId(matchedVendor.id);
    }
  };

  const validateForm = () => {
    if (!name.trim()) return "Product name is required";
    if (!vendorId) return "Please select a vendor";
    if (!category) return "Please select a category";
    if (!wholesalePrice || isNaN(parseFloat(wholesalePrice))) return "Valid wholesale price is required";
    if (!quantity || isNaN(parseInt(quantity))) return "Valid quantity is required";
    if (!season) return "Please select a season";
    if (!deliveryDate) return "Delivery date is required";
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
      const vendor = vendors.find((v) => v.id === vendorId);
      
      await ProductStorage.create({
        name: name.trim(),
        styleNumber: styleNumber.trim() || `STY-${Date.now().toString(36).toUpperCase()}`,
        vendorId,
        vendorName: vendor?.name || "Unknown Vendor",
        category,
        wholesalePrice: parseFloat(wholesalePrice),
        retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
        quantity: parseInt(quantity),
        colors: colors.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
        deliveryDate,
        season,
        notes: notes.trim(),
        status: "ordered" as ProductStatus,
        imageUri: productImageUri,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", "Failed to save product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const vendorOptions = vendors.map((v) => ({ label: v.name, value: v.id }));
  const categoryOptions = CATEGORIES.map((c) => ({ label: c, value: c }));
  const seasonOptions = SEASONS.map((s) => ({ label: s, value: s }));

  if (step === "product_photo") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.stepContainer}>
          <View style={[styles.iconCircle, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="camera" size={48} color={BrandColors.gold} />
          </View>
          <ThemedText style={[styles.stepTitle, { color: theme.text }]}>
            Step 1: Product Photo
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            Take a photo of the product to save with your order
          </ThemedText>
          <Button onPress={handleTakeProductPhoto} style={styles.actionButton}>
            Take Product Photo
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (step === "label_photo") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.stepContainer}>
          {productImageUri ? (
            <Image source={{ uri: productImageUri }} style={styles.previewThumb} />
          ) : null}
          <View style={[styles.iconCircle, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="tag" size={48} color={BrandColors.gold} />
          </View>
          <ThemedText style={[styles.stepTitle, { color: theme.text }]}>
            Step 2: Scan Label
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            Take a photo of the hang tag or label to auto-fill product details
          </ThemedText>
          <Button onPress={handleTakeLabelPhoto} style={styles.actionButton}>
            Scan Label
          </Button>
          <Pressable onPress={handleSkipLabel} style={styles.skipButton}>
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip and enter manually
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (step === "scanning") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.stepContainer}>
          <ActivityIndicator size="large" color={BrandColors.gold} />
          <ThemedText style={[styles.stepTitle, { color: theme.text, marginTop: Spacing.xl }]}>
            Reading Label...
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            AI is extracting product information from the label
          </ThemedText>
        </View>
      </ThemedView>
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
      <View style={styles.imageRow}>
        {productImageUri ? (
          <View style={styles.thumbContainer}>
            <Image source={{ uri: productImageUri }} style={styles.thumbImage} />
            <ThemedText style={[styles.thumbLabel, { color: theme.textSecondary }]}>
              Product
            </ThemedText>
          </View>
        ) : null}
        {labelImageUri ? (
          <View style={styles.thumbContainer}>
            <Image source={{ uri: labelImageUri }} style={styles.thumbImage} />
            <ThemedText style={[styles.thumbLabel, { color: theme.textSecondary }]}>
              Label
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={[styles.extractedBadge, { backgroundColor: BrandColors.goldLight }]}>
        <Feather name="zap" size={16} color={BrandColors.gold} />
        <ThemedText style={[styles.extractedText, { color: BrandColors.gold }]}>
          Review extracted info and fill in any missing fields
        </ThemedText>
      </View>

      <Input
        label="Product Name"
        placeholder="Enter product name"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Style Number"
        placeholder="e.g., STY-12345"
        value={styleNumber}
        onChangeText={setStyleNumber}
      />

      <Select
        label="Vendor"
        placeholder="Select vendor..."
        options={vendorOptions}
        value={vendorId}
        onChange={setVendorId}
      />

      <Select
        label="Category"
        placeholder="Select category..."
        options={categoryOptions}
        value={category}
        onChange={setCategory}
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Wholesale Price"
            placeholder="0.00"
            value={wholesalePrice}
            onChangeText={setWholesalePrice}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="Retail Price"
            placeholder="0.00"
            value={retailPrice}
            onChangeText={setRetailPrice}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Input
        label="Colors"
        placeholder="e.g., Black, Navy, White"
        value={colors}
        onChangeText={setColors}
      />

      <Input
        label="Sizes"
        placeholder="e.g., XS, S, M, L, XL"
        value={sizes}
        onChangeText={setSizes}
      />

      <Input
        label="Quantity"
        placeholder="1"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
      />

      <Select
        label="Season"
        placeholder="Select season..."
        options={seasonOptions}
        value={season}
        onChange={setSeason}
      />

      <Input
        label="Delivery Date"
        placeholder="YYYY-MM-DD"
        value={deliveryDate}
        onChangeText={setDeliveryDate}
      />

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
        {isSubmitting ? "Saving..." : "Save Product"}
      </Button>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  stepTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "700",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: Typography.sizes.md,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  actionButton: {
    width: "100%",
  },
  skipButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  skipText: {
    fontSize: Typography.sizes.sm,
  },
  previewThumb: {
    width: 80,
    height: 100,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  imageRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  thumbContainer: {
    alignItems: "center",
  },
  thumbImage: {
    width: 70,
    height: 88,
    borderRadius: BorderRadius.sm,
  },
  thumbLabel: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  extractedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  extractedText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
});
