import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { AuthUser } from "@/types";
import {
  registerUser,
  loginUser,
  logoutUser,
  fetchCurrentUser,
  updateProfile as updateProfileApi,
  signInWithApple as signInWithAppleApi,
  signInWithGoogle as signInWithGoogleApi,
  syncSubscriptionPlan,
} from "@/lib/auth";
import { clearAllData } from "@/lib/seedData";
import { migrateLocalDataToServer } from "@/lib/storage";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import {
  identifyUser as rcIdentify,
  logOutPurchases,
  getPlanFromCustomerInfo,
  addCustomerInfoListener,
} from "@/lib/purchases";

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: {
    businessName: string;
    name: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
  updateProfile: (data: {
    businessName?: string;
    name?: string;
    role?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add timeout to prevent infinite loading if Firebase fails
    const timeout = setTimeout(() => {
      console.warn("Auth initialization timeout - proceeding without auth");
      setIsLoading(false);
    }, 5000); // 5 second timeout

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          clearTimeout(timeout); // Clear timeout on successful auth state change

          if (firebaseUser) {
            try {
              const profile = await fetchCurrentUser();

              // Identify user with RevenueCat and sync subscription plan
              try {
                const customerInfo = await rcIdentify(firebaseUser.uid);
                const rcPlan = getPlanFromCustomerInfo(customerInfo);
                if (
                  profile &&
                  rcPlan !== (profile.subscriptionPlan ?? "free")
                ) {
                  profile.subscriptionPlan = rcPlan;
                  syncSubscriptionPlan(rcPlan);
                }
              } catch (rcErr) {
                console.warn("RevenueCat identify failed:", rcErr);
              }

              if (profile) {
                setUser(profile);
                migrateLocalDataToServer().catch((err) =>
                  console.warn("Data migration error:", err),
                );
                registerForPushNotifications().catch((err) =>
                  console.warn("Push registration error:", err),
                );
              }
            } catch (error) {
              console.error("Failed to fetch user profile:", error);
            }
          } else {
            setUser(null);
          }
          setIsLoading(false);
        },
        (error) => {
          // Error callback for onAuthStateChanged
          console.error("Auth state change error:", error);
          clearTimeout(timeout);
          setIsLoading(false);
        },
      );

      return () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (error) {
      console.error("Failed to initialize auth listener:", error);
      clearTimeout(timeout);
      setIsLoading(false);
      return () => {};
    }
  }, []);

  // Listen for RevenueCat subscription changes in real-time
  useEffect(() => {
    const remove = addCustomerInfoListener((customerInfo) => {
      const rcPlan = getPlanFromCustomerInfo(customerInfo);
      setUser((prev) => {
        if (prev && prev.subscriptionPlan !== rcPlan) {
          syncSubscriptionPlan(rcPlan);
          return { ...prev, subscriptionPlan: rcPlan };
        }
        return prev;
      });
    });
    return remove;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await loginUser({ email, password });
    setIsGuest(false);
    const profile = await fetchCurrentUser();
    if (profile) {
      setUser(profile);
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    const profile = await signInWithAppleApi();
    setUser(profile);
    setIsGuest(false);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const profile = await signInWithGoogleApi();
    setUser(profile);
    setIsGuest(false);
  }, []);

  const register = useCallback(
    async (data: {
      businessName: string;
      name: string;
      email: string;
      password: string;
      role: string;
    }) => {
      const profile = await registerUser(data);
      setUser(profile);
      setIsGuest(false);
    },
    [],
  );

  const updateProfile = useCallback(
    async (data: {
      businessName?: string;
      name?: string;
      role?: string;
      avatarUrl?: string;
    }) => {
      const updated = await updateProfileApi(data);
      setUser(updated);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const profile = await fetchCurrentUser();
    if (profile) setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    await clearAllData();
    await logOutPurchases().catch(() => {});
    setUser(null);
    setIsGuest(false);
  }, []);

  const enterGuestMode = useCallback(() => {
    setUser(null);
    setIsGuest(true);
  }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isLoading,
        isAuthenticated,
        login,
        loginWithApple,
        loginWithGoogle,
        register,
        updateProfile,
        refreshUser,
        logout,
        enterGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
