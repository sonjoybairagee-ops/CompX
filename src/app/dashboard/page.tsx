"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface ScrapeJob {
  id: string;
  source: string;
  query: string;
  leads: number;
  status: "Completed" | "Crawling" | "Enriching";
  progress: number;
  date: string;
}

const mockJobs: ScrapeJob[] = [
  {
    id: "job-1",
    source: "Google Maps Scraper",
    query: "Dentists near London",
    leads: 125,
    status: "Completed",
    progress: 100,
    date: "2026-05-20",
  },
  {
    id: "job-2",
    source: "LinkedIn Extractor",
    query: "SaaS CEOs in San Francisco",
    leads: 56,
    status: "Crawling",
    progress: 68,
    date: "2026-05-20",
  },
  {
    id: "job-3",
    source: "Email Enrichment",
    query: "UK Tech Companies Bulk Scan",
    leads: 84,
    status: "Enriching",
    progress: 92,
    date: "2026-05-19",
  },
];

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<ScrapeJob[]>(mockJobs);
  const [activeSidebarTab, setActiveSidebarTab] = useState("dashboard");
  const [crmSynced, setCrmSynced] = useState(false);
  
  // Scraper form state
  const [newQuery, setNewQuery] = useState("");
  const [newSource, setNewSource] = useState("Google Maps Scraper");
  const [isScraping, setIsScraping] = useState(false);

  // Route Guard: Redirect unauthenticated requests to login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Premium secure verification splash screen
  if (loading || !user) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg-dark)",
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
          CHECKING ACCESS AUTHORIZATION...
        </p>
      </div>
    );
  }

  const handleStartScrape = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery) return;

    setIsScraping(true);

    // Simulate real-time lead crawler initialization
    setTimeout(() => {
      const newJob: ScrapeJob = {
        id: `job-${Date.now()}`,
        source: newSource,
        query: newQuery,
        leads: 0,
        status: "Crawling",
        progress: 12,
        date: new Date().toISOString().split("T")[0],
      };
      
      setJobs((prev) => [newJob, ...prev]);
      setNewQuery("");
      setIsScraping(false);
    }, 1200);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-dark)",
        color: "#fff",
      }}
    >
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: "280px",
          background: "var(--bg-darker)",
          borderRight: "1px solid var(--glass-border)",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2.5rem",
        }}
      >
        <Link href="/" className="logo">
          <span>
            <span className="logo-comp">COMP</span>
            <span className="logo-x">X</span>
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveSidebarTab("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              width: "100%",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: activeSidebarTab === "dashboard" ? "rgba(139,92,246,0.1)" : "transparent",
              border: "none",
              color: activeSidebarTab === "dashboard" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            📊 Dashboard Overview
          </button>
          <button
            onClick={() => setActiveSidebarTab("scraper")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              width: "100%",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: activeSidebarTab === "scraper" ? "rgba(139,92,246,0.1)" : "transparent",
              border: "none",
              color: activeSidebarTab === "scraper" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            📍 Google Maps Scraper
          </button>
          <button
            onClick={() => setActiveSidebarTab("enrichment")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              width: "100%",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: activeSidebarTab === "enrichment" ? "rgba(139,92,246,0.1)" : "transparent",
              border: "none",
              color: activeSidebarTab === "enrichment" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            🔄 Email Enrichment
          </button>
          <button
            onClick={() => setActiveSidebarTab("settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              width: "100%",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: activeSidebarTab === "settings" ? "rgba(139,92,246,0.1)" : "transparent",
              border: "none",
              color: activeSidebarTab === "settings" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            ⚙️ Scraper Settings
          </button>
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Logged In As</span>
            <strong style={{ color: "#fff", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", display: "block" }}>
              {user.email || "anonymous@compx.ai"}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span>Credits Used:</span>
            <strong>265 / 25,000</strong>
          </div>
          <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
            <div style={{ width: "2%", height: "100%", background: "var(--primary)", borderRadius: "3px" }}></div>
          </div>
          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="status-dot pulse" style={{ width: "8px", height: "8px" }}></span>
            <span>Plan: Leads Pro (Pro)</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "3rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        
        {/* Header bar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.3rem" }}>
              Welcome back, <span className="logo-comp" style={{ fontWeight: "850", color: "var(--primary)" }}>{user.email?.split("@")[0] || "User"}</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Extract, enrich, and automate your sales outbound flows.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              onClick={() => setCrmSynced(!crmSynced)}
              className="btn btn-secondary"
              style={{ padding: "0.6rem 1.4rem", borderRadius: "10px", fontSize: "0.85rem" }}
            >
              {crmSynced ? "🟢 CRM Synced (Live)" : "🔗 Sync to HubSpot/Sheets"}
            </button>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.4rem", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
            <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Total Extracted Leads</span>
            <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginTop: "0.3rem", color: "#fff" }}>265</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: "0.3rem" }}>🚀 +125 from today's job</p>
          </div>
          <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
            <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Verified Emails Found</span>
            <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginTop: "0.3rem", color: "#fff" }}>168</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--primary)", marginTop: "0.3rem" }}>⭐ 63% validation match rate</p>
          </div>
          <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
            <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Active Campaigns</span>
            <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginTop: "0.3rem", color: "#fff" }}>2</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>📍 Maps and LinkedIn crawlers</p>
          </div>
          <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
            <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Scraper Status</span>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "800", marginTop: "0.3rem", color: "var(--accent-blue)" }}>Active</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>⚡ CompX Extractor Chrome extension live</p>
          </div>
        </section>

        {/* Content columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
          
          {/* Active Scraping Jobs */}
          <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2rem" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1.2rem" }}>Active Extraction Log</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    padding: "1rem 1.2rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.95rem" }}>{job.query}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{job.source}</span>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        background:
                          job.status === "Completed"
                            ? "rgba(16,185,129,0.1)"
                            : job.status === "Crawling"
                            ? "rgba(139,92,246,0.1)"
                            : "rgba(6,182,212,0.1)",
                        color:
                          job.status === "Completed"
                            ? "#10b981"
                            : job.status === "Crawling"
                            ? "var(--primary)"
                            : "var(--accent-blue)",
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <span>{job.leads} Leads found</span>
                    <span>Progress: {job.progress}%</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                    <div
                      style={{
                        width: `${job.progress}%`,
                        height: "100%",
                        background: job.status === "Completed" ? "#10b981" : "var(--primary)",
                        borderRadius: "2px",
                        transition: "width 0.4s ease",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Scraper Task Controller */}
          <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2rem", alignSelf: "start" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1.2rem" }}>Launch AI Lead Scraper</h3>
            
            <form onSubmit={handleStartScrape} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)" }}>
                  Target Platform / Scraper Source
                </label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.9rem",
                    borderRadius: "10px",
                    background: "var(--bg-darker)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    outline: "none",
                  }}
                >
                  <option value="Google Maps Scraper">📍 Google Maps Leads</option>
                  <option value="LinkedIn Extractor">💼 LinkedIn Business Scraper</option>
                  <option value="Bulk Website Scraper">🌐 Bulk Domain Scraper</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)" }}>
                  Query Keyword & Location
                </label>
                <input
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="e.g., Real estate agents in New York"
                  required
                  style={{
                    width: "100%",
                    padding: "0.9rem 1.2rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary pulse-btn"
                disabled={isScraping}
                style={{ width: "100%", padding: "0.9rem", borderRadius: "50px", marginTop: "0.5rem" }}
              >
                {isScraping ? "Launching Scraper Node..." : "🚀 Launch Lead Crawler"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
