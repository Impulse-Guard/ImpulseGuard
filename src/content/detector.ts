import { trackBlockedPurchase } from "./storage";
import { categorizePurchase } from "@/api/claude";
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

  const productName = getProductName();
  const itemPrice = getItemPrice();
  const itemId = getCurrentItemId();

  console.log(`[Impulse Guard] Checking: "${productName}" ($${itemPrice})`);

  try {
    const result = await categorizePurchase(productName, itemPrice);
    console.log(
      `[Impulse Guard] Result: ${result.category} - ${result.reason}`,
    );

    if (result.category === "normal") {
      // Remove blocker - user can now click the real button
      removeOverlay();
      removeBlockerDiv();
      showApprovedToast();
    } else {
      // Block wasteful purchase
      const isNewBlock = await trackBlockedPurchase(itemPrice, itemId);
      showBlockedOverlay(itemPrice, isNewBlock, result.reason);
    }
  } catch (e) {
    console.error("[Impulse Guard] Error:", e);
    removeOverlay();
  }
}

// Install blocker after page loads
setTimeout(createBlockerDiv, 1000);

console.log("[Impulse Guard] Content script loaded");
