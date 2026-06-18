# ImpulseGuard

**ImpulseGuard** is an AI-powered browser extension that helps you avoid impulse purchases. When you try to add an item to your cart, it uses Claude AI to analyze the product and decide whether it's a genuine necessity or an impulse buy. If flagged as wasteful, the purchase is blocked and your savings are tracked in real time.

## Features

- 🛑 **Intercepts "Add to Cart"** on supported retail sites before the action completes
- 🤖 **AI-powered analysis** — sends the product name and price to Claude for instant categorization
- 💰 **Savings tracker** — records money saved, blocked purchases, and impulse-resistance stats in the popup dashboard
- ✅ **Allows genuine necessities** — essential items (groceries, medicine, household supplies, etc.) pass straight through
- 🔄 **Duplicate detection** — the same item is never counted twice

## Supported Sites

| Site | Status |
|------|--------|
| Best Buy Canada (`bestbuy.ca`) | ✅ Supported |

> Support for additional retail sites can be added by updating the host permissions and XPath selectors in the source code.

## Prerequisites

- **Node.js** (v18 or later recommended)
- **npm**
- An **Anthropic API key** — get one at <https://console.anthropic.com/>

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Impulse-Guard/ImpulseGuard.git
cd ImpulseGuard

# 2. Install dependencies
npm install

# 3. Add your Claude API key
echo "CLAUDE_API_KEY=your-api-key-here" > .env

# 4. Build the extension
npm run build        # production build  →  dist/
# or
npm run dev          # watch mode (rebuilds on file changes)
```

## Loading the Extension

### Chrome / Brave / Edge

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` folder

### Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/manifest.json`

## Usage

1. Browse to a supported retail site (e.g., `bestbuy.ca`)
2. Find a product and click **Add to Cart**
3. ImpulseGuard intercepts the action and sends the product details to Claude
   - **Normal purchase** → the item is added to your cart as usual
   - **Impulse purchase** → a blocking overlay appears explaining why the purchase was flagged and how much you saved
4. Open the extension popup at any time to view your savings dashboard

## Project Structure

```
ImpulseGuard/
├── src/
│   ├── main.tsx              # React entry point (popup)
│   ├── App.tsx               # Popup dashboard UI
│   ├── index.css             # Tailwind CSS styles
│   ├── api/
│   │   └── claude.ts         # Claude API integration
│   └── content/
│       ├── detector.ts       # Content script — intercepts Add to Cart
│       └── storage.ts        # Chrome Storage helpers
├── static/                   # Extension icons
├── popup.html                # Popup HTML shell
├── manifest.json             # Chrome extension manifest (MV3)
├── vite.config.ts            # Vite build configuration
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| UI | React 19 + Tailwind CSS + Radix UI |
| Bundler | Vite |
| AI | Anthropic Claude (`claude-3-haiku`) |
| Browser APIs | Chrome Extension MV3 / webextension-polyfill |

## Contributing

Contributions are welcome! To get started:

1. Fork the repository and create a feature branch
2. Make your changes and run `npm run build` to verify the build succeeds
3. Open a pull request describing what you changed and why

## License

This project does not currently specify a license. Please contact the repository owner before using it in your own projects.
