import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

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
import { Vendor, SEASONS, ProductStatus } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { scanLabelImage } from "@/lib/scanLabel";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = "setup" | "label_camera" | "product_camera";

export default function MultiScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [step, setStep] = useState<Step>("setup");
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Session settings
  const [sessionVendorId, setSessionVendorId] = useState("");
  const [sessionSeason, setSessionSeason] = useState("");
  const [sessionEvent, setSessionEvent] = useState("");

  // Scan state
  const [scannedCount, setScannedCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const currentProductIdRef = useRef<string | null>(null);
  const currentLabelBase64Ref = useRef<string | null>(null);

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
      // Update product with image URI
      await ProductStorage.update(productId, { imageUri: uri });

      setScannedCount((c) => c + 1);

      // Fire background scan
      if (labelBase64) {
        setProcessingCount((c) => c + 1);
        scanInBackground(productId, labelBase64);
      } else {
        // No label scan, mark as complete with defaults
        await ProductStorage.update(productId, { scanStatus: "complete" });
      }
    }

    // Reset refs and loop back to label camera
    currentProductIdRef.current = null;
    currentLabelBase64Ref.current = null;
    setStep("label_camera");
  };

  const scanInBackground = async (productId: string, base64: string) => {
    try {
      const result = await scanLabelImage(base64);

      if (result) {
        await ProductStorage.update(productId, {
          name: result.styleNumber || result.styleName || "Scanned Product",
          styleNumber: result.styleNumber || "",
          wholesalePrice: result.wholesalePrice || 0,
          retailPrice: result.retailPrice || undefined,
          colors: result.colors || [],
          sizes: result.sizes || [],
          category: result.category || "",
          notes: result.notes || undefined,
          scanStatus: "complete",
        });
      } else {
        await ProductStorage.update(productId, { scanStatus: "failed" });
      }
    } catch (error) {
      console.error("Background scan error:", error);
      await ProductStorage.update(productId, { scanStatus: "failed" });
    } finally {
      setProcessingCount((c) => Math.max(0, c - 1));
    }
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (sessionVendorId) {
      navigation.replace("VendorDetail", { vendorId: sessionVendorId });
    } else {
      navigation.goBack();
    }
  };

  const handleSkipProductPhoto = async () => {
    const productId = currentProductIdRef.current;
    const labelBase64 = currentLabelBase64Ref.current;

    if (productId) {
      setScannedCount((c) => c + 1);

      if (labelBase64) {
        setProcessingCount((c) => c + 1);
        scanInBackground(productId, labelBase64);
      } else {
        await ProductStorage.update(productId, { scanStatus: "complete" });
      }
    }

    currentProductIdRef.current = null;
    currentLabelBase64Ref.current = null;
    setStep("label_camera");
  };

  const vendorOptions = vendors.map((v) => ({ label: v.name, value: v.id }));
  const seasonOptions = SEASONS.map((s) => ({ label: s, value: s }));

  // Setup screen
  if (step === "setup") {
    return (
      <ThemedView
        style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}
      >
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
        {/* Overlay: Done button + count badge */}
        <View style={styles.scanOverlay}>
          <Pressable style={styles.doneButton} onPress={handleDone}>
            <Feather name="check-circle" size={20} color="#fff" />
            <ThemedText style={styles.doneText}>
              Done{scannedCount > 0 ? ` (${scannedCount})` : ""}
            </ThemedText>
          </Pressable>
          {processingCount > 0 ? (
            <View style={styles.processingBadge}>
              <ActivityIndicator size="small" color={BrandColors.gold} />
              <ThemedText style={styles.processingText}>
                {processingCount} processing
              </ThemedText>
            </View>
          ) : null}
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
});
