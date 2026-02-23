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

const SYSTEM_PROMPT = `You are an expert at reading wholesale fashion product labels and hang tags from trade shows and showrooms. Extract information from the label image and return a JSON object with the following fields (use null for fields you cannot determine):
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
- Return valid JSON only, no markdown or explanation`;

export async function scanLabelImage(
  base64Data: string,
): Promise<LabelScanResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("EXPO_PUBLIC_OPENAI_API_KEY is not set");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in OpenAI response");
      return null;
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as LabelScanResult;
  } catch (error) {
    console.error("Error scanning label:", error);
    return null;
  }
}
