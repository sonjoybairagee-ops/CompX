"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface HeroProps {
  onSelectTab?: (tabId: "compx-lifetime" | "compx-leads-pro") => void;
}

export default function Hero({ onSelectTab }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  const handleDotClick = (idx: number) => {
    setCurrentSlide(idx);
  };

  return (
    <header className="hero section">
      <div className="hero-glow-orb"></div>
      <div className="container grid">
        <div className="hero-content reveal active">
          <div className="hero-badge">🚀 Elite Google Maps & LinkedIn Scraper Suite</div>
          <h1>
            Automate B2B Lead Generation{" "}
            <span className="gradient-text">in Seconds</span>
          </h1>
          <p className="subheadline">
            Scrape Google Maps, LinkedIn & corporate sites automatically. Extract verified email addresses, phone numbers, and social links straight to CSV or your outbound CRM with zero manual work.
          </p>
          <div className="hero-action-btns">
            <Link
              href="/login"
              className="btn btn-primary pulse-btn"
              style={{ padding: "0.8rem 2rem", fontSize: "1.05rem" }}
            >
              Get Started
            </Link>
            <a
              href="#pricing"
              className="btn btn-secondary"
              style={{ padding: "0.8rem 2rem", fontSize: "1.05rem" }}
            >
              Watch Demo
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Leads Generated</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">Satisfaction</div>
            </div>
          </div>
        </div>

        <div className="hero-visual reveal active">
          <div
            className="glass-card mockup-wrapper slider-container"
            onMouseMove={handleSpotlightMouseMove}
          >
            <div className="slider-wrapper">
              {/* Slide 1: High Fidelity Dynamic CSS Mockup Dashboard */}
              <div
                className={`mockup-slide dashboard-mockup ${
                  currentSlide === 0 ? "active" : ""
                }`}
              >
                <div className="dashboard-mockup-header">
                  <div className="header-left">
                    <h3>CompX Dashboard</h3>
                    <p>AI Lead Intelligence</p>
                  </div>
                  <div className="status-indicator">
                    <span className="status-dot pulse"></span>
                    <span className="status-text">Live</span>
                  </div>
                </div>
                <div className="dashboard-mockup-body">
                  <div className="dashboard-card card-blue">
                    <div className="card-left">
                      <div className="card-title">Google Maps Leads</div>
                      <div className="card-desc">Dentists near London</div>
                    </div>
                    <div className="card-right">125 Leads</div>
                  </div>
                  <div className="dashboard-card card-purple">
                    <div className="card-left">
                      <div className="card-title">Emails Found</div>
                      <div className="card-desc">Enrichment Engine</div>
                    </div>
                    <div className="card-right">84 Emails</div>
                  </div>
                  <div className="dashboard-card card-cyan">
                    <div className="card-left">
                      <div className="card-title">LinkedIn Companies</div>
                      <div className="card-desc">B2B Data Extraction</div>
                    </div>
                    <div className="card-right">56 Companies</div>
                  </div>
                </div>
              </div>

              {/* Slide 2: CompX AE Precomp Manager - Secure & Simple Activation */}
              <div className={`mockup-slide ${currentSlide === 1 ? "active" : ""}`}>
                <Image
                  src="/assets/ui-license.png.JPG"
                  alt="CompX AE Secure & Simple Activation"
                  fill
                  style={{ objectFit: "cover" }}
                  priority={currentSlide === 1}
                />
              </div>

              {/* Slide 3: CompX AE Precomp Manager - Asset Library */}
              <div className={`mockup-slide ${currentSlide === 2 ? "active" : ""}`}>
                <Image
                  src="/assets/ui-main.png.JPG"
                  alt="CompX AE Asset Library & Comps"
                  fill
                  style={{ objectFit: "cover" }}
                  priority={currentSlide === 2}
                />
              </div>

              {/* Slide 4: Real Product Screenshots (Leads Pro) */}
              <div className={`mockup-slide ${currentSlide === 3 ? "active" : ""}`}>
                <Image
                  src="/compx_leads_extraction.png"
                  alt="CompX Website & Google Maps Extractor"
                  fill
                  style={{ objectFit: "cover" }}
                  priority={currentSlide === 3}
                />
              </div>

              {/* Slide 5: Real Product Screenshots (Leads Pro) */}
              <div className={`mockup-slide ${currentSlide === 4 ? "active" : ""}`}>
                <Image
                  src="/compx_crm_sync.png"
                  alt="CompX SaaS Dashboard CRM Sync"
                  fill
                  style={{ objectFit: "cover" }}
                  priority={currentSlide === 4}
                />
              </div>
            </div>

            <div className="slider-dots">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <span
                  key={idx}
                  onClick={() => handleDotClick(idx)}
                  className={`dot ${currentSlide === idx ? "active" : ""}`}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
