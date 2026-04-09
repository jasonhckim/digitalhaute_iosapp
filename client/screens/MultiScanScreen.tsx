import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { QuickCamera } from "@/components/QuickCamera";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { EventSelect } from "@/components/EventSelect";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  BrandColors,
  Typography,
} from "@/constants/theme";
import { ProductStorage, VendorStorage, EventStorage } from "@/lib/storage";
import { Vendor, SEASONS, CATEGORIES, ProductStatus } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { scanLabelImage, LabelScanResult } from "@/lib/scanLabel";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, effectiveSubscriptionPlan } from "@/lib/plans";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = "setup" | "label_camera" | "product_camera" | "review";

export default function MultiScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("setup");
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Session settings
  const [sessionVendorId, setSessionVendorId] = useState("");
  const [sessionSeason, setSessionSeason] = useState("");
  const [sessionEvent, setSessionEvent] = useState("");

  // Scan state
  const [scannedCount, setScannedCount] = useState(0);
  const currentProductIdRef = useRef<string | null>(null);
  const currentLabelBase64Ref = useRef<string | null>(null);
  const currentProductImageRef = useRef<string | null>(null);

  // Review/edit state
  const [scanResult, setScanResult] = useState<LabelScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStyleNumber, setEditStyleNumber] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editWholesalePrice, setEditWholesalePrice] = useState("");
  const [editRetailPrice, setEditRetailPrice] = useState("");
  const [editColors, setEditColors] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    VendorStorage.getAll().then(setVendors);
  }, []);

  const handleStartSession = async () => {
    if (!sessionVendorId) {
      Alert.alert("Select Vendor", "Please select a vendor before starting.");
      return;
    }
    if (!sessionSeason) {
      Alert.alert("Select Season", "Please select a season before starting.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save event if provided
    if (sessionEvent.trim()) {
      await EventStorage.add(sessionEvent.trim());
    }

    setStep("label_camera");
  };

  const handleLabelCaptured = async (uri: string, base64?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Soft product limit check for free plan
    const plan = effectiveSubscriptionPlan(user ?? null);
    const maxProducts = PLANS[plan]?.maxProducts ?? 10;
    if (maxProducts !== Infinity) {
      const existing = await ProductStorage.getAll();
      if (existing.length >= maxProducts) {
        Alert.alert(
          "Product Limit Reached",
          `Your Free plan is limited to ${maxProducts} products. Upgrade to Starter for unlimited products.`,
          [
            {
              text: "Upgrade to Starter",
              onPress: () => {
                navigation.navigate("Main", {
                  screen: "AccountTab",
                  params: { screen: "Billing" },
                });
              },
            },
            { text: "Continue Anyway" },
          ],
        );
        // Soft limit — don't block, just notify. Continue creating.
      }
    }

    // Create placeholder product immediately
    const vendor = vendors.find((v) => v.id === sessionVendorId);
    const product = await ProductStorage.create({
      name: "Scanning...",
      styleNumber: `SCAN-${Date.now().toString(36)}`,
      vendorId: sessionVendorId,
      vendorName: vendor?.name || "Unknown Vendor",
      category: "",
      wholesalePrice: 0,
      quantity: 0,
      colors: [],
      sizes: [],
      deliveryDate: "",
      season: sessionSeason,
      event: sessionEvent.trim() || undefined,
      status: "maybe" as ProductStatus,
      scanStatus: "processing",
    });

    currentProductIdRef.current = product.id;
    currentLabelBase64Ref.current = base64 || null;

    // Move to product photo immediately
    setStep("product_camera");
  };

  const handleProductCaptured = async (uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const productId = currentProductIdRef.current;
    const labelBase64 = currentLabelBase64Ref.current;

    if (productId) {
      await ProductStorage.update(productId, { imageUri: uri });
      currentProductImageRef.current = uri;
    }

    // Move to review step — scan label while showing the form
    await startReview();
  };

  const startReview = async () => {
    const labelBase64 = currentLabelBase64Ref.current;

    // Reset edit fields
    setEditName("");
    setEditStyleNumber("");
    setEditCategory("");
    setEditWholesalePrice("");
    setEditRetailPrice("");
    setEditColors("");
    setEditQuantity("");
    setEditNotes("");
    setScanResult(null);

    setStep("review");

    if (labelBase64) {
      setScanLoading(true);
      try {
        const result = await scanLabelImage(labelBase64);
        setScanResult(result);
        if (result) {
          setEditName(result.styleName || "");
          setEditStyleNumber(result.styleNumber || "");
          setEditCategory(result.category || "");
          setEditWholesalePrice(result.wholesalePrice ? result.wholesalePrice.toString() : "");
          setEditRetailPrice(result.retailPrice ? result.retailPrice.toString() : "");
          setEditColors(result.colors ? result.colors.join(", ") : "");
          setEditNotes(result.notes || "");
        }
      } catch (error) {
        console.error("Scan error:", error);
      } finally {
        setScanLoading(false);
      }
    }
  };

  const handleConfirmProduct = async () => {
    const productId = currentProductIdRef.current;
    if (!productId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const colors = editColors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    await ProductStorage.update(productId, {
      name: editStyleNumber || editName || "Scanned Product",
      styleNumber: editStyleNumber,
      category: editCategory,
      wholesalePrice: parseFloat(editWholesalePrice) || 0,
      retailPrice: editRetailPrice ? parseFloat(editRetailPrice) : undefined,
      colors,
      quantity: parseInt(editQuantity, 10) || 0,
      notes: editNotes || undefined,
      scanStatus: "complete",
    });

    setScannedCount((c) => c + 1);

    // Reset and loop back
    currentProductIdRef.current = null;
    currentLabelBase64Ref.current = null;
    currentProductImageRef.current = null;
    setStep("label_camera");
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (sessionVendorId) {
      navigation.replace("VendorDetail", { vendorId: sessionVendorId });
    } else {
      navigation.goBack();
    }
  };

  const handlePickFromGalleryForLabel = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to select images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await handleLabelCaptured(asset.uri, asset.base64 ?? undefined);
    }
  };

  const handlePickFromGalleryForProduct = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to select images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleProductCaptured(result.assets[0].uri);
    }
  };

  const handleSkipProductPhoto = async () => {
    currentProductImageRef.current = null;
    await startReview();
  };

  const vendorOptions = vendors.map((v) => ({ label: v.name, value: v.id }));
  const seasonOptions = SEASONS.map((s) => ({ label: s, value: s }));

  // Setup screen
  if (step === "setup") {
    return (
      <ThemedView
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.setupHeader}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.setupCloseButton}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText style={styles.setupHeaderTitle}>Multi-Scan</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.setupContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: BrandColors.goldLight, alignSelf: "center" },
            ]}
          >
            <Feather name="layers" size={48} color={BrandColors.gold} />
          </View>
          <ThemedText
            style={[
              styles.stepTitle,
              { color: theme.text, textAlign: "center" },
            ]}
          >
            Multiple Product Scan
          </ThemedText>
          <ThemedText
            style={[
              styles.stepDescription,
              {
                color: theme.textSecondary,
                textAlign: "center",
                marginBottom: Spacing.xl,
              },
            ]}
          >
            Rapidly scan labels and snap product photos. Each scan creates a
            product instantly.
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

          <EventSelect
            label="Event (optional)"
            value={sessionEvent}
            onChange={setSessionEvent}
          />

          <View style={styles.sessionInfo}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText
              style={[styles.sessionInfoText, { color: theme.textSecondary }]}
            >
              Scan label → snap photo → repeat. AI extracts product details in
              the background while you keep scanning.
            </ThemedText>
          </View>

          <Button onPress={handleStartSession} style={styles.actionButton}>
            Start Scanning
          </Button>
        </KeyboardAwareScrollViewCompat>
      </ThemedView>
    );
  }

  // Label camera
  if (step === "label_camera") {
    return (
      <View style={styles.cameraContainer}>
        <QuickCamera
          onCapture={handleLabelCaptured}
          onCancel={handleDone}
          includeBase64
          title="Scan Label"
        />
        {/* Overlay: Gallery (left) + Done (right) */}
        <View style={styles.scanOverlay}>
          <Pressable
            style={styles.galleryButton}
            onPress={handlePickFromGalleryForLabel}
          >
            <Feather name="image" size={20} color="#fff" />
            <ThemedText style={styles.galleryText}>Gallery</ThemedText>
          </Pressable>
          <View style={styles.overlayRight}>
            <Pressable style={styles.doneButton} onPress={handleDone}>
              <Feather name="check-circle" size={20} color="#fff" />
              <ThemedText style={styles.doneText}>
                Done{scannedCount > 0 ? ` (${scannedCount})` : ""}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Product camera
  if (step === "product_camera") {
    return (
      <View style={styles.cameraContainer}>
        <QuickCamera
          onCapture={handleProductCaptured}
          onCancel={handleSkipProductPhoto}
          includeBase64={false}
          title="Product Photo"
        />
        <View style={styles.scanOverlay}>
          <Pressable
            style={styles.galleryButton}
            onPress={handlePickFromGalleryForProduct}
          >
            <Feather name="image" size={20} color="#fff" />
            <ThemedText style={styles.galleryText}>Gallery</ThemedText>
          </Pressable>
          <Pressable
            style={styles.skipPhotoButton}
            onPress={handleSkipProductPhoto}
          >
            <Feather name="skip-forward" size={18} color="#fff" />
            <ThemedText style={styles.skipPhotoText}>Skip Photo</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Review/edit step
  if (step === "review") {
    const categoryOptions = CATEGORIES.map((c) => ({ label: c, value: c }));

    return (
      <ThemedView
        style={[styles.container, { paddingTop: insets.top + Spacing.md }]}
      >
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.reviewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Product image thumbnail */}
          {currentProductImageRef.current && (
            <Image
              source={{ uri: currentProductImageRef.current }}
              style={styles.reviewImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.reviewHeader}>
            <ThemedText style={[styles.reviewTitle, { color: theme.text }]}>
              Review Product
            </ThemedText>
            {scanLoading && (
              <View style={styles.scanningRow}>
                <ActivityIndicator size="small" color={BrandColors.gold} />
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                  Scanning label...
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.reviewField}>
            <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
              Style Number
            </ThemedText>
            <TextInput
              style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
              value={editStyleNumber}
              onChangeText={setEditStyleNumber}
              placeholder="Enter style number"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.reviewField}>
            <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
              Style Name
            </ThemedText>
            <TextInput
              style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter style name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.reviewField}>
            <Select
              label="Category"
              placeholder="Select category..."
              options={categoryOptions}
              value={editCategory}
              onChange={setEditCategory}
            />
          </View>

          <View style={styles.reviewRow}>
            <View style={[styles.reviewField, { flex: 1 }]}>
              <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
                Wholesale $
              </ThemedText>
              <TextInput
                style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
                value={editWholesalePrice}
                onChangeText={setEditWholesalePrice}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.reviewField, { flex: 1 }]}>
              <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
                Retail $
              </ThemedText>
              <TextInput
                style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
                value={editRetailPrice}
                onChangeText={setEditRetailPrice}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.reviewField}>
            <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
              Quantity
            </ThemedText>
            <TextInput
              style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
              value={editQuantity}
              onChangeText={setEditQuantity}
              placeholder="Enter quantity"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.reviewField}>
            <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
              Colors (comma separated)
            </ThemedText>
            <TextInput
              style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
              value={editColors}
              onChangeText={setEditColors}
              placeholder="Black, White, Red"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.reviewField}>
            <ThemedText style={[styles.reviewLabel, { color: theme.textSecondary }]}>
              Notes
            </ThemedText>
            <TextInput
              style={[styles.reviewInput, styles.reviewInputMulti, { color: theme.text, borderColor: theme.border }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Optional notes"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.reviewButtons}>
            <Button onPress={handleConfirmProduct} style={{ flex: 1 }}>
              Confirm & Next
            </Button>
          </View>

          <Pressable
            style={styles.reviewSkip}
            onPress={() => {
              // Skip without saving — delete the placeholder product
              const productId = currentProductIdRef.current;
              if (productId) {
                ProductStorage.delete(productId);
              }
              currentProductIdRef.current = null;
              currentLabelBase64Ref.current = null;
              currentProductImageRef.current = null;
              setStep("label_camera");
            }}
          >
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
              Discard this product
            </ThemedText>
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  setupContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
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
    lineHeight: 22,
  },
  actionButton: {
    width: "100%",
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  sessionInfoText: {
    fontSize: Typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  scanOverlay: {
    position: "absolute",
    bottom: 120,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  galleryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  overlayRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: BrandColors.gold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  processingText: {
    color: BrandColors.gold,
    fontSize: 13,
    fontWeight: "500",
  },
  skipPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  skipPhotoText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  reviewContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  reviewImage: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    marginBottom: Spacing.lg,
  },
  reviewTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: "700",
  },
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  reviewField: {
    marginBottom: Spacing.md,
  },
  reviewLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
    marginBottom: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
  },
  reviewInputMulti: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  reviewRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  reviewButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  reviewSkip: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  setupCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  setupHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
});
