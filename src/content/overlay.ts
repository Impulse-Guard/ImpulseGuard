/**
 * Injected overlay UI for shopping pages.
 *
 * These elements live inside arbitrary third-party pages, so we can't mount the
 * Radix popup here. Instead we build the DOM from the same design tokens the
 * popup uses, giving every Impulse Guard surface one consistent look: the cream
 * "old money" card, money-green accents, matching radii, shadows and type.
 */

import { color, font, gradient, radius, shadow, space } from "@/design/tokens";
import type { CategorizationResult } from "@/api/claude";

const OVERLAY_ID = "impulse-guard-overlay";

/** Shared base styles so injected markup ignores the host page's CSS. */
const RESET = `box-sizing: border-box; font-family: ${font.family}; margin: 0;`;

function scrim(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    ${RESET}
    position: fixed;
    inset: 0;
    background: ${gradient.scrim};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
  `;
  return el;
}

function card(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    ${RESET}
    background: ${color.background};
    padding: ${space.xxl};
    border-radius: ${radius.lg};
    border: 1px solid ${color.border};
    max-width: 400px;
    width: calc(100% - 32px);
    text-align: center;
    box-shadow: ${shadow.modal};
  `;
  return el;
}

function clearOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

/** Modal shown while the purchase is being analyzed. */
export function showLoadingOverlay() {
  clearOverlay();

  const overlay = scrim();
  overlay.id = OVERLAY_ID;

  const panel = card();
  panel.innerHTML = `
    <h2 style="${RESET} color: ${color.primaryDeep}; margin-bottom: ${space.md}; font-size: 22px; font-weight: 700;">
      🤔 Analyzing&hellip;
    </h2>
    <p style="${RESET} color: ${color.textMuted}; font-size: 15px;">
      Checking if this is an impulse purchase&hellip;
    </p>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

/** Maps an impulse severity to a short labelled badge. */
const SEVERITY_LABEL: Record<string, string> = {
  low: "Low impulse risk",
  medium: "Medium impulse risk",
  high: "High impulse risk",
};

/** Escapes text destined for innerHTML so scraped/model text can't inject markup. */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Modal shown when a purchase is blocked. Returns once the user dismisses it. */
export function showBlockedOverlay(
  itemPrice: number,
  isNewBlock: boolean,
  result?: CategorizationResult,
) {
  clearOverlay();

  const overlay = scrim();
  overlay.id = OVERLAY_ID;

  const message = isNewBlock
    ? "This looks like an impulse purchase.<br>Come back in <strong>24 hours</strong> if you still want it."
    : "You already blocked this item!<br>Still want it? Come back in <strong>24 hours</strong>.";

  const reason = result?.reason;
  const reasonBlock = reason
    ? `<p style="${RESET} color: ${color.textMuted}; font-size: 14px; font-style: italic; margin-bottom: ${space.lg};">&ldquo;${escapeHtml(reason)}&rdquo;</p>`
    : "";

  const severityLabel = result?.severity && SEVERITY_LABEL[result.severity];
  const confidencePct =
    result?.confidence != null ? Math.round(result.confidence * 100) : null;
  const badgeText = [
    severityLabel,
    confidencePct != null ? `${confidencePct}% sure` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const badgeBlock = badgeText
    ? `<p style="${RESET} display: inline-block; color: ${color.danger}; background: ${color.background}; border: 1px solid ${color.border}; padding: ${space.xs} ${space.md}; border-radius: ${radius.sm}; font-size: 12px; font-weight: 600; margin-bottom: ${space.lg};">${escapeHtml(badgeText)}</p>`
    : "";

  const alternativeBlock = result?.alternative
    ? `<div style="${RESET} background: ${color.savingsSoft}; padding: ${space.md}; border-radius: ${radius.md}; margin-bottom: ${space.lg}; text-align: left;">
         <p style="${RESET} color: ${color.primaryDark}; font-weight: 600; font-size: 13px; margin-bottom: ${space.xs};">💡 Consider this instead</p>
         <p style="${RESET} color: ${color.text}; font-size: 14px; line-height: 1.4;">${escapeHtml(result.alternative)}</p>
       </div>`
    : "";

  const savingsBlock =
    itemPrice > 0 && isNewBlock
      ? `<div style="${RESET} background: ${color.savingsSoft}; padding: ${space.md}; border-radius: ${radius.md}; margin-bottom: ${space.lg};">
           <p style="${RESET} color: ${color.primaryDark}; font-weight: 700; font-size: 18px;">
             💰 You just saved $${itemPrice.toFixed(2)}!
           </p>
         </div>`
      : "";

  const panel = card();
  panel.innerHTML = `
    <h2 style="${RESET} color: ${color.danger}; margin-bottom: ${space.lg}; font-size: 22px; font-weight: 700;">
      🛑 Impulse Guard
    </h2>
    <p style="${RESET} color: ${color.text}; font-size: 15px; line-height: 1.5; margin-bottom: ${space.lg};">
      ${message}
    </p>
    ${badgeBlock}
    ${reasonBlock}
    ${alternativeBlock}
    ${savingsBlock}
    <button id="impulse-guard-close" style="
      ${RESET}
      background: ${gradient.cash};
      color: white;
      border: none;
      padding: ${space.md} ${space.xl};
      border-radius: ${radius.sm};
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: ${shadow.card};
    ">I understand</button>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  panel
    .querySelector("#impulse-guard-close")
    ?.addEventListener("click", () => overlay.remove());
}

/** Removes any open analyzing/blocked modal. */
export function removeOverlay() {
  clearOverlay();
}

/** Transient confirmation toast shown when a purchase is approved. */
export function showApprovedToast() {
  const toast = document.createElement("div");
  toast.style.cssText = `
    ${RESET}
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${gradient.cash};
    color: white;
    padding: ${space.lg} ${space.xl};
    border-radius: ${radius.md};
    font-size: 15px;
    font-weight: 600;
    z-index: 2147483647;
    box-shadow: ${shadow.toast};
  `;
  toast.textContent = "✅ Approved! Click the button again to purchase.";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
