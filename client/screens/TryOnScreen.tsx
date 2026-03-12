import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Pressable,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, BrandColors } from "@/constants/theme";
import { ProductStorage } from "@/lib/storage";
import { Product } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { generateTryOn, type EditorialStyle } from "@/lib/tryOn";

type RouteProps = RouteProp<RootStackParamList, "TryOn">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface StyleOption {
  value: EditorialStyle;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

const STYLE_OPTIONS: StyleOption[] = [
  { value: "studio", label: "Studio", icon: "aperture" },
  { value: "ecommerce", label: "E-Commerce", icon: "shopping-bag" },
  { value: "street", label: "Street", icon: "map-pin" },
  { value: "lifestyle", label: "Lifestyle", icon: "sun" },
  { value: "campaign", label: "Campaign", icon: "award" },
  { value: "social", label: "Social", icon: "instagram" },
];

export default function TryOnScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { productId, imageUri, category } = route.params;

  const [selectedStyle, setSelectedStyle] = useState<EditorialStyle>("studio");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUri, setGeneratedImageUri] = useState<string | null>(
    null,
  );
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasAlreadyConverted, setHasAlreadyConverted] = useState(false);

  // Fullscreen image modal state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ProductStorage.getById(productId).then((product) => {
      if (!cancelled && product?.modelImageUri) {
        setHasAlreadyConverted(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleGenerate = useCallback(async () => {
    if (!imageUri) {
      Alert.alert("No Image", "This product does not have an image to try on.");
      return;
    }

    if (hasAlreadyConverted) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    setGeneratedImageUri(null);
    setGeneratedBase64(null);

    try {
      // Read the image file and convert to base64 using fetch + FileReader
      // (works in Expo Go without native modules)
      const imgResponse = await fetch(imageUri);
      const blob = await imgResponse.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Strip the data:image/...;base64, prefix
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await generateTryOn({
        imageBase64: base64,
        category: category,
        style: selectedStyle,
      });

      if (result.success && result.imageBase64) {
        // Use a data URI to display the generated image (no file system needed)
        const dataUri = `data:image/jpeg;base64,${result.imageBase64}`;
        setGeneratedImageUri(dataUri);
        setGeneratedBase64(result.imageBase64);
        setHasAlreadyConverted(true); // 1 conversion limit per product image
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Generation Failed",
          result.error ||
            "Could not generate the try-on image. Please try again.",
        );
      }
    } catch (error) {
      console.error("Try-on error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        "An unexpected error occurred. Please check your connection and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [imageUri, selectedStyle, productId, category, hasAlreadyConverted]);

  // Replace the product's original image with the generated one
  const handleReplaceOriginal = useCallback(async () => {
    if (!generatedImageUri || !productId) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await ProductStorage.update(productId, {
        imageUri: generatedImageUri,
        modelImageUri: generatedImageUri,
      });

      Alert.alert(
        "Saved",
        "Product image replaced with the AI-generated model image.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      console.error("Error saving model image:", error);
      Alert.alert("Error", "Failed to save the image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [generatedImageUri, productId, navigation]);

  // Share / save the generated image using expo-file-system for temp file
  const handleShareImage = useCallback(async () => {
    if (!generatedBase64) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sharing not available",
          "Sharing is not supported on this device.",
        );
        return;
      }

      // expo-sharing requires a file:// URI, not a data URI or blob URL.
      // Use the cache directory to write a temp file.
      const FileSystem = require("expo-file-system");
      const tempUri = `${FileSystem.cacheDirectory}tryon_share_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(tempUri, generatedBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(tempUri, {
        mimeType: "image/jpeg",
        dialogTitle: "Save or Share Image",
      });
    } catch (error) {
      console.error("Error sharing image:", error);
      Alert.alert(
        "Save Image",
        "To save this image, take a screenshot while viewing it fullscreen.",
        [{ text: "OK" }],
      );
    }
  }, [generatedBase64]);

  // Long press handler for fullscreen modal
  const handleFullscreenLongPress = useCallback(() => {
    if (!generatedBase64) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert("Image Options", "What would you like to do?", [
      {
        text: "Save / Share",
        onPress: handleShareImage,
      },
      {
        text: "Use as Product Image",
        onPress: handleReplaceOriginal,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  }, [generatedBase64, handleShareImage, handleReplaceOriginal]);

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        {/* Original product image - tap to enlarge */}
        <ThemedText style={styles.sectionTitle}>Original</ThemedText>
        {imageUri ? (
          <Pressable onPress={() => setFullscreenImage(imageUri)}>
            <Image source={{ uri: imageUri }} style={styles.image} />
            <View style={styles.tapHint}>
              <Feather name="maximize-2" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="image" size={48} color={theme.textTertiary} />
            <ThemedText
              style={[styles.placeholderText, { color: theme.textTertiary }]}
            >
              No product image available
            </ThemedText>
          </View>
        )}

        {/* Style Selector */}
        <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          Editorial Style
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleRow}
        >
          {STYLE_OPTIONS.map((option) => {
            const isSelected = selectedStyle === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSelectedStyle(option.value);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.styleChip,
                  {
                    backgroundColor: isSelected
                      ? BrandColors.gold
                      : theme.backgroundSecondary,
                    borderColor: isSelected ? BrandColors.gold : theme.border,
                  },
                ]}
              >
                <Feather
                  name={option.icon}
                  size={16}
                  color={isSelected ? "#FFFFFF" : theme.textSecondary}
                  style={{ marginRight: Spacing.xs }}
                />
                <ThemedText
                  style={[
                    styles.styleChipText,
                    {
                      color: isSelected ? "#FFFFFF" : theme.text,
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Generate Button or 1-conversion limit message */}
        <View style={{ marginTop: Spacing.xl }}>
          {hasAlreadyConverted ? (
            <View
              style={[
                styles.limitMessage,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather
                name="info"
                size={20}
                color={theme.textSecondary}
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText
                style={[
                  styles.limitMessageText,
                  { color: theme.textSecondary },
                ]}
              >
                You've already generated a model image for this product. The
                image is for reference only.
              </ThemedText>
            </View>
          ) : (
            <Button
              onPress={handleGenerate}
              disabled={isGenerating || !imageUri}
            >
              {isGenerating ? "Generating..." : "See on Model"}
            </Button>
          )}
        </View>

        {/* Loading State */}
        {isGenerating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.gold} />
            <ThemedText
              style={[styles.loadingText, { color: theme.textSecondary }]}
            >
              Creating your model image...
            </ThemedText>
            <ThemedText
              style={[styles.loadingSubtext, { color: theme.textTertiary }]}
            >
              This may take 15-30 seconds
            </ThemedText>
          </View>
        )}

        {/* Generated Image - tap to enlarge, long press for options */}
        {generatedImageUri && (
          <View style={{ marginTop: Spacing.xl }}>
            <ThemedText style={styles.sectionTitle}>
              Generated Model Image
            </ThemedText>
            <Pressable
              onPress={() => setFullscreenImage(generatedImageUri)}
              onLongPress={handleFullscreenLongPress}
            >
              <Image
                source={{ uri: generatedImageUri }}
                style={styles.generatedImage}
              />
              <View style={styles.tapHint}>
                <Feather name="maximize-2" size={14} color="#FFFFFF" />
              </View>
            </Pressable>

            <ThemedText
              style={[styles.hintText, { color: theme.textTertiary }]}
            >
              Tap to enlarge. Long press for save options.
            </ThemedText>

            <View style={styles.actionRow}>
              <Button
                onPress={handleReplaceOriginal}
                disabled={isSaving}
                style={{ flex: 1, marginRight: Spacing.sm }}
              >
                {isSaving ? "Saving..." : "Use as Product Image"}
              </Button>
              {!hasAlreadyConverted && (
                <Button
                  variant="secondary"
                  onPress={handleGenerate}
                  disabled={isGenerating}
                  style={{ flex: 1, marginLeft: Spacing.sm }}
                >
                  Regenerate
                </Button>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreenImage(null)}
      >
        <StatusBar barStyle="light-content" />
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFullscreenImage(null)}
          onLongPress={() => {
            // Only show save options if viewing the generated image
            if (fullscreenImage === generatedImageUri && generatedBase64) {
              handleFullscreenLongPress();
            }
          }}
        >
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}

          {/* Close button */}
          <Pressable
            style={[styles.closeButton, { top: insets.top + Spacing.md }]}
            onPress={() => setFullscreenImage(null)}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Save/Share button - only for generated image */}
          {fullscreenImage === generatedImageUri && generatedBase64 && (
            <Pressable
              style={[
                styles.saveButton,
                { bottom: insets.bottom + Spacing.xl },
              ]}
              onPress={handleShareImage}
            >
              <Feather name="share" size={20} color="#FFFFFF" />
              <ThemedText style={styles.saveButtonText}>
                Save / Share
              </ThemedText>
            </Pressable>
          )}

          {/* Hint text */}
          {fullscreenImage === generatedImageUri && generatedBase64 && (
            <View
              style={[
                styles.modalHint,
                { bottom: insets.bottom + Spacing.xl + 60 },
              ]}
            >
              <ThemedText style={styles.modalHintText}>
                Long press for more options
              </ThemedText>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  image: {
    width: "100%",
    height: 280,
    borderRadius: BorderRadius.lg,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  tapHint: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: BorderRadius.full,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  limitMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  limitMessageText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  styleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  styleChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: 16,
    fontWeight: "500",
  },
  loadingSubtext: {
    marginTop: Spacing.xs,
    fontSize: 13,
  },
  generatedImage: {
    width: "100%",
    height: 400,
    borderRadius: BorderRadius.lg,
    resizeMode: "cover",
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Fullscreen modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: BorderRadius.full,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: BrandColors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalHint: {
    position: "absolute",
    alignSelf: "center",
  },
  modalHintText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
});
