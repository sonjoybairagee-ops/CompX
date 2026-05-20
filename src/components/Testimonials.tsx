"use client";

import React from "react";
import { handleSpotlightMouseMove } from "@/utils/spotlight";

interface Testimonial {
  avatarText: string;
  name: string;
  role: string;
  quote: string;
}

const testimonialsList: Testimonial[] = [
  {
    avatarText: "RH",
    name: "Rahat Hossain",
    role: "Fiverr Lead Generation Seller",
    quote: '"CompX is perfect for Fiverr lead generation gig orders. I can scrape client lists in minutes instead of manually browsing sites. Saved me 10+ hours per week!"',
  },
  {
    avatarText: "KS",
    name: "Kate Smith",
    role: "SEO Agency CEO",
    quote: '"The LinkedIn enrichment and Google Maps scrapers are extremely accurate. Out of all scraping tools I used, CompX has the cleanest validation data."',
  },
  {
    avatarText: "AN",
    name: "Asif Newaz",
    role: "Start-up Founder",
    quote: '"We built our initial SaaS outbound pipeline strictly using CompX Leads Pro bulk extraction. The AI Cold Email builder makes personalization incredibly fast."',
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials section bg-darker">
      <div className="container">
        <div className="section-header reveal active">
          <h2>Loved by Growth Hackers</h2>
          <p>
            See how agencies, freelancers, and marketers use CompX to book more
            appointments.
          </p>
        </div>
        <div className="testimonial-grid grid">
          {testimonialsList.map((t, idx) => (
            <div
              key={idx}
              className="testimonial-card glass-card reveal active"
              onMouseMove={handleSpotlightMouseMove}
            >
              <div className="author">
                <div className="avatar">{t.avatarText}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
              <p>{t.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
