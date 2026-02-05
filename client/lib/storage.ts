import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product, Vendor, Budget, AppSettings } from "@/types";

const PRODUCTS_KEY = "@digitalhaute/products";
const VENDORS_KEY = "@digitalhaute/vendors";
const BUDGETS_KEY = "@digitalhaute/budgets";
const SETTINGS_KEY = "@digitalhaute/settings";

const DEFAULT_SETTINGS: AppSettings = {
  markupMultiplier: 2.5,
  roundUpPrices: false,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const ProductStorage = {
  async getAll(): Promise<Product[]> {
    try {
      const data = await AsyncStorage.getItem(PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Product | null> {
    const products = await this.getAll();
    return products.find((p) => p.id === id) || null;
  },

  async create(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> {
    const products = await this.getAll();
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    products.unshift(newProduct);
    await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    return newProduct;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const products = await this.getAll();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    
    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    return products[index];
  },

  async delete(id: string): Promise<boolean> {
    const products = await this.getAll();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) return false;
    await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
    return true;
  },

  async getByVendor(vendorId: string): Promise<Product[]> {
    const products = await this.getAll();
    return products.filter((p) => p.vendorId === vendorId);
  },
};

export const VendorStorage = {
  async getAll(): Promise<Vendor[]> {
    try {
      const data = await AsyncStorage.getItem(VENDORS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting vendors:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Vendor | null> {
    const vendors = await this.getAll();
    return vendors.find((v) => v.id === id) || null;
  },

  async create(vendor: Omit<Vendor, "id" | "createdAt" | "updatedAt">): Promise<Vendor> {
    const vendors = await this.getAll();
    const now = new Date().toISOString();
    const newVendor: Vendor = {
      ...vendor,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    vendors.unshift(newVendor);
    await AsyncStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
    return newVendor;
  },

  async update(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
    const vendors = await this.getAll();
    const index = vendors.findIndex((v) => v.id === id);
    if (index === -1) return null;
    
    vendors[index] = {
      ...vendors[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
    return vendors[index];
  },

  async delete(id: string): Promise<boolean> {
    const vendors = await this.getAll();
    const filtered = vendors.filter((v) => v.id !== id);
    if (filtered.length === vendors.length) return false;
    await AsyncStorage.setItem(VENDORS_KEY, JSON.stringify(filtered));
    return true;
  },
};

export const BudgetStorage = {
  async getAll(): Promise<Budget[]> {
    try {
      const data = await AsyncStorage.getItem(BUDGETS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting budgets:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Budget | null> {
    const budgets = await this.getAll();
    return budgets.find((b) => b.id === id) || null;
  },

  async create(budget: Omit<Budget, "id" | "createdAt" | "updatedAt">): Promise<Budget> {
    const budgets = await this.getAll();
    const now = new Date().toISOString();
    const newBudget: Budget = {
      ...budget,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    budgets.unshift(newBudget);
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    return newBudget;
  },

  async update(id: string, updates: Partial<Budget>): Promise<Budget | null> {
    const budgets = await this.getAll();
    const index = budgets.findIndex((b) => b.id === id);
    if (index === -1) return null;
    
    budgets[index] = {
      ...budgets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    return budgets[index];
  },

  async delete(id: string): Promise<boolean> {
    const budgets = await this.getAll();
    const filtered = budgets.filter((b) => b.id !== id);
    if (filtered.length === budgets.length) return false;
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(filtered));
    return true;
  },

  async updateSpent(products: Product[]): Promise<void> {
    const budgets = await this.getAll();
    
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
    
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
  },
};

export const SettingsStorage = {
  async get(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Error getting settings:", error);
      return DEFAULT_SETTINGS;
    }
  },

  async save(settings: AppSettings): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  calculateRetailPrice(wholesalePrice: number, settings: AppSettings): number {
    const rawPrice = wholesalePrice * settings.markupMultiplier;
    return settings.roundUpPrices ? Math.ceil(rawPrice) : Math.round(rawPrice * 100) / 100;
  },
};

export async function getDashboardStats(): Promise<{
  totalProducts: number;
  totalVendors: number;
  nextDeliveryDate?: string;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
}> {
  const [products, vendors, budgets] = await Promise.all([
    ProductStorage.getAll(),
    VendorStorage.getAll(),
    BudgetStorage.getAll(),
  ]);

  const activeProducts = products.filter((p) => p.status !== "cancelled");
  
  const upcomingDeliveries = activeProducts
    .filter((p) => new Date(p.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

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
