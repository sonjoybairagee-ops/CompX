"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { handleSpotlightMouseMove } from "@/utils/spotlight";
import {
  fetchUserLeads,
  saveUserLeads,
  deleteUserLead,
  clearAllUserLeads,
  updateLeadsSyncStatusInDb,
  updateLeadOutreachFieldsInDb,
  Lead
} from "@/utils/leads";


interface ScrapeJob {
  id: string;
  source: string;
  query: string;
  leads: number;
  status: "Completed" | "Crawling" | "Enriching" | "Idle";
  progress: number;
  date: string;
}


interface EnrichedEmail {
  domain: string;
  name: string;
  role: string;
  email: string;
  status: "Deliverable" | "Catch-All" | "Risky";
  deliverability: number;
}

const initialJobs: ScrapeJob[] = [
  {
    id: "job-1",
    source: "Google Maps Scraper",
    query: "Dentists near London",
    leads: 12,
    status: "Completed",
    progress: 100,
    date: "2026-05-20",
  },
  {
    id: "job-2",
    source: "LinkedIn Extractor",
    query: "SaaS CEOs in San Francisco",
    leads: 8,
    status: "Completed",
    progress: 100,
    date: "2026-05-20",
  },
  {
    id: "job-3",
    source: "Email Enrichment",
    query: "UK Tech Companies Bulk Scan",
    leads: 15,
    status: "Completed",
    progress: 100,
    date: "2026-05-19",
  },
];
// Leads are dynamically loaded and seeded from leads service utility

const mockEnrichedContacts: EnrichedEmail[] = [
  { domain: "dentalcare.com", name: "Dr. Sarah Jenkins", role: "Clinical Director", email: "sarah.j@dentalcare.com", status: "Deliverable", deliverability: 98 },
  { domain: "dentalcare.com", name: "Robert Miller", role: "Operations Lead", email: "operations@dentalcare.com", status: "Catch-All", deliverability: 82 },
  { domain: "apexplumbing.co.uk", name: "David Apex", role: "Managing Director", email: "d.apex@apexplumbing.co.uk", status: "Deliverable", deliverability: 95 },
  { domain: "apexplumbing.co.uk", name: "Lisa Thompson", role: "Head of Marketing", email: "lisa@apexplumbing.co.uk", status: "Risky", deliverability: 47 },
  { domain: "techcorp.com", name: "Michael Chang", role: "Chief Technology Officer", email: "mchang@techcorp.com", status: "Deliverable", deliverability: 99 },
];

export default function DashboardPage() {
  const { user, loading, logout, updateUserLeads, upgradeToPro } = useAuth();
  const router = useRouter();

  // SaaS Limit Modal States
  const [limitExceededModalOpen, setLimitExceededModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgradePlan = () => {
    if (!user) return;

    // 1. Mock Authentication / Persistent Demo Fallback
    if (user.isMock) {
      setIsUpgrading(true);
      // Simulate network checkout latency
      setTimeout(async () => {
        await upgradeToPro();
        setIsUpgrading(false);
        setLimitExceededModalOpen(false);
      }, 1200);
      return;
    }

    // 2. Real Production/Sandbox Lemon Squeezy Integration
    setIsUpgrading(true);
    const baseUrl = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL || "https://compx.lemonsqueezy.com/checkout/buy/checkout-id-placeholder";
    const checkoutUrl = `${baseUrl}?checkout[custom][user_id]=${user.uid}&checkout[email]=${encodeURIComponent(user.email || "")}`;

    console.log("[CompX Billing] Dispatching Lemon Squeezy Checkout URL:", checkoutUrl);

    if ((window as any).LemonSqueezy) {
      try {
        (window as any).LemonSqueezy.Url.Open(checkoutUrl);
        setIsUpgrading(false);
      } catch (e) {
        console.warn("[CompX Billing] Lemon Squeezy overlay initiation failed, falling back to standard tab redirect.", e);
        window.open(checkoutUrl, "_blank");
        setIsUpgrading(false);
      }
    } else {
      console.warn("[CompX Billing] Lemon Squeezy SDK script not initialized. Redirecting in new window.");
      window.open(checkoutUrl, "_blank");
      setIsUpgrading(false);
    }
  };


  // Primary State
  const [jobs, setJobs] = useState<ScrapeJob[]>(initialJobs);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState("dashboard");
  const [crmSynced, setCrmSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Scraper Multi-Source Filters & Modals
  const [sourceFilter, setSourceFilter] = useState("All");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [webCrawlerLogs, setWebCrawlerLogs] = useState<{ text: string; level: string; timestamp: string }[]>([]);

  // Broadcast Firebase Auth Token to the Extension via postMessage
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      user.getIdToken?.(true).then((token: string)=> {
        window.postMessage({ type: "COMPX_AUTH_TOKEN", token }, "*");
        console.log("[SaaS Dashboard] Broadcasted Auth Token to Extension");
      }).catch((err: any) => console.error("Failed to get ID Token:", err));
    }
  }, [user]);

  // Load Leads dynamically from the persistent database on mount/user change
  useEffect(() => {
    let active = true;
    if (user && user.uid) {
      setLeadsLoading(true);
      fetchUserLeads(user.uid)
        .then((fetchedLeads) => {
          if (active) {
            setLeads(fetchedLeads);
            setLeadsLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load user leads from DB:", err);
          if (active) {
            setLeadsLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [user]);

  // Stats Counters
  const [verifiedEmailsCount, setVerifiedEmailsCount] = useState(6);

  // Keep verified email count synced
  useEffect(() => {
    if (user) {
      setVerifiedEmailsCount(Math.max(6, Math.floor(user.leadsUsed * 0.63)));
    }
  }, [user]);

  // Scraper Panel State
  const [newQuery, setNewQuery] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newSource, setNewSource] = useState("Google Maps Scraper");
  
  // Crawler Live Simulation
  const [crawlerActive, setCrawlerActive] = useState(false);
  const [crawlerProgress, setCrawlerProgress] = useState(0);
  const [crawlerStage, setCrawlerStage] = useState("");
  const [crawlerLogs, setCrawlerLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Leads Database Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortField, setSortField] = useState<keyof Lead>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Email Enrichment Panel State
  const [domainsInput, setDomainsInput] = useState("dentalcare.com\napexplumbing.co.uk\ntechcorp.com");
  const [enrichmentActive, setEnrichmentActive] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [enrichedResults, setEnrichedResults] = useState<EnrichedEmail[]>([]);

  // Settings Panel State
  const [scraperSpeed, setScraperSpeed] = useState("standard");
  const [deepEmailSearch, setDeepEmailSearch] = useState(true);
  const [verifyPhones, setVerifyPhones] = useState(true);
  const [detectLinkedIn, setDetectLinkedIn] = useState(true);
  const [hubspotApiKey, setHubspotApiKey] = useState("••••••••••••••••••••••••••••");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // ==================== COLD OUTREACH STATES & EFFECTS ====================
  const [resendApiKey, setResendApiKey] = useState("");
  const [outreachFromEmail, setOutreachFromEmail] = useState("");
  const [selectedOutreachLeadId, setSelectedOutreachLeadId] = useState("");
  const [outreachSequenceDay, setOutreachSequenceDay] = useState<0 | 3 | 7>(0);
  const [outreachNiche, setOutreachNiche] = useState<"agency" | "ecommerce" | "coach" | "designer" | "general">("general");
  const [customOutreachSubject, setCustomOutreachSubject] = useState("");
  const [customOutreachBody, setCustomOutreachBody] = useState("");
  const [outreachSending, setOutreachSending] = useState(false);
  const [outreachStatusMessage, setOutreachStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [outreachSettingsSavedMessage, setOutreachSettingsSavedMessage] = useState(false);

  // Manual telemetry switches
  const [simOpened, setSimOpened] = useState(false);
  const [simClicked, setSimClicked] = useState(false);
  const [simBounced, setSimBounced] = useState(false);

  // Load Saved Resend Credentials on Mount
  useEffect(() => {
    if (typeof window !== "undefined" && user?.uid) {
      const savedResendKey = localStorage.getItem(`compx_resend_api_key_${user.uid}`);
      const savedFromEmail = localStorage.getItem(`compx_outreach_from_email_${user.uid}`);
      if (savedResendKey) setResendApiKey(savedResendKey);
      if (savedFromEmail) setOutreachFromEmail(savedFromEmail);
    }
  }, [user]);

  // Find currently selected outreach lead object
  const selectedOutreachLead = leads.find((l) => l.id === selectedOutreachLeadId) || null;

  // Auto-fill form fields, scores, and switches when outreach lead selection changes
  useEffect(() => {
    if (selectedOutreachLead) {
      // Intelligently guess business niche from category string
      const cat = (selectedOutreachLead.category || "").toLowerCase();
      if (cat.includes("design") || cat.includes("creative") || cat.includes("pixel")) {
        setOutreachNiche("designer");
      } else if (cat.includes("software") || cat.includes("saas") || cat.includes("tech") || cat.includes("intelligence")) {
        setOutreachNiche("agency");
      } else if (cat.includes("fashion") || cat.includes("apparel") || cat.includes("retail") || cat.includes("brand")) {
        setOutreachNiche("ecommerce");
      } else if (cat.includes("coach") || cat.includes("consultant") || cat.includes("advisor")) {
        setOutreachNiche("coach");
      } else {
        setOutreachNiche("general");
      }

      // Sync active telemetry switches with database record values
      setSimOpened(selectedOutreachLead.opened || false);
      setSimClicked(selectedOutreachLead.clicked || false);
      setSimBounced(selectedOutreachLead.bounced || false);
    }
  }, [selectedOutreachLeadId, leads]);

  // Automatically update lead telemetry status when manual toggle switches change
  const handleTelemetryToggle = async (type: "opened" | "clicked" | "bounced", value: boolean) => {
    if (!user?.uid || !selectedOutreachLeadId) return;

    if (type === "opened") setSimOpened(value);
    if (type === "clicked") setSimClicked(value);
    if (type === "bounced") setSimBounced(value);

    // Prepare fields to write
    const updates: any = { [type]: value };
    
    // Automatically adjust priority score reactively
    let score = selectedOutreachLead?.score || 50;
    if (type === "opened") score += value ? 15 : -15;
    if (type === "clicked") score += value ? 25 : -25;
    if (type === "bounced") score = value ? 5 : score;
    updates.score = Math.max(5, Math.min(score, 100));

    try {
      await updateLeadOutreachFieldsInDb(user.uid, selectedOutreachLeadId, updates);
      // Locally update page state
      setLeads((prev) =>
        prev.map((l) => (l.id === selectedOutreachLeadId ? { ...l, ...updates } : l))
      );
    } catch (e) {
      console.error("Failed to sync toggle updates to DB:", e);
    }
  };

  // Generate Cold Sequence Subject and Body content dynamically
  useEffect(() => {
    if (!selectedOutreachLead) {
      setCustomOutreachSubject("");
      setCustomOutreachBody("");
      return;
    }

    const companyName = selectedOutreachLead.name || "your business";
    // Deduce contact name: if it looks like Google Maps/Website, use a placeholder or generic greeting
    const contactGreeting = selectedOutreachLead.source === "LinkedIn" 
      ? selectedOutreachLead.name.split(" ")[0] 
      : "Growth Lead";

    let subject = "";
    let body = "";

    if (outreachSequenceDay === 0) {
      // Day 0: Intro pitch
      if (outreachNiche === "agency") {
        subject = `Scaling engineering/pipeline output for ${companyName}?`;
        body = `Hi ${contactGreeting},\n\nI was looking at ${companyName} on LinkedIn and noticed your team is expanding. We work with high-growth tech brands to double their qualified sales pipelines via custom automated scrapers and cloud lead list pipelines.\n\nAre you free for a brief, 10-minute introductory sync next Tuesday at 3 PM?\n\nBest regards,\nSales Outreach Team\nCompX AI Systems`;
      } else if (outreachNiche === "ecommerce") {
        subject = `Increasing checkout speed & metrics for ${companyName}`;
        body = `Hi ${contactGreeting},\n\nI absolutely love the catalog over at ${companyName}! I noticed a couple of minor speed latency spikes on your storefront's product selection pages. We help premium e-commerce labels optimize load speeds to boost checkout conversions by up to 28%.\n\nWould you mind if I sent over a custom 2-minute video walkthrough showcasing how we would optimize this for ${companyName}?\n\nWarm regards,\nE-commerce Specialist\nCompX Outbound`;
      } else if (outreachNiche === "coach") {
        subject = `Consistently booking strategy slots for ${companyName}`;
        body = `Hi ${contactGreeting},\n\nI came across your profile and wanted to congratulate you on your impressive growth at ${companyName}. Many top-tier consultants and business coaches lose hours manually chasing prospects.\n\nWe built an automated customer acquisition matrix that books 10-15 hyper-qualified strategy calls every single month on absolute autopilot.\n\nAre you open to checking out a quick 10-minute demo this Thursday?\n\nBest,\nAcquisition Partner`;
      } else if (outreachNiche === "designer") {
        subject = `Custom glassmorphic landing page preview for ${companyName}`;
        body = `Hi ${contactGreeting},\n\nYour brand ${companyName} offers amazing value, but your digital landing page might be missing modern styling accents to capture today's high-ticket traffic.\n\nWe design premium, ultra-responsive glassmorphic interfaces that turn visitors into high-paying clients.\n\nWe actually drew up a custom Figma interface mockup tailored for ${companyName}. Would you be interested in taking a look?\n\nWarmly,\nDesign Lead\nCompX Studio`;
      } else {
        // General outreach
        subject = `Brief question regarding ${companyName}`;
        body = `Hi ${contactGreeting},\n\nI hope this message finds you well. I was reviewing ${companyName} online and wanted to reach out regarding your current B2B prospect flow.\n\nWe help growing enterprises automate their target data scraping and sync workflows, reducing manual marketing overhead by up to 90%.\n\nDo you have 5 minutes for a quick introductory chat this coming Wednesday?\n\nWarmly,\nLead Gen Specialist\nCompX Global`;
      }
    } else if (outreachSequenceDay === 3) {
      // Day 3: Follow-up bump
      subject = `Re: Brief question regarding ${companyName}`;
      body = `Hi ${contactGreeting},\n\nI know you're super busy managing operations at ${companyName}, so I wanted to float this to the top of your inbox in case it got buried.\n\nDid you have a moment to read my previous note? We'd love to share a free prospecting audit showcasing 50 verified email leads matching your exact target profile.\n\nLet me know if we can sync for 5 minutes this week!\n\nBest,\nOutbound Campaign Manager`;
    } else {
      // Day 7: Final breakup email
      subject = `Closing file: ${companyName}`;
      body = `Hi ${contactGreeting},\n\nSince I haven't heard back, I'm going to assume that optimizing the lead pipelines at ${companyName} isn't a high priority right now. Completely understandable!\n\nI will close your file on our end. If you ever want to re-explore high-converting data scrapers or sync pipelines in the future, feel free to reach back out.\n\nThis is my final note. Wish you and the team all the best!\n\nWarmly,\nOutbound Specialist\nCompX AI`;
    }

    setCustomOutreachSubject(subject);
    setCustomOutreachBody(body);
  }, [selectedOutreachLeadId, outreachSequenceDay, outreachNiche, leads]);

  // Outreach Analytics Metrics
  const totalSent = leads.filter((l) => l.outreachStatus && ["Outreached", "Replied", "Closed Client"].includes(l.outreachStatus)).length;
  const totalOpened = leads.filter((l) => l.opened).length;
  const totalClicked = leads.filter((l) => l.clicked).length;
  const totalReplied = leads.filter((l) => l.outreachStatus && ["Replied", "Closed Client"].includes(l.outreachStatus)).length;
  const totalBounced = leads.filter((l) => l.bounced).length;

  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const ctrRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;
  const responseRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

  // Handle saving Resend configuration in outreach settings card
  const handleSaveOutreachSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && user?.uid) {
      localStorage.setItem(`compx_resend_api_key_${user.uid}`, resendApiKey);
      localStorage.setItem(`compx_outreach_from_email_${user.uid}`, outreachFromEmail);
      setOutreachSettingsSavedMessage(true);
      setTimeout(() => setOutreachSettingsSavedMessage(false), 3000);
    }
  };

  // Dispatch email campaign via proxy API route or mock success
  const handleSendCampaignEmail = async () => {
    if (!selectedOutreachLeadId || !selectedOutreachLead) return;

    setOutreachSending(true);
    setOutreachStatusMessage({ text: "Sending campaign email...", type: "info" });

    try {
      const response = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: resendApiKey,
          from: outreachFromEmail,
          to: selectedOutreachLead.email || "recipient@example.com",
          subject: customOutreachSubject,
          text: customOutreachBody,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Dynamic CRM Status update: set lead status to "Outreached" persistently
        const updates: Partial<Lead> = {
          outreachStatus: "Outreached",
          score: Math.max(50, selectedOutreachLead.score || 50),
        };
        
        // If simulation, random chance of autofilling opened/clicked switches to look amazing
        if (data.simulated) {
          updates.opened = true;
          updates.score = 65;
        }

        await updateLeadOutreachFieldsInDb(user?.uid ?? "", selectedOutreachLeadId, updates);

        // Log to email history
        const historyEntry: import("@/utils/leads").EmailHistoryEntry = {
          sentAt: new Date().toISOString(),
          subject: customOutreachSubject,
          status: data.simulated ? "opened" : "sent",
          day: outreachSequenceDay,
          method: data.simulated ? "simulated" : "resend",
        };
        const existingHistory = selectedOutreachLead.emailHistory || [];
        const historyUpdate: Partial<Lead> = {
          sentAt: historyEntry.sentAt,
          emailHistory: [...existingHistory, historyEntry],
        };
        await updateLeadOutreachFieldsInDb(user?.uid ?? "", selectedOutreachLeadId, historyUpdate);
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedOutreachLeadId ? { ...l, ...updates, ...historyUpdate } : l))
        );
        
        // Update local toggle state
        if (updates.opened) setSimOpened(true);

        setOutreachStatusMessage({
          text: data.simulated 
            ? "🚀 Campaign Simulation Sent! Recipient status marked as Outreached." 
            : "✉️ Email successfully dispatched via Resend! Marked as Outreached.",
          type: "success",
        });
      } else {
        setOutreachStatusMessage({
          text: `❌ Dispatch failed: ${data.message || "Unknown error"}`,
          type: "error",
        });
      }
    } catch (err: any) {
      setOutreachStatusMessage({
        text: `❌ Dispatch failed: ${err.message || "Network error"}`,
        type: "error",
      });
    } finally {
      setOutreachSending(false);
      setTimeout(() => setOutreachStatusMessage(null), 5000);
    }
  };

  // Direct Gmail fallback trigger using mailto URL schemes
  const handleGmailFallbackTrigger = () => {
    if (!selectedOutreachLead) return;

    const email = selectedOutreachLead.email || "";
    const subject = encodeURIComponent(customOutreachSubject);
    const body = encodeURIComponent(customOutreachBody);
    
    // Construct mailto link
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, "_blank");

    // Mark as outreached persistently
    const updates: Partial<Lead> = { outreachStatus: "Outreached" };
    updateLeadOutreachFieldsInDb(user?.uid ?? "", selectedOutreachLeadId, updates)
      .then(async () => {
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedOutreachLeadId ? { ...l, ...updates } : l))
        );
        // Log to email history
        const historyEntry: import("@/utils/leads").EmailHistoryEntry = {
          sentAt: new Date().toISOString(),
          subject: customOutreachSubject,
          status: "sent",
          day: outreachSequenceDay,
          method: "gmail",
        };
        const existingHistory = selectedOutreachLead?.emailHistory || [];
        const historyUpdate: Partial<Lead> = {
          sentAt: historyEntry.sentAt,
          emailHistory: [...existingHistory, historyEntry],
        };
        await updateLeadOutreachFieldsInDb(user?.uid ?? "", selectedOutreachLeadId, historyUpdate);
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedOutreachLeadId ? { ...l, ...historyUpdate } : l))
        );
      });

    setOutreachStatusMessage({
      text: "📬 Opened draft in default mail client. Lead marked as Outreached.",
      type: "success",
    });
    setTimeout(() => setOutreachStatusMessage(null), 4000);
  };

  // Update CRM Pipeline step on visual timeline nodes click
  const handleUpdateCrmPipelineStep = async (newStatus: "Scraped" | "Outreached" | "Replied" | "Closed Client") => {
    if (!user?.uid || !selectedOutreachLeadId || !selectedOutreachLead) return;

    const updates: Partial<Lead> = { outreachStatus: newStatus };
    
    // Add realistic automatic score updates based on CRM steps
    let score = selectedOutreachLead.score || 50;
    if (newStatus === "Scraped") score = 40;
    if (newStatus === "Outreached") score = 55;
    if (newStatus === "Replied") {
      score = 80;
      updates.opened = true;
      setSimOpened(true);
    }
    if (newStatus === "Closed Client") {
      score = 100;
      updates.opened = true;
      updates.clicked = true;
      setSimOpened(true);
      setSimClicked(true);
    }
    updates.score = score;

    try {
      await updateLeadOutreachFieldsInDb(user.uid, selectedOutreachLeadId, updates);
      
      // Update local page state
      setLeads((prev) =>
        prev.map((l) => (l.id === selectedOutreachLeadId ? { ...l, ...updates } : l))
      );

      setOutreachStatusMessage({
        text: `💼 CRM Pipeline updated. Lead status set to: ${newStatus}`,
        type: "success",
      });
      setTimeout(() => setOutreachStatusMessage(null), 3000);
    } catch (e) {
      console.error("CRM node update failure:", e);
    }
  };

  // Jump to Outreach tab and pre-select a lead from the lead table
  const handleOutreachFromLead = (leadId: string) => {
    setSelectedOutreachLeadId(leadId);
    setActiveSidebarTab("outreach");
    // Scroll to top so outreach tab is fully visible
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getSourceBadge = (source?: string) => {
    const src = source || "Google Maps";
    let icon = "📍";
    let color = "#3b82f6";
    let bg = "rgba(59, 130, 246, 0.08)";
    let border = "rgba(59, 130, 246, 0.15)";
    
    if (src === "Website") {
      icon = "🌐";
      color = "#06b6d4";
      bg = "rgba(6, 182, 212, 0.08)";
      border = "rgba(6, 182, 212, 0.15)";
    } else if (src === "LinkedIn") {
      icon = "💼";
      color = "#8b5cf6";
      bg = "rgba(139, 92, 246, 0.08)";
      border = "rgba(139, 92, 246, 0.15)";
    } else if (src === "Instagram") {
      icon = "📸";
      color = "#ec4899";
      bg = "rgba(236, 72, 153, 0.08)";
      border = "rgba(236, 72, 153, 0.15)";
    }
    
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          color: color,
          background: bg,
          border: `1px solid ${border}`,
          padding: "3px 8px",
          borderRadius: "12px",
          fontSize: "0.78rem",
          fontWeight: "600",
          textTransform: "capitalize",
          whiteSpace: "nowrap",
        }}
      >
        {icon} {src}
      </span>
    );
  };


  // Auto-load or Auto-generate Developer API token & Sync with mock API backend
  useEffect(() => {
    if (typeof window !== "undefined" && user?.uid) {
      const savedToken = localStorage.getItem(`compx_developer_token_${user.uid}`);
      if (savedToken) {
        setGeneratedApiKey(savedToken);
        // Register token with the Next.js API server to ensure sync
        fetch("/api/extension/register-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, email: user.email, token: savedToken })
        }).catch(err => console.error("[Token Autoregister] Sync failed:", err));
      } else {
        // Auto-generate key on first land
        const autoKey = `compx_live_sk_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`compx_developer_token_${user.uid}`, autoKey);
        setGeneratedApiKey(autoKey);
        // Register token
        fetch("/api/extension/register-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, email: user.email, token: autoKey })
        }).catch(err => console.error("[Token Autoregister] Initialization failed:", err));
      }
    }
  }, [user]);

  // Real-time log streams polling from Next.js server logs cache when Extension Hub is open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSidebarTab === "extension-hub" && user?.uid) {
      const pollLogs = async () => {
        try {
          const res = await fetch(`/api/extension/logs?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "success" && data.logs) {
              setWebCrawlerLogs(data.logs);
            }
          }
        } catch (e) {
          console.error("[Live Logs Poll] Error:", e);
        }
      };
      // Fetch immediately
      pollLogs();
      // Poll every 2.5 seconds
      timer = setInterval(pollLogs, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSidebarTab, user]);

  // Route Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Keep logs scrolled down
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [crawlerLogs]);

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

  // Trigger CRM Sync
  const handleCrmSync = () => {
    setIsSyncing(true);
    setTimeout(async () => {
      try {
        const pendingLeadIds = leads.filter(l => l.status === "Pending").map(l => l.id);
        if (pendingLeadIds.length > 0 && user && user.uid) {
          await updateLeadsSyncStatusInDb(user.uid, pendingLeadIds, "Synced");
        }
        setIsSyncing(false);
        setCrmSynced(true);
        
        // Update leads status
        setLeads(prev => prev.map(lead => ({ ...lead, status: "Synced" })));
      } catch (err) {
        console.error("CRM Sync failed in database:", err);
        setIsSyncing(false);
      }
    }, 1500);
  };

  // Delete a specific lead from database persistently
  const handleDeleteLead = async (leadId: string) => {
    if (!user || !user.uid) return;
    try {
      await deleteUserLead(user.uid, leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.error("Failed to delete lead from database:", err);
    }
  };

  // Clear all leads from database persistently
  const handleClearAllLeads = async () => {
    if (!user || !user.uid) return;
    if (
      window.confirm(
        "🗑️ Are you sure you want to delete all leads in your database? This action is permanent and cannot be undone."
      )
    ) {
      try {
        await clearAllUserLeads(user.uid);
        setLeads([]);
      } catch (err) {
        console.error("Failed to clear leads database:", err);
      }
    }
  };

  // Launch Simulated Google Maps / LinkedIn Scraper
  const handleLaunchCrawler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery || !newLocation) return;

    // SaaS Quota Limit Check
    if (user.leadsUsed >= user.leadLimit) {
      setLimitExceededModalOpen(true);
      return;
    }

    setCrawlerActive(true);
    setCrawlerProgress(0);
    setCrawlerLogs([]);
    setCrawlerStage("Initializing node crawler cluster...");

    const queryStr = `${newQuery} in ${newLocation}`;

    // Create a new running scraper job
    const jobId = `job-${Date.now()}`;
    const newJob: ScrapeJob = {
      id: jobId,
      source: newSource,
      query: queryStr,
      leads: 0,
      status: "Crawling",
      progress: 0,
      date: new Date().toISOString().split("T")[0],
    };

    setJobs((prev) => [newJob, ...prev]);

    // Progression simulation steps
    const simulationSteps = [
      {
        progress: 10,
        stage: "Connecting proxy nodes...",
        log: "[INFO] Booting browser worker nodes in region [US-East-1]...",
      },
      {
        progress: 20,
        stage: "Resolving geographic coordinates...",
        log: `[INFO] Accessing local indexes for "${newQuery}" in "${newLocation}"...`,
      },
      {
        progress: 35,
        stage: "Scraping directory metadata...",
        log: `[SUCCESS] Query resolved. Found 48 candidate listings matching keyword.`,
      },
      {
        progress: 45,
        stage: "Extracting business listings...",
        log: `[INFO] Scraping details for listing 1/12: "Elite Outlets"...`,
      },
      {
        progress: 55,
        stage: "Injecting site enrichment crawlers...",
        log: "[INFO] Validating domains for contact web pages...",
      },
      {
        progress: 68,
        stage: "Parsing email MX servers...",
        log: "[SUCCESS] Found email: direct@eliteoutlets.com (Status: Deliverable)",
      },
      {
        progress: 78,
        stage: "Scraping details 6/12...",
        log: "[INFO] Scraping phone: +1 415-555-0988 for Alpha Fitness Group...",
      },
      {
        progress: 90,
        stage: "Finalizing contact checks...",
        log: "[SUCCESS] Crawled 12 complete business profiles. Syncing metadata...",
      },
      {
        progress: 100,
        stage: "Finished Scrape Task",
        log: "[SUCCESS] Crawler execution finished successfully! 5 leads fully enriched.",
      },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < simulationSteps.length) {
        const step = simulationSteps[currentStep];
        setCrawlerProgress(step.progress);
        setCrawlerStage(step.stage);
        setCrawlerLogs((prev) => [...prev, step.log]);

        // Update current running job progress
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, progress: step.progress, leads: Math.min(Math.floor(step.progress / 8), 12) } : j))
        );

        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          // Complete job
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: "Completed", progress: 100, leads: 12 } : j
            )
          );

          // Add realistic crawled leads into active lead listing
          const newCrawledLeads: Lead[] = [
            {
              id: `lead-new-1-${Date.now()}`,
              name: `Aura ${newQuery}`,
              category: newQuery,
              phone: "+1 415-555-0911",
              email: `hello@aura${newQuery.toLowerCase().replace(/\s+/g, "")}.com`,
              address: `402 Broadway St, ${newLocation}`,
              website: `https://www.aura${newQuery.toLowerCase().replace(/\s+/g, "")}.com`,
              rating: 4.8,
              reviews: 231,
              status: "Pending",
              date: new Date().toISOString().split("T")[0],
            },
            {
              id: `lead-new-2-${Date.now()}`,
              name: `Premier ${newQuery} Professionals`,
              category: newQuery,
              phone: "+1 415-555-0824",
              email: `info@premier${newQuery.toLowerCase().replace(/\s+/g, "")}.com`,
              address: `88 Sutter St, ${newLocation}`,
              website: `https://www.premier${newQuery.toLowerCase().replace(/\s+/g, "")}.com`,
              rating: 4.4,
              reviews: 57,
              status: "Pending",
              date: new Date().toISOString().split("T")[0],
            },
            {
              id: `lead-new-3-${Date.now()}`,
              name: `${newLocation} ${newQuery} Collective`,
              category: newQuery,
              phone: "+1 415-555-0377",
              email: `contact@${newLocation.toLowerCase().replace(/\s+/g, "")}${newQuery.toLowerCase().replace(/\s+/g, "")}.com`,
              address: `100 Van Ness Ave, ${newLocation}`,
              website: `https://www.${newLocation.toLowerCase().replace(/\s+/g, "")}${newQuery.toLowerCase().replace(/\s+/g, "")}.com`,
              rating: 4.6,
              reviews: 19,
              status: "Pending",
              date: new Date().toISOString().split("T")[0],
            },
          ];

          saveUserLeads(user.uid, newCrawledLeads)
            .then(() => {
              setLeads((prev) => [...newCrawledLeads, ...prev]);
            })
            .catch((err) => {
              console.error("Error saving leads to database:", err);
              setLeads((prev) => [...newCrawledLeads, ...prev]);
            });

          updateUserLeads(user.leadsUsed + 45);
          
          setCrawlerActive(false);
          setNewQuery("");
          setNewLocation("");
        }, 1000);
      }
    }, 1200);
  };

  // Launch Simulated Domain Email Enrichment
  const handleLaunchEnrichment = () => {
    if (!domainsInput) return;

    // SaaS Quota Limit Check
    if (user.leadsUsed >= user.leadLimit) {
      setLimitExceededModalOpen(true);
      return;
    }

    setEnrichmentActive(true);
    setEnrichmentProgress(0);
    setEnrichedResults([]);

    const domains = domainsInput.split("\n").filter((d) => d.trim());
    let currentProgress = 0;

    const interval = setInterval(() => {
      if (currentProgress < 100) {
        currentProgress += 20;
        setEnrichmentProgress(currentProgress);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          // Render results
          const domainsLower = domains.map((d) => d.toLowerCase().trim());
          const matchedContacts = mockEnrichedContacts.filter((contact) =>
            domainsLower.includes(contact.domain.toLowerCase())
          );
          
          setEnrichedResults(matchedContacts);
          setEnrichmentActive(false);
          updateUserLeads(user.leadsUsed + matchedContacts.length * 3);
        }, 800);
      }
    }, 600);
  };

  // Handle saving configurations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedMessage(true);
    setTimeout(() => {
      setSettingsSavedMessage(false);
    }, 3000);
  };

  // Generate Personal Developer API Key
  const handleGenerateApiKey = () => {
    if (!user) return;
    const key = `compx_live_sk_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
    setGeneratedApiKey(key);
    localStorage.setItem(`compx_developer_token_${user.uid}`, key);
    
    // Register token with the Next.js API server
    fetch("/api/extension/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, email: user.email, token: key })
    }).catch(err => console.error("[Token Registry] Registration failed:", err));
  };

  // Clear live logs on Next.js server console
  const handleClearWebLogs = async () => {
    if (!user?.uid) return;
    try {
      await fetch(`/api/extension/logs?userId=${user.uid}`, { method: "DELETE" });
      setWebCrawlerLogs([]);
    } catch (e) {
      console.error("[Logs API] Failed clearing logs:", e);
    }
  };

  // Lead export as CSV file helper
  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Name,Category,Phone,Email,Address,Website,Rating,Reviews"].join(",") +
      "\n" +
      leads.map((l) => `"${l.name}","${l.category}","${l.phone}","${l.email}","${l.address}","${l.website}",${l.rating},${l.reviews}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `compx_leads_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort & Filter Leads Database
  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const categories = ["All", ...Array.from(new Set(leads.map((l) => l.category)))];

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "All" || lead.category === categoryFilter;
      const matchesSource = sourceFilter === "All" || lead.source === sourceFilter;
      return matchesSearch && matchesCategory && matchesSource;
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";
      let comparison = 0;
      if (valA > valB) comparison = 1;
      if (valA < valB) comparison = -1;
      return sortAsc ? comparison : -comparison;
    });

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
          position: "sticky",
          top: 0,
          height: "100vh",
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
              border: activeSidebarTab === "dashboard" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
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
              border: activeSidebarTab === "scraper" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
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
              border: activeSidebarTab === "enrichment" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
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
            onClick={() => setActiveSidebarTab("outreach")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              width: "100%",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: activeSidebarTab === "outreach" ? "rgba(139,92,246,0.1)" : "transparent",
              border: activeSidebarTab === "outreach" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
              color: activeSidebarTab === "outreach" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            ✉️ Cold Outreach
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
              border: activeSidebarTab === "settings" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
              color: activeSidebarTab === "settings" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            ⚙️ Scraper Settings
          </button>
          <button
            onClick={() => setActiveSidebarTab("extension-hub")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              width: "100%",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: activeSidebarTab === "extension-hub" ? "rgba(139,92,246,0.1)" : "transparent",
              border: activeSidebarTab === "extension-hub" ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
              color: activeSidebarTab === "extension-hub" ? "var(--primary)" : "var(--text-muted)",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.3s ease",
            }}
          >
            🧩 Extension Hub
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
            <span>Leads Used:</span>
            <strong>{user.leadsUsed.toLocaleString()} / {user.leadLimit.toLocaleString()}</strong>
          </div>
          <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
            <div style={{ width: `${Math.min((user.leadsUsed / user.leadLimit) * 100, 100)}%`, height: "100%", background: "var(--primary)", borderRadius: "3px", transition: "width 0.4s ease" }}></div>
          </div>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="status-dot pulse" style={{ width: "8px", height: "8px", backgroundColor: user.plan === "pro" ? "var(--primary)" : "#10b981" }}></span>
              <span>Plan: {user.plan.toUpperCase()} (Active)</span>
            </div>
            {user.plan === "free" && (
              <button
                onClick={() => setLimitExceededModalOpen(true)}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.55rem",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  textAlign: "center",
                  background: "var(--glow-gradient)",
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 0 15px rgba(139, 92, 246, 0.2)",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                ⚡ Upgrade to PRO
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "3rem", display: "flex", flexDirection: "column", gap: "2.5rem", overflowY: "auto" }}>
        
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
              onClick={handleCrmSync}
              className="btn btn-secondary"
              disabled={isSyncing}
              style={{ padding: "0.6rem 1.4rem", borderRadius: "10px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {isSyncing ? (
                <>
                  <span className="status-dot pulse" style={{ width: "8px", height: "8px", backgroundColor: "var(--primary)" }}></span>
                  Syncing to HubSpot...
                </>
              ) : crmSynced ? (
                "🟢 CRM Synced (Live)"
              ) : (
                "🔗 Sync to HubSpot/Sheets"
              )}
            </button>
            {/* Upgrade Plan button - Later this will open the Lemon Squeezy checkout */}
            {user.plan === "free" && (
              <button
                onClick={() => setLimitExceededModalOpen(true)}
                className="btn btn-primary pulse-btn"
                style={{
                  padding: "0.6rem 1.4rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background: "var(--glow-gradient)",
                  border: "none",
                  fontWeight: "700",
                  boxShadow: "0 0 15px rgba(139, 92, 246, 0.3)",
                }}
              >
                Upgrade Plan
              </button>
            )}
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

        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeSidebarTab === "dashboard" && (
          <>
            {/* Stats Grid */}
            <section className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
                <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Total Extracted Leads</span>
                <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginTop: "0.3rem", color: "#fff" }}>{user.leadsUsed}</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: "0.3rem" }}>🚀 Real-time lead index live</p>
              </div>
              <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
                <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Verified Emails Found</span>
                <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginTop: "0.3rem", color: "#fff" }}>{verifiedEmailsCount}</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--primary)", marginTop: "0.3rem" }}>⭐ 86% validation match rate</p>
              </div>
              <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
                <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Active Campaigns</span>
                <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginTop: "0.3rem", color: "#fff" }}>{jobs.filter(j => j.status === "Crawling").length || 1}</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>📍 Maps and LinkedIn crawlers</p>
              </div>
              <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "1.5rem 1.8rem", borderRadius: "16px" }}>
                <span style={{ fontSize: "0.82rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Scraper Status</span>
                <h2 style={{ fontSize: "2.2rem", fontWeight: "800", marginTop: "0.3rem", color: "var(--accent-blue)" }}>Active</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>⚡ CompX Extractor Chrome extension live</p>
              </div>
            </section>

            {/* Content columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.0fr", gap: "2rem" }}>
              
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

              {/* Outreach Activity stream */}
              <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2rem" }}>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "1.2rem" }}>Real-time Outreach Stream</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "310px", overflowY: "auto", paddingRight: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.88rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.8rem" }}>
                    <span style={{ color: "var(--primary)" }}>[16:48]</span>
                    <div>
                      <strong>Apex.ai (CEO John Doe)</strong>
                      <span style={{ color: "var(--text-muted)", display: "block" }}>Automated email campaign personalized and pushed to HubSpot queue.</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.88rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.8rem" }}>
                    <span style={{ color: "var(--primary)" }}>[15:12]</span>
                    <div>
                      <strong>London Dental Group</strong>
                      <span style={{ color: "var(--text-muted)", display: "block" }}>Deep scan completed. Found active email: info@londondental.co.uk.</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.88rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.8rem" }}>
                    <span style={{ color: "var(--primary)" }}>[14:05]</span>
                    <div>
                      <strong>Acme Software Ltd</strong>
                      <span style={{ color: "var(--text-muted)", display: "block" }}>HubSpot Sync Completed automatically. Status updated to: Synced.</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.88rem" }}>
                    <span style={{ color: "var(--primary)" }}>[11:30]</span>
                    <div>
                      <strong>City Dental Clinic</strong>
                      <span style={{ color: "var(--text-muted)", display: "block" }}>Google Maps Scraper node extraction success. Added to CRM table.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* ==================== TAB 2: GOOGLE MAPS SCRAPER ==================== */}
        {activeSidebarTab === "scraper" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            
            {/* Input form controller & Live terminal progress side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem" }}>
              
              {/* Form Input */}
              <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2.2rem" }}>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Configure Lead Crawler</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.8rem" }}>Deploy virtual proxy browser nodes to scrape and verify business contacts in real time.</p>
                
                <form onSubmit={handleLaunchCrawler} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)" }}>
                      Target Platform / Scraper Source
                    </label>
                    <select
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      disabled={crawlerActive}
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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)" }}>
                        Query Keyword
                      </label>
                      <input
                        type="text"
                        value={newQuery}
                        onChange={(e) => setNewQuery(e.target.value)}
                        placeholder="e.g., Gyms, Plumbers"
                        required
                        disabled={crawlerActive}
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

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)" }}>
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g., Los Angeles, London"
                        required
                        disabled={crawlerActive}
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
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary pulse-btn"
                    disabled={crawlerActive || !newQuery || !newLocation}
                    style={{ width: "100%", padding: "1rem", borderRadius: "50px", marginTop: "1rem", fontWeight: "700" }}
                  >
                    {crawlerActive ? "Deploying Scraper Node Cluster..." : "🚀 Launch Lead Crawler"}
                  </button>
                </form>
              </div>

              {/* Progress Terminal */}
              <div
                className="glass-card"
                style={{
                  borderRadius: "20px",
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  background: "#050508",
                  border: "1px solid var(--glass-border)",
                  height: "365px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }}></div>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b" }}></div>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }}></div>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>CompX Virtual Console v1.4</span>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1rem",
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: "10px",
                    fontFamily: "monospace",
                    fontSize: "0.82rem",
                    lineHeight: "1.5",
                    color: "#a7f3d0",
                    border: "1px solid rgba(255,255,255,0.02)",
                    marginBottom: "1rem",
                  }}
                >
                  {crawlerLogs.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", display: "flex", height: "100%", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "0.5rem" }}>
                      <span>🖥️ Scraper Node Terminal offline.</span>
                      <span>Enter query & click Launch to initialize proxy nodes.</span>
                    </div>
                  ) : (
                    <>
                      {crawlerLogs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: "0.4rem", wordBreak: "break-all" }}>{log}</div>
                      ))}
                      <div ref={logsEndRef}></div>
                    </>
                  )}
                </div>

                {crawlerActive && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#fff", marginBottom: "0.4rem" }}>
                      <span>Status: <strong>{crawlerStage}</strong></span>
                      <span>{crawlerProgress}%</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                      <div
                        style={{
                          width: `${crawlerProgress}%`,
                          height: "100%",
                          background: "var(--glow-gradient)",
                          borderRadius: "4px",
                          boxShadow: "0 0 10px var(--primary)",
                          transition: "width 0.4s ease",
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Leads Database Table */}
            <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2.5rem" }}>
              
              {/* Database Header Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>Lead Intelligence Database</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Inspect, filter, search, and download your verified lead lists.</p>
                </div>
                
                <div style={{ display: "flex", gap: "0.8rem" }}>
                  <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: "0.6rem 1.4rem", borderRadius: "10px", fontSize: "0.85rem" }}>
                    📥 Export Leads to CSV
                  </button>
                  {leads.length > 0 && (
                    <button
                      onClick={handleClearAllLeads}
                      className="btn btn-secondary"
                      style={{
                        padding: "0.6rem 1.4rem",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        borderColor: "rgba(239, 68, 68, 0.3)",
                        color: "#ff6b6b",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      🗑️ Clear All Leads
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Box */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search by company, email, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 0.9,
                    minWidth: "250px",
                    padding: "0.75rem 1.2rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    outline: "none",
                    fontSize: "0.9rem",
                  }}
                />
                
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: "0.75rem 1.2rem",
                    borderRadius: "10px",
                    background: "var(--bg-darker)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    outline: "none",
                    minWidth: "150px",
                  }}
                >
                  <option value="All">All Categories</option>
                  {categories.filter(c => c !== "All").map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  style={{
                    padding: "0.75rem 1.2rem",
                    borderRadius: "10px",
                    background: "var(--bg-darker)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    outline: "none",
                    minWidth: "150px",
                  }}
                >
                  <option value="All">All Platforms</option>
                  <option value="Google Maps">📍 Google Maps</option>
                  <option value="Website">🌐 Website</option>
                  <option value="LinkedIn">💼 LinkedIn</option>
                  <option value="Instagram">📸 Instagram</option>
                </select>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "14px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                      <th onClick={() => handleSort("name")} style={{ padding: "1.1rem 1.4rem", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)" }}>
                        Company Name {sortField === "name" && (sortAsc ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleSort("category")} style={{ padding: "1.1rem 1.4rem", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)" }}>
                        Category {sortField === "category" && (sortAsc ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleSort("source")} style={{ padding: "1.1rem 1.4rem", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)" }}>
                        Platform {sortField === "source" && (sortAsc ? "▲" : "▼")}
                      </th>
                      <th style={{ padding: "1.1rem 1.4rem", fontWeight: "600", color: "var(--text-muted)" }}>Phone Number</th>
                      <th style={{ padding: "1.1rem 1.4rem", fontWeight: "600", color: "var(--text-muted)" }}>Verified Email</th>
                      <th onClick={() => handleSort("rating")} style={{ padding: "1.1rem 1.4rem", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)" }}>
                        Rating {sortField === "rating" && (sortAsc ? "▲" : "▼")}
                      </th>
                      <th style={{ padding: "1.1rem 1.4rem", fontWeight: "600", color: "var(--text-muted)" }}>Address</th>
                      <th style={{ padding: "1.1rem 1.4rem", fontWeight: "600", color: "var(--text-muted)" }}>Status</th>
                      <th style={{ padding: "1.1rem 1.4rem", fontWeight: "600", color: "var(--text-muted)", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)", opacity: 0.7 }}>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <div className="skeleton-pulse-anim" style={{ width: "140px", height: "16px", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}></div>
                              <div className="skeleton-pulse-anim" style={{ width: "90px", height: "12px", borderRadius: "3px", background: "rgba(255,255,255,0.03)" }}></div>
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "70px", height: "20px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "80px", height: "20px", borderRadius: "12px", background: "rgba(255,255,255,0.04)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "110px", height: "14px", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "150px", height: "22px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "50px", height: "14px", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "160px", height: "14px", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "80px", height: "16px", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}></div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem", textAlign: "center" }}>
                            <div className="skeleton-pulse-anim" style={{ width: "24px", height: "24px", borderRadius: "4px", background: "rgba(255,255,255,0.03)", display: "inline-block" }}></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: "3rem", color: "var(--text-muted)", textAlign: "center" }}>
                          🔍 No leads matching filters found. Run the scraper or clear filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          style={{
                            borderBottom: "1px solid var(--glass-border)",
                            transition: "background 0.2s ease",
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "1.1rem 1.4rem", fontWeight: "600" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span>{lead.name}</span>
                              <a href={lead.website} target="_blank" rel="noreferrer" style={{ fontSize: "0.78rem", color: "var(--primary)", textDecoration: "none", marginTop: "0.2rem" }}>
                                {lead.website.replace("https://", "")}
                              </a>
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <span style={{ background: "rgba(139,92,246,0.08)", color: "var(--primary)", padding: "3px 8px", borderRadius: "12px", fontSize: "0.78rem", border: "1px solid rgba(139,92,246,0.15)" }}>
                              {lead.category}
                            </span>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            {getSourceBadge(lead.source)}
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem", fontFamily: "monospace" }}>{lead.phone || "N/A"}</td>
                          <td style={{ padding: "1.1rem 1.4rem", fontFamily: "monospace" }}>
                            {lead.email ? (
                              <span style={{ color: "#a7f3d0", background: "rgba(16,185,129,0.08)", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.15)" }}>
                                {lead.email}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>Missing</span>
                            )}
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <span style={{ color: "#f59e0b" }}>★</span>
                              <span>{lead.rating}</span>
                              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>({lead.reviews})</span>
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem", color: "var(--text-muted)", maxWidth: "220px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {lead.address}
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem" }}>
                            <span style={{ color: lead.status === "Synced" ? "#10b981" : "var(--accent-blue)", fontSize: "0.85rem", fontWeight: "600" }}>
                              {lead.status === "Synced" ? "🟢 Synced" : "🟡 Pending"}
                            </span>
                          </td>
                          <td style={{ padding: "1.1rem 1.4rem", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                              <button
                                onClick={() => handleOutreachFromLead(lead.id)}
                                disabled={!lead.email}
                                title={lead.email ? "Send Outreach Email" : "No email available"}
                                style={{
                                  background: lead.outreachStatus && lead.outreachStatus !== "Scraped"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : "rgba(139, 92, 246, 0.15)",
                                  border: lead.outreachStatus && lead.outreachStatus !== "Scraped"
                                    ? "1px solid rgba(16, 185, 129, 0.35)"
                                    : "1px solid rgba(139, 92, 246, 0.3)",
                                  color: lead.outreachStatus && lead.outreachStatus !== "Scraped" ? "#10b981" : "#a78bfa",
                                  cursor: lead.email ? "pointer" : "not-allowed",
                                  opacity: lead.email ? 1 : 0.4,
                                  fontSize: "0.78rem",
                                  padding: "5px 10px",
                                  borderRadius: "8px",
                                  transition: "all 0.2s ease",
                                  fontWeight: "700",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  whiteSpace: "nowrap",
                                }}
                                onMouseEnter={(e) => { if (lead.email) e.currentTarget.style.transform = "scale(1.05)"; }}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                ✉️ {lead.outreachStatus && lead.outreachStatus !== "Scraped" ? "Re-send" : "Outreach"}
                              </button>
                              <button
                                onClick={() => setSelectedLead(lead)}
                                style={{
                                  background: "rgba(139, 92, 246, 0.15)",
                                  border: "1px solid rgba(139, 92, 246, 0.3)",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  padding: "5px 10px",
                                  borderRadius: "8px",
                                  transition: "all 0.2s ease",
                                  fontWeight: "600",
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                title="View Details"
                              >
                                ✨ Details
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ff6b6b",
                                  cursor: "pointer",
                                  fontSize: "1.1rem",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease",
                                }}
                                title="Delete Lead"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 3: EMAIL ENRICHMENT ==================== */}
        {activeSidebarTab === "enrichment" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem" }}>
            
            {/* Input domains panel */}
            <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2.2rem" }}>
              <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Bulk Domain Enricher</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.8rem" }}>Input domains (one per line) to scan for verified corporate email structures and executives.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <textarea
                  rows={8}
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  disabled={enrichmentActive}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                    outline: "none",
                    resize: "none",
                  }}
                />

                <button
                  onClick={handleLaunchEnrichment}
                  className="btn btn-primary pulse-btn"
                  disabled={enrichmentActive || !domainsInput}
                  style={{ width: "100%", padding: "0.9rem", borderRadius: "50px" }}
                >
                  {enrichmentActive ? "Enriching Contact Domains..." : "🔄 Enrich Email List"}
                </button>
              </div>
            </div>

            {/* Results display */}
            <div className="glass-card" style={{ borderRadius: "20px", padding: "2.2rem" }}>
              <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Enriched Executive Database</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.8rem" }}>Real-time WHOIS scans, MX checks, and deliverability verification results.</p>

              {enrichmentActive && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "200px", justifyContent: "center", alignItems: "center" }}>
                  <div className="status-dot pulse" style={{ width: "16px", height: "16px", background: "var(--primary)" }}></div>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Scanning servers for MX records ({enrichmentProgress}%)</span>
                </div>
              )}

              {!enrichmentActive && enrichedResults.length === 0 && (
                <div style={{ display: "flex", height: "200px", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", border: "1px dashed var(--glass-border)", borderRadius: "12px" }}>
                  💡 Enter domain lines and enrich to discover verified contacts.
                </div>
              )}

              {!enrichmentActive && enrichedResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "350px", overflowY: "auto" }}>
                  {enrichedResults.map((contact, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "1rem",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.95rem", display: "block" }}>{contact.name}</strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>
                          {contact.role} @ <span style={{ color: "var(--primary)" }}>{contact.domain}</span>
                        </span>
                        <code style={{ fontSize: "0.82rem", background: "rgba(0,0,0,0.3)", padding: "3px 6px", borderRadius: "4px", color: "#a7f3d0" }}>{contact.email}</code>
                      </div>
                      
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            background:
                              contact.status === "Deliverable"
                                ? "rgba(16,185,129,0.1)"
                                : contact.status === "Catch-All"
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(239,68,68,0.1)",
                            color:
                              contact.status === "Deliverable"
                                ? "#10b981"
                                : contact.status === "Catch-All"
                                ? "#f59e0b"
                                : "#ef4444",
                            border:
                              contact.status === "Deliverable"
                                ? "1px solid rgba(16,185,129,0.2)"
                                : contact.status === "Catch-All"
                                ? "1px solid rgba(245,158,11,0.2)"
                                : "1px solid rgba(239,68,68,0.2)",
                            marginBottom: "0.4rem",
                          }}
                        >
                          {contact.status}
                        </span>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)" }}>{contact.deliverability}% match rate</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 4: SETTINGS ==================== */}
        {activeSidebarTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
            
            {/* Scraper options */}
            <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2.5rem" }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>Global Scraper Settings</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "2rem" }}>Tweak proxy coordinates and data processing models for scraper clusters.</p>

              {settingsSavedMessage && (
                <div style={{ padding: "0.8rem", borderRadius: "10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: "0.85rem", textAlign: "center", marginBottom: "1.5rem" }}>
                  🟢 Configuration saved successfully. Nodes updated dynamically.
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                
                {/* Speed slider */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-muted)" }}>Crawler Velocity / Request Delay</label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {["ethical", "standard", "turbo"].map((speed) => (
                      <button
                        type="button"
                        key={speed}
                        onClick={() => setScraperSpeed(speed)}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          borderRadius: "10px",
                          background: scraperSpeed === speed ? "var(--glow-gradient)" : "rgba(255,255,255,0.02)",
                          color: "#fff",
                          border: "1px solid var(--glass-border)",
                          fontWeight: "600",
                          cursor: "pointer",
                          textTransform: "capitalize",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {speed === "ethical" ? "Ethical (15s)" : speed === "standard" ? "Standard (5s)" : "Hyper Turbo (0s)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metadata Switches */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1.2rem" }}>
                  <label style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-muted)" }}>Data Enrichment Steps</label>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>Deep scan for email domains</strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Crawl website subpages to discover contact profiles.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={deepEmailSearch}
                      onChange={(e) => setDeepEmailSearch(e.target.checked)}
                      style={{ width: "42px", height: "22px", cursor: "pointer" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>Verify Phone Deliverability</strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Crosscheck landline indexes to verify business connections.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={verifyPhones}
                      onChange={(e) => setVerifyPhones(e.target.checked)}
                      style={{ width: "42px", height: "22px", cursor: "pointer" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>Detect social media profiles</strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Extract Facebook, LinkedIn, and Instagram company page targets.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={detectLinkedIn}
                      onChange={(e) => setDetectLinkedIn(e.target.checked)}
                      style={{ width: "42px", height: "22px", cursor: "pointer" }}
                    />
                  </div>
                </div>

                {/* API CRM integration */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1.2rem" }}>
                  <label style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-muted)" }}>HubSpot Integration Sync Token</label>
                  <input
                    type="password"
                    value={hubspotApiKey}
                    onChange={(e) => setHubspotApiKey(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.8rem 1.2rem",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--glass-border)",
                      color: "#fff",
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.9rem", borderRadius: "50px", fontWeight: "700" }}>
                  💾 Save Scraper Settings
                </button>
              </form>
            </div>

            {/* Developer token manager */}
            <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ borderRadius: "20px", padding: "2.5rem", alignSelf: "start" }}>
              <h3 style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>Developer API Tokens</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "2rem" }}>Access scraped databases directly through the developer nodes.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {generatedApiKey ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>Active Private Access Token</span>
                    <code style={{ wordBreak: "break-all", background: "rgba(0,0,0,0.4)", color: "#a7f3d0", padding: "0.8rem 1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", fontSize: "0.82rem" }}>
                      {generatedApiKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedApiKey);
                        alert("API key copied to clipboard!");
                      }}
                      className="btn btn-secondary"
                      style={{ padding: "0.6rem 1rem", borderRadius: "10px", fontSize: "0.8rem", marginTop: "0.5rem" }}
                    >
                      📋 Copy Token
                    </button>
                  </div>
                ) : (
                  <button onClick={handleGenerateApiKey} className="btn btn-primary" style={{ width: "100%", padding: "0.9rem", borderRadius: "50px" }}>
                    🔑 Generate API Access Key
                  </button>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                  <span>⚠️ Keep private keys secure! Anyone with access can request your scraped credits or lead lists.</span>
                </div>
              </div>
            </div>

          </div>
        )}

         {/* ==================== TAB 5: COLD OUTREACH ==================== */}
         {activeSidebarTab === "outreach" && (
           <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
             
             {/* Header and status alerts */}
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
               <div>
                 <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#fff", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                   ✉️ Cold Outreach Campaign Manager
                 </h2>
                 <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                   Compose AI-personalized outreach templates, dispatch campaigns via Resend API, and manage pipeline conversions in real-time.
                 </p>
               </div>
             </div>

             {/* Status Alert Banner */}
             {outreachStatusMessage && (
               <div
                 style={{
                   padding: "1rem 1.5rem",
                   borderRadius: "14px",
                   background:
                     outreachStatusMessage.type === "success"
                       ? "rgba(16, 185, 129, 0.08)"
                       : outreachStatusMessage.type === "error"
                       ? "rgba(239, 68, 68, 0.08)"
                       : "rgba(59, 130, 246, 0.08)",
                   border:
                     outreachStatusMessage.type === "success"
                       ? "1px solid rgba(16, 185, 129, 0.2)"
                       : outreachStatusMessage.type === "error"
                       ? "1px solid rgba(239, 68, 68, 0.2)"
                       : "1px solid rgba(59, 130, 246, 0.2)",
                   color:
                     outreachStatusMessage.type === "success"
                       ? "#34D399"
                       : outreachStatusMessage.type === "error"
                       ? "#F87171"
                       : "#60A5FA",
                   fontSize: "0.9rem",
                   display: "flex",
                   alignItems: "center",
                   gap: "0.6rem",
                   boxShadow: "0 4px 15px rgba(0, 0, 0, 0.15)",
                 }}
               >
                 <span style={{ fontSize: "1.1rem" }}>
                   {outreachStatusMessage.type === "success" ? "🟢" : outreachStatusMessage.type === "error" ? "❌" : "ℹ️"}
                 </span>
                 <strong>{outreachStatusMessage.text}</strong>
               </div>
             )}

             {/* ── CAMPAIGN ANALYTICS SUMMARY CARDS ── */}
             <section className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
               <div className="glass-card" style={{ padding: "1.2rem 1.4rem", borderRadius: "16px", textAlign: "center" }}>
                 <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.05em" }}>Campaign Sent</span>
                 <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.2rem", color: "#60A5FA" }}>{totalSent}</h2>
                 <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "0.6rem" }}>
                   <div style={{ width: `${Math.min((totalSent / Math.max(1, leads.length)) * 100, 100)}%`, height: "100%", background: "#60A5FA", borderRadius: "2px" }}></div>
                 </div>
               </div>

               <div className="glass-card" style={{ padding: "1.2rem 1.4rem", borderRadius: "16px", textAlign: "center" }}>
                 <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.05em" }}>Open Rate</span>
                 <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.2rem", color: "var(--primary)" }}>{openRate}%</h2>
                 <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{totalOpened} total opens</p>
               </div>

               <div className="glass-card" style={{ padding: "1.2rem 1.4rem", borderRadius: "16px", textAlign: "center" }}>
                 <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.05em" }}>Click Rate (CTR)</span>
                 <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.2rem", color: "#06B6D4" }}>{ctrRate}%</h2>
                 <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{totalClicked} total clicks</p>
               </div>

               <div className="glass-card" style={{ padding: "1.2rem 1.4rem", borderRadius: "16px", textAlign: "center" }}>
                 <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.05em" }}>Response Rate</span>
                 <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.2rem", color: "#10B981" }}>{responseRate}%</h2>
                 <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{totalReplied} total replies</p>
               </div>

               <div className="glass-card" style={{ padding: "1.2rem 1.4rem", borderRadius: "16px", textAlign: "center" }}>
                 <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.05em" }}>Bounced</span>
                 <h2 style={{ fontSize: "2rem", fontWeight: "800", marginTop: "0.2rem", color: "#EF4444" }}>{totalBounced}</h2>
                 <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "0.6rem" }}>
                   <div style={{ width: `${totalSent > 0 ? (totalBounced / totalSent) * 100 : 0}%`, height: "100%", background: "#EF4444", borderRadius: "2px" }}></div>
                 </div>
               </div>
             </section>

             {/* Main columns */}
             <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "2rem" }}>
               
               {/* LEFT COLUMN: Setup, parameters, targets & telemetry */}
               <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                 
                 {/* 1. Resend Settings Card */}
                 <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "2rem", borderRadius: "20px" }}>
                   <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                     🔑 Resend Integration Config
                   </h3>
                   <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1.2rem" }}>
                     Set your private Resend details. Settings are encrypted and saved locally.
                   </p>

                   {outreachSettingsSavedMessage && (
                     <div style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: "0.8rem", textAlign: "center", marginBottom: "1rem" }}>
                       🟢 Outreach configurations saved successfully!
                     </div>
                   )}

                   <form onSubmit={handleSaveOutreachSettings} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                     <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                       <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>Resend API Access Token</label>
                       <input
                         type="password"
                         placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                         value={resendApiKey}
                         onChange={(e) => setResendApiKey(e.target.value)}
                         style={{
                           width: "100%",
                           padding: "0.75rem 1rem",
                           borderRadius: "10px",
                           background: "rgba(255,255,255,0.02)",
                           border: "1px solid var(--glass-border)",
                           color: "#fff",
                           fontFamily: "monospace",
                           outline: "none",
                           fontSize: "0.85rem",
                         }}
                       />
                     </div>

                     <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                       <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>Verified From Email</label>
                       <input
                         type="text"
                         placeholder="e.g. sender@yourverifieddomain.com"
                         value={outreachFromEmail}
                         onChange={(e) => setOutreachFromEmail(e.target.value)}
                         style={{
                           width: "100%",
                           padding: "0.75rem 1rem",
                           borderRadius: "10px",
                           background: "rgba(255,255,255,0.02)",
                           border: "1px solid var(--glass-border)",
                           color: "#fff",
                           outline: "none",
                           fontSize: "0.85rem",
                         }}
                       />
                     </div>

                     <button type="submit" className="btn btn-secondary" style={{ width: "100%", padding: "0.7rem", borderRadius: "10px", fontSize: "0.82rem", fontWeight: "700" }}>
                       💾 Save Resend Senders
                     </button>
                   </form>

                   {/* Resend custom tips box */}
                   <div style={{
                     marginTop: "1.2rem",
                     background: "rgba(139, 92, 246, 0.04)",
                     border: "1px solid rgba(139, 92, 246, 0.12)",
                     borderRadius: "12px",
                     padding: "0.8rem 1rem",
                     fontSize: "0.78rem",
                     color: "#C4B5FD",
                     display: "flex",
                     gap: "0.5rem",
                     lineHeight: "1.4"
                   }}>
                     <span>💡</span>
                     <div>
                       <strong style={{ color: "#fff", display: "block", marginBottom: "2px" }}>Resend Domain Verification</strong>
                       For sandbox testing, use <code style={{ color: "#F472B6" }}>onboarding@resend.dev</code>. To email custom databases, verify your domain under Resend Settings first.
                     </div>
                   </div>
                 </div>

                 {/* 2. Recipient Selector Card */}
                 <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "2rem", borderRadius: "20px" }}>
                   <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                     👤 Target Campaign Recipient
                   </h3>
                   <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1.2rem" }}>
                     Select a scraped lead from your active synced database to mount.
                   </p>

                   <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                     <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                       <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>Synced Database Leads Dropdown</label>
                       <select
                         value={selectedOutreachLeadId}
                         onChange={(e) => setSelectedOutreachLeadId(e.target.value)}
                         style={{
                           width: "100%",
                           padding: "0.8rem",
                           borderRadius: "10px",
                           background: "var(--bg-darker)",
                           border: "1px solid var(--glass-border)",
                           color: "#fff",
                           outline: "none",
                           fontSize: "0.85rem",
                         }}
                       >
                         <option value="">-- Choose Recipient Lead --</option>
                         {leads.filter(l => l.email).map((lead) => (
                           <option key={lead.id} value={lead.id}>
                             {lead.name} ({lead.email})
                           </option>
                         ))}
                       </select>
                     </div>

                     {selectedOutreachLead && (
                       <div style={{
                         background: "rgba(255,255,255,0.01)",
                         border: "1px solid var(--glass-border)",
                         padding: "1rem",
                         borderRadius: "12px",
                         display: "flex",
                         flexDirection: "column",
                         gap: "0.6rem",
                         fontSize: "0.82rem"
                       }}>
                         <div style={{ display: "flex", justifyContent: "space-between" }}>
                           <span style={{ color: "var(--text-muted)" }}>Target Sourced:</span>
                           <strong>{selectedOutreachLead.source || "Google Maps"}</strong>
                         </div>
                         <div style={{ display: "flex", justifyContent: "space-between" }}>
                           <span style={{ color: "var(--text-muted)" }}>Website URL:</span>
                           <a href={selectedOutreachLead.website} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>
                             {selectedOutreachLead.website.replace("https://", "").replace("www.", "").substring(0, 22)}...
                           </a>
                         </div>
                         <div style={{ display: "flex", justifyContent: "space-between" }}>
                           <span style={{ color: "var(--text-muted)" }}>Lead CRM Status:</span>
                           <span style={{ color: selectedOutreachLead.outreachStatus === "Closed Client" ? "#10b981" : "var(--primary)", fontWeight: "700" }}>
                             {selectedOutreachLead.outreachStatus || "Scraped"}
                           </span>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* 3. AI Lead Signals & Telemetry Simulator Card */}
                 <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "2rem", borderRadius: "20px" }}>
                   <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                     📡 Telemetry & Priority Metrics
                   </h3>
                   <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1.2rem" }}>
                     Tweak delivery signals and simulate reactive lead scoring updates in real-time.
                   </p>

                   {selectedOutreachLead ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                       {/* Priority score indicator */}
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#050508", padding: "1rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                         <div>
                           <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>AI Priority Rating</span>
                           <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.1rem" }}>
                             <span style={{ fontSize: "1.8rem", fontWeight: "800", color: (selectedOutreachLead.score || 50) >= 80 ? "#10B981" : "#F59E0B" }}>
                               {selectedOutreachLead.score || 50}
                             </span>
                             <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ 100</span>
                           </div>
                         </div>
                         <span style={{
                           fontSize: "0.75rem",
                           fontWeight: "800",
                           padding: "4px 8px",
                           borderRadius: "6px",
                           background: (selectedOutreachLead.score || 50) >= 80 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                           color: (selectedOutreachLead.score || 50) >= 80 ? "#10B981" : "#F59E0B"
                         }}>
                           {(selectedOutreachLead.score || 50) >= 80 ? "🔥 HOT TARGET" : "🟡 COLD LEAD"}
                         </span>
                       </div>

                       {/* Toggle Switches */}
                       <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <div>
                             <strong style={{ fontSize: "0.85rem", display: "block" }}>Open Email Signal</strong>
                             <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Simulates recipient opening outbound sequences.</span>
                           </div>
                           <input
                             type="checkbox"
                             checked={simOpened}
                             onChange={(e) => handleTelemetryToggle("opened", e.target.checked)}
                             style={{ width: "36px", height: "18px", cursor: "pointer" }}
                           />
                         </div>

                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <div>
                             <strong style={{ fontSize: "0.85rem", display: "block" }}>Click Link Signal</strong>
                             <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Simulates recipient clicking landing page CTA links.</span>
                           </div>
                           <input
                             type="checkbox"
                             checked={simClicked}
                             onChange={(e) => handleTelemetryToggle("clicked", e.target.checked)}
                             style={{ width: "36px", height: "18px", cursor: "pointer" }}
                           />
                         </div>

                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <div>
                             <strong style={{ fontSize: "0.85rem", display: "block" }}>Mail Bounce Signal</strong>
                             <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Simulates SMTP server delivery rejection bounces.</span>
                           </div>
                           <input
                             type="checkbox"
                             checked={simBounced}
                             disabled={simOpened}
                             onChange={(e) => handleTelemetryToggle("bounced", e.target.checked)}
                             style={{ width: "36px", height: "18px", cursor: "pointer" }}
                           />
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div style={{ padding: "1.5rem", border: "1px dashed var(--glass-border)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
                       Select a recipient lead above to access metric indicators and manual telemetry overrides.
                     </div>
                   )}
                 </div>

               </div>

               {/* RIGHT COLUMN: Pipeline timeline, AI writer, Dispatch keys */}
               <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                 
                 {/* 1. CRM Visual Pipeline Timeline */}
                 <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "2rem", borderRadius: "20px" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                     <h3 style={{ fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                       🔗 CRM Outreach Conversion Pipeline
                     </h3>
                     {selectedOutreachLead && (
                       <span style={{
                         fontSize: "0.72rem",
                         fontWeight: "700",
                         background: "rgba(139,92,246,0.1)",
                         border: "1px solid rgba(139,92,246,0.2)",
                         color: "var(--primary)",
                         padding: "2px 8px",
                         borderRadius: "20px",
                         textTransform: "uppercase"
                       }}>
                         {selectedOutreachLead.outreachStatus || "Scraped"}
                       </span>
                     )}
                   </div>

                   {selectedOutreachLead ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                       <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                         Click nodes below to manually promote recipient states in the CRM pipeline:
                       </p>

                       {/* Visual track container */}
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", padding: "0 10px", height: "60px" }}>
                         
                         {/* Track lines */}
                         <div style={{ position: "absolute", left: "20px", right: "20px", height: "3px", background: "rgba(255,255,255,0.05)", zIndex: 1 }}></div>
                         <div style={{
                           position: "absolute",
                           left: "20px",
                           width:
                             selectedOutreachLead.outreachStatus === "Outreached"
                               ? "33%"
                               : selectedOutreachLead.outreachStatus === "Replied"
                               ? "66%"
                               : selectedOutreachLead.outreachStatus === "Closed Client"
                               ? "100%"
                               : "0%",
                           height: "3px",
                           background: "var(--primary)",
                           boxShadow: "0 0 10px var(--primary)",
                           zIndex: 2,
                           transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                         }}></div>

                         {/* Node 1: Scraped */}
                         <button
                           onClick={() => handleUpdateCrmPipelineStep("Scraped")}
                           style={{
                             zIndex: 3,
                             background: "none",
                             border: "none",
                             cursor: "pointer",
                             display: "flex",
                             flexDirection: "column",
                             alignItems: "center",
                             gap: "0.4rem",
                             outline: "none"
                           }}
                         >
                           <div style={{
                             width: "18px",
                             height: "18px",
                             borderRadius: "50%",
                             background: "#050508",
                             border: `3px solid ${selectedOutreachLead.outreachStatus === "Scraped" || ["Outreached", "Replied", "Closed Client"].includes(selectedOutreachLead.outreachStatus || "") ? "var(--primary)" : "rgba(255,255,255,0.15)"}`,
                             transition: "all 0.3s ease"
                           }}></div>
                           <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#fff" }}>Scraped</span>
                         </button>

                         {/* Node 2: Outreached */}
                         <button
                           onClick={() => handleUpdateCrmPipelineStep("Outreached")}
                           style={{
                             zIndex: 3,
                             background: "none",
                             border: "none",
                             cursor: "pointer",
                             display: "flex",
                             flexDirection: "column",
                             alignItems: "center",
                             gap: "0.4rem",
                             outline: "none"
                           }}
                         >
                           <div style={{
                             width: "18px",
                             height: "18px",
                             borderRadius: "50%",
                             background: "#050508",
                             border: `3px solid ${["Outreached", "Replied", "Closed Client"].includes(selectedOutreachLead.outreachStatus || "") ? "var(--primary)" : "rgba(255,255,255,0.15)"}`,
                             transition: "all 0.3s ease"
                           }}></div>
                           <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#fff" }}>Contacted</span>
                         </button>

                         {/* Node 3: Replied */}
                         <button
                           onClick={() => handleUpdateCrmPipelineStep("Replied")}
                           style={{
                             zIndex: 3,
                             background: "none",
                             border: "none",
                             cursor: "pointer",
                             display: "flex",
                             flexDirection: "column",
                             alignItems: "center",
                             gap: "0.4rem",
                             outline: "none"
                           }}
                         >
                           <div style={{
                             width: "18px",
                             height: "18px",
                             borderRadius: "50%",
                             background: "#050508",
                             border: `3px solid ${["Replied", "Closed Client"].includes(selectedOutreachLead.outreachStatus || "") ? "var(--primary)" : "rgba(255,255,255,0.15)"}`,
                             transition: "all 0.3s ease"
                           }}></div>
                           <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#fff" }}>Replied</span>
                         </button>

                         {/* Node 4: Won (Closed Client) */}
                         <button
                           onClick={() => handleUpdateCrmPipelineStep("Closed Client")}
                           style={{
                             zIndex: 3,
                             background: "none",
                             border: "none",
                             cursor: "pointer",
                             display: "flex",
                             flexDirection: "column",
                             alignItems: "center",
                             gap: "0.4rem",
                             outline: "none"
                           }}
                         >
                           <div style={{
                             width: "18px",
                             height: "18px",
                             borderRadius: "50%",
                             background: "#050508",
                             border: `3px solid ${selectedOutreachLead.outreachStatus === "Closed Client" ? "#10b981" : "rgba(255,255,255,0.15)"}`,
                             transition: "all 0.3s ease"
                           }}></div>
                           <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#fff" }}>Won 🎉</span>
                         </button>

                       </div>
                     </div>
                   ) : (
                     <div style={{ padding: "1.5rem", border: "1px dashed var(--glass-border)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
                       Select a recipient lead on the left column to launch visual pipeline nodes.
                     </div>
                   )}
                 </div>

                 {/* 2. AI Copy Editor Card */}
                 <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "2rem", borderRadius: "20px" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                     <h3 style={{ fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                       🤖 AI Copy & Cadence Editor
                     </h3>
                     {selectedOutreachLead && (
                       <select
                         value={outreachNiche}
                         onChange={(e) => setOutreachNiche(e.target.value as any)}
                         style={{
                           padding: "4px 10px",
                           borderRadius: "8px",
                           background: "var(--bg-darker)",
                           border: "1px solid var(--glass-border)",
                           color: "#fff",
                           fontSize: "0.75rem",
                           outline: "none",
                           fontWeight: "700"
                         }}
                       >
                         <option value="general">💼 General B2B</option>
                         <option value="agency">🏢 Agency/Tech</option>
                         <option value="ecommerce">🛒 E-commerce</option>
                         <option value="coach">👑 Coach/Consultant</option>
                         <option value="designer">🎨 UI Designer</option>
                       </select>
                     )}
                   </div>

                   {selectedOutreachLead ? (
                     <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                       
                       {/* Sequence cadence chooser */}
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#050508", padding: "0.6rem 1rem", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                         <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>Sequence cadences:</span>
                         <div style={{ display: "flex", gap: "0.4rem" }}>
                           {[0, 3, 7].map((day) => (
                             <button
                               key={day}
                               onClick={() => setOutreachSequenceDay(day as any)}
                               style={{
                                 padding: "4px 10px",
                                 borderRadius: "6px",
                                 fontSize: "0.78rem",
                                 fontWeight: "700",
                                 background: outreachSequenceDay === day ? "var(--glow-gradient)" : "rgba(255,255,255,0.02)",
                                 color: "#fff",
                                 border: "1px solid var(--glass-border)",
                                 cursor: "pointer",
                                 transition: "all 0.3s ease"
                               }}
                             >
                               Day {day}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Subject Input */}
                       <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                         <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>Email Subject Line</label>
                         <input
                           type="text"
                           value={customOutreachSubject}
                           onChange={(e) => setCustomOutreachSubject(e.target.value)}
                           style={{
                             width: "100%",
                             padding: "0.8rem 1rem",
                             borderRadius: "10px",
                             background: "rgba(255,255,255,0.02)",
                             border: "1px solid var(--glass-border)",
                             color: "#fff",
                             outline: "none",
                             fontSize: "0.88rem",
                             fontWeight: "600"
                           }}
                         />
                       </div>

                       {/* Body Textarea */}
                       <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                         <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>Email Body Copy</label>
                         <textarea
                           rows={8}
                           value={customOutreachBody}
                           onChange={(e) => setCustomOutreachBody(e.target.value)}
                           style={{
                             width: "100%",
                             padding: "1rem",
                             borderRadius: "12px",
                             background: "rgba(255,255,255,0.02)",
                             border: "1px solid var(--glass-border)",
                             color: "#fff",
                             fontSize: "0.88rem",
                             lineHeight: "1.5",
                             outline: "none",
                             resize: "none"
                           }}
                         />
                       </div>

                       {/* Campaign dispatch actions */}
                       <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                         <button
                           onClick={handleSendCampaignEmail}
                           disabled={outreachSending}
                           className="btn btn-primary pulse-btn"
                           style={{
                             padding: "0.85rem",
                             borderRadius: "50px",
                             fontWeight: "800",
                             fontSize: "0.85rem",
                             background: "var(--glow-gradient)",
                             border: "none",
                             boxShadow: "0 0 15px rgba(139, 92, 246, 0.25)",
                           }}
                         >
                           {outreachSending ? (
                             <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                               <span className="status-dot pulse" style={{ width: "8px", height: "8px", backgroundColor: "#fff" }}></span>
                               Dispatching...
                             </span>
                           ) : (
                             "⚡ Dispatch Campaign"
                           )}
                         </button>

                         <button
                           onClick={handleGmailFallbackTrigger}
                           className="btn btn-secondary"
                           style={{
                             padding: "0.85rem",
                             borderRadius: "50px",
                             fontWeight: "700",
                             fontSize: "0.85rem",
                             borderColor: "rgba(233, 67, 53, 0.3)",
                             color: "#fda4af",
                             background: "rgba(233, 67, 53, 0.03)",
                             display: "flex",
                             alignItems: "center",
                             justifyContent: "center",
                             gap: "0.4rem"
                           }}
                         >
                           <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "13px", height: "13px" }}>
                             <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                           </svg>
                           Gmail Direct
                         </button>
                       </div>

                     </div>
                   ) : (
                     <div style={{ padding: "1.5rem", border: "1px dashed var(--glass-border)", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
                       Select a recipient lead on the left column to compile sequences and enable copy editors.
                     </div>
                   )}
                 </div>

               </div>

             </div>

            </div>
         )}

            {/* ─── EMAIL HISTORY LOG ─── */}
            {activeSidebarTab === "outreach" && selectedOutreachLead && (selectedOutreachLead.emailHistory?.length ?? 0) > 0 && (
              <div className="glass-card" style={{ borderRadius: "20px", padding: "2rem", marginTop: "-1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    📋 Email Dispatch History
                    <span style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "var(--primary)", fontSize: "0.72rem", padding: "2px 8px", borderRadius: "20px", fontWeight: "700" }}>
                      {selectedOutreachLead.emailHistory!.length} sent
                    </span>
                  </h3>
                  {selectedOutreachLead.sentAt && (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Last sent: {new Date(selectedOutreachLead.sentAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", maxHeight: "260px", overflowY: "auto" }}>
                  {[...selectedOutreachLead.emailHistory!].reverse().map((entry, idx) => {
                    const methodMap: Record<string, { color: string; bg: string; icon: string }> = {
                      resend:    { color: "#a78bfa", bg: "rgba(139,92,246,0.08)",  icon: "⚡" },
                      gmail:     { color: "#f87171", bg: "rgba(239,68,68,0.07)",   icon: "📧" },
                      simulated: { color: "#60a5fa", bg: "rgba(59,130,246,0.07)",  icon: "🧪" },
                    };
                    const statusColor: Record<string, string> = { sent: "#10b981", opened: "#f59e0b", bounced: "#ef4444" };
                    const m = methodMap[entry.method] || methodMap.simulated;
                    return (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "0.8rem", alignItems: "center", padding: "0.75rem 1rem", borderRadius: "12px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}30`, padding: "3px 8px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: "700", whiteSpace: "nowrap" }}>
                          {m.icon} {entry.method === "resend" ? "Resend" : entry.method === "gmail" ? "Gmail" : "Simulated"}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.subject}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Day {entry.day}</span>
                        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <span style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: statusColor[entry.status] || "#10b981" }}>
                            ● {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            {new Date(entry.sentAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

         {/* ==================== TAB 6: EXTENSION HUB ==================== */}
        {activeSidebarTab === "extension-hub" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            
            {/* Header / Intro */}
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#fff", marginBottom: "0.5rem" }}>
                🧩 Browser Extension Hub
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                Merge multi-source leads scraping (Google Maps, Websites, LinkedIn, Instagram) directly into your CRM Outbound pipeline.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2.5rem" }}>
              
              {/* Controls Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                
                {/* Download Zip Card (Locked to protect code / coming soon to Chrome & Firefox web stores) */}
                <div
                  className="glass-card"
                  onMouseMove={handleSpotlightMouseMove}
                  style={{
                    padding: "2rem",
                    borderRadius: "20px",
                    border: "1px solid rgba(244, 114, 182, 0.2)",
                    boxShadow: "0 0 25px rgba(244, 114, 182, 0.05)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {/* Subtle coming soon ribbon/badge */}
                  <div style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "rgba(236, 72, 153, 0.15)",
                    border: "1px solid rgba(236, 72, 153, 0.3)",
                    color: "#f472b6",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "0.7rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    Store Reviewing
                  </div>

                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    🧩 CompX Scraper Extension v1.4
                  </h3>
                  
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.2rem", lineHeight: "1.6" }}>
                    Built-in Google Maps scraper, Instagram bio parser, LinkedIn contact extractor, and automatic cloud database synchronization.
                  </p>

                  <div style={{
                    background: "rgba(244, 63, 94, 0.04)",
                    border: "1px solid rgba(244, 63, 94, 0.15)",
                    borderRadius: "12px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                    fontSize: "0.8rem",
                    color: "#fda4af",
                    display: "flex",
                    gap: "0.6rem",
                    alignItems: "flex-start",
                    lineHeight: "1.4"
                  }}>
                    <span style={{ fontSize: "1.1rem" }}>🔒</span>
                    <div>
                      <strong style={{ color: "#fff", display: "block", marginBottom: "2px" }}>Direct ZIP download is locked</strong>
                      To prevent unauthorized copying and secure proprietary extraction algorithms, direct file download is restricted. Official store releases are coming soon!
                    </div>
                  </div>
                  
                  <div
                    className="btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.6rem",
                      width: "100%",
                      padding: "1.2rem 1rem",
                      borderRadius: "50px",
                      fontWeight: "800",
                      fontSize: "0.88rem",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      color: "rgba(255, 255, 255, 0.3)",
                      cursor: "not-allowed",
                      textAlign: "center",
                    }}
                  >
                    🚀 Coming Soon to Chrome Web Store & Firefox Add-ons
                  </div>
                </div>

                {/* Developer Sync Token Card */}
                <div className="glass-card" onMouseMove={handleSpotlightMouseMove} style={{ padding: "2rem", borderRadius: "20px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.8rem" }}>
                    🔑 Developer Sync Token
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.2rem", lineHeight: "1.5" }}>
                    Copy this token and paste it inside the extension popup settings window to authenticate and sync leads instantly.
                  </p>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    <code
                      style={{
                        wordBreak: "break-all",
                        background: "#050508",
                        color: "#a7f3d0",
                        padding: "0.8rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid var(--glass-border)",
                        fontSize: "0.8rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {generatedApiKey || "compx_live_sk_loading..."}
                    </code>
                    
                    <div style={{ display: "flex", gap: "0.8rem" }}>
                      <button
                        onClick={() => {
                          if (generatedApiKey) {
                            navigator.clipboard.writeText(generatedApiKey);
                            alert("Developer sync token copied to clipboard!");
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: "0.7rem", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "600" }}
                      >
                        📋 Copy Token
                      </button>
                      <button
                        onClick={handleGenerateApiKey}
                        className="btn btn-secondary"
                        style={{ padding: "0.7rem", borderRadius: "10px", fontSize: "0.8rem", borderColor: "rgba(255,255,255,0.05)" }}
                        title="Re-generate Sync Token"
                      >
                        🔄 Re-generate
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Console & Stream Column */}
              <div
                className="glass-card"
                style={{
                  borderRadius: "20px",
                  padding: "2rem",
                  background: "#050508",
                  border: "1px solid var(--glass-border)",
                  display: "flex",
                  flexDirection: "column",
                  height: "530px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }}></div>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b" }}></div>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }}></div>
                    <span style={{ fontSize: "0.82rem", color: "#fff", fontWeight: "700", marginLeft: "0.5rem" }}>
                      🖥️ Live Web Crawler Console Stream
                    </span>
                  </div>
                  {webCrawlerLogs.length > 0 && (
                    <button
                      onClick={handleClearWebLogs}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#ff6b6b",
                        fontSize: "0.72rem",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      🗑️ Clear Console
                    </button>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1.2rem",
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: "12px",
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    lineHeight: "1.6",
                    border: "1px solid rgba(255,255,255,0.02)",
                    color: "#a7f3d0",
                  }}
                >
                  {webCrawlerLogs.length === 0 ? (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                      <span>📡 Awaiting streaming data from local browser extension...</span>
                      <span style={{ fontSize: "0.75rem", textAlign: "center", maxWidth: "80%" }}>
                        Load the extension, paste your sync token, and navigate to any business search query to trigger logs!
                      </span>
                    </div>
                  ) : (
                    webCrawlerLogs.map((log, index) => {
                      let levelColor = "#3b82f6"; // INFO
                      if (log.level === "SUCCESS" || log.text.includes("SUCCESS")) levelColor = "#10b981";
                      if (log.level === "ERROR" || log.text.includes("ERROR") || log.text.includes("failed")) levelColor = "#ef4444";
                      if (log.level === "WARNING" || log.text.includes("WARNING")) levelColor = "#f59e0b";

                      return (
                        <div key={index} style={{ marginBottom: "0.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.01)", paddingBottom: "0.4rem", wordBreak: "break-all" }}>
                          <span style={{ color: "var(--text-muted)" }}>[{log.timestamp}]</span>{" "}
                          <span style={{ color: levelColor, fontWeight: "700" }}>[{log.level || "INFO"}]</span>{" "}
                          <span style={{ color: "#fff" }}>{log.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Bilingual Installation Walkthrough Instructions */}
            <div
              className="glass-card"
              style={{
                padding: "2.5rem",
                borderRadius: "20px",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
                
                {/* English Guide */}
                <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", paddingRight: "2.5rem" }}>
                  <h4 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#fff", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    🇬🇧 Upcoming Web Store Installation
                  </h4>
                  <ol style={{ paddingLeft: "1.2rem", color: "var(--text-muted)", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "0.9rem", lineHeight: "1.6" }}>
                    <li>
                      <strong style={{ color: "#fff" }}>Official Store Release</strong>: We are currently publishing the CompX Scraper Extension directly to the Chrome Web Store and Firefox Add-ons directory.
                    </li>
                    <li>
                      <strong style={{ color: "#fff" }}>Direct Installation</strong>: Once approved, you will be able to add the extension with a single click without downloading zip packages.
                    </li>
                    <li>
                      <strong style={{ color: "#fff" }}>Secure Authentication</strong>: Copy your <strong style={{ color: "#a7f3d0" }}>Developer Sync Token</strong> below and paste it in the store-installed extension popup settings to authenticate.
                    </li>
                    <li>
                      <strong style={{ color: "#fff" }}>Proprietary Code Protection</strong>: Direct local ZIP files are locked temporarily to safeguard B2B lead scraping scripts.
                    </li>
                  </ol>
                </div>

                {/* Bengali Guide */}
                <div>
                  <h4 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#fff", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    🇧🇩 আসন্ন ব্রাউজার স্টোর ইনস্টলেশন গাইড
                  </h4>
                  <ol style={{ paddingLeft: "1.2rem", color: "var(--text-muted)", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "0.9rem", lineHeight: "1.6" }}>
                    <li>
                      <strong style={{ color: "#fff" }}>অফিসিয়াল স্টোর রিলিজ</strong>: আমরা বর্তমানে ক্রোম ওয়েব স্টোর এবং ফায়ারফক্স অ্যাড-অন ডিরেক্টরিতে সরাসরি CompX Scraper এক্সটেনশনটি পাবলিশ করার কাজ করছি।
                    </li>
                    <li>
                      <strong style={{ color: "#fff" }}>এক ক্লিকে ইনস্টল</strong>: অনুমোদন পাওয়ার সাথে সাথেই আপনারা কোনো জিপ ফাইল ডাউনলোড করা ছাড়াই ব্রাউজার স্টোর থেকে সরাসরি এটি ইনস্টল করতে পারবেন।
                    </li>
                    <li>
                      <strong style={{ color: "#fff" }}>নিরাপদ সংযোগ</strong>: ইনস্টল করার পর আপনার <strong style={{ color: "#a7f3d0" }}>Developer Sync Token</strong>-টি কপি করে এক্সটেনশন প্যানেলে পেস্ট করে সিঙ্ক (Sync) করবেন।
                    </li>
                    <li>
                      <strong style={{ color: "#fff" }}>কোড সুরক্ষা লক</strong>: স্ক্র্যাপিং স্ক্রিপ্ট এবং সোর্স কোড সুরক্ষিত রাখতে আপাতত সরাসরি জিপ ফাইল ডাউনলোড অপশনটি লক রাখা হয়েছে।
                    </li>
                  </ol>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Quota Limit Exceeded Glassmorphic Modal */}
      {limitExceededModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(5, 5, 8, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "500px",
              width: "100%",
              padding: "2.5rem",
              borderRadius: "24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.5rem",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)",
              animation: "scaleIn 0.3s ease",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                color: "#ef4444",
                boxShadow: "0 0 20px rgba(239, 68, 68, 0.2)",
              }}
            >
              ⚠️
            </div>
            
            <div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#fff", marginBottom: "0.5rem" }}>
                Lead Limit Exceeded
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: "1.6" }}>
                You have reached the maximum lead quota for your current <strong style={{ color: "var(--primary)" }}>{user.plan.toUpperCase()}</strong> plan. 
                Upgrade to PRO to unlock massive searches, full geographic proxy targets, and executive MX scans.
              </p>
            </div>

            {/* Quota Progress Gauge inside modal */}
            <div style={{ width: "100%", background: "rgba(255,255,255,0.02)", padding: "1.2rem", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Usage stats:</span>
                <strong style={{ color: "#ef4444" }}>{user.leadsUsed.toLocaleString()} / {user.leadLimit.toLocaleString()} Leads</strong>
              </div>
              <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                <div style={{ width: `${Math.min((user.leadsUsed / user.leadLimit) * 100, 100)}%`, height: "100%", background: "#ef4444", borderRadius: "4px" }}></div>
              </div>
            </div>

            {/* Checkout Form Simulation */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", width: "100%" }}>
              <button
                onClick={handleUpgradePlan}
                disabled={isUpgrading}
                className="btn btn-primary pulse-btn"
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "50px",
                  fontWeight: "800",
                  fontSize: "0.95rem",
                  background: "var(--glow-gradient)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isUpgrading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <span className="status-dot pulse" style={{ width: "8px", height: "8px", backgroundColor: "#fff" }}></span>
                    Processing Secure Payment...
                  </span>
                ) : (
                  "🔥 Upgrade to PRO (Only $19/mo)"
                )}
              </button>
              
              <button
                onClick={() => setLimitExceededModalOpen(false)}
                disabled={isUpgrading}
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  borderRadius: "50px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel / Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dynamic script injection for Lemon Squeezy Overlay */}
      <Script
        src="https://lmsqueezy.com/media/js/lemon.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("[CompX Billing] Lemon Squeezy Script Loaded successfully.");
          if ((window as any).LemonSqueezy) {
            try {
              (window as any).LemonSqueezy.Setup({
                eventHandler: (event: any) => {
                  console.log("[CompX Billing] Received Lemon Squeezy Event:", event);
                  if (event.event === "Checkout.Success") {
                    console.log("[CompX Billing] Checkout transaction complete! User will be upgraded via webhook.");
                  }
                },
              });
              console.log("[CompX Billing] Lemon Squeezy Setup configured.");
            } catch (err) {
              console.error("[CompX Billing] Setup error:", err);
            }
          }
        }}
      />

      {/* Quota-Tailored Selected Lead Intelligence Inspector Modal */}
      {selectedLead && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(5, 5, 8, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "700px",
              width: "100%",
              padding: "2.5rem",
              borderRadius: "24px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.15)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedLead(null)}
              style={{
                position: "absolute",
                top: "1.5rem",
                right: "1.5rem",
                background: "rgba(255,255,255,0.05)",
                border: "none",
                color: "#fff",
                fontSize: "1.2rem",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              ✕
            </button>

            {/* Header info */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2rem" }}>
                {selectedLead.source === "Website" ? "🌐" : selectedLead.source === "LinkedIn" ? "💼" : selectedLead.source === "Instagram" ? "📸" : "📍"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#fff", marginBottom: "0.2rem" }}>
                  {selectedLead.name}
                </h3>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {getSourceBadge(selectedLead.source)}
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>• Extracted on {selectedLead.date}</span>
                </div>
              </div>
            </div>

            {/* Core Info Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.2rem",
                background: "rgba(255,255,255,0.02)",
                padding: "1.5rem",
                borderRadius: "16px",
                border: "1px solid var(--glass-border)",
                marginBottom: "1.8rem",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Category / Sector</span>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#fff", marginTop: "0.2rem" }}>{selectedLead.category}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Phone Number</span>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#fff", marginTop: "0.2rem", fontFamily: "monospace" }}>{selectedLead.phone || "N/A"}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Verified Email</span>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "#a7f3d0", marginTop: "0.2rem", fontFamily: "monospace" }}>{selectedLead.email || "Missing"}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Website Link</span>
                <a
                  href={selectedLead.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", fontSize: "0.95rem", color: "var(--primary)", marginTop: "0.2rem", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {selectedLead.website || "N/A"}
                </a>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Geographic Address</span>
                <strong style={{ display: "block", fontSize: "0.9rem", color: "#fff", marginTop: "0.2rem", fontWeight: "normal" }}>{selectedLead.address}</strong>
              </div>
            </div>

            {/* Platform-Specific Metrics Section */}
            <div style={{ marginBottom: "2rem" }}>
              {selectedLead.source === "Google Maps" && (
                <div>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "0.8rem", color: "#fff" }}>📍 Google Maps Reputation Metrics</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Reputation Rating</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.3rem" }}>
                        <span style={{ fontSize: "2rem", fontWeight: "800", color: "#f59e0b" }}>{selectedLead.rating}</span>
                        <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ 5.0</span>
                      </div>
                      {/* Visual stars gauge */}
                      <div style={{ display: "flex", gap: "2px", marginTop: "0.3rem", color: "#f59e0b" }}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span key={idx}>{idx < Math.round(selectedLead.rating) ? "★" : "☆"}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Review Volume Gauge</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.3rem" }}>
                        <span style={{ fontSize: "2rem", fontWeight: "800", color: "#fff" }}>{selectedLead.reviews}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>total reviews</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min((selectedLead.reviews / 250) * 100, 100)}%`, height: "100%", background: "var(--primary)", borderRadius: "3px" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedLead.source === "Website" && (
                <div>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "0.8rem", color: "#fff" }}>🌐 Domain Extracted Contacts & Metadata</h4>
                  {selectedLead.enrichmentData && selectedLead.enrichmentData.length > 0 ? (
                    <div style={{ border: "1px solid var(--glass-border)", borderRadius: "12px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                            <th style={{ padding: "0.6rem 1rem", color: "var(--text-muted)" }}>Resource Type</th>
                            <th style={{ padding: "0.6rem 1rem", color: "var(--text-muted)" }}>Value / Target URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLead.enrichmentData.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < (selectedLead.enrichmentData?.length ?? 0) - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <span style={{
                                  background: item.type === "Email" ? "rgba(16,185,129,0.1)" : "rgba(6,182,212,0.1)",
                                  color: item.type === "Email" ? "#10b981" : "var(--accent-blue)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.72rem",
                                  fontWeight: "bold"
                                }}>
                                  {item.type}
                                </span>
                              </td>
                              <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                                {item.type === "Email" ? (
                                  <span style={{ color: "#a7f3d0" }}>{item.value}</span>
                                ) : (
                                  <a href={item.value} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>
                                    {item.value}
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No supplementary email structures or social indexes scraped yet. Run the bulk domain enricher.</p>
                  )}
                </div>
              )}

              {selectedLead.source === "LinkedIn" && (
                <div>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "0.8rem", color: "#fff" }}>💼 LinkedIn Professional Account Metrics</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Company Size Profile</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--accent-blue)", marginTop: "0.5rem" }}>
                        {selectedLead.companySize || "11-50 employees"}
                      </strong>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Profile Outbound Status</span>
                      <strong style={{ display: "block", fontSize: "1.1rem", color: "#10b981", marginTop: "0.5rem" }}>
                        Ready for outreach
                      </strong>
                    </div>
                  </div>
                  {selectedLead.linkedinUrl && (
                    <a
                      href={selectedLead.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.7rem 1.2rem",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        background: "linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)",
                        border: "none",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: "700",
                        boxShadow: "0 0 15px rgba(0, 119, 181, 0.3)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      🔗 Open LinkedIn Corporate Profile
                    </a>
                  )}
                </div>
              )}

              {selectedLead.source === "Instagram" && (
                <div>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "0.8rem", color: "#fff" }}>📸 Instagram Creator & Brand Insights</h4>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Parsed Biography Bio</span>
                      <blockquote style={{ margin: "0.5rem 0 0 0", paddingLeft: "0.8rem", borderLeft: "2px solid var(--primary)", fontSize: "0.85rem", color: "#fff", fontStyle: "italic", lineHeight: "1.4" }}>
                        "{selectedLead.biography || "Direct outbound queries: contact page available."}"
                      </blockquote>
                    </div>
                    
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "12px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Follower Volume Gauge</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.3rem" }}>
                        <span style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ec4899" }}>
                          {selectedLead.followersCount ? `${(selectedLead.followersCount / 1000).toFixed(1)}k` : "15.4k"}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Followers</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", marginTop: "0.5rem" }}>
                        <div style={{ width: `${Math.min(((selectedLead.followersCount || 15400) / 100000) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)", borderRadius: "3px" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct CRM Integration & Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1.5rem" }}>
              <button
                onClick={() => {
                  if (selectedLead.status === "Synced") return;
                  setIsSyncing(true);
                  setTimeout(async () => {
                    if (user && user.uid) {
                      await updateLeadsSyncStatusInDb(user.uid, [selectedLead.id], "Synced");
                      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: "Synced" } : l));
                      setSelectedLead(prev => prev ? { ...prev, status: "Synced" } : null);
                    }
                    setIsSyncing(false);
                  }, 1000);
                }}
                disabled={selectedLead.status === "Synced" || isSyncing}
                className="btn btn-secondary"
                style={{
                  padding: "0.7rem 1.4rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  borderColor: selectedLead.status === "Synced" ? "#10b981" : "var(--glass-border)",
                  color: selectedLead.status === "Synced" ? "#10b981" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: selectedLead.status === "Synced" ? "default" : "pointer"
                }}
              >
                {isSyncing ? (
                  "Syncing..."
                ) : selectedLead.status === "Synced" ? (
                  "🟢 Synced to HubSpot"
                ) : (
                  "🔗 Direct Sync to HubSpot Outbound"
                )}
              </button>

              <button
                onClick={() => setSelectedLead(null)}
                className="btn btn-primary"
                style={{
                  padding: "0.7rem 1.8rem",
                  borderRadius: "50px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
