"use client";

import React from "react";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface PricingProps {
  activeRegion: "local" | "global";
  setActiveRegion: (region: "local" | "global") => void;
  onOpenModal?: (planId: string) => void;
  activeTab?: string;
  setActiveTab?: (tabId: any) => void;
  activeLeadsCycle?: string;
  setActiveLeadsCycle?: (cycle: any) => void;
}

export default function Pricing({
  activeRegion,
  setActiveRegion,
  onOpenModal,
}: PricingProps) {
  const currencySymbol = activeRegion === "local" ? "৳" : "$";

  const plans = [
    {
      id: "free",
      name: "Free",
      limit: "500 leads/week",
      prices: {
        local: "0",
        global: "0",
      },
      period: "forever",
      subtext: "Perfect for testing the extension features.",
      features: [
        "Google Maps scraping",
        "Export CSV (up to 500 leads/wk)",
        "Standard data enrichment",
        "Chrome & Firefox extension compatibility",
      ],
      cta: "Start Free",
      featured: false,
    },
    {
      id: "pro",
      name: "Pro",
      limit: "10,000 leads/month",
      prices: {
        local: "1,900",
        global: "19",
      },
      period: "month",
      subtext: "Ideal for growing startups & sales reps.",
      features: [
        "Everything in Free plan",
        "LinkedIn leads scraping",
        "Email finder & B2B data enrichment",
        "Full CSV, Excel & Google Sheets export",
        "Lead limit system customized",
        "Priority live chat support",
      ],
      cta: "Upgrade",
      featured: true,
    },
    {
      id: "agency",
      name: "Agency",
      limit: "Unlimited",
      prices: {
        local: "4,900",
        global: "49",
      },
      period: "month",
      subtext: "Designed for scaling agencies & enterprises.",
      features: [
        "Everything in Pro plan",
        "Unlimited lead scraping",
        "Advanced CRM dashboard integration",
        "Multiple device sessions (up to 3)",
        "24/7 dedicated account manager",
        "Custom APIs & webhook integrations",
      ],
      cta: "Upgrade",
      featured: false,
    },
  ];

  const handleCtaClick = (planId: string) => {
    if (onOpenModal) {
      onOpenModal(planId);
    } else {
      alert(`Payment integration for ${planId.toUpperCase()} will be connected soon!`);
    }
  };

  return (
    <section id="pricing" className="pricing section">
      <div className="container">
        <div className="section-header reveal active">
          <h2>Simple, Transparent Pricing</h2>
          <p>Choose the model that fits your lead generation outreach needs.</p>
        </div>

        {/* Regional Switcher */}
        <div
          className="pricing-selector-container"
          style={{ maxWidth: "400px", margin: "0 auto 3rem auto" }}
        >
          <div className="pricing-selector" id="global-region-switch">
            <button
              className={`selector-btn ${activeRegion === "local" ? "active" : ""}`}
              onClick={() => setActiveRegion("local")}
            >
              🇧🇩 Local BDT (৳)
            </button>
            <button
              className={`selector-btn ${activeRegion === "global" ? "active" : ""}`}
              onClick={() => setActiveRegion("global")}
            >
              🌐 International USD ($)
            </button>
          </div>
        </div>

        {/* Static Pricing Grid */}
        <div className="socleads-pricing-grid">
          {plans.map((plan) => {
            const price = activeRegion === "local" ? plan.prices.local : plan.prices.global;
            return (
              <div
                key={plan.id}
                className={`socleads-pricing-card ${plan.featured ? "featured" : ""} reveal active`}
                onMouseMove={handleSpotlightMouseMove}
              >
                {plan.featured && <span className="featured-ribbon">🔥 Most Popular</span>}
                <div className="card-tier-title">{plan.name}</div>
                <span className="card-leads-limit">{plan.limit}</span>
                <div className="socleads-price-container">
                  <span className="socleads-currency">{currencySymbol}</span>
                  <span className="socleads-amount">{price}</span>
                  <span className="socleads-period">/{plan.period}</span>
                </div>
                <p className="socleads-price-sub">{plan.subtext}</p>

                <div className="card-features-container">
                  <ul>
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>
                        <span className="check">✔</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`socleads-cta-btn ${plan.featured ? "" : "btn-secondary"}`}
                  onClick={() => handleCtaClick(plan.id)}
                  style={{ width: "100%", marginTop: "auto" }}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
