import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Spacing,
  BorderRadius,
  BrandColors,
  FontFamilies,
} from "@/constants/theme";

const ROLE_OPTIONS = [
  { label: "Owner", value: "owner" },
  { label: "Buyer", value: "buyer" },
  { label: "Assistant", value: "assistant" },
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();

  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState<string>(user?.role || "owner");
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatarUrl || null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    businessName !== (user?.businessName || "") ||
    name !== (user?.name || "") ||
    role !== (user?.role || "owner") ||
    avatarUri !== (user?.avatarUrl || null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!businessName.trim()) e.businessName = "Business name is required";
    if (!name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to set a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      Haptics.selectionAsync();
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await updateProfile({
        businessName: businessName.trim(),
        name: name.trim(),
        role,
        ...(avatarUri !== (user?.avatarUrl || null)
          ? { avatarUrl: avatarUri || "" }
          : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (): string => {
    const displayName = name || businessName || "U";
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: BrandColors.cream }]}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing["2xl"],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View
                style={[styles.avatarFallback, { borderColor: BrandColors.camel }]}
              >
                <ThemedText
                  style={[styles.avatarText, { color: BrandColors.camel }]}
                >
                  {getInitials()}
                </ThemedText>
              </View>
            )}
            <View style={styles.cameraButton}>
              <Feather name="camera" size={16} color={BrandColors.cream} />
            </View>
          </Pressable>
          <Pressable onPress={pickImage}>
            <ThemedText style={styles.changePhotoText}>
              Change Profile Photo
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.infoRow}>
          <Feather
            name="mail"
            size={16}
            color={BrandColors.textTertiary}
            style={{ marginRight: Spacing.sm }}
          />
          <ThemedText style={styles.emailText}>{user?.email || ""}</ThemedText>
        </View>

        <View style={styles.form}>
          <Input
            label="Business Name"
            placeholder="My Fashion Boutique"
            value={businessName}
            onChangeText={setBusinessName}
            error={errors.businessName}
            autoCapitalize="words"
          />
          <Input
            label="Your Name"
            placeholder="Jane Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="words"
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
          />
        </View>

        <Button onPress={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: Spacing.md,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: BrandColors.camel,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${BrandColors.camel}10`,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.camel,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BrandColors.cream,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: "600",
    color: BrandColors.camel,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: BrandColors.creamDark,
    borderRadius: BorderRadius.sm,
    alignSelf: "center",
  },
  emailText: {
    fontSize: 15,
    color: BrandColors.textSecondary,
  },
  form: {
    gap: 0,
    marginBottom: Spacing.lg,
  },
});
