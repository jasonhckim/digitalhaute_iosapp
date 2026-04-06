import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product, Vendor, Budget, AppSettings } from "@/types";
import { apiRequest } from "@/lib/query-client";
import { auth } from "@/lib/firebase";

const PRODUCTS_KEY = "@digitalhaute/products";
const VENDORS_KEY = "@digitalhaute/vendors";
const BUDGETS_KEY = "@digitalhaute/budgets";
const SETTINGS_KEY = "@digitalhaute/settings";
const EVENTS_KEY = "@digitalhaute/events";
const MIGRATION_KEY = "@digitalhaute/migrated_to_server";

const DEFAULT_SETTINGS: AppSettings = {
  markupMultiplier: 2.5,
  roundingMode: "none",
};

function isAuthenticated(): boolean {
  return !!auth.currentUser;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function dbProductToClient(p: Record<string, unknown>): Product {
  return {
    id: p.id as string,
    name: p.name as string,
    styleNumber: (p.styleNumber ?? p.style_number ?? "") as string,
    vendorId: (p.vendorId ?? p.vendor_id ?? "") as string,
    vendorName: (p.vendorName ?? p.vendor_name ?? "") as string,
    category: (p.category ?? "") as string,
    subcategory: p.subcategory as string | undefined,
    wholesalePrice: Number(p.wholesalePrice ?? p.wholesale_price ?? 0),
    retailPrice: p.retailPrice != null || p.retail_price != null
      ? Number(p.retailPrice ?? p.retail_price)
      : undefined,
    quantity: Number(p.quantity ?? 0),
    packs: p.packs != null ? Number(p.packs) : undefined,
    packRatio: (p.packRatio ?? p.pack_ratio) as Product["packRatio"],
    colors: (p.colors ?? []) as string[],
    selectedColors: (p.selectedColors ?? p.selected_colors) as string[] | undefined,
    sizes: (p.sizes ?? []) as string[],
    deliveryDate: (p.deliveryDate ?? p.delivery_date ?? "") as string,
    receivedDate: (p.receivedDate ?? p.received_date) as string | undefined,
    season: (p.season ?? "") as string,
    collection: p.collection as string | undefined,
    event: p.event as string | undefined,
    notes: p.notes as string | undefined,
    status: (p.status ?? "maybe") as Product["status"],
    scanStatus: (p.scanStatus ?? p.scan_status) as Product["scanStatus"],
    imageUri: (p.imageUri ?? p.image_uri) as string | undefined,
    modelImageUri: (p.modelImageUri ?? p.model_image_uri) as string | undefined,
    createdAt: (p.createdAt ?? p.created_at ?? "") as string,
    updatedAt: (p.updatedAt ?? p.updated_at ?? "") as string,
  };
}

function dbVendorToClient(v: Record<string, unknown>): Vendor {
  return {
    id: v.id as string,
    name: v.name as string,
    contactName: (v.contactName ?? v.contact_name) as string | undefined,
    email: v.email as string | undefined,
    phone: v.phone as string | undefined,
    website: v.website as string | undefined,
    address: v.address as string | undefined,
    paymentTerms: (v.paymentTerms ?? v.payment_terms) as string | undefined,
    packRatio: (v.packRatio ?? v.pack_ratio) as Vendor["packRatio"],
    notes: v.notes as string | undefined,
    isFavorite: !!(v.isFavorite ?? v.is_favorite),
    createdAt: (v.createdAt ?? v.created_at ?? "") as string,
    updatedAt: (v.updatedAt ?? v.updated_at ?? "") as string,
  };
}

function dbBudgetToClient(b: Record<string, unknown>): Budget {
  return {
    id: b.id as string,
    season: b.season as string,
    category: b.category as string | undefined,
    vendorId: (b.vendorId ?? b.vendor_id) as string | undefined,
    amount: Number(b.amount ?? 0),
    spent: Number(b.spent ?? 0),
    createdAt: (b.createdAt ?? b.created_at ?? "") as string,
    updatedAt: (b.updatedAt ?? b.updated_at ?? "") as string,
  };
}

// ── AsyncStorage helpers (for guest mode) ──────────────────────

async function localGetAll<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function localSetAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// ── ProductStorage ──────────────────────────────────────────────

export const ProductStorage = {
  async getAll(): Promise<Product[]> {
    if (!isAuthenticated()) {
      return localGetAll<Product>(PRODUCTS_KEY);
    }
    try {
      const res = await apiRequest("GET", "/api/products");
      const data = await res.json();
      return (data.products ?? []).map(dbProductToClient);
    } catch (error) {
      console.warn("API products fetch failed, using local:", error);
      return localGetAll<Product>(PRODUCTS_KEY);
    }
  },

  async getById(id: string): Promise<Product | null> {
    if (!isAuthenticated()) {
      const products = await localGetAll<Product>(PRODUCTS_KEY);
      return products.find((p) => p.id === id) || null;
    }
    try {
      const res = await apiRequest("GET", `/api/products/${id}`);
      const data = await res.json();
      return data.product ? dbProductToClient(data.product) : null;
    } catch {
      return null;
    }
  },

  async create(
    product: Omit<Product, "id" | "createdAt" | "updatedAt">,
  ): Promise<Product> {
    if (!isAuthenticated()) {
      const products = await localGetAll<Product>(PRODUCTS_KEY);
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...product,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      products.unshift(newProduct);
      await localSetAll(PRODUCTS_KEY, products);
      return newProduct;
    }
    const res = await apiRequest("POST", "/api/products", product);
    const data = await res.json();
    return dbProductToClient(data.product);
  },

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (!isAuthenticated()) {
      const products = await localGetAll<Product>(PRODUCTS_KEY);
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) return null;
      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await localSetAll(PRODUCTS_KEY, products);
      return products[index];
    }
    try {
      const res = await apiRequest("PUT", `/api/products/${id}`, updates);
      const data = await res.json();
      return data.product ? dbProductToClient(data.product) : null;
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isAuthenticated()) {
      const products = await localGetAll<Product>(PRODUCTS_KEY);
      const filtered = products.filter((p) => p.id !== id);
      if (filtered.length === products.length) return false;
      await localSetAll(PRODUCTS_KEY, filtered);
      return true;
    }
    try {
      await apiRequest("DELETE", `/api/products/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  async getByVendor(vendorId: string): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter((p) => p.vendorId === vendorId);
  },
};

// ── VendorStorage ──────────────────────────────────────────────

export const VendorStorage = {
  async getAll(): Promise<Vendor[]> {
    if (!isAuthenticated()) {
      return localGetAll<Vendor>(VENDORS_KEY);
    }
    try {
      const res = await apiRequest("GET", "/api/vendors");
      const data = await res.json();
      return (data.vendors ?? []).map(dbVendorToClient);
    } catch (error) {
      console.warn("API vendors fetch failed, using local:", error);
      return localGetAll<Vendor>(VENDORS_KEY);
    }
  },

  async getById(id: string): Promise<Vendor | null> {
    if (!isAuthenticated()) {
      const vendors = await localGetAll<Vendor>(VENDORS_KEY);
      return vendors.find((v) => v.id === id) || null;
    }
    try {
      const res = await apiRequest("GET", `/api/vendors/${id}`);
      const data = await res.json();
      return data.vendor ? dbVendorToClient(data.vendor) : null;
    } catch {
      return null;
    }
  },

  async create(
    vendor: Omit<Vendor, "id" | "createdAt" | "updatedAt">,
  ): Promise<Vendor> {
    if (!isAuthenticated()) {
      const vendors = await localGetAll<Vendor>(VENDORS_KEY);
      const now = new Date().toISOString();
      const newVendor: Vendor = {
        ...vendor,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      vendors.unshift(newVendor);
      await localSetAll(VENDORS_KEY, vendors);
      return newVendor;
    }
    const res = await apiRequest("POST", "/api/vendors", vendor);
    const data = await res.json();
    return dbVendorToClient(data.vendor);
  },

  async update(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
    if (!isAuthenticated()) {
      const vendors = await localGetAll<Vendor>(VENDORS_KEY);
      const index = vendors.findIndex((v) => v.id === id);
      if (index === -1) return null;
      vendors[index] = {
        ...vendors[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await localSetAll(VENDORS_KEY, vendors);
      return vendors[index];
    }
    try {
      const res = await apiRequest("PUT", `/api/vendors/${id}`, updates);
      const data = await res.json();
      return data.vendor ? dbVendorToClient(data.vendor) : null;
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isAuthenticated()) {
      const vendors = await localGetAll<Vendor>(VENDORS_KEY);
      const filtered = vendors.filter((v) => v.id !== id);
      if (filtered.length === vendors.length) return false;
      await localSetAll(VENDORS_KEY, filtered);
      return true;
    }
    try {
      await apiRequest("DELETE", `/api/vendors/${id}`);
      return true;
    } catch {
      return false;
    }
  },
};

// ── BudgetStorage ──────────────────────────────────────────────

export const BudgetStorage = {
  async getAll(): Promise<Budget[]> {
    if (!isAuthenticated()) {
      return localGetAll<Budget>(BUDGETS_KEY);
    }
    try {
      const res = await apiRequest("GET", "/api/budgets");
      const data = await res.json();
      return (data.budgets ?? []).map(dbBudgetToClient);
    } catch (error) {
      console.warn("API budgets fetch failed, using local:", error);
      return localGetAll<Budget>(BUDGETS_KEY);
    }
  },

  async getById(id: string): Promise<Budget | null> {
    if (!isAuthenticated()) {
      const budgets = await localGetAll<Budget>(BUDGETS_KEY);
      return budgets.find((b) => b.id === id) || null;
    }
    try {
      const res = await apiRequest("GET", `/api/budgets/${id}`);
      const data = await res.json();
      return data.budget ? dbBudgetToClient(data.budget) : null;
    } catch {
      return null;
    }
  },

  async create(
    budget: Omit<Budget, "id" | "createdAt" | "updatedAt">,
  ): Promise<Budget> {
    if (!isAuthenticated()) {
      const budgets = await localGetAll<Budget>(BUDGETS_KEY);
      const now = new Date().toISOString();
      const newBudget: Budget = {
        ...budget,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      budgets.unshift(newBudget);
      await localSetAll(BUDGETS_KEY, budgets);
      return newBudget;
    }
    const res = await apiRequest("POST", "/api/budgets", budget);
    const data = await res.json();
    return dbBudgetToClient(data.budget);
  },

  async update(id: string, updates: Partial<Budget>): Promise<Budget | null> {
    if (!isAuthenticated()) {
      const budgets = await localGetAll<Budget>(BUDGETS_KEY);
      const index = budgets.findIndex((b) => b.id === id);
      if (index === -1) return null;
      budgets[index] = {
        ...budgets[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await localSetAll(BUDGETS_KEY, budgets);
      return budgets[index];
    }
    try {
      const res = await apiRequest("PUT", `/api/budgets/${id}`, updates);
      const data = await res.json();
      return data.budget ? dbBudgetToClient(data.budget) : null;
    } catch {
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!isAuthenticated()) {
      const budgets = await localGetAll<Budget>(BUDGETS_KEY);
      const filtered = budgets.filter((b) => b.id !== id);
      if (filtered.length === budgets.length) return false;
      await localSetAll(BUDGETS_KEY, filtered);
      return true;
    }
    try {
      await apiRequest("DELETE", `/api/budgets/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  async updateSpent(products: Product[]): Promise<void> {
    if (isAuthenticated()) {
      try {
        await apiRequest("POST", "/api/budgets/update-spent");
        return;
      } catch {
        // Fall through to local
      }
    }
    const budgets = await localGetAll<Budget>(BUDGETS_KEY);
    for (const budget of budgets) {
      let spent = 0;
      for (const product of products) {
        if (product.season !== budget.season) continue;
        if (budget.category && product.category !== budget.category) continue;
        if (budget.vendorId && product.vendorId !== budget.vendorId) continue;
        if (product.status !== "cancelled") {
          spent += product.wholesalePrice * product.quantity;
        }
      }
      budget.spent = spent;
    }
    await localSetAll(BUDGETS_KEY, budgets);
  },
};

// ── EventStorage ──────────────────────────────────────────────

export const EventStorage = {
  async getAll(): Promise<string[]> {
    if (!isAuthenticated()) {
      return localGetAll<string>(EVENTS_KEY);
    }
    try {
      const res = await apiRequest("GET", "/api/events");
      const data = await res.json();
      return data.events ?? [];
    } catch {
      return localGetAll<string>(EVENTS_KEY);
    }
  },

  async add(event: string): Promise<string[]> {
    if (!isAuthenticated()) {
      const events = await localGetAll<string>(EVENTS_KEY);
      const exists = events.some(
        (e) => e.toLowerCase() === event.trim().toLowerCase(),
      );
      if (!exists && event.trim()) {
        events.unshift(event.trim());
        await localSetAll(EVENTS_KEY, events);
      }
      return events;
    }
    try {
      const res = await apiRequest("POST", "/api/events", { name: event });
      const data = await res.json();
      return data.events ?? [];
    } catch {
      return this.getAll();
    }
  },

  async delete(event: string): Promise<string[]> {
    if (!isAuthenticated()) {
      const events = await localGetAll<string>(EVENTS_KEY);
      const filtered = events.filter(
        (e) => e.toLowerCase() !== event.toLowerCase(),
      );
      await localSetAll(EVENTS_KEY, filtered);
      return filtered;
    }
    try {
      const res = await apiRequest("DELETE", "/api/events", { name: event });
      const data = await res.json();
      return data.events ?? [];
    } catch {
      return this.getAll();
    }
  },
};

// ── SettingsStorage ──────────────────────────────────────────────

export const SettingsStorage = {
  async get(): Promise<AppSettings> {
    if (!isAuthenticated()) {
      try {
        const data = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!data) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(data);
        if ("roundUpPrices" in parsed && !("roundingMode" in parsed)) {
          parsed.roundingMode = parsed.roundUpPrices ? "up" : "none";
          delete parsed.roundUpPrices;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    try {
      const res = await apiRequest("GET", "/api/settings");
      const data = await res.json();
      return {
        markupMultiplier: data.settings?.markupMultiplier ?? 2.5,
        roundingMode: data.settings?.roundingMode ?? "none",
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async save(settings: AppSettings): Promise<void> {
    if (!isAuthenticated()) {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return;
    }
    try {
      await apiRequest("PUT", "/api/settings", settings);
    } catch {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  },

  calculateRetailPrice(wholesalePrice: number, settings: AppSettings): number {
    const rawPrice = wholesalePrice * settings.markupMultiplier;
    switch (settings.roundingMode) {
      case "up":
        return Math.ceil(rawPrice);
      case "even": {
        const rounded = Math.ceil(rawPrice);
        return rounded % 2 === 0 ? rounded : rounded + 1;
      }
      default:
        return Math.round(rawPrice * 100) / 100;
    }
  },
};

export function calculateRetailPrice(
  wholesalePrice: number,
  settings: AppSettings | null,
): number {
  if (!settings) return wholesalePrice * 2.5;
  const rawPrice = wholesalePrice * settings.markupMultiplier;
  switch (settings.roundingMode) {
    case "up":
      return Math.ceil(rawPrice);
    case "even": {
      const rounded = Math.ceil(rawPrice);
      return rounded % 2 === 0 ? rounded : rounded + 1;
    }
    default:
      return Math.round(rawPrice * 100) / 100;
  }
}

export async function getDashboardStats(): Promise<{
  totalProducts: number;
  totalVendors: number;
  nextDeliveryDate?: string;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
}> {
  if (isAuthenticated()) {
    try {
      const res = await apiRequest("GET", "/api/dashboard/stats");
      const data = await res.json();
      return data.stats;
    } catch {
      // Fall through to local
    }
  }

  const [products, vendors, budgets] = await Promise.all([
    ProductStorage.getAll(),
    VendorStorage.getAll(),
    BudgetStorage.getAll(),
  ]);

  const activeProducts = products.filter((p) => p.status !== "cancelled");

  const upcomingDeliveries = activeProducts
    .filter((p) => new Date(p.deliveryDate) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime(),
    );

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return {
    totalProducts: activeProducts.length,
    totalVendors: vendors.length,
    nextDeliveryDate: upcomingDeliveries[0]?.deliveryDate,
    budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
  };
}

/**
 * One-time migration: upload local AsyncStorage data to the server.
 * Runs after login if local data exists and hasn't been migrated yet.
 */
export async function migrateLocalDataToServer(): Promise<void> {
  if (!isAuthenticated()) return;

  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (alreadyMigrated === "true") return;

    const [localProducts, localVendors, localBudgets, localEvents, localSettings] =
      await Promise.all([
        localGetAll<Product>(PRODUCTS_KEY),
        localGetAll<Vendor>(VENDORS_KEY),
        localGetAll<Budget>(BUDGETS_KEY),
        localGetAll<string>(EVENTS_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
      ]);

    const hasData =
      localProducts.length > 0 ||
      localVendors.length > 0 ||
      localBudgets.length > 0 ||
      localEvents.length > 0;

    if (!hasData) {
      await AsyncStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    console.log(
      `Migrating local data: ${localProducts.length} products, ${localVendors.length} vendors, ${localBudgets.length} budgets, ${localEvents.length} events`,
    );

    const promises: Promise<unknown>[] = [];

    if (localVendors.length > 0) {
      promises.push(apiRequest("POST", "/api/vendors/bulk", { vendors: localVendors }));
    }
    if (localProducts.length > 0) {
      promises.push(apiRequest("POST", "/api/products/bulk", { products: localProducts }));
    }
    if (localBudgets.length > 0) {
      promises.push(apiRequest("POST", "/api/budgets/bulk", { budgets: localBudgets }));
    }
    if (localEvents.length > 0) {
      promises.push(apiRequest("POST", "/api/events/bulk", { events: localEvents }));
    }
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        promises.push(apiRequest("PUT", "/api/settings", parsed));
      } catch {
        // Ignore parse errors
      }
    }

    await Promise.allSettled(promises);

    await AsyncStorage.multiRemove([
      PRODUCTS_KEY,
      VENDORS_KEY,
      BUDGETS_KEY,
      EVENTS_KEY,
    ]);
    await AsyncStorage.setItem(MIGRATION_KEY, "true");

    console.log("Local data migration complete");
  } catch (error) {
    console.warn("Local data migration failed (will retry next launch):", error);
  }
}
