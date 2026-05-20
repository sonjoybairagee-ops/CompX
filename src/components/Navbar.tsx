import React from "react";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="navbar" style={{ padding: "1rem 0" }}>
      <div 
        className="container" 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          width: "100%" 
        }}
      >
        {/* Left Side: Logo */}
        <Link href="/" className="logo" style={{ display: "flex", alignItems: "center" }}>
          <span>
            <span className="logo-comp" style={{ letterSpacing: "-0.02em" }}>COMP</span>
            <span className="logo-x" style={{ fontWeight: "900" }}>X</span>
          </span>
        </Link>
        
        {/* Center: Navigation Links */}
        <div className="nav-links-center">
          <a href="#features" className="nav-link-item">
            Features
          </a>
          <a href="#pricing" className="nav-link-item">
            Pricing
          </a>
          <a href="#how-it-works" className="nav-link-item">
            How it Works
          </a>
        </div>

        {/* Right Side: Navigation Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              color: "var(--text-muted)",
              fontWeight: 500,
              fontSize: "0.95rem",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            Login
          </Link>
          <Link
            href="/login"
            className="btn btn-primary pulse-btn"
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: "50px",
              fontSize: "0.9rem",
              boxShadow: "0 0 15px var(--primary-glow)",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
