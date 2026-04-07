import type { Express, Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";
import { profileSchema } from "@shared/schema";
import { storage } from "./storage";

function loadFirebaseCredential(): admin.credential.Credential | null {
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      return admin.credential.cert(parsed);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e);
    }
  }

  const filePath = path.resolve(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(filePath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return admin.credential.cert(serviceAccount);
  }

  console.error(
    "WARNING: Firebase credentials not found. Auth endpoints will not work. " +
      "Set FIREBASE_SERVICE_ACCOUNT env var or provide firebase-service-account.json",
  );
  return null;
}

const firebaseCred = loadFirebaseCredential();
if (firebaseCred) {
  admin.initializeApp({ credential: firebaseCred });
} else {
  admin.initializeApp();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      authToken?: DecodedIdToken;
    }
  }
}

function sanitizeUser(user: {
  id: string;
  businessName: string;
  name: string;
  email: string;
  role: string | null;
  avatarUrl?: string | null;
  subscriptionPlan?: string | null;
  createdAt: string | null;
}) {
  return {
    id: user.id,
    businessName: user.businessName,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    subscriptionPlan: user.subscriptionPlan ?? "free",
    createdAt: user.createdAt,
  };
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  admin
    .auth()
    .verifyIdToken(token)
    .then((decoded) => {
      req.userId = decoded.uid;
      req.authToken = decoded;
      next();
    })
    .catch(() => {
      return res.status(401).json({ error: "Invalid or expired token" });
    });
}

export function authenticateAdminToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  authenticateToken(req, res, () => {
    if (req.authToken?.admin === true) {
      return next();
    }
    return res.status(403).json({ error: "Admin access required" });
  });
}

export function registerAuthRoutes(app: Express) {
  // Create or update profile (called after Firebase registration)
  app.post(
    "/api/auth/profile",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const parsed = profileSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
          });
        }

        const uid = req.userId!;
        const { businessName, name, role } = parsed.data;
        const referralCode =
          typeof req.body?.referralCode === "string"
            ? req.body.referralCode
            : undefined;

        // Get email from Firebase
        const firebaseUser = await admin.auth().getUser(uid);
        const email = firebaseUser.email || "";

        // Check if profile already exists
        const existing = await storage.getUserById(uid);
        if (existing) {
          await storage.getOrCreateAffiliateProfile(uid);
          const updated = await storage.updateUser(uid, {
            businessName,
            name,
            role,
          });
          return res.json({ user: sanitizeUser(updated!) });
        }

        const user = await storage.createUser({
          id: uid,
          businessName,
          name,
          email,
          role,
        });

        await storage.getOrCreateAffiliateProfile(uid);
        if (referralCode && referralCode.trim()) {
          const result = await storage.applyReferralCodeToUser(uid, referralCode);
          if (!result.applied) {
            console.warn(
              `Referral code not applied for ${uid}: ${result.reason || "unknown"}`,
            );
          }
        }

        res.status(201).json({ user: sanitizeUser(user) });
      } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ error: "Failed to save profile" });
      }
    },
  );

  // Update profile (partial updates)
  app.patch(
    "/api/auth/profile",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const uid = req.userId!;
        const { businessName, name, role, avatarUrl, subscriptionPlan } = req.body;

        const updateData: Record<string, string> = {};
        if (typeof businessName === "string" && businessName.trim())
          updateData.businessName = businessName.trim();
        if (typeof name === "string" && name.trim())
          updateData.name = name.trim();
        if (typeof role === "string" && role.trim())
          updateData.role = role.trim();
        if (typeof avatarUrl === "string") updateData.avatarUrl = avatarUrl;
        const validPlans = ["free", "starter", "growth", "vip"];
        if (typeof subscriptionPlan === "string" && validPlans.includes(subscriptionPlan))
          updateData.subscriptionPlan = subscriptionPlan;

        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: "No fields to update" });
        }

        const updated = await storage.updateUser(uid, updateData);
        if (!updated) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: sanitizeUser(updated) });
      } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile" });
      }
    },
  );

  // Get current user
  app.get(
    "/api/auth/me",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUserById(req.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: sanitizeUser(user) });
      } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to get user" });
      }
    },
  );

  // Delete account
  app.delete(
    "/api/auth/account",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const uid = req.userId!;
        await storage.deleteUser(uid);
        await admin.auth().deleteUser(uid);
        res.json({ success: true });
      } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ error: "Failed to delete account" });
      }
    },
  );

  // Export user data
  app.get(
    "/api/auth/export-data",
    authenticateToken,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUserById(req.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({
          exportedAt: new Date().toISOString(),
          user: sanitizeUser(user),
        });
      } catch (error) {
        console.error("Export data error:", error);
        res.status(500).json({ error: "Failed to export data" });
      }
    },
  );
}
