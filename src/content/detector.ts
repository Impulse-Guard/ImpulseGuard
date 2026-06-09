import { trackBlockedPurchase, getStorageData } from "./storage";
import {
  categorizePurchase,
  type ProductContext,
  type UserFinancialContext,
} from "@/api/claude";
import { getSiteConfig, type SiteConfig } from "./sites";
import {
  showLoadingOverlay,
  showBlockedOverlay,
  removeOverlay,
  showApprovedToast,
} from "./overlay";

// Legacy XPaths for the bundled demo/test page. Kept as last-resort fallbacks so
// existing local testing keeps working when no site config or heuristic matches.
const DEMO_BUTTON_XPATH = '//*[@id="test"]/button';
const DEMO_NAME_XPATH = '//*[@id="root"]/div/div[3]/main/section[2]/div/h1';
const DEMO_PRICE_XPATH =
  '//*[@id="root"]/div/div[3]/main/section[3]/div[1]/div/div[1]/div/span[1]/span';

// Text that identifies an add-to-cart / buy button on unrecognized sites.
const BUY_TEXT = /\b(add to (cart|bag|basket|trolley)|buy now|add to order)\b/i;

const site: SiteConfig | null = getSiteConfig(window.location.hostname);

function getElementByXPath(xpath: string): Element | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );
  return result.singleNodeValue as Element | null;
}

/** Resolves the first matching element from a list of CSS / `xpath:` selectors. */
function queryFirst(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = selector.startsWith("xpath:")
      ? getElementByXPath(selector.slice("xpath:".length))
      : document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// --- Add-to-cart button ---------------------------------------------------

/** Heuristic search for a buy button by its label, used on unlisted sites. */
function findButtonByText(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    "button, input[type='submit'], input[type='button'], a[role='button'], [role='button']",
  );
  for (const el of candidates) {
    if (!isVisible(el)) continue;
    const label =
      el.textContent?.trim() ||
      el.getAttribute("aria-label") ||
      (el as HTMLInputElement).value ||
      "";
    if (BUY_TEXT.test(label)) return el;
  }
  return null;
}

function findAddToCartButton(): HTMLElement | null {
  if (site) {
    const el = queryFirst(site.addToCart) as HTMLElement | null;
    if (el) return el;
  }
  return (
    findButtonByText() ??
    (getElementByXPath(DEMO_BUTTON_XPATH) as HTMLElement | null)
  );
}

// --- Product name ---------------------------------------------------------

function getProductName(): string {
  if (site) {
    const el = queryFirst(site.productName);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }

  const ogTitle = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content");
  if (ogTitle?.trim()) return ogTitle.trim();

  const demo = getElementByXPath(DEMO_NAME_XPATH);
  if (demo?.textContent?.trim()) return demo.textContent.trim();

  const h1 = Array.from(document.querySelectorAll("h1")).find(isVisible);
  return h1?.textContent?.trim() || document.title || "Unknown Product";
}

// --- Price ----------------------------------------------------------------

function parsePrice(text: string): number {
  // Strip thousands separators, keep the decimal point.
  const cleaned = text.replace(/[^0-9.,]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const price = parseFloat(cleaned.replace(/,/g, "."));
  return Number.isFinite(price) && price > 0 ? price : 0;
}

/** Pulls a price out of schema.org JSON-LD product data, if present. */
function priceFromJsonLd(): number {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  for (const script of scripts) {
    try {
      const nodes = JSON.parse(script.textContent || "null");
      for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
        const offers = node?.offers;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        const raw = offer?.price ?? offer?.lowPrice;
        if (raw != null) {
          const price = parsePrice(String(raw));
          if (price > 0) return price;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return 0;
}

function getItemPrice(): number {
  if (site) {
    const el = queryFirst(site.price);
    if (el) {
      const price = parsePrice(el.textContent || "");
      if (price > 0) return price;
    }
  }

  const jsonLd = priceFromJsonLd();
  if (jsonLd > 0) return jsonLd;

  const meta = document
    .querySelector(
      'meta[property="product:price:amount"], meta[property="og:price:amount"], [itemprop="price"]',
    )
    ?.getAttribute("content");
  if (meta) {
    const price = parsePrice(meta);
    if (price > 0) return price;
  }

  const demo = getElementByXPath(DEMO_PRICE_XPATH);
  if (demo) return parsePrice(demo.textContent || "");

  return 0;
}

// --- Extra product context (description / category / brand) ---------------

const MAX_DESCRIPTION_LENGTH = 500;

/** Returns the first schema.org Product node found in JSON-LD, if any. */
function productNodeFromJsonLd(): any | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "null");
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        if (!node) continue;
        const type = node["@type"];
        const isProduct = Array.isArray(type)
          ? type.includes("Product")
          : type === "Product";
        if (isProduct || node.offers) return node;
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return null;
}

function getProductDescription(jsonLd: any): string | undefined {
  const candidates = [
    typeof jsonLd?.description === "string" ? jsonLd.description : undefined,
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content"),
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content"),
  ];
  for (const raw of candidates) {
    const text = raw?.replace(/\s+/g, " ").trim();
    if (text) return text.slice(0, MAX_DESCRIPTION_LENGTH);
  }
  return undefined;
}

function getBrand(jsonLd: any): string | undefined {
  const brand = jsonLd?.brand;
  const fromJsonLd =
    typeof brand === "string" ? brand : (brand?.name as string | undefined);
  const candidates = [
    fromJsonLd,
    document
      .querySelector('meta[property="product:brand"]')
      ?.getAttribute("content"),
    document.querySelector('[itemprop="brand"]')?.getAttribute("content") ||
      document.querySelector('[itemprop="brand"]')?.textContent,
  ];
  for (const raw of candidates) {
    const text = raw?.trim();
    if (text) return text;
  }
  return undefined;
}

function getCategory(jsonLd: any): string | undefined {
  if (typeof jsonLd?.category === "string" && jsonLd.category.trim()) {
    return jsonLd.category.trim();
  }

  // Fall back to the page breadcrumb trail.
  const crumbs = Array.from(
    document.querySelectorAll(
      '[itemtype*="BreadcrumbList"] [itemprop="name"], nav[aria-label*="readcrumb" i] a, .breadcrumb a, ol.breadcrumb li',
    ),
  )
    .map((el) => el.textContent?.trim())
    .filter((t): t is string => !!t && t.toLowerCase() !== "home");
  if (crumbs.length) return crumbs.join(" > ").slice(0, MAX_DESCRIPTION_LENGTH);

  return undefined;
}

function getProductContext(): ProductContext {
  const jsonLd = productNodeFromJsonLd();
  return {
    name: getProductName(),
    price: getItemPrice(),
    description: getProductDescription(jsonLd),
    category: getCategory(jsonLd),
    brand: getBrand(jsonLd),
  };
}

async function getUserContext(): Promise<UserFinancialContext> {
  const data = await getStorageData();
  return {
    totalSaved: data.moneySaved,
    weeklySaved: data.weeklySaved,
    impulsesResisted: data.impulsesResisted,
    blockedPurchases: data.blockedPurchases,
  };
}

function getCurrentItemId(): string {
  return window.location.href;
}

// --- Transparent div blocker ----------------------------------------------

let blockerDiv: HTMLDivElement | null = null;
let attempts = 0;
const MAX_ATTEMPTS = 15;

function positionBlocker(button: HTMLElement) {
  const rect = button.getBoundingClientRect();
  blockerDiv!.style.top = `${rect.top}px`;
  blockerDiv!.style.left = `${rect.left}px`;
  blockerDiv!.style.width = `${rect.width}px`;
  blockerDiv!.style.height = `${rect.height}px`;
}

function createBlockerDiv() {
  const button = findAddToCartButton();
  if (!button) {
    if (++attempts > MAX_ATTEMPTS) {
      console.log("[Impulse Guard] No add-to-cart button found on this page");
      return;
    }
    console.log("[Impulse Guard] Button not found, retrying...");
    setTimeout(createBlockerDiv, 1000);
    return;
  }

  blockerDiv = document.createElement("div");
  blockerDiv.id = "impulse-guard-blocker";
  blockerDiv.style.cssText = `
    position: fixed;
    background: transparent;
    z-index: 999999;
    cursor: pointer;
  `;
  positionBlocker(button);

  blockerDiv.addEventListener("click", handleBlockerClick);
  document.body.appendChild(blockerDiv);

  window.addEventListener("scroll", updateBlockerPosition);
  window.addEventListener("resize", updateBlockerPosition);

  console.log(
    `[Impulse Guard] Blocker installed (${site?.name ?? "generic"} mode)`,
  );
}

function updateBlockerPosition() {
  if (!blockerDiv) return;
  const button = findAddToCartButton();
  if (!button) return;
  positionBlocker(button);
}

function removeBlockerDiv() {
  if (blockerDiv) {
    blockerDiv.remove();
    blockerDiv = null;
    window.removeEventListener("scroll", updateBlockerPosition);
    window.removeEventListener("resize", updateBlockerPosition);
    console.log("[Impulse Guard] Blocker div removed");
  }
}

async function handleBlockerClick() {
  showLoadingOverlay();

  const product = getProductContext();
  const itemPrice = product.price ?? 0;
  const itemId = getCurrentItemId();

  console.log(`[Impulse Guard] Checking: "${product.name}" ($${itemPrice})`);

  try {
    const userContext = await getUserContext();
    const result = await categorizePurchase(product, userContext);
    console.log(
      `[Impulse Guard] Result: ${result.category} (${result.severity ?? "?"}, ${Math.round((result.confidence ?? 0) * 100)}%) - ${result.reason}`,
    );

    if (result.category === "normal") {
      // Remove blocker - user can now click the real button
      removeOverlay();
      removeBlockerDiv();
      showApprovedToast();
    } else {
      // Block wasteful purchase
      const isNewBlock = await trackBlockedPurchase(itemPrice, itemId);
      showBlockedOverlay(itemPrice, isNewBlock, result);
    }
  } catch (e) {
    console.error("[Impulse Guard] Error:", e);
    removeOverlay();
  }
}

// Install blocker after page loads
setTimeout(createBlockerDiv, 1000);

console.log("[Impulse Guard] Content script loaded");
