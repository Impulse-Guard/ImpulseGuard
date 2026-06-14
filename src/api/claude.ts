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

export interface CategorizationResult {
  category: "normal" | "wasteful";
  reason?: string;
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
        max_tokens: 100,
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

// Categorize a purchase as normal or wasteful
export async function categorizePurchase(
  productName: string,
  price?: number
): Promise<CategorizationResult> {
  const prompt = `You are a purchase categorization assistant. Categorize this product as either "normal" (essentials like toiletries, groceries, household necessities, cleaning supplies, medicine, basic clothing) or "wasteful" (impulse purchases like entertainment, luxury items, hobbies, collectibles, gaming, electronics upgrades, designer items, cosmetics beyond basics).

Product: ${productName}${price ? ` ($${price})` : ""}

Be strict: when in doubt, categorize as wasteful.

Respond with ONLY valid JSON:
{"category": "normal", "reason": "brief reason"} or {"category": "wasteful", "reason": "brief reason"}`;

  try {
    const response = await sendMessage([{ role: "user", content: prompt }]);
    console.log("[Impulse Guard] Raw response:", response);

    // Try to extract JSON from response (in case Claude adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*"category"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Impulse Guard] No JSON found in response");
      return { category: "wasteful", reason: "Could not parse response" };
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.category === "normal" || result.category === "wasteful") {
      return result as CategorizationResult;
    }

    // Default to wasteful if unexpected response
    return { category: "wasteful", reason: "Unable to categorize" };
  } catch (error) {
    console.error("Categorization error:", error);
    // Fail safe: treat as wasteful
    return { category: "wasteful", reason: "Error during categorization" };
  }
}
