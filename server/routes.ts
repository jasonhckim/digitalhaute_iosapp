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
    async (req: Request, res: Response) => {
      try {
        const { productIds, shopDomain } = req.body;

        if (
          !productIds ||
          !Array.isArray(productIds) ||
          productIds.length === 0
        ) {
          return res.status(400).json({ error: "Product IDs are required" });
        }

        const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        if (!shopifyAccessToken || !shopDomain) {
          return res.status(400).json({
            error:
              "Shopify is not configured. Please connect your store in Settings.",
          });
        }

        // Full Shopify Admin API integration requires store-specific OAuth setup.
        return res.status(501).json({
          success: false,
          error:
            "Shopify export is not yet implemented. OAuth integration with Shopify Admin API is required.",
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
