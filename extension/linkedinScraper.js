/**
 * CompX Leads Pro - LinkedIn Company Profile Scraper Engine (Master Version 7)
 * File: social-finder-extension/linkedinScraper.js
 *
 * v7 FIXES:
 * 1. goToAboutPage()   — wrong /about/ link bug fix (company slug validate)
 *                      — /about/ না পেলে URL manually construct করে navigate
 * 2. getField()        — Layer 2: querySelectorAll("*") performance fix
 * 3. extractWebsite()  — Layer W3: social & tracking domains properly blocked
 * 4. scrapeLinkedIn()  — navigate না করে background fetch দিয়ে /about/ পড়া
 *                      — companyName fallback selectors যোগ
 */

// ── FIX 1: goToAboutPage ────────────────────────────────────────────────────
// আগের সমস্যা: যেকোনো /about/ link এ navigate করত — অন্য company-র লিংকও ধরত
// Fix: current company slug দিয়ে match করো, না পেলে URL manually construct করো
async function goToAboutPage() {
  if (window.location.href.includes("/about/")) return;

  const slugMatch = window.location.href.match(/\/company\/([^/?#]+)/);
  const currentSlug = slugMatch ? slugMatch[1] : null;

  const aboutLink = [...document.querySelectorAll("a")].find(a => {
    if (!a.href.includes("/about/")) return false;
    if (currentSlug && !a.href.includes(`/company/${currentSlug}/`)) return false;
    return true;
  });

  if (aboutLink) {
    window.location.href = aboutLink.href;
    return;
  }

  // Fallback: manually construct /about/ URL (link DOM এ না থাকলে)
  if (currentSlug) {
    window.location.href = `https://www.linkedin.com/company/${currentSlug}/about/`;
  }
}

// ── FIX 2: getField ──────────────────────────────────────────────────────────
// আগের সমস্যা Layer 2: querySelectorAll("*") সব element scan করে — অনেক slow
// Fix: শুধু leaf-level text nodes টার্গেট করা হচ্ছে
function getField(label, doc = document) {
  // --- LAYER 1: DT/DD structure ---
  const dts = [...doc.querySelectorAll("dt")];
  const dtFound = dts.find(el =>
    el.textContent?.trim().toLowerCase() === label.toLowerCase() ||
    el.textContent?.trim().toLowerCase().includes(label.toLowerCase())
  );
  if (dtFound) {
    const dd = dtFound.nextElementSibling;
    if (dd && dd.tagName.toLowerCase() === "dd") {
      const txt = dd.textContent?.trim();
      if (txt) return txt;
    }
  }

  // --- LAYER 2: Next sibling text extraction (FIXED — span/p/li শুধু) ---
  // আগে: querySelectorAll("*") = হাজার হাজার element scan
  // এখন: শুধু leaf text elements scan করা হচ্ছে
  const leafEls = [...doc.querySelectorAll("span, p, li, h3, h4, div")].filter(
    el => el.children.length === 0
  );
  const labelEl = leafEls.find(el =>
    el.textContent?.trim().toLowerCase() === label.toLowerCase()
  );
  if (labelEl) {
    let sibling = labelEl.nextElementSibling;
    if (sibling) {
      const txt = sibling.textContent?.trim().split("\n")[0];
      if (txt) return txt;
    }
    sibling = labelEl.parentElement?.nextElementSibling;
    if (sibling) {
      const txt = sibling.textContent?.trim().split("\n")[0];
      if (txt) return txt;
    }
  }

  // --- LAYER 3: Regex Raw Text parsing ---
  const bodyText = doc.body?.textContent || doc.documentElement?.textContent || "";
  try {
    if (label.toLowerCase() === "industry") {
      const match = bodyText.match(/\nIndustry\s*\n([^\n]+)/i);
      if (match) return match[1].trim();
      const fallback = bodyText.match(/\n([^\n]+)\nCompany size/i);
      if (fallback) return fallback[1].trim();
    } else if (label.toLowerCase() === "company size") {
      const match = bodyText.match(/Company size\s*\n([0-9,\-+]+ employees)/i);
      if (match) return match[1].trim();
    } else if (label.toLowerCase() === "headquarters") {
      const match = bodyText.match(/Headquarters\s*\n([^\n]+)/i);
      if (match) return match[1].trim();
    } else if (label.toLowerCase() === "website") {
      const match = bodyText.match(/Website\s*\n(https?:\/\/[^\n]+)/i);
      if (match) return match[1].trim();
    } else if (label.toLowerCase() === "founded") {
      const match = bodyText.match(/Founded\s*\n(\d{4})/i);
      if (match) return match[1].trim();
    } else if (label.toLowerCase() === "specialties") {
      const match = bodyText.match(/Specialties\s*\n([^\n]+)/i);
      if (match) return match[1].trim();
    }
  } catch (e) {}

  return "";
}

// ── FIX 3: extractWebsite ────────────────────────────────────────────────────
// BLOCKED_DOMAINS = শুধু LinkedIn infrastructure + generic platforms
// কোনো company-র নিজের domain এখানে রাখা যাবে না (microsoft.com, apple.com ছিল — সরানো হয়েছে)
const BLOCKED_DOMAINS = [
  "linkedin.com", "lnkd.in", "licdn.com",
  "google.com", "google.co", "bing.com",
  "facebook.com", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "whatsapp.com",
  "t.me", "wa.me",
  "glassdoor.com", "indeed.com", "ziprecruiter.com"
];

// Root domain বের করে (e.g. "news.microsoft.com" → "microsoft.com")
function getRootDomain(href) {
  try {
    const hostname = new URL(href).hostname; // "news.microsoft.com"
    const parts = hostname.split(".");
    // Last 2 parts নাও (microsoft.com), country TLD হলে last 3 (e.g. co.uk)
    if (parts.length > 2 && parts[parts.length - 2].length <= 3) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  } catch (e) {
    return "";
  }
}

// Subdomain কিনা চেক করো (e.g. news.microsoft.com = subdomain, microsoft.com = root)
function isSubdomain(href) {
  try {
    const hostname = new URL(href).hostname;
    const root = getRootDomain(href);
    return hostname !== root && hostname !== `www.${root}`;
  } catch (e) {
    return false;
  }
}

function extractWebsite(doc = document) {
  const links = [...doc.querySelectorAll("a")];

  // Layer W1: DT "Website" label এর ভেতরের anchor — সবচেয়ে accurate
  const websiteDt = [...doc.querySelectorAll("dt")].find(el =>
    el.textContent?.trim().toLowerCase() === "website"
  );
  if (websiteDt) {
    const dd = websiteDt.nextElementSibling;
    const anchor = dd?.querySelector("a[href]");
    if (anchor) {
      try {
        const raw = anchor.href || "";
        if (raw.includes("linkedin.com/redir/redirect")) {
          const urlParam = new URL(raw).searchParams.get("url");
          if (urlParam) return decodeURIComponent(urlParam);
        } else if (raw.startsWith("http") && !raw.includes("linkedin.com")) {
          return raw;
        }
      } catch (e) {}
    }
  }

  // Layer W2: যেকোনো dd এর ভেতরে redirect link
  const redirectLink = links.find(link =>
    link.href?.includes("linkedin.com/redir/redirect") &&
    link.closest("dd")
  );
  if (redirectLink) {
    try {
      const urlParam = new URL(redirectLink.href).searchParams.get("url");
      if (urlParam) return decodeURIComponent(urlParam);
    } catch (e) {}
  }

  // Layer W3: External links collect করে root domain কে priority দাও
  // সমস্যা ছিল: news.microsoft.com আগে আসলে সেটাই return করত
  // Fix: root/www domain থাকলে সেটাকে prefer করো, subdomain কে না
  const externalLinks = links
    .map(l => l.href || "")
    .filter(href => {
      if (!href.startsWith("http")) return false;
      return !BLOCKED_DOMAINS.some(domain => href.includes(domain));
    });

  if (externalLinks.length > 0) {
    // Root বা www domain আছে কিনা দেখো — থাকলে সেটাই নাও
    const rootLink = externalLinks.find(href => !isSubdomain(href));
    if (rootLink) return rootLink;
    // সব subdomain হলে প্রথমটাই নাও
    return externalLinks[0];
  }

  // Layer W4: Regex fallback
  return getField("Website", doc);
}

// ── FIX 4: scrapeLinkedInCompany ────────────────────────────────────────────
// আগের সমস্যা: navigate হলে data miss হয় কারণ main page এ scrape হয়
// Fix: navigate এর বদলে background fetch দিয়ে /about/ page পড়া হচ্ছে
// এতে page reload ছাড়াই সব data পাওয়া যাবে
async function scrapeLinkedInCompany() {
  // Step 1: Current page থেকে যা পাওয়া যায় নাও
  const data = {
    companyName: (
      document.querySelector("h1")?.textContent?.trim() ||
      document.querySelector(".top-card-layout__title")?.textContent?.trim() ||
      document.querySelector('[data-anonymize="company-name"]')?.textContent?.trim() ||
      ""
    ),
    website:      extractWebsite(),
    industry:     getField("Industry"),
    companySize:  getField("Company size"),
    headquarters: getField("Headquarters"),
    founded:      getField("Founded"),
    specialties:  getField("Specialties"),
    linkedin:     window.location.href
  };

  // Step 2: Missing fields থাকলে /about/ page background fetch করো (navigate ছাড়া)
  const hasMissing = !data.website || !data.industry || !data.companySize || !data.founded;
  if (hasMissing && !window.location.href.includes("/about/")) {
    try {
      const slugMatch = window.location.href.match(/\/company\/([^/?#]+)/);
      if (slugMatch) {
        const aboutUrl = `https://www.linkedin.com/company/${slugMatch[1]}/about/`;
        const res = await fetch(aboutUrl, { credentials: "include" });
        if (res.ok) {
          const html = await res.text();
          const parser = new DOMParser();
          const aboutDoc = parser.parseFromString(html, "text/html");

          if (!data.companyName) data.companyName = aboutDoc.querySelector("h1")?.textContent?.trim() || "";
          if (!data.website)     data.website      = extractWebsite(aboutDoc);
          if (!data.industry)    data.industry     = getField("Industry", aboutDoc);
          if (!data.companySize) data.companySize  = getField("Company size", aboutDoc);
          if (!data.headquarters)data.headquarters = getField("Headquarters", aboutDoc);
          if (!data.founded)     data.founded      = getField("Founded", aboutDoc);
          if (!data.specialties) data.specialties  = getField("Specialties", aboutDoc);
        }
      }
    } catch (e) {
      console.warn("CompX: /about/ background fetch failed:", e.message);
    }
  }

  return data;
}

// Auto-execute removed: scrapeLinkedInCompany() is called via chrome.runtime.onMessage in content.js
