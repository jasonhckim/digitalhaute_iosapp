import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  // @ts-expect-error - getReactNativePersistence is exported from the RN-specific entry point
  // Metro bundler resolves this correctly at runtime via react-native export condition
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Get Firebase config from environment variables
// Expo automatically loads EXPO_PUBLIC_* variables from .env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase configuration is missing! Check your .env file.");
  console.error("Required variables: EXPO_PUBLIC_FIREBASE_*");
}

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
