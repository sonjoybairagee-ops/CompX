"use client";

import React from "react";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface CompareProps {
  onSelectTab: (tabId: "compx-lifetime" | "compx-leads-pro") => void;
}

export default function Compare({ onSelectTab }: CompareProps) {
  return (
    <section id="compare" className="compare section bg-darker">
      <div className="container">
        <div className="section-header reveal active">
          <h2>Our Premium Software Suite</h2>
          <p>
            Explore the features of CompX After Effects Extension and CompX
            Leads Pro Web Scraper below.
          </p>
        </div>
        <div className="comparison-grid grid">
          {/* Lifetime Column */}
          <div
            className="comparison-card glass-card reveal active"
            onMouseMove={handleSpotlightMouseMove}
          >
            <div className="tier-icon">💎</div>
            <h3>CompX Lifetime Deal</h3>
            <p className="tier-meta">600 BDT One-Time Payment</p>
            <p className="tier-desc">
              Designed for video editors, animators, and motion designers
              looking to speed up their After Effects workflow and keep their
              timelines clean.
            </p>
            <ul className="comparison-features">
              <li>
                <span className="check-icon">✓</span> 1-Click Precomp & Un-precomp
              </li>
              <li>
                <span className="check-icon">✓</span> Auto-Trim to layer content bounds
              </li>
              <li>
                <span className="check-icon">✓</span> Batch composition renaming
              </li>
              <li>
                <span className="check-icon">✓</span> Expression link preservation
              </li>
              <li>
                <span className="check-icon">✓</span> Keyframe & effect transfer engine
              </li>
              <li>
                <span className="check-icon">✓</span> Full script & extensions updates
              </li>
              <li>
                <span className="check-icon">✓</span> Lifetime access & support
              </li>
            </ul>
            <a
              href="#pricing"
              onClick={() => onSelectTab("compx-lifetime")}
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: "1.5rem" }}
            >
              View Lifetime Plan
            </a>
          </div>

          {/* Subscription Column */}
          <div
            className="comparison-card glass-card featured reveal active"
            onMouseMove={handleSpotlightMouseMove}
          >
            <div className="featured-badge">🔥 Most Powerful</div>
            <div className="tier-icon" style={{ color: "var(--primary)" }}>
              ⚡
            </div>
            <h3>CompX Leads Pro</h3>
            <p className="tier-meta">Starting at $9 / $19 / $39 Monthly</p>
            <p className="tier-desc">
              Designed for B2B marketers, sales teams, agencies, SEO companies,
              and startups aiming for high-volume validated outbound leads.
            </p>
            <ul className="comparison-features">
              <li>
                <span className="check-icon">✓</span> Google Maps Leads Extraction
              </li>
              <li>
                <span className="check-icon">✓</span> LinkedIn company data scraper
              </li>
              <li>
                <span className="check-icon">✓</span> Smart AI Email Enrichment Engine
              </li>
              <li>
                <span className="check-icon">✓</span> AI Cold Email Generator
              </li>
              <li>
                <span className="check-icon">✓</span> Lead Scoring System (0–100)
              </li>
              <li>
                <span className="check-icon">✓</span> CRM dashboard & Google Sheets sync
              </li>
              <li>
                <span className="check-icon">✓</span> Bulk extraction & Unlimited lists
              </li>
            </ul>
            <a
              href="#pricing"
              onClick={() => onSelectTab("compx-leads-pro")}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "1.5rem" }}
            >
              View Subscription Tiers
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
