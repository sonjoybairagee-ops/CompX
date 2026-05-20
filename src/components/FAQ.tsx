"use client";

import React, { useState } from "react";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface FaqItem {
  question: string;
  answer: string;
}

const faqList: FaqItem[] = [
  {
    question: "Is CompX legal?",
    answer: "Yes, CompX scrapes publicly accessible business contact information (emails, phones, addresses) in accordance with open-web extraction policies. We do not extract private user credentials.",
  },
  {
    question: "Does it work on Chrome and Firefox?",
    answer: "Absolutely! The CompX browser extension is fully compiled and compatible with both Google Chrome (and all Chromium-based browsers like Edge/Brave) and Mozilla Firefox.",
  },
  {
    question: "Do I need coding skills to use it?",
    answer: "No coding skills are required. CompX is built with a zero-friction, one-click visual graphical user interface. Anyone can start extracting leads in seconds.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, your Leads Pro subscription (Starter, Pro, or Business) can be managed or canceled at any time directly through your dashboard with zero lock-in contracts.",
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (idx: number) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="faq section">
      <div className="container">
        <div className="section-header reveal active">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about CompX scraping tools.</p>
        </div>
        <div className="faq-list">
          {faqList.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <div
                key={idx}
                className={`faq-item glass-card reveal active ${
                  isActive ? "active" : ""
                }`}
                onMouseMove={handleSpotlightMouseMove}
              >
                <button
                  className="faq-trigger"
                  onClick={() => toggleAccordion(idx)}
                  aria-expanded={isActive}
                >
                  <span>{item.question}</span>
                  <span className="faq-caret">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isActive ? "rotate(180deg)" : "none",
                        transition: "transform 0.3s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>
                <div
                  className="faq-content"
                  style={{
                    maxHeight: isActive ? "200px" : "0px",
                    overflow: "hidden",
                    transition: "max-height 0.35s ease",
                  }}
                >
                  <p style={{ paddingBottom: "1.2rem" }}>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
