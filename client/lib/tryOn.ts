export type EditorialStyle =
  | "studio"
  | "ecommerce"
  | "street"
  | "lifestyle"
  | "campaign"
  | "social";

export interface TryOnRequest {
  /** Base64-encoded garment image (without data URL prefix) */
  imageBase64: string;
  /** Garment category for better outfit completion */
  category?: string;
  /** Editorial style for the generated photo */
  style?: EditorialStyle;
}

export interface TryOnResponse {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

const STYLE_CONFIG: Record<
  EditorialStyle,
  { lighting: string; mood: string; background: string }
> = {
  studio: {
    lighting:
      "clean studio lighting with soft shadows and professional key light",
    mood: "professional, commercial, clean",
    background: "seamless white or light gray studio backdrop",
  },
  ecommerce: {
    lighting:
      "flat, even lighting with no shadows - bright and shadowless product photography",
    mood: "commercial, clinical, trustworthy, detail-oriented",
    background:
      "pure seamless white (#FFFFFF) background with no shadows, gradients, or textures",
  },
  street: {
    lighting:
      "natural outdoor daylight with urban shadows and ambient city light reflections",
    mood: "urban, edgy, authentic, youthful, candid",
    background:
      "city street scene - brick walls, storefronts, urban architecture, or pedestrian crossings",
  },
  lifestyle: {
    lighting: "warm, golden hour ambient lighting - cozy and inviting",
    mood: "cozy, warm, relatable, comfortable, approachable",
    background:
      "home environment - living room, cafe setting, or garden with warm, natural tones",
  },
  campaign: {
    lighting:
      "sophisticated mixed lighting with soft key light and subtle fill - luxury brand lighting",
    mood: "aspirational, premium, sophisticated, timeless, editorial",
    background:
      "styled environment - elegant interior, marble surfaces, or high-end architectural space",
  },
  social: {
    lighting:
      "bright, punchy lighting with slight warmth - optimized for social media impact",
    mood: "trendy, vibrant, playful, energetic",
    background: "colorful gradient, neon accents, or bold solid color backdrop",
  },
};

function getOutfitCompletionInstruction(category?: string): string {
  const cat = (category || "").toLowerCase();

  if (
    cat.includes("top") ||
    cat.includes("blouse") ||
    cat.includes("shirt") ||
    cat.includes("jacket") ||
    cat.includes("outerwear")
  ) {
    return "The garment is a top/outerwear piece. Add matching bottoms (pants, skirt, or trousers) that complement the garment's color and style.";
  }

  if (
    cat.includes("bottom") ||
    cat.includes("pant") ||
    cat.includes("skirt") ||
    cat.includes("short")
  ) {
    return "The garment is a bottoms piece. Add a matching top (blouse, shirt, or sweater) that complements the garment's color and style.";
  }

  if (cat.includes("dress")) {
    return "The garment is a dress - it is the complete outfit. Add only minimal accessories (jewelry, belt, or bag) if they enhance the look.";
  }

  return "Complete the outfit with complementary clothing items that create a cohesive, fashion-forward look.";
}

function buildTryOnPrompt(style: EditorialStyle, category?: string): string {
  const config = STYLE_CONFIG[style];
  const outfitInstruction = getOutfitCompletionInstruction(category);

  return `GENERATIVE FASHION PHOTOGRAPHY - CREATE A COMPLETE NEW IMAGE

You are provided with a garment image showing a fashion item (may be on a hanger, flat-lay, or mannequin).

YOUR TASK: Generate a COMPLETELY NEW photorealistic fashion photograph of a model wearing this garment. This is NOT an edit - create an entirely new image.

=== CRITICAL REQUIREMENTS ===

1. PRESERVE THE GARMENT EXACTLY:
   - The garment from the provided image must appear exactly as shown
   - Preserve ALL details: color, texture, pattern, construction, fit, and design
   - Do NOT alter the garment's color, design, or style under any circumstances

2. CREATE A NATURAL POSE - FRONT-FACING VIEW:
   - The model should face the camera with confident, natural posture
   - Try a dynamic stance with slight weight shift or editorial pose

3. COMPLETE THE OUTFIT:
   ${outfitInstruction}
   - The complete outfit should look cohesive and fashion-forward

4. ADD PROFESSIONAL STYLING:
   - HAIR: Generate beautiful, styled hair that suits the model's face and complements the outfit
   - MAKEUP: Add natural, editorial-quality makeup
   - ACCESSORIES: Add minimal, tasteful accessories if appropriate

=== EDITORIAL STYLE: ${style.charAt(0).toUpperCase() + style.slice(1)} ===
- LIGHTING: ${config.lighting}
- MOOD: ${config.mood}
- BACKGROUND: ${config.background}

=== PHOTOREALISM REQUIREMENTS ===
Create an image that is INDISTINGUISHABLE from a real photograph with natural skin texture, anatomically correct proportions, natural fabric draping, and proper lighting.

Generate the final retail-ready image now.`;
}

/**
 * Call Google Gemini directly (client-side) to generate a model
 * wearing the provided garment image.
 */
export async function generateTryOn(
  request: TryOnRequest,
): Promise<TryOnResponse> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "Gemini API key not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to your environment.",
    };
  }

  const style = request.style || "studio";
  const prompt = buildTryOnPrompt(style, request.category);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: request.imageBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return {
        success: false,
        error: `Gemini API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts) {
      return {
        success: false,
        error: "No image generated. The model returned an empty response.",
      };
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          success: true,
          imageBase64: part.inlineData.data,
        };
      }
    }

    const textParts = candidate.content.parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text?: string }) => p.text)
      .join("\n");

    return {
      success: false,
      error: textParts
        ? `Model returned text instead of an image: ${textParts.slice(0, 200)}`
        : "No image data found in the response.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    console.error("Try-on API error:", message);
    return {
      success: false,
      error: `Failed to generate image: ${message}`,
    };
  }
}
