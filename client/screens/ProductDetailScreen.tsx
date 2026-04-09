import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Pressable,
  Modal,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows, BrandColors, FontFamilies } from "@/constants/theme";
import { ProductStorage, BudgetStorage } from "@/lib/storage";
import { hasFeature, effectiveSubscriptionPlan } from "@/lib/plans";
import { Product, ProductStatus, STATUS_LABELS } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "ProductDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const canUseSeeOnModel = hasFeature(
    effectiveSubscriptionPlan(user ?? null),
    "seeOnModel",
  );

  const handleSeeOnModelPress = () => {
    if (canUseSeeOnModel) {
      navigation.navigate("TryOn", {
        productId: product!.id,
        imageUri: product!.imageUri!,
        category: product!.category,
      });
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleUpgradeToBilling = () => {
    setShowUpgradeModal(false);
    navigation.navigate("Main", {
      screen: "AccountTab",
      params: { screen: "Billing" },
    });
  };

  useEffect(() => {
    loadProduct();
  }, [route.params.productId]);

  useFocusEffect(
    useCallback(() => {
      loadProduct();
    }, [route.params.productId]),
  );

  const loadProduct = async () => {
    try {
      const data = await ProductStorage.getById(route.params.productId);
      setProduct(data);
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!product) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const updated = await ProductStorage.update(product.id, {
        status: newStatus as ProductStatus,
        receivedDate:
          newStatus === "received" ? new Date().toISOString() : undefined,
      });
      if (updated) {
        setProduct(updated);
        const products = await ProductStorage.getAll();
        await BudgetStorage.updateSpent(products);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!product) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await ProductStorage.delete(product.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading || !product) {
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

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        {product.imageUri ? (
          <View>
            <Pressable onPress={() => setFullscreenImage(product.imageUri!)}>
              <Image source={{ uri: product.imageUri }} style={styles.image} />
              <View style={styles.enlargeHint}>
                <Feather name="maximize-2" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleSeeOnModelPress();
              }}
              style={[
                styles.tryOnButton,
                { backgroundColor: BrandColors.gold },
              ]}
            >
              <Feather name="user" size={16} color="#FFFFFF" />
              <ThemedText style={styles.tryOnButtonText}>
                See on Model
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="image" size={48} color={theme.textTertiary} />
          </View>
        )}

        {/* Show saved model image only if it differs from the main image */}
        {product.modelImageUri && product.modelImageUri !== product.imageUri ? (
          <Pressable
            onPress={() => setFullscreenImage(product.modelImageUri!)}
            style={{ marginBottom: Spacing.lg }}
          >
            <ThemedText
              style={[styles.modelImageLabel, { color: theme.textSecondary }]}
            >
              AI Model Preview
            </ThemedText>
            <Image
              source={{ uri: product.modelImageUri }}
              style={styles.modelImage}
            />
            <View style={styles.enlargeHint}>
              <Feather name="maximize-2" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <ThemedText style={styles.productName}>{product.name}</ThemedText>
          <StatusBadge status={product.status} />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: BrandColors.creamDark },
          ]}
        >
          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Vendor
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {product.vendorName}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Style #
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {product.styleNumber}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Category
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {product.category}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Season
            </ThemedText>
            <ThemedText style={styles.detailValue}>{product.season}</ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: BrandColors.creamDark },
          ]}
        >
          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Wholesale Price
            </ThemedText>
            <ThemedText
              style={[styles.priceValue, { color: BrandColors.gold }]}
            >
              {formatCurrency(product.wholesalePrice)}
            </ThemedText>
          </View>

          {product.retailPrice ? (
            <View style={styles.detailRow}>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textSecondary }]}
              >
                Retail Price
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatCurrency(product.retailPrice)}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Quantity
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {product.quantity}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Total Cost
            </ThemedText>
            <ThemedText
              style={[styles.priceValue, { color: BrandColors.gold }]}
            >
              {formatCurrency(product.wholesalePrice * product.quantity)}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: BrandColors.creamDark },
          ]}
        >
          <View style={styles.detailRow}>
            <ThemedText
              style={[styles.detailLabel, { color: theme.textSecondary }]}
            >
              Delivery Date
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatDate(product.deliveryDate)}
            </ThemedText>
          </View>

          {product.receivedDate ? (
            <View style={styles.detailRow}>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textSecondary }]}
              >
                Received Date
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(product.receivedDate)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {product.notes ? (
          <View
            style={[
              styles.card,
              { backgroundColor: BrandColors.creamDark },
            ]}
          >
            <ThemedText
              style={[
                styles.detailLabel,
                { color: theme.textSecondary, marginBottom: Spacing.sm },
              ]}
            >
              Notes
            </ThemedText>
            <ThemedText style={styles.notesText}>{product.notes}</ThemedText>
          </View>
        ) : null}

        <Select
          label="Update Status"
          options={statusOptions}
          value={product.status}
          onChange={handleStatusChange}
        />

        <Button
          variant="primary"
          onPress={() =>
            navigation.navigate("EditProduct", { productId: product.id })
          }
          style={styles.editButton}
        >
          Edit Product
        </Button>

        <Button
          variant="secondary"
          onPress={handleDelete}
          style={styles.deleteButton}
        >
          Delete Product
        </Button>
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
        >
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT * 0.75,
              }}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={[styles.closeButton, { top: insets.top + Spacing.md }]}
            onPress={() => setFullscreenImage(null)}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>

      <UpgradePromptModal
        visible={showUpgradeModal}
        featureId="seeOnModel"
        onDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradeToBilling}
      />
    </>
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
  image: {
    width: "100%",
    height: 300,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  productName: {
    fontSize: 24,
    fontFamily: FontFamilies.serif,
    color: BrandColors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontSize: 15,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  enlargeHint: {
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
  tryOnButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    position: "absolute",
    bottom: Spacing.lg + Spacing.xl,
    right: Spacing.md,
    gap: Spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tryOnButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modelImageLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  modelImage: {
    width: "100%",
    height: 300,
    borderRadius: BorderRadius.lg,
  },
  editButton: {
    marginTop: Spacing.xl,
  },
  deleteButton: {
    marginTop: Spacing.md,
    borderColor: BrandColors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
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
});
