import { apiRequest } from "./query-client";

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

/**
 * Generate a model wearing the provided garment image via the server endpoint.
 * The server calls Google Gemini securely without exposing API keys.
 */
export async function generateTryOn(
  request: TryOnRequest,
): Promise<TryOnResponse> {
  try {
    const res = await apiRequest("POST", "/api/try-on", {
      imageBase64: request.imageBase64,
      category: request.category,
      style: request.style || "studio",
    });

    const data = await res.json();
    return {
      success: data.success ?? false,
      imageBase64: data.imageBase64,
      error: data.error,
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
