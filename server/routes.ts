import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/scan-label", async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert at reading fashion product labels and hang tags. Extract information from the label image and return a JSON object with the following fields (use null for fields you cannot determine):
{
  "styleName": "Product name or style name",
  "styleNumber": "Style number, SKU, or product code",
  "wholesalePrice": number (wholesale/cost price without currency symbol),
  "retailPrice": number (suggested retail price without currency symbol),
  "colors": ["array of color names"],
  "sizes": ["array of available sizes like XS, S, M, L, XL or numeric sizes"],
  "category": "One of: Tops, Bottoms, Dresses, Outerwear, Accessories, Shoes, Bags, Jewelry",
  "brandName": "Brand or vendor name",
  "season": "Season like Fall 2026, Resort 2027, etc.",
  "notes": "Any additional info like fabric content, care instructions, etc."
}

Important:
- Extract actual numbers for prices (remove $ or currency symbols)
- If you see "WS" or "Wholesale" before a price, that's the wholesale price
- If you see "MSRP", "Retail", or "SRP" before a price, that's the retail price
- Look for style numbers which often start with letters followed by numbers
- Colors may be listed as color codes - try to interpret them
- Return valid JSON only, no markdown or explanation`
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

      const content = response.choices[0]?.message?.content || "{}";
      
      let result: LabelScanResult;
      try {
        const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
        result = JSON.parse(cleaned);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        result = {};
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error scanning label:", error);
      res.status(500).json({ error: "Failed to scan label" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
