import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { QuickCamera } from "@/components/QuickCamera";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Typography } from "@/constants/theme";
import { ProductStorage, VendorStorage } from "@/lib/storage";
import { Vendor, CATEGORIES, SEASONS, ProductStatus, PackRatio } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = "setup" | "label_photo" | "label_camera" | "product_photo" | "product_camera" | "processing" | "review";

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

  const [step, setStep] = useState<Step>("setup");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Session settings (pre-selected before scanning)
  const [sessionVendorId, setSessionVendorId] = useState("");
  const [sessionSeason, setSessionSeason] = useState("");

  const [productImageUri, setProductImageUri] = useState<string | undefined>();
  const [labelImageUri, setLabelImageUri] = useState<string | undefined>();
  const [isScanComplete, setIsScanComplete] = useState(false);
  const scanPromiseRef = useRef<Promise<ExtractedData | null> | null>(null);

  const [styleNumber, setStyleNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [category, setCategory] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [packs, setPacks] = useState("1");
  const [season, setSeason] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [colors, setColors] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState("");
  const [vendorPackRatio, setVendorPackRatio] = useState<PackRatio | undefined>();

  const selectedVendor = vendors.find(v => v.id === vendorId);

  useEffect(() => {
    if (selectedVendor?.packRatio) {
      setVendorPackRatio(selectedVendor.packRatio);
      setSizes(selectedVendor.packRatio.sizes.join(", "));
    } else {
      setVendorPackRatio(undefined);
    }
  }, [vendorId, selectedVendor]);

  const getTotalUnitsFromPacks = (): number => {
    if (!vendorPackRatio) return parseInt(quantity, 10) || 0;
    const numPacks = parseInt(packs, 10) || 0;
    const unitsPerPack = vendorPackRatio.quantities.reduce((sum, q) => sum + q, 0);
    return numPacks * unitsPerPack;
  };

  const getPackBreakdown = (): string => {
    if (!vendorPackRatio) return "";
    const numPacks = parseInt(packs, 10) || 0;
    return vendorPackRatio.sizes.map((size, i) => 
      `${vendorPackRatio.quantities[i] * numPacks} ${size}`
    ).join(" + ");
  };

  const colorList = colors.split(",").map(c => c.trim()).filter(Boolean);

  const toggleColorSelection = (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  useEffect(() => {
    VendorStorage.getAll().then(setVendors);
  }, []);

  const handleStartSession = () => {
    if (!sessionVendorId) {
      Alert.alert("Select Vendor", "Please select a vendor before starting.");
      return;
    }
    if (!sessionSeason) {
      Alert.alert("Select Season", "Please select a season before starting.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVendorId(sessionVendorId);
    setSeason(sessionSeason);
    setStep("label_photo");
  };

  const handleOpenLabelCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("label_camera");
  };

  const handleLabelCaptured = (uri: string, base64?: string) => {
    setLabelImageUri(uri);
    setIsScanComplete(false);
    scanPromiseRef.current = scanLabelInBackground(base64);
    setStep("product_photo");
  };

  const handleSkipLabel = () => {
    scanPromiseRef.current = null;
    setIsScanComplete(true);
    setStep("product_photo");
  };

  const handleOpenProductCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("product_camera");
  };

  const handleProductCaptured = async (uri: string) => {
    setProductImageUri(uri);
    await finishAndShowReview();
  };

  const handleSkipProductPhoto = async () => {
    await finishAndShowReview();
  };

  const finishAndShowReview = async () => {
    if (scanPromiseRef.current && !isScanComplete) {
      setStep("processing");
      try {
        const extractedData = await scanPromiseRef.current;
        if (extractedData) {
          applyExtractedData(extractedData);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error("Error in background scan:", error);
      }
      setIsScanComplete(true);
    }
    setStep("review");
  };

  const scanLabelInBackground = async (base64Data?: string): Promise<ExtractedData | null> => {
    if (!base64Data) return null;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/scan-label", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan label");
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.error("Error scanning label:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return null;
  };

  const applyExtractedData = (data: ExtractedData) => {
    if (data.styleName) setStyleNumber(data.styleName);
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
    if (!styleNumber.trim()) return "Style number is required";
    if (!vendorId) return "Please select a vendor";
    if (!category) return "Please select a category";
    if (!wholesalePrice || isNaN(parseFloat(wholesalePrice))) return "Valid wholesale price is required";
    if (!quantity || isNaN(parseInt(quantity))) return "Valid quantity is required";
    if (!season) return "Please select a season";
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
      
      const finalQuantity = vendorPackRatio 
        ? getTotalUnitsFromPacks() 
        : parseInt(quantity, 10);

      await ProductStorage.create({
        name: styleNumber.trim(),
        styleNumber: styleNumber.trim(),
        vendorId,
        vendorName: vendor?.name || "Unknown Vendor",
        category,
        wholesalePrice: parseFloat(wholesalePrice),
        retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
        quantity: finalQuantity,
        packs: vendorPackRatio ? parseInt(packs, 10) : undefined,
        packRatio: vendorPackRatio,
        colors: colors.split(",").map((c) => c.trim()).filter(Boolean),
        selectedColors: selectedColors.length > 0 ? selectedColors : undefined,
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

  const sessionVendor = vendors.find((v) => v.id === sessionVendorId);

  if (step === "setup") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.setupContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconCircle, { backgroundColor: BrandColors.goldLight, alignSelf: "center" }]}>
            <Feather name="briefcase" size={48} color={BrandColors.gold} />
          </View>
          <ThemedText style={[styles.stepTitle, { color: theme.text, textAlign: "center" }]}>
            Start Scanning Session
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.xl }]}>
            Select the vendor and season first. These will be applied to all products you scan.
          </ThemedText>

          <Select
            label="Vendor"
            placeholder="Select vendor..."
            options={vendorOptions}
            value={sessionVendorId}
            onChange={setSessionVendorId}
          />

          <Select
            label="Season"
            placeholder="Select season..."
            options={seasonOptions}
            value={sessionSeason}
            onChange={setSessionSeason}
          />

          <View style={styles.sessionInfo}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText style={[styles.sessionInfoText, { color: theme.textSecondary }]}>
              You can scan multiple products from this vendor without re-entering this info.
            </ThemedText>
          </View>

          <Button onPress={handleStartSession} style={styles.actionButton}>
            Start Scanning
          </Button>
        </KeyboardAwareScrollViewCompat>
      </ThemedView>
    );
  }

  if (step === "label_photo") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.stepContainer}>
          <View style={[styles.vendorBadge, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="briefcase" size={14} color={BrandColors.gold} />
            <ThemedText style={[styles.vendorBadgeText, { color: BrandColors.gold }]}>
              {sessionVendor?.name || "Unknown Vendor"} • {sessionSeason}
            </ThemedText>
          </View>
          <View style={[styles.iconCircle, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="tag" size={48} color={BrandColors.gold} />
          </View>
          <ThemedText style={[styles.stepTitle, { color: theme.text }]}>
            Step 1: Scan Label
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            Take a photo of the hang tag or label to auto-fill product details
          </ThemedText>
          <Button onPress={handleOpenLabelCamera} style={styles.actionButton}>
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

  if (step === "label_camera") {
    return (
      <QuickCamera
        onCapture={handleLabelCaptured}
        onCancel={() => setStep("label_photo")}
        includeBase64={true}
        title="Scan Label"
      />
    );
  }

  if (step === "product_photo") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.stepContainer}>
          <View style={[styles.vendorBadge, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="briefcase" size={14} color={BrandColors.gold} />
            <ThemedText style={[styles.vendorBadgeText, { color: BrandColors.gold }]}>
              {sessionVendor?.name || "Unknown Vendor"} • {sessionSeason}
            </ThemedText>
          </View>
          {labelImageUri ? (
            <View style={styles.processingBadge}>
              <ActivityIndicator size="small" color={BrandColors.gold} />
              <ThemedText style={[styles.processingText, { color: BrandColors.gold }]}>
                Extracting label info...
              </ThemedText>
            </View>
          ) : null}
          <View style={[styles.iconCircle, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="camera" size={48} color={BrandColors.gold} />
          </View>
          <ThemedText style={[styles.stepTitle, { color: theme.text }]}>
            Step 2: Product Photo
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            Take a photo of the product to save with your order
          </ThemedText>
          <Button onPress={handleOpenProductCamera} style={styles.actionButton}>
            Take Product Photo
          </Button>
          <Pressable onPress={handleSkipProductPhoto} style={styles.skipButton}>
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip product photo
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (step === "product_camera") {
    return (
      <QuickCamera
        onCapture={handleProductCaptured}
        onCancel={() => setStep("product_photo")}
        includeBase64={false}
        title="Product Photo"
      />
    );
  }

  if (step === "processing") {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.stepContainer}>
          <View style={[styles.vendorBadge, { backgroundColor: BrandColors.goldLight }]}>
            <Feather name="briefcase" size={14} color={BrandColors.gold} />
            <ThemedText style={[styles.vendorBadgeText, { color: BrandColors.gold }]}>
              {sessionVendor?.name || "Unknown Vendor"} • {sessionSeason}
            </ThemedText>
          </View>
          {labelImageUri ? (
            <Image source={{ uri: labelImageUri }} style={styles.scanningImage} />
          ) : null}
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color={BrandColors.gold} />
          </View>
          <ThemedText style={[styles.stepTitle, { color: theme.text, marginTop: Spacing.xl }]}>
            Finishing Up...
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            Almost there! Extracting product details from label
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
        label="Style Number"
        placeholder="e.g., STY-12345 (becomes product name)"
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
        label="Available Colors"
        placeholder="e.g., Black, Navy, White"
        value={colors}
        onChangeText={setColors}
      />

      {colorList.length > 0 ? (
        <View style={styles.colorSection}>
          <ThemedText style={[styles.colorLabel, { color: theme.text }]}>
            Colors Ordered
          </ThemedText>
          <ThemedText style={[styles.colorHint, { color: theme.textSecondary }]}>
            Tap to select colors you ordered
          </ThemedText>
          <View style={styles.colorGrid}>
            {colorList.map((color) => (
              <Pressable
                key={color}
                onPress={() => toggleColorSelection(color)}
                style={[
                  styles.colorChip,
                  { 
                    backgroundColor: selectedColors.includes(color) 
                      ? BrandColors.goldLight 
                      : theme.backgroundSecondary,
                    borderColor: selectedColors.includes(color)
                      ? BrandColors.gold
                      : "transparent",
                  }
                ]}
              >
                <Feather 
                  name={selectedColors.includes(color) ? "heart" : "heart"} 
                  size={16} 
                  color={selectedColors.includes(color) ? BrandColors.gold : theme.textSecondary} 
                  style={{ opacity: selectedColors.includes(color) ? 1 : 0.4 }}
                />
                <ThemedText 
                  style={[
                    styles.colorChipText, 
                    { 
                      color: selectedColors.includes(color) ? BrandColors.gold : theme.text 
                    }
                  ]}
                >
                  {color}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Input
        label="Sizes"
        placeholder="e.g., XS, S, M, L, XL"
        value={sizes}
        onChangeText={setSizes}
      />

      {vendorPackRatio ? (
        <View style={styles.packSection}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Packs"
                placeholder="1"
                value={packs}
                onChangeText={setPacks}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.halfInput, styles.packInfo]}>
              <ThemedText style={[styles.packInfoLabel, { color: theme.textSecondary }]}>
                Pack Ratio
              </ThemedText>
              <ThemedText style={[styles.packInfoValue, { color: theme.text }]}>
                {vendorPackRatio.quantities.join("-")}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.packBreakdown, { backgroundColor: BrandColors.goldLight }]}>
            <ThemedText style={[styles.packBreakdownText, { color: BrandColors.gold }]}>
              {getPackBreakdown()} = {getTotalUnitsFromPacks()} total units
            </ThemedText>
          </View>
        </View>
      ) : (
        <Input
          label="Quantity"
          placeholder="1"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
      )}

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
  setupContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sessionInfoText: {
    fontSize: Typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  vendorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  vendorBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
  },
  scanningImage: {
    width: 120,
    height: 80,
    borderRadius: BorderRadius.md,
    opacity: 0.7,
  },
  scanningOverlay: {
    marginTop: Spacing.lg,
  },
  scanningHint: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.md,
    fontStyle: "italic",
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: BrandColors.goldLight,
    marginBottom: Spacing.lg,
  },
  processingText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
  },
  colorSection: {
    marginBottom: Spacing.lg,
  },
  colorLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  colorHint: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.md,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  colorChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
  },
  packSection: {
    marginBottom: Spacing.lg,
  },
  packInfo: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.md,
  },
  packInfoLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: Spacing.xs,
  },
  packInfoValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: "700",
    letterSpacing: 2,
  },
  packBreakdown: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  packBreakdownText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "600",
    textAlign: "center",
  },
});
