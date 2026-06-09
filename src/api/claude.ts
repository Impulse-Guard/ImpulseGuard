const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/** Everything we can learn about the product from the page. */
export interface ProductContext {
  name: string;
  price?: number;
  /** Short product description / blurb scraped from the page. */
  description?: string;
  /** Category or breadcrumb, e.g. "Electronics > Headphones". */
  category?: string;
  brand?: string;
}

/**
 * The shopper's running savings picture, pulled from storage. Lets Claude
 * calibrate how strict to be for someone actively curbing impulse spending.
 */
export interface UserFinancialContext {
  totalSaved?: number;
  weeklySaved?: number;
  impulsesResisted?: number;
  blockedPurchases?: number;
}

export interface CategorizationResult {
  category: "normal" | "wasteful";
  reason?: string;
  /** Model confidence in the call, 0–1. */
  confidence?: number;
  /** How strongly this reads as an impulse buy. */
  severity?: "low" | "medium" | "high";
  /** Best-guess product category, e.g. "electronics", "groceries". */
  productCategory?: string;
  /** A cheaper alternative or a short reflection prompt for the shopper. */
  alternative?: string;
}

// Make a request to Claude API with timeout
export async function sendMessage(messages: ClaudeMessage[]): Promise<string> {
  const apiKey = import.meta.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error("Claude API key not configured");
  }

  console.log("[Impulse Guard] Sending API request...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data: ClaudeResponse = await response.json();
    console.log("[Impulse Guard] API response received");
    return data.content[0]?.text || "";
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/** Renders the available product details as labelled lines for the prompt. */
function describeProduct(product: ProductContext): string {
  const lines = [`Name: ${product.name}`];
  if (product.price != null && product.price > 0)
    lines.push(`Price: $${product.price}`);
  if (product.brand) lines.push(`Brand: ${product.brand}`);
  if (product.category) lines.push(`Category: ${product.category}`);
  if (product.description) lines.push(`Description: ${product.description}`);
  return lines.join("\n");
}

/** Renders the shopper's savings context, or an empty string if we have none. */
function describeUser(user?: UserFinancialContext): string {
  if (!user) return "";
  const lines: string[] = [];
  if (user.totalSaved != null)
    lines.push(`- Has already avoided $${user.totalSaved.toFixed(2)} in impulse spending so far`);
  if (user.weeklySaved != null)
    lines.push(`- Avoided $${user.weeklySaved.toFixed(2)} this week`);
  if (user.impulsesResisted != null)
    lines.push(`- Has resisted ${user.impulsesResisted} impulse(s)`);
  if (user.blockedPurchases != null)
    lines.push(`- Has blocked ${user.blockedPurchases} purchase(s)`);
  if (lines.length === 0) return "";
  return `\nAbout this shopper (they are actively trying to curb impulse spending):\n${lines.join("\n")}\n`;
}

function buildPrompt(
  product: ProductContext,
  user?: UserFinancialContext,
): string {
  return `You are a purchase categorization assistant helping a shopper avoid impulse buys.

Categorize the product below as either:
- "normal" — essentials such as toiletries, groceries, household necessities, cleaning supplies, medicine, basic clothing.
- "wasteful" — impulse purchases such as entertainment, luxury items, hobbies, collectibles, gaming, electronics upgrades, designer items, cosmetics beyond basics.

Consider the product details, its price, and the shopper's context together. A higher price or a discretionary category should push toward "wasteful". Be strict: when in doubt, categorize as wasteful.

Product:
${describeProduct(product)}
${describeUser(user)}
Respond with ONLY valid JSON, no extra text:
{
  "category": "normal" | "wasteful",
  "reason": "one concise sentence explaining the call",
  "confidence": number between 0 and 1,
  "severity": "low" | "medium" | "high",   // how strongly this reads as an impulse buy
  "productCategory": "short product category, e.g. electronics, groceries",
  "alternative": "for wasteful items, a cheaper alternative or a short reflection prompt; otherwise empty string"
}`;
}

function clamp01(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(1, Math.max(0, n));
}

function normalizeResult(parsed: any): CategorizationResult | null {
  if (parsed?.category !== "normal" && parsed?.category !== "wasteful") {
    return null;
  }

  const severity =
    parsed.severity === "low" ||
    parsed.severity === "medium" ||
    parsed.severity === "high"
      ? parsed.severity
      : undefined;

  return {
    category: parsed.category,
    reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    confidence: clamp01(parsed.confidence),
    severity,
    productCategory:
      typeof parsed.productCategory === "string" && parsed.productCategory
        ? parsed.productCategory
        : undefined,
    alternative:
      typeof parsed.alternative === "string" && parsed.alternative.trim()
        ? parsed.alternative.trim()
        : undefined,
  };
}

// Categorize a purchase as normal or wasteful, taking product and shopper
// context into account.
export async function categorizePurchase(
  product: ProductContext,
  user?: UserFinancialContext,
): Promise<CategorizationResult> {
  const prompt = buildPrompt(product, user);

  try {
    const response = await sendMessage([{ role: "user", content: prompt }]);
    console.log("[Impulse Guard] Raw response:", response);

    // Try to extract JSON from response (in case Claude adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*"category"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Impulse Guard] No JSON found in response");
      return { category: "wasteful", reason: "Could not parse response" };
    }

    const result = normalizeResult(JSON.parse(jsonMatch[0]));
    if (result) return result;

    // Default to wasteful if unexpected response
    return { category: "wasteful", reason: "Unable to categorize" };
  } catch (error) {
    console.error("Categorization error:", error);
    // Fail safe: treat as wasteful
    return { category: "wasteful", reason: "Error during categorization" };
  }
}
