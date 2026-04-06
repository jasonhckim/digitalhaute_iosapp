/**
 * Shopify Admin REST API integration for product export.
 * Uses the 2024-01 API version.
 */

const SHOPIFY_API_VERSION = "2024-01";

interface ShopifyVariant {
  option1: string;
  option2?: string;
  price: string;
  compare_at_price?: string;
  sku: string;
  inventory_quantity: number;
  weight?: number;
  weight_unit?: string;
}

interface ShopifyImage {
  src: string;
}

interface ShopifyProductPayload {
  product: {
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    tags: string;
    status: "active" | "draft" | "archived";
    options: Array<{ name: string; values: string[] }>;
    variants: ShopifyVariant[];
    images: ShopifyImage[];
  };
}

interface ProductInput {
  id: string;
  name: string;
  styleNumber: string;
  vendorName: string;
  category: string;
  subcategory?: string;
  wholesalePrice: number;
  retailPrice?: number;
  quantity: number;
  colors: string[];
  selectedColors?: string[];
  sizes: string[];
  season: string;
  collection?: string;
  event?: string;
  notes?: string;
  status: string;
  imageUri?: string;
}

interface ExportResult {
  created: number;
  failed: number;
  errors: string[];
}

function mapStatusToShopify(
  status: string,
): "active" | "draft" | "archived" {
  switch (status) {
    case "ordered":
    case "shipped":
    case "delivered":
    case "received":
      return "active";
    case "cancelled":
      return "archived";
    default:
      return "draft";
  }
}

export function mapProductToShopifyProduct(
  product: ProductInput,
): ShopifyProductPayload {
  const colors =
    product.selectedColors && product.selectedColors.length > 0
      ? product.selectedColors
      : product.colors.length > 0
        ? product.colors
        : ["Default"];

  const sizes = product.sizes.length > 0 ? product.sizes : ["OS"];

  const tags = [product.season, product.collection, product.event, product.category]
    .filter(Boolean)
    .join(", ");

  // Build variants: colors × sizes
  const variants: ShopifyVariant[] = [];
  for (const color of colors) {
    for (const size of sizes) {
      variants.push({
        option1: color,
        option2: size,
        price: (product.retailPrice ?? product.wholesalePrice).toFixed(2),
        compare_at_price: product.retailPrice
          ? undefined
          : undefined,
        sku: `${product.styleNumber}-${color.replace(/\s+/g, "").substring(0, 5).toUpperCase()}-${size}`,
        inventory_quantity: product.quantity,
      });
    }
  }

  // Build options
  const options: Array<{ name: string; values: string[] }> = [];
  if (colors.length > 0) {
    options.push({ name: "Color", values: colors });
  }
  if (sizes.length > 0) {
    options.push({ name: "Size", values: sizes });
  }

  // Only include images with HTTP(S) URLs (local file:// URIs won't work)
  const images: ShopifyImage[] = [];
  if (product.imageUri && /^https?:\/\//.test(product.imageUri)) {
    images.push({ src: product.imageUri });
  }

  const bodyParts: string[] = [];
  if (product.notes) bodyParts.push(`<p>${product.notes}</p>`);
  if (product.subcategory) bodyParts.push(`<p>Subcategory: ${product.subcategory}</p>`);

  return {
    product: {
      title: product.name || `${product.vendorName} ${product.styleNumber}`,
      body_html: bodyParts.join("\n") || "",
      vendor: product.vendorName,
      product_type: product.category,
      tags,
      status: mapStatusToShopify(product.status),
      options,
      variants,
      images,
    },
  };
}

export async function createShopifyProduct(
  shopDomain: string,
  accessToken: string,
  payload: ShopifyProductPayload,
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `Shopify API error (${response.status}) for "${payload.product.title}":`,
      errorBody,
    );
    return {
      success: false,
      error: `${response.status}: ${errorBody.slice(0, 200)}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    productId: String(data.product?.id ?? ""),
  };
}

/**
 * Export an array of products to Shopify with rate limiting.
 * Shopify REST API allows ~2 requests/second.
 */
export async function exportProductsToShopify(
  shopDomain: string,
  accessToken: string,
  products: ProductInput[],
): Promise<ExportResult> {
  const result: ExportResult = { created: 0, failed: 0, errors: [] };

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const payload = mapProductToShopifyProduct(product);

    const createResult = await createShopifyProduct(
      shopDomain,
      accessToken,
      payload,
    );

    if (createResult.success) {
      result.created++;
    } else {
      result.failed++;
      result.errors.push(
        `"${product.name || product.styleNumber}": ${createResult.error}`,
      );
    }

    // Rate limit: wait 500ms between requests (2 req/sec)
    if (i < products.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return result;
}
