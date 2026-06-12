import { trackBlockedPurchase } from "./storage";
import { categorizePurchase } from "@/api/claude";
import { color, font, radius } from "@/design/tokens";

// Shared style fragments for the injected overlays (kept as plain strings so
// they can be interpolated into the double-quoted style attributes below).
const BACKDROP_STYLE = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${color.backdrop};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
`;

const CARD_STYLE = `
  background: ${color.background};
  padding: 28px 32px;
  border-radius: ${radius.card};
  border: 1px solid ${color.rail};
  max-width: 420px;
  text-align: left;
  font-family: ${font.sans};
  color: ${color.ink};
  box-shadow: 0 24px 48px rgba(10, 10, 10, 0.25);
`;

const EYEBROW_STYLE = `
  margin: 0 0 10px;
  font-family: ${font.mono};
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: ${color.amber};
`;

const PILL_BUTTON_STYLE = `
  width: 100%;
  padding: 13px 24px;
  border: none;
  border-radius: 9999px;
  background: ${color.ink};
  color: ${color.background};
  font-family: ${font.mono};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
`;

const ADD_TO_CART_XPATH = '//*[@id="test"]/button';
const PRODUCT_NAME_XPATH = '//*[@id="root"]/div/div[3]/main/section[2]/div/h1';
const PRICE_XPATH =
  '//*[@id="root"]/div/div[3]/main/section[3]/div[1]/div/div[1]/div/span[1]/span';

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

function getCurrentItemId(): string {
  return window.location.href;
}

function getProductName(): string {
  const nameEl = getElementByXPath(PRODUCT_NAME_XPATH);
  return nameEl?.textContent?.trim() || document.title || "Unknown Product";
}

async function getItemPrice(): Promise<number> {
  const priceElement = getElementByXPath(PRICE_XPATH);
  if (priceElement) {
    const priceText = priceElement.textContent || "0";
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ""));
    if (price > 0) return price;
  }
  return 0;
}

function showLoadingOverlay() {
  const existing = document.getElementById("impulse-guard-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "impulse-guard-overlay";
  overlay.innerHTML = `
    <div style="${BACKDROP_STYLE}">
      <div style="${CARD_STYLE}">
        <p style="${EYEBROW_STYLE}">[ Impulse Guard ]</p>
        <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.03em;">
          Checking this purchase.
        </h2>
        <p style="
          margin: 0;
          font-family: ${font.mono};
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: ${color.muted};
        ">Analyzing&hellip;</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showBlockedOverlay(
  itemPrice: number,
  isNewBlock: boolean,
  reason?: string,
) {
  const existing = document.getElementById("impulse-guard-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "impulse-guard-overlay";
  overlay.innerHTML = `
    <div style="${BACKDROP_STYLE}">
      <div style="${CARD_STYLE}">
        <p style="${EYEBROW_STYLE}">[ Impulse Guard ]</p>
        <h2 style="margin: 0 0 12px; font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15;">
          Hold on. <span style="color: ${color.amber};">That looks like an impulse.</span>
        </h2>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">
          ${
            isNewBlock
              ? "Come back in <strong>24 hours</strong> if you still want it."
              : "You already blocked this item. Still want it? Come back in <strong>24 hours</strong>."
          }
        </p>
        ${
          reason
            ? `
        <p style="margin: 0 0 16px; font-size: 13px; font-style: italic; color: ${color.muted};">
          "${reason}"
        </p>
        `
            : ""
        }
        ${
          itemPrice > 0 && isNewBlock
            ? `
        <div style="
          background: ${color.amberTint};
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        ">
          <p style="
            margin: 0 0 2px;
            font-family: ${font.mono};
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: ${color.amber};
          ">[ You just saved ]</p>
          <p style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
            $${itemPrice.toFixed(2)}
          </p>
        </div>
        `
            : ""
        }
        <button id="impulse-guard-close" style="${PILL_BUTTON_STYLE}">I understand</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document
    .getElementById("impulse-guard-close")
    ?.addEventListener("click", () => {
      overlay.remove();
    });
}

function removeOverlay() {
  const existing = document.getElementById("impulse-guard-overlay");
  if (existing) existing.remove();
}

// Transparent div blocker
let blockerDiv: HTMLDivElement | null = null;

function createBlockerDiv() {
  const button = getElementByXPath(ADD_TO_CART_XPATH) as HTMLElement;
  if (!button) {
    console.log("[Impulse Guard] Button not found, retrying...");
    setTimeout(createBlockerDiv, 1000);
    return;
  }

  const rect = button.getBoundingClientRect();

  blockerDiv = document.createElement("div");
  blockerDiv.id = "impulse-guard-blocker";
  blockerDiv.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    background: transparent;
    z-index: 999999;
    cursor: pointer;
  `;

  blockerDiv.addEventListener("click", handleBlockerClick);
  document.body.appendChild(blockerDiv);

  window.addEventListener("scroll", updateBlockerPosition);
  window.addEventListener("resize", updateBlockerPosition);

  console.log("[Impulse Guard] Blocker div installed");
}

function updateBlockerPosition() {
  if (!blockerDiv) return;
  const button = getElementByXPath(ADD_TO_CART_XPATH) as HTMLElement;
  if (!button) return;

  const rect = button.getBoundingClientRect();
  blockerDiv.style.top = `${rect.top}px`;
  blockerDiv.style.left = `${rect.left}px`;
  blockerDiv.style.width = `${rect.width}px`;
  blockerDiv.style.height = `${rect.height}px`;
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
  const itemPrice = await getItemPrice();
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

function showApprovedToast() {
  const toast = document.createElement("div");
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.ink};
      color: ${color.background};
      padding: 14px 22px;
      border-radius: 9999px;
      font-family: ${font.mono};
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      z-index: 999999;
      box-shadow: 0 12px 24px rgba(10, 10, 10, 0.25);
    ">
      <span style="color: ${color.amberBright};">✓</span> Approved — click again to buy
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Install blocker after page loads
setTimeout(createBlockerDiv, 1000);

console.log("[Impulse Guard] Content script loaded");
