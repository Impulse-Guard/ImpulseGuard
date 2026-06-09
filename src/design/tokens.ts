/**
 * Impulse Guard design tokens — the single source of truth for the brand's
 * visual language. Both the extension popup (React + Radix) and the overlays
 * injected into shopping pages (plain DOM) read from here so that every surface
 * shares the same colors, typography, radii and shadows.
 *
 * Theme: "old money" — warm cream backgrounds, money greens, gold accents.
 */

export const color = {
  // Money greens (primary)
  primary: "#16a34a",
  primaryDark: "#15803d",
  primaryDeep: "#064e3b",

  // Gold accents
  gold: "#d4af37",
  goldLight: "#f5d78e",

  // Warm cream backgrounds (like old money)
  background: "#fefdf8",
  backgroundMuted: "#f5f3eb",
  backgroundElevated: "#ffffff",

  // Text
  text: "#1a1a1a",
  textMuted: "#52525b",
  textSuccess: "#15803d",
  border: "#e7e5df",

  // Status
  savings: "#22c55e",
  savingsSoft: "#dcfce7",
  danger: "#dc2626",
} as const;

/** Gradient used on the hero "money saved" surfaces. */
export const gradient = {
  cash: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
  scrim: "rgba(20, 20, 20, 0.7)",
} as const;

export const font = {
  family:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  pill: "9999px",
} as const;

export const shadow = {
  card: "0 1px 3px rgba(20, 20, 20, 0.08)",
  modal: "0 12px 40px rgba(20, 20, 20, 0.28)",
  toast: "0 8px 24px rgba(20, 20, 20, 0.24)",
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
} as const;
