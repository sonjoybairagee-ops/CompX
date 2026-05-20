"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import Compare from "@/components/Compare";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Support from "@/components/Support";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import BuyModal from "@/components/BuyModal";
import SupportWidget from "@/components/SupportWidget";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"compx-lifetime" | "compx-leads-pro">("compx-lifetime");
  const [activeRegion, setActiveRegion] = useState<"local" | "global">("local");
  const [activeLeadsCycle, setActiveLeadsCycle] = useState<"monthly" | "yearly">("monthly");
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");
    
    // Dynamically strip initial 'active' hardcode to enable the fade-in entry transitions
    revealElements.forEach((el) => {
      el.classList.remove("active");
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            // Stop observing once fade-in has been activated for optimal UI stability
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const handleOpenModal = (planId: string) => {
    // Pricing CTA redirects directly to login/signup for user creation/conversion
    router.push("/login");
  };

  const handleSelectTab = (tabId: "compx-lifetime" | "compx-leads-pro") => {
    setActiveTab(tabId);
  };

  return (
    <>
      <Navbar />
      <Hero onSelectTab={handleSelectTab} />
      <SocialProof />
      <Compare onSelectTab={handleSelectTab} />
      <Features />
      
      {/* How it Works - Keep directly in page.tsx for layout simplicity */}
      <section id="how-it-works" className="how-it-works section bg-darker">
        <div className="container">
          <div className="section-header reveal active">
            <h2>How CompX Works</h2>
          </div>
          <div className="steps grid">
            <div className="step-item reveal active">
              <div className="step-number">01</div>
              <h3>Install the Extension</h3>
              <p>Add the lightweight CompX extension to Google Chrome or Mozilla Firefox in seconds.</p>
            </div>
            <div className="step-item reveal active">
              <div className="step-number">02</div>
              <h3>Visit Website or Search</h3>
              <p>Navigate to LinkedIn, search Google Maps, or load any corporate website you want to target.</p>
            </div>
            <div className="step-item reveal active">
              <div className="step-number">03</div>
              <h3>Extract Leads Instantly</h3>
              <p>Click the CompX icon to instantly extract verified emails, phones, and social links in real-time.</p>
            </div>
            <div className="step-item reveal active">
              <div className="step-number">04</div>
              <h3>Export to CSV or CRM</h3>
              <p>Download clean data as CSV, sync directly to Google Sheets, or push to your outbound CRM.</p>
            </div>
          </div>
        </div>
      </section>

      <Pricing
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRegion={activeRegion}
        setActiveRegion={setActiveRegion}
        activeLeadsCycle={activeLeadsCycle}
        setActiveLeadsCycle={setActiveLeadsCycle}
        onOpenModal={handleOpenModal}
      />

      <Testimonials />
      <FAQ />
      <CTA onSelectTab={handleSelectTab} />
      <Support />
      <Footer />

      {/* Shared Purchase Modal */}
      <BuyModal
        planId={selectedPlanId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultRegion={activeRegion}
        defaultLeadsCycle={activeLeadsCycle}
      />

      {/* Floating Widget */}
      <SupportWidget />
    </>
  );
}

// Temporary inline import redirection to prevent circular or build reference issues
import Pricing from "@/components/Pricing";
