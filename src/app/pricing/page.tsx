"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import BuyModal from "@/components/BuyModal";
import SupportWidget from "@/components/SupportWidget";

export default function PricingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"compx-lifetime" | "compx-leads-pro">("compx-leads-pro");
  const [activeRegion, setActiveRegion] = useState<"local" | "global">("local");
  const [activeLeadsCycle, setActiveLeadsCycle] = useState<"monthly" | "yearly">("monthly");
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (planId: string) => {
    // Lead generation conversion funnel: Pricing CTA routes directly to secure Login/Registration page
    router.push("/login");
  };

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "8rem" }}>
        <Pricing
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeRegion={activeRegion}
          setActiveRegion={setActiveRegion}
          activeLeadsCycle={activeLeadsCycle}
          setActiveLeadsCycle={setActiveLeadsCycle}
          onOpenModal={handleOpenModal}
        />
      </div>
      <Footer />

      <BuyModal
        planId={selectedPlanId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultRegion={activeRegion}
        defaultLeadsCycle={activeLeadsCycle}
      />
      <SupportWidget />
    </>
  );
}
