export type ProductStatus =
  | "maybe"
  | "ordered"
  | "shipped"
  | "delivered"
  | "received"
  | "cancelled";

export interface Product {
  id: string;
  name: string;
  styleNumber: string;
  vendorId: string;
  vendorName: string;
  category: string;
  subcategory?: string;
  wholesalePrice: number;
  retailPrice?: number;
  quantity: number;
  packs?: number;
  packRatio?: PackRatio;
  colors: string[];
  selectedColors?: string[];
  sizes: string[];
  deliveryDate: string;
  receivedDate?: string;
  season: string;
  collection?: string;
  notes?: string;
  status: ProductStatus;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackRatio {
  sizes: string[];
  quantities: number[];
}

export interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
  packRatio?: PackRatio;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  season: string;
  category?: string;
  vendorId?: string;
  amount: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalVendors: number;
  nextDeliveryDate?: string;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
}

export const CATEGORIES = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Accessories",
  "Shoes",
  "Bags",
  "Jewelry",
] as const;

function generateSeasons(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const seasons: string[] = [];

  // Determine which seasons to show based on current month
  // Fashion buying typically works 6-12 months ahead
  const seasonNames = ["Spring", "Summer", "Fall", "Winter", "Resort"];

  // Start from current season of current year, show through next year + Resort
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const year = currentYear + yearOffset;
    for (const name of seasonNames) {
      if (name === "Resort") {
        seasons.push(`${name} ${year + 1}`);
      } else {
        seasons.push(`${name} ${year}`);
      }
    }
  }

  return seasons;
}

export const SEASONS = generateSeasons();

export const STATUS_LABELS: Record<ProductStatus, string> = {
  maybe: "Maybe",
  ordered: "Ordered",
  shipped: "Shipped",
  delivered: "Delivered",
  received: "Received",
  cancelled: "Cancelled",
};

export type RoundingMode = "none" | "up" | "even";

export interface AppSettings {
  markupMultiplier: number;
  roundingMode: RoundingMode;
}

export interface ShopifyStatus {
  success: boolean;
  configured: boolean;
  connected: boolean;
  shopDomain?: string;
  connectedAt?: string;
}
