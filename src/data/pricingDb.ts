// pricingDb.ts - Clean, structured B2B pricing model for CompX tools and plans

export interface PriceTier {
  amount: string;
  currency: string;
  coupon?: string;
  couponDesc?: string;
  checkout: string;
}

export interface SubscriptionPrice {
  monthly: PriceTier;
  yearly: PriceTier;
}

export interface PlanData {
  name: string;
  description: string;
  isSubscription: boolean;
  deviceLimit?: number;
  prices: {
    local: PriceTier | SubscriptionPrice;
    global: PriceTier | SubscriptionPrice;
  };
}

export const pricingDb: Record<string, PlanData> = {
  "compx-lifetime": {
    name: "CompX Lifetime License",
    description: "One-time payment for CompX After Effects Precomp Manager. Speed up your composition workflow, batch rename layers, auto-trim composition bounds, and keep timeline expressions intact forever.",
    isSubscription: false,
    prices: {
      local: {
        amount: "600",
        currency: "৳",
        coupon: "SB80",
        couponDesc: "Save 80% - Limited local launch discount coupon",
        checkout: "https://www.supportkori.com/sonjoybairagee/extras/compx-lifetime-local-7sn6"
      },
      global: {
        amount: "8",
        currency: "$",
        checkout: "https://compx.lemonsqueezy.com/checkout/buy/compx-lifetime-global"
      }
    }
  },
  "free": {
    name: "Free Plan",
    description: "Perfect for testing the extension features with standard lead generation search capabilities.",
    isSubscription: true,
    deviceLimit: 1,
    prices: {
      local: {
        monthly: { amount: "0", currency: "৳", checkout: "#" },
        yearly: { amount: "0", currency: "৳", checkout: "#" }
      },
      global: {
        monthly: { amount: "0", currency: "$", checkout: "#" },
        yearly: { amount: "0", currency: "$", checkout: "#" }
      }
    }
  },
  "pro": {
    name: "Pro Plan",
    description: "Ideal for growing startups & sales reps. Up to 10,000 verified leads per month.",
    isSubscription: true,
    deviceLimit: 1,
    prices: {
      local: {
        monthly: { amount: "1,900", currency: "৳", checkout: "#" },
        yearly: { amount: "11,400", currency: "৳", checkout: "#" }
      },
      global: {
        monthly: { amount: "19", currency: "$", checkout: "#" },
        yearly: { amount: "114", currency: "$", checkout: "#" }
      }
    }
  },
  "agency": {
    name: "Agency Plan",
    description: "Designed for scaling agencies & enterprises. Unlimited lead scraping, CRM integrations, and premium outbound syncing.",
    isSubscription: true,
    deviceLimit: 3,
    prices: {
      local: {
        monthly: { amount: "4,900", currency: "৳", checkout: "#" },
        yearly: { amount: "29,400", currency: "৳", checkout: "#" }
      },
      global: {
        monthly: { amount: "49", currency: "$", checkout: "#" },
        yearly: { amount: "294", currency: "$", checkout: "#" }
      }
    }
  }
};
