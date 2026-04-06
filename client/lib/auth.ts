import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  OAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/lib/firebase";
import { getApiUrl } from "@/lib/query-client";
import type { AuthUser } from "@/types";

const CACHED_PROFILE_KEY = "@digitalhaute/cached_profile";

async function authFetch(
  route: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Abort after 5 seconds so auth doesn't hang when server is unreachable
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    return await fetch(url.toString(), {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function registerUser(data: {
  businessName: string;
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<AuthUser> {
  // Create Firebase user
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password,
    );
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    switch (err.code) {
      case "auth/email-already-in-use":
        throw new Error("An account with this email already exists. Please log in instead.");
      case "auth/invalid-email":
        throw new Error("Please enter a valid email address.");
      case "auth/weak-password":
        throw new Error("Password is too weak. Please use at least 6 characters.");
      case "auth/operation-not-allowed":
        throw new Error("Email/password registration is not enabled. Please contact support.");
      case "auth/network-request-failed":
        throw new Error("Network error. Please check your internet connection and try again.");
      default:
        throw new Error(err.message || "Registration failed. Please try again.");
    }
  }

  // Try to save profile to server (may fail if server is unreachable on TestFlight)
  try {
    const res = await authFetch("/api/auth/profile", {
      method: "POST",
      body: JSON.stringify({
        businessName: data.businessName,
        name: data.name,
        role: data.role,
      }),
    });

    if (res.ok) {
      const body = await res.json();
      return body.user;
    }
  } catch {
    // Server unreachable — fall through to local fallback
  }

  // Fallback: return user from Firebase data so registration still succeeds
  return {
    id: credential.user.uid,
    businessName: data.businessName,
    name: data.name,
    email: data.email,
    role: data.role as AuthUser["role"],
    subscriptionPlan: "free" as const,
    createdAt: new Date().toISOString(),
  };
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<void> {
  await signInWithEmailAndPassword(auth, data.email, data.password);
}

export async function signInWithApple(): Promise<AuthUser> {
  // Generate a nonce for security
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const { identityToken } = appleCredential;
  if (!identityToken) {
    throw new Error("Apple sign-in failed: no identity token returned.");
  }

  // Create Firebase credential with Apple token
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });

  const firebaseResult = await signInWithCredential(auth, credential);

  // Apple only returns name/email on the FIRST sign-in, so capture it
  const appleFullName = appleCredential.fullName;
  const displayName = appleFullName
    ? [appleFullName.givenName, appleFullName.familyName]
        .filter(Boolean)
        .join(" ")
    : "";

  const uid = firebaseResult.user.uid;
  const email = firebaseResult.user.email || appleCredential.email || "";

  // Try to save/update profile on server
  try {
    const res = await authFetch("/api/auth/profile", {
      method: "POST",
      body: JSON.stringify({
        businessName: "",
        name: displayName || firebaseResult.user.displayName || "",
        role: "owner",
      }),
    });

    if (res.ok) {
      const body = await res.json();
      return body.user;
    }
  } catch {
    // Server unreachable — fall through to local fallback
  }

  return {
    id: uid,
    businessName: "",
    name: displayName || firebaseResult.user.displayName || "",
    email,
    role: "owner",
    subscriptionPlan: "free" as const,
    createdAt:
      firebaseResult.user.metadata.creationTime || new Date().toISOString(),
  };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!auth.currentUser) return null;

  try {
    const res = await authFetch("/api/auth/me");
    if (res.ok) {
      const body = await res.json();
      if (body.user) {
        AsyncStorage.setItem(
          CACHED_PROFILE_KEY,
          JSON.stringify(body.user),
        ).catch(() => {});
        return body.user;
      }
    }
  } catch {
    // Server unreachable — try local cache first, then Firebase fallback
  }

  try {
    const cached = await AsyncStorage.getItem(CACHED_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as AuthUser;
      if (parsed.id === auth.currentUser.uid) {
        return parsed;
      }
    }
  } catch {
    // Cache read failed
  }

  const firebaseUser = auth.currentUser;
  return {
    id: firebaseUser.uid,
    businessName: "",
    name: firebaseUser.displayName || "",
    email: firebaseUser.email || "",
    role: "owner",
    subscriptionPlan: "free" as const,
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
  };
}

export async function updateProfile(data: {
  businessName?: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
}): Promise<AuthUser> {
  const res = await authFetch("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to update profile");
  }

  const body = await res.json();
  return body.user;
}

export async function deleteAccount(): Promise<void> {
  const res = await authFetch("/api/auth/account", { method: "DELETE" });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to delete account");
  }
}

export async function exportUserData(): Promise<Record<string, unknown>> {
  const res = await authFetch("/api/auth/export-data");

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to export data");
  }

  return res.json();
}
