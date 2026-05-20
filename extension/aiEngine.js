export function analyzeLead(data) {
  const lead = {
    score: 0,
    category: "unknown",
    intent: "cold",
    signals: []
  };

  // --- SCORING SYSTEM ---
  if (data.email && data.email.length > 0) {
    lead.score += 30;
    lead.signals.push("email_found");
  }

  if (data.phone && data.phone.length > 0) {
    lead.score += 20;
    lead.signals.push("phone_found");
  }

  if (data.website) {
    lead.score += 10;
    lead.signals.push("website_present");
  }

  if (data.social && data.social.length > 0) {
    lead.score += 10;
    lead.signals.push("social_presence");
  }

  if (data.hasBooking || data.keywords?.includes("book")) {
    lead.score += 25;
    lead.signals.push("booking_system");
  }

  // --- CATEGORY DETECTION ---
  const text = (data.text || "").toLowerCase();

  if (text.includes("spa") || text.includes("massage")) {
    lead.category = "wellness";
  } else if (text.includes("agency") || text.includes("marketing")) {
    lead.category = "agency";
  } else if (text.includes("restaurant") || text.includes("food")) {
    lead.category = "restaurant";
  } else {
    lead.category = "general business";
  }

  // --- INTENT CLASSIFICATION ---
  if (lead.score >= 70) {
    lead.intent = "hot";
  } else if (lead.score >= 40) {
    lead.intent = "warm";
  } else {
    lead.intent = "cold";
  }

  return lead;
}
