import { describe, it, expect } from "vitest";
import { mapProductToShopifyProduct } from "../shopifyService";

describe("mapProductToShopifyProduct", () => {
  const base = {
    id: "p1",
    name: "Silk Blouse",
    styleNumber: "SB-100",
    vendorName: "Acme Apparel",
    category: "Tops",
    wholesalePrice: 45,
    retailPrice: 95,
    quantity: 12,
    colors: ["Ivory", "Black"],
    sizes: ["S", "M", "L"],
    season: "Fall 2026",
    status: "ordered",
  };

  it("produces correct title, vendor, and product_type", () => {
    const { product } = mapProductToShopifyProduct(base as any);
    expect(product.title).toBe("Silk Blouse");
    expect(product.vendor).toBe("Acme Apparel");
    expect(product.product_type).toBe("Tops");
  });

  it("builds color × size variant matrix", () => {
    const { product } = mapProductToShopifyProduct(base as any);
    expect(product.variants).toHaveLength(6); // 2 colors × 3 sizes
    expect(product.variants[0].option1).toBe("Ivory");
    expect(product.variants[0].option2).toBe("S");
  });

  it("uses retailPrice when available", () => {
    const { product } = mapProductToShopifyProduct(base as any);
    expect(product.variants[0].price).toBe("95.00");
  });

  it("falls back to wholesalePrice when no retailPrice", () => {
    const noRetail = { ...base, retailPrice: undefined };
    const { product } = mapProductToShopifyProduct(noRetail as any);
    expect(product.variants[0].price).toBe("45.00");
  });

  it("maps ordered status to active", () => {
    const { product } = mapProductToShopifyProduct(base as any);
    expect(product.status).toBe("active");
  });

  it("maps cancelled status to archived", () => {
    const cancelled = { ...base, status: "cancelled" };
    const { product } = mapProductToShopifyProduct(cancelled as any);
    expect(product.status).toBe("archived");
  });

  it("maps unknown status to draft", () => {
    const draft = { ...base, status: "maybe" };
    const { product } = mapProductToShopifyProduct(draft as any);
    expect(product.status).toBe("draft");
  });

  it("generates SKU from styleNumber, color, and size", () => {
    const { product } = mapProductToShopifyProduct(base as any);
    expect(product.variants[0].sku).toBe("SB-100-IVORY-S");
  });

  it("defaults to ['Default'] color and ['OS'] size when empty", () => {
    const minimal = { ...base, colors: [], sizes: [] };
    const { product } = mapProductToShopifyProduct(minimal as any);
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].option1).toBe("Default");
    expect(product.variants[0].option2).toBe("OS");
  });

  it("includes tags from season, collection, event, category", () => {
    const withMeta = { ...base, collection: "Holiday", event: "MAGIC" };
    const { product } = mapProductToShopifyProduct(withMeta as any);
    expect(product.tags).toContain("Fall 2026");
    expect(product.tags).toContain("Holiday");
    expect(product.tags).toContain("MAGIC");
    expect(product.tags).toContain("Tops");
  });

  it("excludes local file:// images", () => {
    const local = { ...base, imageUri: "file:///tmp/photo.jpg" };
    const { product } = mapProductToShopifyProduct(local as any);
    expect(product.images).toHaveLength(0);
  });

  it("includes https images", () => {
    const remote = { ...base, imageUri: "https://cdn.example.com/photo.jpg" };
    const { product } = mapProductToShopifyProduct(remote as any);
    expect(product.images).toHaveLength(1);
    expect(product.images[0].src).toBe("https://cdn.example.com/photo.jpg");
  });
});
