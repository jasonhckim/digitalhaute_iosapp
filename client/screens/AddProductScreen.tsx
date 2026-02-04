import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { ProductStorage, VendorStorage } from "@/lib/storage";
import { Vendor, CATEGORIES, SEASONS, ProductStatus } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddProductScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | undefined>();

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

  useEffect(() => {
    VendorStorage.getAll().then(setVendors);
  }, []);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
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
        colors: [],
        sizes: [],
        deliveryDate,
        season,
        notes: notes.trim(),
        status: "ordered" as ProductStatus,
        imageUri,
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

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.imageSection}>
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.productImage} />
            <Pressable
              style={[styles.removeImage, { backgroundColor: BrandColors.error }]}
              onPress={() => setImageUri(undefined)}
            >
              <Feather name="x" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.imageButtons}>
            <Pressable
              style={[styles.imageButton, { borderColor: BrandColors.gold }]}
              onPress={handleTakePhoto}
            >
              <Feather name="camera" size={24} color={BrandColors.gold} />
              <ThemedText style={[styles.imageButtonText, { color: BrandColors.gold }]}>
                Take Photo
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.imageButton, { borderColor: BrandColors.gold }]}
              onPress={handlePickImage}
            >
              <Feather name="image" size={24} color={BrandColors.gold} />
              <ThemedText style={[styles.imageButtonText, { color: BrandColors.gold }]}>
                Choose Photo
              </ThemedText>
            </Pressable>
          </View>
        )}
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
  imageSection: {
    marginBottom: Spacing.xl,
  },
  imageContainer: {
    position: "relative",
    alignSelf: "center",
  },
  productImage: {
    width: 160,
    height: 200,
    borderRadius: BorderRadius.md,
  },
  removeImage: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  imageButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  imageButton: {
    flex: 1,
    height: 100,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
