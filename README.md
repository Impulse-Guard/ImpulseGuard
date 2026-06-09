# Impulse Guard

**AI-Powered Impulse Purchase Blocker**

Stop wasteful online shopping before it happens. Impulse Guard is a browser extension that uses AI to detect impulse buys at checkout and enforces a 24-hour cooling-off period so you only buy what you actually need.

## The Problem

Online retailers are engineered to make spending frictionless — one-click checkout, "Buy Now" buttons, and constant urgency cues. The result is impulse spending that adds up fast:

- **Frictionless checkout** removes the natural pause that prevents regret purchases
- **Dark patterns** like countdown timers and "only 2 left" manufacture urgency
- **No built-in reflection** between "I want this" and "I bought this"
- **Invisible totals** — small impulse buys quietly drain savings over months
- **No accountability** to your actual financial goals

Most people don't lack the desire to save — they lack a moment of friction at the point of purchase.

## The Solution

Impulse Guard is an **AI-powered impulse purchase blocker** that:

- **Intercepts the "Add to Cart" button** on supported stores before you can click it
- **Analyzes the item with AI** to decide whether it's a necessity or an impulse buy
- **Blocks wasteful purchases** behind a 24-hour cooling-off period
- **Tracks your savings** so you can see the money you didn't spend
- **Personalizes onboarding** with AI insights based on your spending goals

If you still want the item tomorrow, you can buy it. Most impulses fade.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          BROWSER EXTENSION                         │
│                    React 19 + Vite + Radix Themes                  │
│                                                                    │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│   │   Popup UI   │   │  Onboarding  │   │   Content Script     │  │
│   │  (dashboard) │   │  (first run) │   │  (detector overlay)  │  │
│   └──────┬───────┘   └──────┬───────┘   └──────────┬───────────┘  │
│          │                  │                      │              │
│          └──────────────────┼──────────────────────┘              │
│                             ▼                                     │
│              ┌────────────────────────────┐                      │
│              │   Background Service Worker │                      │
│              │   (onInstalled → onboarding)│                      │
│              └────────────────────────────┘                      │
└──────────────────────────────┬─────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │chrome.storage│    │  Claude API  │    │  Retail Site │
   │   (.local)   │    │ (Haiku model)│    │ (bestbuy.ca) │
   └──────────────┘    └──────────────┘    └──────────────┘
     stats & profile    purchase analysis    injected overlay
```

When you click "Add to Cart" on a supported site, the content script intercepts the click, sends the product name and price to the Claude API for categorization, and either approves the purchase or shows a blocking overlay with a 24-hour timer. All stats and your onboarding profile live in `chrome.storage.local`.

## Tech Stack

### Extension

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | Popup & onboarding UI |
| [Vite](https://vitejs.dev/) | Build tool & bundler |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Radix Themes](https://www.radix-ui.com/themes) | UI components |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) | Cross-browser extension APIs |

### AI

| Technology | Purpose |
|------------|---------|
| [Claude API](https://www.anthropic.com/api) | Purchase categorization & coaching |
| `claude-3-haiku` | Fast, low-cost classification model |

## Project Structure

```
ImpulseGuard/
├── src/
│   ├── App.tsx              # Popup dashboard (savings stats)
│   ├── main.tsx             # Popup entry point
│   ├── background.ts        # Service worker (opens onboarding on install)
│   ├── content/
│   │   ├── detector.ts      # Injected blocker + overlays on retail sites
│   │   └── storage.ts       # chrome.storage schema & block-timer logic
│   ├── onboarding/
│   │   ├── Onboarding.tsx   # Multi-step first-run flow
│   │   └── main.tsx         # Onboarding entry point
│   └── api/
│       └── claude.ts        # Claude API client & categorization
│
├── static/                  # Extension icons
├── popup.html               # Popup HTML shell
├── onboarding.html          # Onboarding HTML shell
├── manifest.json            # Manifest V3 config
└── vite.config.ts           # Build config (popup, onboarding, content, background)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) and npm
- A [Claude API key](https://console.anthropic.com/) from Anthropic
- A Chromium-based browser (Chrome, Edge, Brave) or Firefox 109+

### Installation

```bash
# Clone the repository
git clone https://github.com/Impulse-Guard/ImpulseGuard.git
cd ImpulseGuard

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
CLAUDE_API_KEY=sk-ant-your-key-here
```

The key is injected at build time and used by the content script and onboarding flow to call the Claude API.

### Build

```bash
# One-off production build
npm run build

# Or rebuild on every change during development
npm run dev
```

Both commands output the unpacked extension to the `dist/` directory.

### Loading the Extension

**Chrome / Edge / Brave:**
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select the `dist/` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `dist/manifest.json`

On first install, the onboarding page opens automatically.

## Features

### Smart Purchase Detection
The content script overlays the "Add to Cart" button on supported stores. When clicked, it captures the product name and price and asks Claude to classify the purchase as a **necessity** or an **impulse buy** — defaulting to caution when uncertain.

### 24-Hour Cooling-Off Period
Flagged purchases are blocked for 24 hours. A blocking overlay shows the time remaining and the amount you'd be spending. If you still want the item after the timer expires, you're free to buy it.

### Savings Dashboard
The popup tracks your total money saved, weekly savings, blocked purchases, impulses resisted, and your overall success rate — all updated in real time as the extension does its work.

### Personalized Onboarding
A guided first-run flow asks about your spending challenges and financial goals, then uses Claude to generate a personalized coaching insight. You can also add an accountability buddy to stay on track.

## Available Scripts

```bash
npm run dev      # Build and watch for changes (development)
npm run build    # Production build to dist/
```

## Supported Sites

Impulse Guard currently activates on:

- `bestbuy.ca`

Support for additional retailers is on the roadmap — each store needs selectors mapped in `src/content/detector.ts`.

## Contributing

This project follows a **"No Task, No Work"** workflow:

1. **Create an issue** for any work
2. **Create a branch**: `git checkout -b issue-{N}-{description}`
3. **Make changes** and commit
4. **Open a PR** referencing the issue (e.g. `Closes #N`)
5. **Merge** when approved

## License

This project is for educational and personal use.

---

*Impulse Guard: a moment of friction between you and the "Buy" button.*
