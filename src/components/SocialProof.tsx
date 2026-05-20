"use client";

import React from "react";

export default function SocialProof() {
  const logos = [
    { name: "ApexMedia", icon: "⚡" },
    { name: "Scrapeify", icon: "🌐" },
    { name: "LeadFlow", icon: "🔄" },
    { name: "OutboundAI", icon: "🤖" },
    { name: "ScaleStudio", icon: "🚀" },
  ];

  return (
    <section 
      className="social-proof" 
      style={{ 
        padding: "2.5rem 0", 
        background: "var(--bg-darker)", 
        borderBottom: "1px solid var(--glass-border)",
        borderTop: "1px solid var(--glass-border)"
      }}
    >
      <div 
        className="container" 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          gap: "1.5rem",
          textAlign: "center"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <span 
            style={{ 
              fontSize: "0.8rem", 
              fontWeight: 700, 
              color: "var(--primary)", 
              textTransform: "uppercase", 
              letterSpacing: "0.15em" 
            }}
          >
            SaaS Trust Layer
          </span>
          <h3 
            style={{ 
              fontSize: "1.25rem", 
              fontWeight: 600, 
              color: "var(--text-white)",
              margin: 0
            }}
          >
            Used by marketers & agencies • <span className="gradient-text" style={{ fontWeight: 800 }}>10,000+ leads generated</span>
          </h3>
        </div>

        {/* Responsive Logos Row */}
        <div 
          className="logos-row"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "3rem",
            marginTop: "0.5rem"
          }}
        >
          {logos.map((logo, idx) => (
            <div 
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: 0.4,
                cursor: "default",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.4";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>{logo.icon}</span>
              <span 
                style={{ 
                  fontWeight: 700, 
                  fontSize: "1.05rem", 
                  letterSpacing: "-0.03em",
                  color: "#ffffff"
                }}
              >
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
