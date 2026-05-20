"use client";

import React, { useState, useEffect, useRef } from "react";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleDocumentClick);
    }
    
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={widgetRef}
      className={`support-widget ${isOpen ? "active" : ""}`}
      id="supportWidget"
    >
      <button
        onClick={toggleOpen}
        className={`support-trigger ${isOpen ? "active" : ""}`}
        id="supportTrigger"
        aria-label="Get Support"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Get Support</span>
      </button>

      <div className={`support-menu ${isOpen ? "active" : ""}`} id="supportMenu">
        <div className="support-menu-header">
          <h4>Need Help?</h4>
          <p>Contact our support team</p>
        </div>
        <div className="support-options">
          <a
            href="https://wa.me/8801922577297"
            className="support-opt-item whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="opt-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M5.784 21.332l.003-.002 1.422-.378A9.956 9.956 0 0 0 12 22.8c5.414 0 9.8-4.386 9.8-9.8S17.414 3.2 12 3.2 2.2 7.586 2.2 13c0 1.74.455 3.37 1.243 4.79l-.003.003-.49 1.898 2.834-.359zm-2.05 1.46L2 22.8l1.26-4.884A10.98 0 0 1 2 13C2 7.477 6.477 3 12 3s10 4.477 10 10-4.477 10-10 10a10.971 10.971 0 0 1-5.284-1.348l-2.982.14z" />
              </svg>
            </div>
            <div className="opt-details">
              <span className="opt-title">WhatsApp Chat</span>
              <span className="opt-desc">01922577297</span>
            </div>
          </a>
          <a
            href="mailto:support.compx@gmail.com"
            className="support-opt-item email"
          >
            <div className="opt-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="opt-details">
              <span className="opt-title">Email Support</span>
              <span className="opt-desc">support.compx@gmail.com</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
