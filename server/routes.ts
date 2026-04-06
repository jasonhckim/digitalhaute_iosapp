import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import {
  registerAuthRoutes,
  authenticateAdminToken,
  authenticateToken,
} from "./auth";
import { storage } from "./storage";
import {
  generateTryOnImage,
  type EditorialStyle,
} from "./tryOnService";
import { exportProductsToShopify } from "./shopifyService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface LabelScanResult {
  styleName?: string;
  styleNumber?: string;
  wholesalePrice?: number;
  retailPrice?: number;
  colors?: string[];
  sizes?: string[];
  category?: string;
  brandName?: string;
  season?: string;
  notes?: string;
}

function normalizeCurrency(code: unknown): string {
  if (typeof code === "string" && code.trim()) return code.trim().toUpperCase();
  return "USD";
}

function getRevenueCatEventId(
  eventData: Record<string, unknown> | undefined,
): string | undefined {
  if (!eventData) return undefined;
  const directId = eventData.id;
  if (typeof directId === "string" && directId.trim()) return directId;
  const eventId = eventData.event_id;
  if (typeof eventId === "string" && eventId.trim()) return eventId;
  const transactionId = eventData.transaction_id;
  if (typeof transactionId === "string" && transactionId.trim()) return transactionId;
  return undefined;
}

function getNetRevenueCents(eventData: Record<string, unknown> | undefined): number {
  if (!eventData) return 0;
  const directNet = eventData.net_revenue;
  if (typeof directNet === "number" && Number.isFinite(directNet)) {
    return Math.max(0, Math.round(directNet * 100));
  }

  const paidAmount = eventData.price_in_purchased_currency;
  if (typeof paidAmount === "number" && Number.isFinite(paidAmount)) {
    return Math.max(0, Math.round(paidAmount * 100));
  }

  return 0;
}

export async function registerRoutes(app: Express): Promise<Server> {
  registerAuthRoutes(app);

  app.post("/api/scan-label", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at reading wholesale fashion product labels and hang tags from trade shows and showrooms. Extract information from the label image and return a JSON object with the following fields (use null for fields you cannot determine):
{
  "styleName": "Product name or style name",
  "styleNumber": "Style number, SKU, or product code",
  "wholesalePrice": number (wholesale/cost price without currency symbol),
  "retailPrice": number (suggested retail price without currency symbol),
  "colors": ["array of available color options"],
  "sizes": ["array of available sizes like XS, S, M, L, XL or numeric sizes"],
  "category": "One of: Tops, Bottoms, Dresses, Outerwear, Accessories, Shoes, Bags, Jewelry",
  "brandName": "Brand or vendor name",
  "season": "Season like Fall 2026, Resort 2027, etc.",
  "notes": "Any additional info like fabric content, care instructions, etc."
}

CRITICAL - This is for WHOLESALE fashion buying:
- If there's only ONE price on the label, it's the WHOLESALE PRICE (put in wholesalePrice, leave retailPrice as null)
- Only use retailPrice if you see "MSRP", "Retail", "SRP", or similar indicators
- The color shown at the top (like "L.BLUE") is the current item's color - the list below shows ALL available colors
- Extract the list of available colors, not just the current item's color
- Interpret color abbreviations: L.BLUE = Light Blue, L.PINK = Light Pink, etc.
- Style numbers typically start with letters followed by numbers (e.g., HF26C297)
- Look for category indicators like "Top", "Dress", "Pants" on the label
- Return valid JSON only, no markdown or explanation`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Please extract all product information from this label/hang tag image.",
              },
            ],
          },
        ],
        max_completion_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return res.status(502).json({
          success: false,
          error:
            "No response received from image analysis. Please try again with a clearer image.",
        });
      }

      let result: LabelScanResult;
      try {
        const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
        result = JSON.parse(cleaned);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        return res.status(502).json({
          success: false,
          error:
            "Could not parse label data. Please try again with a clearer image.",
        });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error scanning label:", error);
      res.status(500).json({ error: "Failed to scan label" });
    }
  });

  // Virtual try-on endpoint: generate a model wearing the garment
  app.post("/api/try-on", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { imageBase64, category, style } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: "Image data is required (imageBase64)",
        });
      }

      const validStyles = [
        "studio",
        "ecommerce",
        "street",
        "lifestyle",
        "campaign",
        "social",
      ];

      if (style && !validStyles.includes(style)) {
        return res.status(400).json({
          success: false,
          error: `Invalid style. Must be one of: ${validStyles.join(", ")}`,
        });
      }

      console.log(
        `Try-on request: category=${category || "auto"}, style=${style || "studio"}`,
      );

      const result = await generateTryOnImage({
        imageBase64,
        category,
        style: (style as EditorialStyle) || "studio",
      });

      if (!result.success) {
        return res.status(502).json({
          success: false,
          error: result.error || "Failed to generate try-on image",
        });
      }

      res.json({
        success: true,
        imageBase64: result.imageBase64,
      });
    } catch (error) {
      console.error("Error in try-on endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during image generation",
      });
    }
  });

  // Shopify integration status endpoint
  app.get("/api/shopify/status", (req: Request, res: Response) => {
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const shopifyDomain = process.env.SHOPIFY_SHOP_DOMAIN;

    if (!shopifyAccessToken || !shopifyDomain) {
      return res.json({
        success: true,
        configured: false,
        connected: false,
      });
    }

    return res.json({
      success: true,
      configured: true,
      connected: true,
      shopDomain: shopifyDomain,
      connectedAt: process.env.SHOPIFY_CONNECTED_AT || new Date().toISOString(),
    });
  });

  // Shopify product export endpoint
  app.post(
    "/api/products/export-to-shopify",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { products, shopDomain: bodyShopDomain } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ error: "Products array is required" });
        }

        if (products.length > 50) {
          return res.status(400).json({
            error: "Maximum 50 products per export. Please export in smaller batches.",
          });
        }

        const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        const shopDomain = bodyShopDomain || process.env.SHOPIFY_SHOP_DOMAIN;

        if (!shopifyAccessToken || !shopDomain) {
          return res.status(400).json({
            error:
              "Shopify is not configured. Please connect your store in Settings.",
          });
        }

        console.log(
          `Shopify export: ${products.length} products to ${shopDomain}`,
        );

        const result = await exportProductsToShopify(
          shopDomain,
          shopifyAccessToken,
          products,
        );

        if (result.created === 0 && result.failed > 0) {
          return res.status(502).json({
            success: false,
            count: 0,
            error: `All ${result.failed} products failed to export.`,
            errors: result.errors,
          });
        }

        res.json({
          success: true,
          count: result.created,
          failed: result.failed,
          message:
            result.failed > 0
              ? `${result.created} exported, ${result.failed} failed.`
              : `${result.created} product${result.created !== 1 ? "s" : ""} exported to Shopify.`,
          errors: result.errors.length > 0 ? result.errors : undefined,
        });
      } catch (error) {
        console.error("Error exporting to Shopify:", error);
        return res
          .status(500)
          .json({ error: "Failed to export products to Shopify" });
      }
    },
  );

  // Validate a referral code before signup.
  app.post("/api/affiliates/validate-code", async (req: Request, res: Response) => {
    const rawCode = req.body?.code;
    if (typeof rawCode !== "string" || !rawCode.trim()) {
      return res.status(400).json({ valid: false, error: "Code is required" });
    }

    const referrer = await storage.findUserByReferralCode(rawCode);
    if (!referrer) {
      return res.json({ valid: false });
    }

    return res.json({
      valid: true,
      referrerName: referrer.name,
      referrerBusinessName: referrer.businessName,
    });
  });

  app.get("/api/affiliates/me", authenticateToken, async (req: Request, res: Response) => {
    const uid = req.userId!;
    const [profile, stats] = await Promise.all([
      storage.getOrCreateAffiliateProfile(uid),
      storage.getAffiliateStats(uid),
    ]);

    return res.json({
      profile,
      stats,
      shareText: `Use my Digital Haute referral code ${profile.referralCode} when you sign up.`,
    });
  });

  app.get(
    "/api/affiliates/me/referrals",
    authenticateToken,
    async (req: Request, res: Response) => {
      const rows = await storage.listAffiliateReferrals(req.userId!);
      return res.json({ referrals: rows });
    },
  );

  app.get(
    "/api/affiliates/me/earnings",
    authenticateToken,
    async (req: Request, res: Response) => {
      const stats = await storage.getAffiliateStats(req.userId!);
      return res.json({ earnings: stats });
    },
  );

  app.get(
    "/api/affiliates/me/payout-requests",
    authenticateToken,
    async (req: Request, res: Response) => {
      const rows = await storage.listAffiliatePayoutRequests(req.userId!);
      return res.json({ payoutRequests: rows });
    },
  );

  app.post(
    "/api/affiliates/me/payout-requests",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const { amountCents, method, destination } = req.body ?? {};
        if (!Number.isInteger(amountCents) || amountCents <= 0) {
          return res.status(400).json({ error: "amountCents must be a positive integer" });
        }
        if (!["paypal", "stripe", "other"].includes(method)) {
          return res.status(400).json({ error: "Invalid payout method" });
        }
        if (typeof destination !== "string" || !destination.trim()) {
          return res.status(400).json({ error: "destination is required" });
        }

        const payoutRequest = await storage.createAffiliatePayoutRequest({
          referrerUserId: req.userId!,
          amountCents,
          method,
          destination,
        });

        return res.status(201).json({ payoutRequest });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create payout request";
        return res.status(400).json({ error: message });
      }
    },
  );

  app.get("/api/admin/overview", authenticateAdminToken, async (_req, res) => {
    const overview = await storage.getAdminOverview();
    return res.json({ overview });
  });

  app.get("/api/admin/referrals", authenticateAdminToken, async (_req, res) => {
    const referrals = await storage.listAdminReferrals();
    return res.json({ referrals });
  });

  app.get("/api/admin/payout-requests", authenticateAdminToken, async (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    if (status && !["requested", "approved", "rejected", "paid"].includes(status)) {
      return res.status(400).json({ error: "Invalid status query parameter" });
    }
    const payoutRequests = await storage.listAdminPayoutRequests(
      status as "requested" | "approved" | "rejected" | "paid" | undefined,
    );
    return res.json({ payoutRequests });
  });

  app.post(
    "/api/admin/payout-requests/:id/approve",
    authenticateAdminToken,
    async (req, res) => {
      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await storage.approvePayoutRequest(requestId, req.userId!);
      if (!updated) {
        return res.status(404).json({ error: "Payout request not found or already handled" });
      }
      return res.json({ payoutRequest: updated });
    },
  );

  app.post(
    "/api/admin/payout-requests/:id/reject",
    authenticateAdminToken,
    async (req, res) => {
      const note = typeof req.body?.note === "string" ? req.body.note : undefined;
      const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await storage.rejectPayoutRequest(requestId, req.userId!, note);
      if (!updated) {
        return res.status(404).json({ error: "Payout request not found or already handled" });
      }
      return res.json({ payoutRequest: updated });
    },
  );

  app.post(
    "/api/admin/payout-requests/:id/mark-paid",
    authenticateAdminToken,
    async (req, res) => {
      try {
        const provider = req.body?.provider;
        const externalTransferId = req.body?.externalTransferId;
        const note = typeof req.body?.note === "string" ? req.body.note : undefined;
        const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        if (
          typeof provider !== "string" ||
          !["paypal", "stripe", "other"].includes(provider)
        ) {
          return res.status(400).json({ error: "Invalid provider" });
        }
        if (typeof externalTransferId !== "string" || !externalTransferId.trim()) {
          return res.status(400).json({ error: "externalTransferId is required" });
        }

        const updated = await storage.markPayoutRequestPaid({
          id: requestId,
          adminUserId: req.userId!,
          provider: provider as "paypal" | "stripe" | "other",
          externalTransferId,
          note,
        });
        if (!updated) {
          return res
            .status(404)
            .json({ error: "Payout request not found or already handled" });
        }
        return res.json({ payoutRequest: updated });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to mark payout paid";
        return res.status(400).json({ error: message });
      }
    },
  );

  // ── Team Management ──────────────────────────────────────────────

  app.post("/api/team/invite", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { email, role } = req.body ?? {};
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "Email is required" });
      }
      if (role && !["buyer", "assistant"].includes(role)) {
        return res.status(400).json({ error: "Role must be buyer or assistant" });
      }
      const invitation = await storage.createTeamInvitation(
        req.userId!,
        email,
        role || "buyer",
      );
      return res.status(201).json({ invitation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send invitation";
      return res.status(400).json({ error: message });
    }
  });

  app.get("/api/team/members", authenticateToken, async (req: Request, res: Response) => {
    const members = await storage.listTeamMembers(req.userId!);
    const count = await storage.getTeamMemberCount(req.userId!);
    const user = await storage.getUserById(req.userId!);
    return res.json({ members, count, plan: user?.subscriptionPlan ?? "free" });
  });

  app.get("/api/team/invitations", authenticateToken, async (req: Request, res: Response) => {
    const invitations = await storage.listTeamInvitations(req.userId!);
    return res.json({ invitations });
  });

  app.delete("/api/team/members/:id", authenticateToken, async (req: Request, res: Response) => {
    const memberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const removed = await storage.removeTeamMember(req.userId!, memberId);
    if (!removed) {
      return res.status(404).json({ error: "Team member not found" });
    }
    return res.json({ success: true });
  });

  app.patch("/api/team/members/:id/role", authenticateToken, async (req: Request, res: Response) => {
    const memberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role } = req.body ?? {};
    if (!role || !["buyer", "assistant"].includes(role)) {
      return res.status(400).json({ error: "Role must be buyer or assistant" });
    }
    const updated = await storage.updateTeamMemberRole(req.userId!, memberId, role);
    if (!updated) {
      return res.status(404).json({ error: "Team member not found" });
    }
    return res.json({ success: true });
  });

  app.post("/api/team/invitations/:token/accept", authenticateToken, async (req: Request, res: Response) => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const result = await storage.acceptTeamInvitation(token, req.userId!);
    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }
    return res.json({ success: true });
  });

  app.post("/api/team/invitations/:token/decline", authenticateToken, async (req: Request, res: Response) => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const declined = await storage.declineTeamInvitation(token);
    if (!declined) {
      return res.status(404).json({ error: "Invitation not found or already handled" });
    }
    return res.json({ success: true });
  });

  app.delete("/api/team/invitations/:id", authenticateToken, async (req: Request, res: Response) => {
    const invitationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cancelled = await storage.cancelTeamInvitation(req.userId!, invitationId);
    if (!cancelled) {
      return res.status(404).json({ error: "Invitation not found or already handled" });
    }
    return res.json({ success: true });
  });

  // ── Products CRUD ──────────────────────────────────────────────

  app.get("/api/products", authenticateToken, async (req: Request, res: Response) => {
    const items = await storage.listProducts(req.userId!);
    return res.json({ products: items });
  });

  app.get("/api/products/:id", authenticateToken, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await storage.getProductById(req.userId!, id);
    if (!item) return res.status(404).json({ error: "Product not found" });
    return res.json({ product: item });
  });

  app.post("/api/products", authenticateToken, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const item = await storage.createProduct(req.userId!, {
        name: data.name ?? "",
        styleNumber: data.styleNumber ?? "",
        vendorId: data.vendorId ?? "",
        vendorName: data.vendorName ?? "",
        category: data.category ?? "",
        subcategory: data.subcategory,
        wholesalePrice: String(data.wholesalePrice ?? 0),
        retailPrice: data.retailPrice != null ? String(data.retailPrice) : null,
        quantity: data.quantity ?? 0,
        packs: data.packs,
        packRatio: data.packRatio,
        colors: data.colors ?? [],
        selectedColors: data.selectedColors,
        sizes: data.sizes ?? [],
        deliveryDate: data.deliveryDate ?? "",
        receivedDate: data.receivedDate,
        season: data.season ?? "",
        collection: data.collection,
        event: data.event,
        notes: data.notes,
        status: data.status ?? "maybe",
        scanStatus: data.scanStatus,
        imageUri: data.imageUri,
        modelImageUri: data.modelImageUri,
      });
      return res.status(201).json({ product: item });
    } catch (error) {
      console.error("Create product error:", error);
      return res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.styleNumber !== undefined) updates.styleNumber = data.styleNumber;
      if (data.vendorId !== undefined) updates.vendorId = data.vendorId;
      if (data.vendorName !== undefined) updates.vendorName = data.vendorName;
      if (data.category !== undefined) updates.category = data.category;
      if (data.subcategory !== undefined) updates.subcategory = data.subcategory;
      if (data.wholesalePrice !== undefined) updates.wholesalePrice = String(data.wholesalePrice);
      if (data.retailPrice !== undefined) updates.retailPrice = data.retailPrice != null ? String(data.retailPrice) : null;
      if (data.quantity !== undefined) updates.quantity = data.quantity;
      if (data.packs !== undefined) updates.packs = data.packs;
      if (data.packRatio !== undefined) updates.packRatio = data.packRatio;
      if (data.colors !== undefined) updates.colors = data.colors;
      if (data.selectedColors !== undefined) updates.selectedColors = data.selectedColors;
      if (data.sizes !== undefined) updates.sizes = data.sizes;
      if (data.deliveryDate !== undefined) updates.deliveryDate = data.deliveryDate;
      if (data.receivedDate !== undefined) updates.receivedDate = data.receivedDate;
      if (data.season !== undefined) updates.season = data.season;
      if (data.collection !== undefined) updates.collection = data.collection;
      if (data.event !== undefined) updates.event = data.event;
      if (data.notes !== undefined) updates.notes = data.notes;
      if (data.status !== undefined) updates.status = data.status;
      if (data.scanStatus !== undefined) updates.scanStatus = data.scanStatus;
      if (data.imageUri !== undefined) updates.imageUri = data.imageUri;
      if (data.modelImageUri !== undefined) updates.modelImageUri = data.modelImageUri;

      const item = await storage.updateProduct(req.userId!, id, updates);
      if (!item) return res.status(404).json({ error: "Product not found" });
      return res.json({ product: item });
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", authenticateToken, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await storage.deleteProduct(req.userId!, id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    return res.json({ success: true });
  });

  // Bulk import (used by local-to-server data migration)
  app.post("/api/products/bulk", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { products: items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "products array required" });
      const mapped = items.map((d: Record<string, unknown>) => ({
        id: d.id as string | undefined,
        name: (d.name as string) ?? "",
        styleNumber: (d.styleNumber as string) ?? "",
        vendorId: (d.vendorId as string) ?? "",
        vendorName: (d.vendorName as string) ?? "",
        category: (d.category as string) ?? "",
        subcategory: d.subcategory as string | undefined,
        wholesalePrice: String(d.wholesalePrice ?? 0),
        retailPrice: d.retailPrice != null ? String(d.retailPrice) : null,
        quantity: (d.quantity as number) ?? 0,
        packs: d.packs as number | undefined,
        packRatio: d.packRatio,
        colors: d.colors ?? [],
        selectedColors: d.selectedColors,
        sizes: d.sizes ?? [],
        deliveryDate: (d.deliveryDate as string) ?? "",
        receivedDate: d.receivedDate as string | undefined,
        season: (d.season as string) ?? "",
        collection: d.collection as string | undefined,
        event: d.event as string | undefined,
        notes: d.notes as string | undefined,
        status: (d.status as string) ?? "maybe",
        scanStatus: d.scanStatus as string | undefined,
        imageUri: d.imageUri as string | undefined,
        modelImageUri: d.modelImageUri as string | undefined,
      }));
      const created = await storage.bulkCreateProducts(req.userId!, mapped as any);
      return res.json({ count: created.length });
    } catch (error) {
      console.error("Bulk create products error:", error);
      return res.status(500).json({ error: "Failed to bulk create products" });
    }
  });

  // ── Vendors CRUD ──────────────────────────────────────────────

  app.get("/api/vendors", authenticateToken, async (req: Request, res: Response) => {
    const items = await storage.listVendors(req.userId!);
    return res.json({ vendors: items });
  });

  app.get("/api/vendors/:id", authenticateToken, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await storage.getVendorById(req.userId!, id);
    if (!item) return res.status(404).json({ error: "Vendor not found" });
    return res.json({ vendor: item });
  });

  app.post("/api/vendors", authenticateToken, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const item = await storage.createVendor(req.userId!, {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        paymentTerms: data.paymentTerms,
        packRatio: data.packRatio,
        notes: data.notes,
        isFavorite: data.isFavorite ?? false,
      });
      return res.status(201).json({ vendor: item });
    } catch (error) {
      console.error("Create vendor error:", error);
      return res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  app.put("/api/vendors/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const item = await storage.updateVendor(req.userId!, id, req.body);
      if (!item) return res.status(404).json({ error: "Vendor not found" });
      return res.json({ vendor: item });
    } catch (error) {
      console.error("Update vendor error:", error);
      return res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", authenticateToken, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await storage.deleteVendor(req.userId!, id);
    if (!deleted) return res.status(404).json({ error: "Vendor not found" });
    return res.json({ success: true });
  });

  app.post("/api/vendors/bulk", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { vendors: items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "vendors array required" });
      const created = await storage.bulkCreateVendors(req.userId!, items);
      return res.json({ count: created.length });
    } catch (error) {
      console.error("Bulk create vendors error:", error);
      return res.status(500).json({ error: "Failed to bulk create vendors" });
    }
  });

  // ── Budgets CRUD ──────────────────────────────────────────────

  app.get("/api/budgets", authenticateToken, async (req: Request, res: Response) => {
    const items = await storage.listBudgets(req.userId!);
    return res.json({ budgets: items });
  });

  app.get("/api/budgets/:id", authenticateToken, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await storage.getBudgetById(req.userId!, id);
    if (!item) return res.status(404).json({ error: "Budget not found" });
    return res.json({ budget: item });
  });

  app.post("/api/budgets", authenticateToken, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const item = await storage.createBudget(req.userId!, {
        season: data.season,
        category: data.category,
        vendorId: data.vendorId,
        amount: String(data.amount ?? 0),
        spent: String(data.spent ?? 0),
      });
      return res.status(201).json({ budget: item });
    } catch (error) {
      console.error("Create budget error:", error);
      return res.status(500).json({ error: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;
      const updates: Record<string, unknown> = {};
      if (data.season !== undefined) updates.season = data.season;
      if (data.category !== undefined) updates.category = data.category;
      if (data.vendorId !== undefined) updates.vendorId = data.vendorId;
      if (data.amount !== undefined) updates.amount = String(data.amount);
      if (data.spent !== undefined) updates.spent = String(data.spent);

      const item = await storage.updateBudget(req.userId!, id, updates);
      if (!item) return res.status(404).json({ error: "Budget not found" });
      return res.json({ budget: item });
    } catch (error) {
      console.error("Update budget error:", error);
      return res.status(500).json({ error: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", authenticateToken, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await storage.deleteBudget(req.userId!, id);
    if (!deleted) return res.status(404).json({ error: "Budget not found" });
    return res.json({ success: true });
  });

  app.post("/api/budgets/update-spent", authenticateToken, async (req: Request, res: Response) => {
    try {
      await storage.updateBudgetSpent(req.userId!);
      return res.json({ success: true });
    } catch (error) {
      console.error("Update budget spent error:", error);
      return res.status(500).json({ error: "Failed to update budget spent" });
    }
  });

  app.post("/api/budgets/bulk", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { budgets: items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "budgets array required" });
      const mapped = items.map((d: Record<string, unknown>) => ({
        id: d.id as string | undefined,
        season: (d.season as string) ?? "",
        category: d.category as string | undefined,
        vendorId: d.vendorId as string | undefined,
        amount: String(d.amount ?? 0),
        spent: String(d.spent ?? 0),
      }));
      const created = await storage.bulkCreateBudgets(req.userId!, mapped);
      return res.json({ count: created.length });
    } catch (error) {
      console.error("Bulk create budgets error:", error);
      return res.status(500).json({ error: "Failed to bulk create budgets" });
    }
  });

  // ── Events ──────────────────────────────────────────────

  app.get("/api/events", authenticateToken, async (req: Request, res: Response) => {
    const items = await storage.listEvents(req.userId!);
    return res.json({ events: items });
  });

  app.post("/api/events", authenticateToken, async (req: Request, res: Response) => {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Event name is required" });
    }
    const items = await storage.addEvent(req.userId!, name);
    return res.json({ events: items });
  });

  app.delete("/api/events", authenticateToken, async (req: Request, res: Response) => {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Event name is required" });
    }
    const items = await storage.deleteEvent(req.userId!, name);
    return res.json({ events: items });
  });

  app.post("/api/events/bulk", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { events: names } = req.body;
      if (!Array.isArray(names)) return res.status(400).json({ error: "events array required" });
      await storage.bulkCreateEvents(req.userId!, names);
      return res.json({ success: true });
    } catch (error) {
      console.error("Bulk create events error:", error);
      return res.status(500).json({ error: "Failed to bulk create events" });
    }
  });

  // ── User Settings ──────────────────────────────────────────────

  app.get("/api/settings", authenticateToken, async (req: Request, res: Response) => {
    const settings = await storage.getUserSettings(req.userId!);
    return res.json({ settings });
  });

  app.put("/api/settings", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { markupMultiplier, roundingMode } = req.body ?? {};
      const settings = await storage.upsertUserSettings(req.userId!, {
        markupMultiplier: typeof markupMultiplier === "number" ? markupMultiplier : 2.5,
        roundingMode: ["none", "up", "even"].includes(roundingMode) ? roundingMode : "none",
      });
      return res.json({ settings });
    } catch (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ── Dashboard Stats ──────────────────────────────────────────────

  app.get("/api/dashboard/stats", authenticateToken, async (req: Request, res: Response) => {
    const stats = await storage.getDashboardStats(req.userId!);
    return res.json({ stats });
  });

  // RevenueCat webhook — receives subscription lifecycle events
  // Set this URL in RevenueCat Dashboard > Project Settings > Integrations > Webhooks
  app.post("/api/webhooks/revenuecat", async (req: Request, res: Response) => {
    try {
      // Verify the webhook auth header matches your RC webhook secret
      const authHeader = req.headers.authorization;
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

      if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const event = req.body;
      const eventData = event?.event as Record<string, unknown> | undefined;
      const appUserId =
        typeof eventData?.app_user_id === "string" ? eventData.app_user_id : undefined;
      const eventType = typeof eventData?.type === "string" ? eventData.type : undefined;

      if (!appUserId || !eventType) {
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      console.log(`RevenueCat webhook: ${eventType} for user ${appUserId}`);

      // Determine plan from entitlements in the event
      const entitlements = Array.isArray(eventData?.entitlement_ids)
        ? (eventData.entitlement_ids as string[])
        : [];

      // Resolve highest tier from entitlements
      function resolveEntitlementPlan(ents: string[]): "free" | "starter" | "growth" | "vip" {
        if (ents.includes("VIP")) return "vip";
        if (ents.includes("Growth")) return "growth";
        if (ents.includes("Starter")) return "starter";
        return "free";
      }

      // Map event types to subscription plan updates
      const upgradeEvents = [
        "INITIAL_PURCHASE",
        "RENEWAL",
        "UNCANCELLATION",
        "PRODUCT_CHANGE",
      ];
      const downgradeEvents = [
        "EXPIRATION",
        "CANCELLATION",
        "BILLING_ISSUE",
      ];

      if (upgradeEvents.includes(eventType)) {
        const plan = resolveEntitlementPlan(entitlements);
        await storage.updateUser(appUserId, { subscriptionPlan: plan });
        console.log(`User ${appUserId} upgraded to ${plan}`);
      } else if (downgradeEvents.includes(eventType)) {
        await storage.updateUser(appUserId, { subscriptionPlan: "free" });
        console.log(`User ${appUserId} downgraded to free`);
      }

      await storage.createCommissionFromRevenueCatEvent({
        referredUserId: appUserId,
        revenuecatEventId: getRevenueCatEventId(eventData),
        eventType,
        currency: normalizeCurrency(eventData?.currency),
        netRevenueCents: getNetRevenueCents(eventData),
        note: "RevenueCat webhook event",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("RevenueCat webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
