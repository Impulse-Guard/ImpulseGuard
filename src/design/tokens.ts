/**
 * Impulse Guard design tokens — the single source of truth for the brand's
 * visual language, shared by the React popup and the overlays that
 * detector.ts injects into shopping pages.
 *
 * The look is borrowed from tday.com: a warm cream canvas, near-black ink,
 * a single amber accent, hairline "rail" borders, pill buttons, and a
 * two-font system (Hanken Grotesk for headings/body, IBM Plex Mono for
 * uppercase labels). src/index.css mirrors the handful of values that must
 * exist as plain CSS — keep them in sync when editing here.
 */

export const color = {
  /** Warm cream page/popup background */
  background: '#FBF9F4',
  /** Near-black primary text */
  ink: '#0A0A0A',
  /** Brand accent: eyebrows, highlights, links */
  amber: '#D69200',
  /** Brighter amber for chips and small fills */
  amberBright: '#FFB300',
  /** Translucent amber fill for callout boxes */
  amberTint: 'rgba(214, 146, 0, 0.10)',
  /** Hairline borders and dividers */
  rail: '#DCD7C9',
  /** Secondary text */
  muted: '#78716C',
  /** Dimmed-page backdrop behind injected modals */
  backdrop: 'rgba(10, 10, 10, 0.55)',
} as const;

/* Family names are single-quoted so the stacks can be interpolated into the
 * double-quoted style="..." attributes detector.ts builds. */
export const font = {
  /** Headings and body. The popup bundles Hanken Grotesk via @fontsource;
   *  host pages fall back to their system sans. */
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  /** Uppercase labels, eyebrows, and buttons. */
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export const radius = {
  card: '24px',
  pill: '9999px',
} as const;
