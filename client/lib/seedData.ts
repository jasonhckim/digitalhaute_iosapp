import AsyncStorage from "@react-native-async-storage/async-storage";

const SEED_KEY = "@digitalhaute/seeded";

export async function seedMockData(): Promise<boolean> {
  return false;
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    "@digitalhaute/products",
    "@digitalhaute/vendors",
    "@digitalhaute/budgets",
    "@digitalhaute/settings",
    SEED_KEY,
  ]);
}
