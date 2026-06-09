/**
 * Per-site selector registry.
 *
 * The detector needs three things on any product page: the "add to cart" button
 * (to overlay the blocker on), the product name and the price. Markup differs
 * wildly across retailers, so each supported site declares a list of candidate
 * selectors for each. Selectors are tried in order and the first match wins,
 * which keeps configs resilient to A/B variants and minor redesigns.
 *
 * Selectors are CSS by default. Prefix a selector with `xpath:` to evaluate it
 * as an XPath expression instead.
 *
 * Sites not listed here are handled by the heuristic fallback in detector.ts.
 */

export interface SiteConfig {
  /** Human-readable label, used in logs. */
  name: string;
  /** Bare domains; a host matches when it equals or is a subdomain of one. */
  domains: string[];
  /** Candidate selectors for the add-to-cart / buy button. */
  addToCart: string[];
  /** Candidate selectors for the product title. */
  productName: string[];
  /** Candidate selectors for the price. */
  price: string[];
}

export const SITES: SiteConfig[] = [
  {
    name: "Amazon",
    domains: ["amazon.com", "amazon.ca", "amazon.co.uk", "amazon.de"],
    addToCart: ["#add-to-cart-button", "#buy-now-button", "input[name='submit.add-to-cart']"],
    productName: ["#productTitle", "#title"],
    price: [
      "#corePrice_feature_div .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      ".a-price .a-offscreen",
    ],
  },
  {
    name: "eBay",
    domains: ["ebay.com", "ebay.ca", "ebay.co.uk"],
    addToCart: [
      "#atcBtn_btn_1",
      "#binBtn_btn_1",
      "[data-testid='ux-call-to-action'] a",
      "a[href*='AddToCart']",
    ],
    productName: [".x-item-title__mainTitle span", "h1.x-item-title__mainTitle"],
    price: ["[data-testid='x-price-primary'] span", ".x-price-primary span", "#prcIsum"],
  },
  {
    name: "Walmart",
    domains: ["walmart.com", "walmart.ca"],
    addToCart: [
      "[data-testid='add-to-cart-section'] button",
      "button[data-automation-id='atc']",
      "[data-testid='add-to-cart']",
    ],
    productName: ["h1[itemprop='name']", "#main-title", "h1#main-title"],
    price: ["[itemprop='price']", "[data-testid='price-wrap'] span", "span[itemprop='price']"],
  },
  {
    name: "Target",
    domains: ["target.com"],
    addToCart: [
      "button[data-test='addToCartButton']",
      "[data-test='shippingButton']",
      "[data-test='orderPickupButton']",
    ],
    productName: ["h1[data-test='product-title']"],
    price: ["[data-test='product-price']"],
  },
  {
    name: "Best Buy",
    domains: ["bestbuy.com", "bestbuy.ca"],
    addToCart: [
      ".add-to-cart-button",
      "button.add-to-cart-button",
      "[data-automation='addToCartButton']",
      ".addToCartButton",
    ],
    productName: [".sku-title h1", "[data-automation='productName'] h1", "h1.heading-5"],
    price: [".priceView-customer-price span", "[data-automation='product-price'] span"],
  },
  {
    name: "Newegg",
    domains: ["newegg.com", "newegg.ca"],
    addToCart: [".btn-primary[title='Add to cart']", "button.btn-primary"],
    productName: [".product-title", "h1.product-title"],
    price: [".price-current", ".product-price .price-current"],
  },
  {
    name: "Etsy",
    domains: ["etsy.com"],
    addToCart: ["button[data-add-to-cart-button]", "button[type='submit'][data-add-to-cart-button]"],
    productName: ["h1[data-buy-box-listing-title]", "h1.wt-text-body-larger"],
    price: ["[data-buy-box-region='price'] .currency-value", "p[data-buy-box-region='price']"],
  },
];

/** Returns the config whose domains match the given hostname, or null. */
export function getSiteConfig(hostname: string): SiteConfig | null {
  const host = hostname.toLowerCase();
  return (
    SITES.find((site) =>
      site.domains.some((d) => host === d || host.endsWith(`.${d}`)),
    ) ?? null
  );
}
