"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingStep, setLoadingStep] = useState("Authenticating...");

  const { user, loading, loginWithEmail } = useAuth();
  const router = useRouter();

  // Route Guard: Auto-redirect to dashboard if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setLoadingStep("Connecting to credentials node...");

    // Premium multi-stage visual simulation
    const steps = [
      "Verifying secure handshake...",
      "Encrypting session token...",
      "Accessing lead intelligence console...",
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setLoadingStep(steps[stepIndex]);
        stepIndex++;
      }
    }, 450);

    try {
      await loginWithEmail(email, password);
      clearInterval(interval);
      router.push("/dashboard");
    } catch (err: any) {
      clearInterval(interval);
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
      setLoadingStep("");
    }
  };

  // Sleek centered gate-opening interface while checking session state
  if (loading || (user && !isLoading)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-darker)",
          gap: "1.5rem",
        }}
      >
        <div className="logo" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          <span>
            <span className="logo-comp">COMP</span>
            <span className="logo-x">X</span>
          </span>
        </div>
        <div className="status-dot pulse" style={{ width: "12px", height: "12px", background: "var(--primary)" }}></div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", letterSpacing: "1px" }}>
          LOADING SECURE GATEWAY...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-darker)",
        position: "relative",
        padding: "1.5rem",
      }}
    >
      <div className="hero-glow-orb" style={{ top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: "400px", height: "400px", opacity: "0.2" }}></div>

      <div
        className="glass-card reveal active"
        onMouseMove={handleSpotlightMouseMove}
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "3rem 2.5rem",
          borderRadius: "24px",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        }}
      >
        <Link href="/" className="logo" style={{ marginBottom: "2rem", display: "inline-block" }}>
          <span>
            <span className="logo-comp">COMP</span>
            <span className="logo-x">X</span>
          </span>
        </Link>

        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem", textAlign: "center" }}>
          Welcome Back
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
          Access your lead generation dashboard
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem", textAlign: "left" }}>
          {errorMsg && (
            <div
              style={{
                padding: "0.8rem 1.2rem",
                borderRadius: "12px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ff6b6b",
                fontSize: "0.85rem",
                textAlign: "center",
                lineHeight: "1.4",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.9rem 1.2rem",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                color: "#fff",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--glass-border)")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)" }}>
                Password
              </label>
              <a href="#" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none" }}>
                Forgot?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.9rem 1.2rem",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                color: "#fff",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--glass-border)")}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary pulse-btn"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "50px",
              marginTop: "1rem",
              fontSize: "0.98rem",
            }}
          >
            {isLoading ? loadingStep : "Sign In to CompX"}
          </button>
        </form>

        <p style={{ marginTop: "2rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link href="/#pricing" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>
            Get started
          </Link>
        </p>
      </div>
    </div>
  );
}

