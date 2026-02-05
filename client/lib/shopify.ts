import { apiRequest } from "./query-client";
import { ShopifyStatus } from "@/types";

export async function checkShopifyStatus(): Promise<ShopifyStatus> {
  const res = await apiRequest("GET", "/api/shopify/status");
  return res.json();
}

interface ExportResult {
  success: boolean;
  count: number;
  message?: string;
}

export async function exportToShopify(
  productIds: string[],
  shopDomain: string,
): Promise<ExportResult> {
  const res = await apiRequest("POST", "/api/products/export-to-shopify", {
    productIds,
    shopDomain,
  });
  return res.json();
}
