"use client";

import React from "react";
import Link from "next/link";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface CTAProps {
  onSelectTab?: (tabId: any) => void;
}

export default function CTA({ onSelectTab }: CTAProps) {
  return (
    <section className="cta-banner section">
      <div className="container reveal active">
        <div
          className="cta-banner-content glass-card"
          style={{ borderRadius: "40px", padding: "4rem 3.5rem", textAlign: "center" }}
          onMouseMove={handleSpotlightMouseMove}
        >
          <div className="cta-glow"></div>
          <h2>Start your first 500 leads free</h2>
          <p style={{ maxWidth: "600px", margin: "1rem auto 2rem auto" }}>
            Unlock instant access to Google Maps scraping, LinkedIn corporate leads, and our real-time email finder. No credit card required. Upgrade anytime.
          </p>
          <div className="cta-banner-btns" style={{ display: "flex", justifyContent: "center" }}>
            <Link
              href="/login"
              className="btn btn-primary pulse-btn"
              style={{ padding: "0.8rem 3rem", fontSize: "1.1rem" }}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
