import { trackBlockedPurchase } from "./storage";
import { categorizePurchase } from "@/api/claude";
import {
  showLoadingOverlay,
  showBlockedOverlay,
  removeOverlay,
  showApprovedToast,
} from "./overlay";

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

// Install blocker after page loads
setTimeout(createBlockerDiv, 1000);

console.log("[Impulse Guard] Content script loaded");
