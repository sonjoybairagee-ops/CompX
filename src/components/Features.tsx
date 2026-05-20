"use client";

import React from "react";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

const featuresList: Feature[] = [
  {
    icon: "📍",
    title: "Google Maps Scraping",
    desc: "Extract business names, ratings, websites, phone numbers, and addresses from any Google Maps search in seconds.",
  },
  {
    icon: "💼",
    title: "LinkedIn Scraping",
    desc: "Collect company info, industry data, employee counts, and targeted B2B contact details directly from LinkedIn profiles.",
  },
  {
    icon: "✉️",
    title: "Email Extraction",
    desc: "Discover hidden email addresses, contact details, mailto links, and social profiles automatically in real-time.",
  },
  {
    icon: "📥",
    title: "Export CSV",
    desc: "Instantly download your extracted lead lists as formatted CSV or Excel sheets, or sync directly to Google Sheets.",
  },
  {
    icon: "🛡️",
    title: "Lead Limit Control",
    desc: "Manage monthly extraction quotas and data caps dynamically synced with your subscription plan status.",
  },
  {
    icon: "⚡",
    title: "Fast Search Engine",
    desc: "Lightning-fast crawling engine parses pages within milliseconds, optimizing search throughput without blocking.",
  },
  {
    icon: "🔄",
    title: "CRM Sync & Integrations",
    desc: "Directly push verified leads into Salesforce, HubSpot, or any custom webhook endpoint with a single click.",
  },
  {
    icon: "🎯",
    title: "Domain Verification",
    desc: "Validate email deliverability automatically to ensure low bounce rates and high outbound campaign conversion.",
  },
];

export default function Features() {
  return (
    <section id="features" className="features section">
      <div className="container">
        <div className="section-header reveal active">
          <h2>Powerful Lead Generation Features</h2>
          <p>Everything you need to find, enrich, and manage business leads.</p>
        </div>
        <div className="features-grid grid">
          {featuresList.map((feature, idx) => (
            <div
              key={idx}
              className="feature-card glass-card reveal active"
              onMouseMove={handleSpotlightMouseMove}
            >
              <div className="icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
              <div className="feature-glow"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
