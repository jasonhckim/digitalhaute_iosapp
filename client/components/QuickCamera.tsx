import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";
import { BrandColors, BorderRadius, Spacing } from "@/constants/theme";
import { Button } from "./Button";

interface QuickCameraProps {
  onCapture: (uri: string, base64?: string) => void;
  onCancel: () => void;
  includeBase64?: boolean;
  title?: string;
}

export function QuickCamera({ onCapture, onCancel, includeBase64 = false, title }: QuickCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const insets = useSafeAreaInsets();

  if (!permission) {
    return (
      <View style={styles.container}>
        <ThemedText>Loading camera...</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <Feather name="camera-off" size={48} color={BrandColors.gold} />
        <ThemedText style={styles.permissionText}>Camera access is required</ThemedText>
        <Button onPress={requestPermission} style={styles.permissionButton}>
          <ThemedText style={styles.permissionButtonText}>Enable Camera</ThemedText>
        </Button>
        <Button onPress={onCancel} variant="secondary" style={styles.cancelButton}>
          <ThemedText>Cancel</ThemedText>
        </Button>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: includeBase64 ? 0.5 : 0.8,
        base64: includeBase64,
        skipProcessing: Platform.OS === "android",
      });

      if (photo) {
        onCapture(photo.uri, photo.base64 || undefined);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={[styles.overlay, { paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.header}>
            <Pressable onPress={onCancel} style={styles.closeButton}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
            {title ? (
              <ThemedText style={styles.title}>{title}</ThemedText>
            ) : null}
            <View style={styles.placeholder} />
          </View>
        </View>

        <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.captureContainer}>
            <Pressable
              onPress={handleCapture}
              disabled={isCapturing}
              style={({ pressed }) => [
                styles.captureButton,
                pressed && styles.captureButtonPressed,
                isCapturing && styles.captureButtonDisabled,
              ]}
            >
              <View style={styles.captureInner} />
            </Pressable>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  placeholder: {
    width: 44,
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  captureContainer: {
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: BrandColors.gold,
    paddingHorizontal: Spacing.xl,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
});
