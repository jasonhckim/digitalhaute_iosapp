import { apiRequest } from "./query-client";

export interface LabelScanResult {
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

const CATEGORY_KEYWORDS: Record<string, string> = {
  top: "Tops",
  tops: "Tops",
  blouse: "Tops",
  shirt: "Tops",
  tee: "Tops",
  tshirt: "Tops",
  bottom: "Bottoms",
  bottoms: "Bottoms",
  pant: "Bottoms",
  pants: "Bottoms",
  skirt: "Bottoms",
  short: "Bottoms",
  shorts: "Bottoms",
  dress: "Dresses",
  dresses: "Dresses",
  jacket: "Outerwear",
  coat: "Outerwear",
  outerwear: "Outerwear",
  "2pcs": "2pcs Set",
  "2 pcs": "2pcs Set",
  "2pc": "2pcs Set",
  "2 pc": "2pcs Set",
  "two piece": "2pcs Set",
  "3pcs": "3pcs Set",
  "3 pcs": "3pcs Set",
  "3pc": "3pcs Set",
  "3 pc": "3pcs Set",
  "three piece": "3pcs Set",
  romper: "Rompers & Jumpsuits",
  jumpsuit: "Rompers & Jumpsuits",
  accessory: "Accessories",
  accessories: "Accessories",
  bag: "Bags",
  bags: "Bags",
  shoe: "Shoes",
  shoes: "Shoes",
  jewelry: "Jewelry",
};

const COLOR_ABBREVS: Record<string, string> = {
  "L.BLUE": "Light Blue",
  "L.PINK": "Light Pink",
  "L.GRAY": "Light Gray",
  "D.BLUE": "Dark Blue",
  "D.GRAY": "Dark Gray",
  "N.BLUE": "Navy Blue",
  "BLK": "Black",
  "WHT": "White",
  "NAV": "Navy",
  "GRY": "Gray",
  "GRN": "Green",
  "RED": "Red",
  "BLU": "Blue",
  "PNK": "Pink",
  "YLW": "Yellow",
  "ORG": "Orange",
  "BRN": "Brown",
  "BEG": "Beige",
  "CAM": "Camel",
  "IVY": "Ivory",
  "CHR": "Charcoal",
};

import { getTextFromFrame } from "expo-text-recognition";

/**
 * Extract raw text from an image using on-device OCR (Apple Vision / ML Kit).
 * Requires a dev/production build — will not work in Expo Go.
 */
export async function extractTextFromImage(
  base64Data: string,
): Promise<string | null> {
  try {
    const lines = await getTextFromFrame(base64Data, true);
    const text = Array.isArray(lines) ? lines.join("\n").trim() : String(lines ?? "").trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    console.error("OCR extraction error:", error);
    return null;
  }
}

/**
 * Parse raw OCR text into structured label data using regex patterns.
 */
export function parseLabelTextFromOCR(
  rawText: string,
): LabelScanResult | null {
  const result: LabelScanResult = {};
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Retail price: MSRP, Retail, SRP followed by number
  const retailMatch = rawText.match(
    /(?:MSRP|Retail|SRP|Suggested Retail)[:\s]*\$?(\d+\.?\d*)/i,
  );
  if (retailMatch) {
    result.retailPrice = parseFloat(retailMatch[1]);
  }

  // Wholesale/cost price: explicit keywords or first standalone price
  const wholesaleMatch = rawText.match(
    /(?:Wholesale|Cost|Price)[:\s]*\$?(\d+\.?\d*)/i,
  );
  if (wholesaleMatch) {
    result.wholesalePrice = parseFloat(wholesaleMatch[1]);
  } else {
    // First price-like number (single price on label = wholesale)
    const priceMatch = rawText.match(/\$?(\d{1,3}\.\d{2})\b/);
    if (priceMatch) {
      const val = parseFloat(priceMatch[1]);
      if (val >= 1 && val <= 9999) {
        result.wholesalePrice = val;
      }
    }
  }

  // Style number: alphanumeric like HF26C297, TS-123, 12345
  const styleNumMatch = rawText.match(
    /\b([A-Z]{1,4}\d{2}[A-Z]?\d{2,4}|\d{4,8}|[A-Z]{2,}-\d{2,5})\b/i,
  );
  if (styleNumMatch) {
    result.styleNumber = styleNumMatch[1].trim();
  }

  // Colors: match abbreviations (L.BLUE), full color names, and delimited color lists
  const foundColors: string[] = [];

  // First, expand abbreviations in the text for matching
  for (const [abbrev, fullName] of Object.entries(COLOR_ABBREVS)) {
    // Use flexible matching — dots and spaces may vary in OCR output
    const escaped = abbrev.replace(".", "\\.?\\s?");
    const pattern = new RegExp(`(?:^|[\\s,/\\-])${escaped}(?=$|[\\s,/\\-])`, "gim");
    if (pattern.test(rawText)) {
      foundColors.push(fullName);
    }
  }

  // Match full color words (case-insensitive, globally)
  const colorWords = [
    "black", "white", "navy", "red", "blue", "green", "pink", "yellow",
    "orange", "brown", "beige", "camel", "ivory", "gray", "grey", "charcoal",
    "cream", "coral", "mauve", "taupe", "khaki", "olive", "burgundy", "rust",
    "lavender", "mint", "sage", "teal", "plum", "wine", "mocha", "oatmeal",
    "light blue", "light pink", "light gray", "dark blue", "dark gray",
    "dark green", "hot pink", "baby blue", "royal blue", "dusty pink",
    "dusty rose", "off white", "heather grey", "heather gray",
  ];
  for (const c of colorWords) {
    const pattern = new RegExp(`\\b${c}\\b`, "gi");
    if (pattern.test(rawText) && !foundColors.some((f) => f.toLowerCase() === c)) {
      foundColors.push(c.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    }
  }

  // Also try to extract color lists separated by / , or newlines
  const colorListMatch = rawText.match(/(?:colou?rs?|available)[:\s]*([\s\S]{3,120})/i);
  if (colorListMatch) {
    const colorList = colorListMatch[1].split(/[,/\n]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 30);
    for (const c of colorList) {
      const cleaned = c.replace(/^[-•]\s*/, "").trim();
      if (cleaned && !foundColors.some((f) => f.toLowerCase() === cleaned.toLowerCase())) {
        foundColors.push(cleaned.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "));
      }
    }
  }

  if (foundColors.length > 0) {
    result.colors = [...new Set(foundColors)];
  }

  // Category from keywords
  const textLower = rawText.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (textLower.includes(keyword)) {
      result.category = category;
      break;
    }
  }

  // Season: Fall 2026, Resort 2027, SS26, FW26
  const seasonMatch = rawText.match(
    /(?:Fall|Spring|Summer|Winter|Resort|Holiday)\s*\d{4}|\b(?:SS|FW|AW)\s*\d{2}\b/i,
  );
  if (seasonMatch) {
    result.season = seasonMatch[0].trim();
  }

  // Brand/vendor: often first line or after "Brand", "Vendor"
  const brandMatch = rawText.match(/(?:Brand|Vendor|By)[:\s]+([A-Za-z0-9\s&.-]+)/i);
  if (brandMatch) {
    result.brandName = brandMatch[1].trim();
  } else if (lines.length > 0 && lines[0].length < 50 && !/^\d+$/.test(lines[0])) {
    result.brandName = lines[0];
  }

  // Notes: fabric, care instructions
  const notesMatch = rawText.match(
    /(?:Fabric|Content|Care|Material)[:\s]+([^\n]+)/i,
  );
  if (notesMatch) {
    result.notes = notesMatch[1].trim().slice(0, 200);
  }

  // Style name: product name - often near style number
  if (styleNumMatch && !result.styleName) {
    const idx = rawText.indexOf(styleNumMatch[1]);
    const before = rawText.slice(Math.max(0, idx - 60), idx).trim();
    const lastLine = before.split(/\n/).pop();
    if (lastLine && lastLine.length > 2 && lastLine.length < 40) {
      result.styleName = lastLine;
    }
  }

  const hasAny =
    result.styleNumber ||
    result.styleName ||
    result.wholesalePrice ||
    result.retailPrice ||
    (result.colors && result.colors.length > 0) ||
    result.category ||
    result.brandName ||
    result.season;

  return hasAny ? result : null;
}

/**
 * Scan a label image: tries the server AI endpoint first, falls back to on-device OCR.
 */
export async function scanLabelImage(
  base64Data: string,
): Promise<LabelScanResult | null> {
  // Try server endpoint first (uses AI vision model securely)
  try {
    const res = await apiRequest("POST", "/api/scan-label", {
      imageBase64: base64Data,
    });

    const data = await res.json();
    if (data.success && data.data) {
      return data.data as LabelScanResult;
    }
  } catch (error) {
    console.warn("Server label scan failed, falling back to OCR:", error);
  }

  // OCR fallback (on-device, no API key needed)
  const rawText = await extractTextFromImage(base64Data);
  if (!rawText) {
    return null;
  }

  return parseLabelTextFromOCR(rawText);
}
