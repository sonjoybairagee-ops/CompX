"use client";

import React, { useState, useEffect } from "react";
import { pricingDb } from "@/data/pricingDb";

interface BuyModalProps {
  planId: string | null;
  isOpen: boolean;
  onClose: () => void;
  defaultRegion: "local" | "global";
  defaultLeadsCycle: "monthly" | "yearly";
}

export default function BuyModal({
  planId,
  isOpen,
  onClose,
  defaultRegion,
  defaultLeadsCycle,
}: BuyModalProps) {
  const [modalPricingType, setModalPricingType] = useState<"local" | "global">(defaultRegion);
  const [modalBillingCycle, setModalBillingCycle] = useState<"monthly" | "yearly">(defaultLeadsCycle);

  // Sync state with parent defaults when modal is opened
  useEffect(() => {
    if (isOpen) {
      setModalPricingType(defaultRegion);
      setModalBillingCycle(defaultLeadsCycle);
    }
  }, [isOpen, defaultRegion, defaultLeadsCycle]);

  if (!isOpen || !planId) return null;

  const ext = pricingDb[planId];
  if (!ext) return null;

  // Pricing values calculations
  let currency = "";
  let amount = "";
  let period = "one-time";
  let subText = "";
  let checkoutLink = "";
  let couponCode = "";
  let couponDesc = "";

  if (ext.isSubscription) {
    const regionTier = ext.prices[modalPricingType];
    const cycleTier = (regionTier as any)[modalBillingCycle];

    currency = cycleTier.currency;
    amount = cycleTier.amount;
    period = modalBillingCycle === "monthly" ? "/month" : "/year";
    checkoutLink = cycleTier.checkout;

    if (modalPricingType === "local") {
      subText = `Billing cycle: ${modalBillingCycle === "monthly" ? "Monthly" : "Yearly"}.`;
      couponCode = cycleTier.coupon;
      couponDesc = cycleTier.couponDesc;
    } else {
      subText = `Billing cycle: ${modalBillingCycle === "monthly" ? "Monthly" : "Yearly"} in standard USD currency.`;
    }
  } else {
    // Lifetime deal
    const regionTier = ext.prices[modalPricingType];

    currency = (regionTier as any).currency;
    amount = (regionTier as any).amount;
    period = "one-time";
    checkoutLink = (regionTier as any).checkout;

    if (modalPricingType === "local") {
      subText = `Lifetime browser extensions standard access license.`;
      couponCode = (regionTier as any).coupon;
      couponDesc = (regionTier as any).couponDesc;
    } else {
      subText = `Lifetime license in global USD. Pay once, use forever.`;
    }
  }

  return (
    <div className={`modal active`} id="buy-modal" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <div className="modal-body">
          <div className="modal-ext-header">
            <h3 id="modal-title">{ext.name}</h3>
            <p id="modal-desc" style={{ fontSize: "0.92rem" }}>
              {ext.description}
            </p>
          </div>

          <div
            className="pricing-selector-container"
            style={{ marginBottom: "1rem" }}
          >
            <div className="pricing-selector" style={{ width: "100%" }}>
              <button
                className={`selector-btn ${
                  modalPricingType === "local" ? "active" : ""
                }`}
                onClick={() => setModalPricingType("local")}
                style={{ flex: 1 }}
              >
                🇧🇩 BD Local (৳)
              </button>
              <button
                className={`selector-btn ${
                  modalPricingType === "global" ? "active" : ""
                }`}
                onClick={() => setModalPricingType("global")}
                style={{ flex: 1 }}
              >
                🌐 International ($)
              </button>
            </div>
          </div>

          {/* Subscription Billing Cycle Toggle */}
          {ext.isSubscription && (
            <div
              className="pricing-selector-container"
              id="modal-billing-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <div
                className="pricing-selector"
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "4px",
                  borderRadius: "8px",
                }}
              >
                <button
                  className={`selector-btn ${
                    modalBillingCycle === "monthly" ? "active" : ""
                  }`}
                  onClick={() => setModalBillingCycle("monthly")}
                  style={{ flex: 1, padding: "8px", fontSize: "0.85rem" }}
                >
                  📅 Monthly
                </button>
                <button
                  className={`selector-btn ${
                    modalBillingCycle === "yearly" ? "active" : ""
                  }`}
                  onClick={() => setModalBillingCycle("yearly")}
                  style={{ flex: 1, padding: "8px", fontSize: "0.85rem" }}
                >
                  📅 Yearly (Save 50%)
                </button>
              </div>
            </div>
          )}

          <div className="modal-price-area">
            <span className="modal-price-currency">{currency}</span>
            <span className="modal-price-number" id="modal-price-number">
              {amount}
            </span>
            <span className="modal-price-period">{period}</span>
          </div>
          <p
            className="modal-price-sub"
            id="modal-price-sub"
            dangerouslySetInnerHTML={{ __html: subText }}
          ></p>

          <div
            className="modal-discount-codes"
            id="modal-discount-container"
            style={{
              display: couponCode || ext.deviceLimit ? "block" : "none",
            }}
          >
            {couponCode && (
              <>
                <p className="discount-label">
                  🎟️ {modalPricingType === "local" ? "BDT Local" : "Subscription Special"}{" "}
                  Launch Discount Coupon Code:
                </p>
                <div className="discount-row">
                  <span className="discount-badge">{couponCode}</span>
                  <span className="discount-text">{couponDesc}</span>
                </div>
              </>
            )}

            {ext.deviceLimit && (
              <div
                className="device-limitation-alert"
                style={{
                  marginTop: "0.8rem",
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid var(--accent-blue)",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "var(--accent-blue)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  textAlign: "left",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
                <span>
                  <strong>Device Limitation:</strong> Bound to{" "}
                  {ext.deviceLimit} active device session lock. Can be
                  transferred easily.
                </span>
              </div>
            )}
          </div>

          <div
            className="pricing-cta"
            style={{
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
            }}
          >
            {modalPricingType === "local" ? (
              <a
                href={checkoutLink}
                id="modal-checkout-local"
                className="btn btn-primary pulse-btn"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", width: "100%" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Buy in Bangladesh (BKash / Nagad)
              </a>
            ) : (
              <a
                href={checkoutLink}
                id="modal-checkout-global"
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  width: "100%",
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  color: "#fff",
                  border: "none",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Buy Globally (Card / PayPal)
              </a>
            )}
            <p className="pricing-note">
              ⚡ License delivered automatically via email instantly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
