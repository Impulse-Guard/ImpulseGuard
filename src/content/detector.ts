import { trackBlockedPurchase } from "./storage";
import { categorizePurchase } from "@/api/claude";

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
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    ">
      <div style="
        background: #fefdf8;
        padding: 32px;
        border-radius: 16px;
        max-width: 400px;
        text-align: center;
        font-family: system-ui, sans-serif;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      ">
        <h2 style="color: #16a34a; margin: 0 0 16px; font-size: 24px;">🤔 Analyzing...</h2>
        <p style="color: #1a1a1a; margin: 0; font-size: 16px;">
          Checking if this is an impulse purchase...
        </p>
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
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    ">
      <div style="
        background: #fefdf8;
        padding: 32px;
        border-radius: 16px;
        max-width: 400px;
        text-align: center;
        font-family: system-ui, sans-serif;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      ">
        <h2 style="color: #dc2626; margin: 0 0 16px; font-size: 24px;">🛑 Impulse Guard</h2>
        <p style="color: #1a1a1a; margin: 0 0 16px; font-size: 16px;">
          ${
            isNewBlock
              ? "This looks like an impulse purchase.<br>Come back in <strong>24 hours</strong> if you still want it."
              : "You already blocked this item!<br>Still want it? Come back in <strong>24 hours</strong>."
          }
        </p>
        ${
          reason
            ? `
        <p style="color: #6b7280; margin: 0 0 16px; font-size: 14px; font-style: italic;">
          "${reason}"
        </p>
        `
            : ""
        }
        ${
          itemPrice > 0 && isNewBlock
            ? `
        <div style="
          background: #dcfce7;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        ">
          <p style="margin: 0; color: #16a34a; font-weight: bold; font-size: 18px;">
            💰 You just saved $${itemPrice.toFixed(2)}!
          </p>
        </div>
        `
            : ""
        }
        <button id="impulse-guard-close" style="
          background: #16a34a;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">I understand</button>
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
      background: #16a34a;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 16px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      ✅ Approved! Click the button again to purchase.
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Install blocker after page loads
setTimeout(createBlockerDiv, 1000);

console.log("[Impulse Guard] Content script loaded");
