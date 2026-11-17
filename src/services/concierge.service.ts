import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { BusinessModel } from "../models/business.model";
import { ProductModel } from "../models/product.model";
import { CategoryModel } from "../models/category.model";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConciergeChatResponse {
  reply: string;
  provider: "gemini" | "groq";
  model: string;
}

export class ConciergeService {
  /**
   * Builds the dynamic Atelier context from MongoDB:
   * Real-time categories, active products, boutique policies, contact details.
   */
  private static async buildAtelierContext(): Promise<string> {
    try {
      const [business, categories, products] = await Promise.all([
        BusinessModel.findOne().lean(),
        CategoryModel.find({ isActive: true, isDeleted: { $ne: true } }).lean(),
        ProductModel.find({ isActive: true, isDeleted: { $ne: true } })
          .select("name slug brand price category stockCount sizes colors description rating isBestSeller isNewArrival inStock")
          .populate("brand", "name")
          .populate("category", "title slug")
          .limit(60)
          .lean(),
      ]);

      const maisonName = business?.name || "Aurevilux Haute Couture";
      const legalName = business?.legalName || "Aurevilux Luxury Group S.A.";
      const address = business?.address || "12 Place Vendôme, 75001 Paris, France";
      const email = business?.email || "concierge@aurevilux.com";
      const phone = business?.phone || "+33 1 42 68 00 00";
      const currency = business?.currency || "USD ($)";
      const freeShipping = business?.freeShippingThreshold ?? 2500;

      const categoryList = categories
        .map((c: any) => `- ${c.title || c.name} (slug: ${c.slug})`)
        .join("\n");

      const productList = products
        .map((p: any) => {
          const colors = p.colors?.map((c: any) => c.name || c).join(", ") || "Standard";
          const sizes = p.sizes?.join(", ") || "One Size";
          const brandName = p.brand?.name || (typeof p.brand === "string" ? p.brand : "Aurevilux Atelier");
          const categoryName = p.category?.title || p.categoryLabel || "Couture";
          const stockCount = p.stockCount ?? (p.inStock ? 5 : 0);
          const stockText = stockCount > 0 ? `${stockCount} available` : "Sold Out";
          return `- ${p.name} (Brand: ${brandName}, Price: $${p.price} ${currency}, Slug: ${p.slug}) [Category: ${categoryName}] [Stock: ${stockText}] [Sizes: ${sizes}] [Colors: ${colors}]: ${p.description || "Atelier archival creation"}`;
        })
        .join("\n");

      return `
=== AUREVILUX MAISON ATELIER DOSSIER ===
Maison: ${maisonName} (${legalName})
Flagship Salon: ${address}
Private Concierge Inquiries: ${email} | Phone: ${phone}
Official Currency: ${currency}
White-Glove Delivery Accord: Complimentary bonded shipping on all acquisitions over $${freeShipping.toLocaleString()}. Standard insured courier delivery for smaller pieces.
Atelier Exchange Policy: 14 days from confirmed concierge receipt for archival exchanges or bespoke resizing. All items must be pristine with security seals intact.
Bespoke Packaging: Every creation arrives in our signature obsidian presentation case with ribbon seal and certificate of authenticity.

=== CURRENT ATELIER COLLECTIONS & CATEGORIES ===
${categoryList || "Haute Couture, Evening Edit, Cashmere Essentials, Leather Goods, Bespoke Tailoring"}

=== CURATED PRODUCT PIECES IN ATELIER ===
${productList || "Aura Cashmere Scarf, Velvet Luna Dress, Celestial Silk Gown, Vendôme Bespoke Blazer"}
`;
    } catch (err) {
      console.error("[ConciergeService] Failed to compile dynamic atelier context:", err);
      return `Maison: Aurevilux Haute Couture, 12 Place Vendôme, Paris. Email: concierge@aurevilux.com.`;
    }
  }

  /**
   * Generates the strict luxury system prompt with guardrails and dynamic context.
   */
  private static async getSystemPrompt(): Promise<string> {
    const atelierContext = await this.buildAtelierContext();

    return `You are Éléanore, the private digital concierge and personal stylist for the luxury fashion house Aurevilux (12 Place Vendôme, Paris).

### VOICE & STYLE:
- Speak in clear, warm, refined, and natural English.
- Be concise, direct, and helpful. Real luxury is confident, clear, and effortless.
- DO NOT use overly complicated, archaic, or pompous vocabulary. Avoid flowery jargon (e.g. do not say "distinguished current acquisitions", "immaculate floor-sweeping silhouette cut on the bias", "covenant", or "dossier").
- Speak like an attentive, knowledgeable client advisor at a flagship Parisian boutique (such as Chanel, Cartier, or Dior).
- Keep answers SHORT and CLEAN: 1 to 2 brief paragraphs, or at most 2 to 3 concise bullet points.
- When asked what is new or for recommendations, highlight only 2 or 3 standout pieces. Give the product name in bold, the price, and one brief, elegant sentence describing it.
- Never write long walls of text.

### STRICT TOPIC BOUNDARIES & REFUSAL GUARDRAILS:
1. ONLY assist with Aurevilux products, collections, styling advice, boutique policies (free shipping over $2,500, 14-day exchanges), and customer shopping assistance.
2. If asked anything outside of Aurevilux and luxury fashion (coding, math, general trivia, politics, recipes), politely decline:
   "I specialize exclusively in Aurevilux collections, styling consultations, and boutique services. How may I assist your shopping today?"

### ATELIER DETAILS:
${atelierContext}
`;
  }

  /**
   * Enforces strict 5-turn memory (maximum 10 messages: 5 user + 5 assistant).
   */
  private static sliceMemory(history: ChatMessage[]): ChatMessage[] {
    if (!history || history.length === 0) return [];
    // 5 turns = 10 messages maximum (FIFO)
    return history.slice(-10);
  }

  /**
   * Main entry point: Generates a luxury reply using the active provider.
   * STRICT NO FALLBACK: If provider fails, error is thrown and logged.
   */
  public static async generateReply(
    userMessage: string,
    history: ChatMessage[] = []
  ): Promise<ConciergeChatResponse> {
    if (!userMessage || !userMessage.trim()) {
      throw new Error("Patron inquiry message cannot be empty.");
    }

    const business = await BusinessModel.findOne().lean();
    const config = business?.conciergeConfig || {
      activeProvider: "gemini",
      enabled: true,
    };

    if (config.enabled === false) {
      throw new Error("Éléanore concierge is currently resting by atelier administration.");
    }

    const provider = config.activeProvider === "groq" ? "groq" : "gemini";
    const systemPrompt = await this.getSystemPrompt();
    const slicedHistory = this.sliceMemory(history);

    if (provider === "groq") {
      return this.generateGroqReply(userMessage, slicedHistory, systemPrompt);
    } else {
      return this.generateGeminiReply(userMessage, slicedHistory, systemPrompt);
    }
  }

  /**
   * Google Gemini Provider Implementation
   */
  private static async generateGeminiReply(
    userMessage: string,
    history: ChatMessage[],
    systemPrompt: string
  ): Promise<ConciergeChatResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    if (!apiKey || !apiKey.trim()) {
      console.error("[ConciergeService] GEMINI_API_KEY is not defined in backend .env");
      throw new Error("Gemini API key is unconfigured in server environment.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });

    // Map history to Gemini content structure
    const contents = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Add current user turn
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 350,
      },
    });

    const reply = result.response.text();
    if (!reply) {
      throw new Error("Empty response received from Gemini engine.");
    }

    return {
      reply,
      provider: "gemini",
      model: modelName,
    };
  }

  /**
   * Groq Provider Implementation
   */
  private static async generateGroqReply(
    userMessage: string,
    history: ChatMessage[],
    systemPrompt: string
  ): Promise<ConciergeChatResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (!apiKey || !apiKey.trim()) {
      console.error("[ConciergeService] GROQ_API_KEY is not defined in backend .env");
      throw new Error("Groq API key is unconfigured in server environment.");
    }

    const groq = new Groq({ apiKey });

    // Format messages for Groq OpenAI-compatible format
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    history.forEach((msg) => {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    });

    messages.push({
      role: "user",
      content: userMessage,
    });

    const completion = await groq.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.5,
      max_tokens: 350,
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      throw new Error("Empty response received from Groq engine.");
    }

    return {
      reply,
      provider: "groq",
      model: modelName,
    };
  }

  /**
   * Checks provider configuration status (safe for public/admin inspect)
   */
  public static async getStatus() {
    const business = await BusinessModel.findOne().lean();
    const config = business?.conciergeConfig || {
      activeProvider: "gemini",
      enabled: true,
      welcomeMessage:
        "Hello. I am Éléanore, your Aurevilux client advisor. How may I assist you today?",
    };

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());

    return {
      name: "Éléanore",
      title: "Haute Concierge & Client Stylist",
      enabled: config.enabled ?? true,
      activeProvider: config.activeProvider || "gemini",
      welcomeMessage: config.welcomeMessage,
      providers: {
        gemini: {
          configured: hasGeminiKey,
          model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        },
        groq: {
          configured: hasGroqKey,
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        },
      },
    };
  }
}
