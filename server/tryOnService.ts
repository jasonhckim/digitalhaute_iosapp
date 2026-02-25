import { GoogleGenAI, Modality } from "@google/genai";

export type EditorialStyle =
  | "studio"
  | "ecommerce"
  | "street"
  | "lifestyle"
  | "campaign"
  | "social";

export interface TryOnOptions {
  /** Base64-encoded garment image (without data URL prefix) */
  imageBase64: string;
  /** Garment category for outfit completion logic */
  category?: string;
  /** Editorial style for the generated photo */
  style?: EditorialStyle;
}

export interface TryOnResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

// Editorial style configurations adapted from fashion-ai-studio
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
    background:
      "colorful gradient, neon accents, or bold solid color backdrop",
  },
};

/**
 * Build the outfit completion instruction based on garment category.
 * Adapted from fashion-ai-studio's generative synthesis prompt.
 */
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

  // Default for accessories, bags, shoes, jewelry, or unknown
  return "Complete the outfit with complementary clothing items that create a cohesive, fashion-forward look.";
}

/**
 * Build the full prompt for Gemini generative synthesis.
 * Adapted from fashion-ai-studio's compileGenerativeSynthesisPrompt.
 */
function buildTryOnPrompt(options: TryOnOptions): string {
  const style = options.style || "studio";
  const config = STYLE_CONFIG[style];
  const outfitInstruction = getOutfitCompletionInstruction(options.category);

  return `GENERATIVE FASHION PHOTOGRAPHY - CREATE A COMPLETE NEW IMAGE

You are provided with a garment image showing a fashion item (may be on a hanger, flat-lay, or mannequin).

YOUR TASK: Generate a COMPLETELY NEW photorealistic fashion photograph of a model wearing this garment. This is NOT an edit - create an entirely new image.

=== CRITICAL REQUIREMENTS ===

1. PRESERVE THE GARMENT EXACTLY:
   - The garment from the provided image must appear exactly as shown
   - Preserve ALL details: color, texture, pattern, construction, fit, and design
   - Do NOT alter the garment's color, design, or style under any circumstances
   - Do NOT darken, lighten, or shift the hue of the garment

2. CREATE A NATURAL POSE - FRONT-FACING VIEW:
   - The model should face the camera with confident, natural posture
   - Try a dynamic stance with slight weight shift or editorial pose
   - Generate a fresh, natural pose suitable for professional fashion photography

3. COMPLETE THE OUTFIT:
   ${outfitInstruction}
   - The complete outfit should look cohesive and fashion-forward

4. ADD PROFESSIONAL STYLING:
   - HAIR: Generate beautiful, styled hair that suits the model's face and complements the outfit
   - MAKEUP: Add natural, editorial-quality makeup
   - ACCESSORIES: Add minimal, tasteful accessories (jewelry, belt, etc.) if appropriate
   - Everything should look cohesive and professionally styled

=== EDITORIAL STYLE: ${style.charAt(0).toUpperCase() + style.slice(1)} ===
- LIGHTING: ${config.lighting}
- MOOD: ${config.mood}
- BACKGROUND: ${config.background}

=== PHOTOREALISM REQUIREMENTS (CRITICAL) ===
Create an image that is INDISTINGUISHABLE from a real photograph:

SKIN & FACE:
- Natural skin texture with visible pores, subtle imperfections, and realistic skin tone variations
- Avoid overly smooth, plastic-looking, or airbrushed skin
- Include natural facial shadows and subtle asymmetry
- Eyes should have realistic catch-lights and depth

BODY & PROPORTIONS:
- Anatomically correct proportions - no elongated limbs or distorted body parts
- Natural hand positioning with correct finger count and proportions
- Realistic body shadows and depth

LIGHTING & PHOTOGRAPHY:
- Natural light falloff and realistic shadows
- Proper depth of field with natural bokeh (background blur)
- Natural color grading - avoid oversaturated or unnatural color tones

GARMENT ON BODY:
- Natural fabric draping and body interaction
- Realistic wrinkles and folds where the body bends
- Proper garment fit showing how it naturally hangs on the body

=== OUTPUT ===
- Single high-resolution retail-ready photograph
- Professional fashion photography standards
- Natural, photorealistic appearance - NO AI artifacts

Generate the final retail-ready image now.`;
}

/**
 * Generate a virtual try-on image using Google Gemini.
 * Takes a garment image and generates a model wearing it.
 */
export async function generateTryOnImage(
  options: TryOnOptions,
): Promise<TryOnResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "Gemini API key not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to your environment.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildTryOnPrompt(options);

    // Prepare the image as inline data for Gemini
    const imageData = {
      inlineData: {
        mimeType: "image/jpeg" as const,
        data: options.imageBase64,
      },
    };

    // Call Gemini with image generation capability
    // Uses the same pattern as fashion-ai-studio
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: [
        {
          role: "user",
          parts: [
            imageData,
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract the generated image from the response
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return {
        success: false,
        error: "No image generated. The model returned an empty response.",
      };
    }

    // Look for inline image data in the response parts
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          success: true,
          imageBase64: part.inlineData.data,
        };
      }
    }

    // If we got text but no image, report it
    const textParts = candidate.content.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    return {
      success: false,
      error: textParts
        ? `Model returned text instead of an image: ${textParts.slice(0, 200)}`
        : "No image data found in the response.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during image generation";
    console.error("Try-on generation error:", error);
    return {
      success: false,
      error: message,
    };
  }
}
