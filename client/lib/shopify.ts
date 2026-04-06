import { apiRequest } from "./query-client";
import { ShopifyStatus, Product } from "@/types";

export async function checkShopifyStatus(): Promise<ShopifyStatus> {
  const res = await apiRequest("GET", "/api/shopify/status");
  return res.json();
}

interface ExportResult {
  success: boolean;
  count: number;
  failed?: number;
  message?: string;
  errors?: string[];
}

export async function exportToShopify(
  products: Product[],
  shopDomain: string,
): Promise<ExportResult> {
  const res = await apiRequest("POST", "/api/products/export-to-shopify", {
    products,
    shopDomain,
  });
  return res.json();
}
