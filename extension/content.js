// STEP 1 & 3 — Clean Data Extractor & Contact Auto Finder (Chrome Core Engine)
const storage = (typeof browser !== "undefined") ? browser : chrome;

// Intercept Auth Token from SaaS Dashboard
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === "COMPX_AUTH_TOKEN" && event.data.token) {
    console.log("[CompX Content] Received Auth Token from Dashboard.");
    chrome.runtime.sendMessage({ 
      type: "AUTH_TOKEN", 
      token: event.data.token 
    });
  }
});

async function safeGet(keys) {
  return new Promise((resolve) => {
    storage.storage.local.get(keys, resolve);
  });
}

async function safeSet(data) {
  return new Promise((resolve) => {
    storage.storage.local.set(data, resolve);
  });
}

const blockedKeywords = [
  "sentry",
  "react",
  "lodash",
  "core-js",
  "polyfill",
  "rspack",
  "npm",
  "webpack",
  "chunk",
  "bundle",
  "wixpress",
  "google",
  "facebook",
  "twitter",
  "instagram"
];

const priorityKeywords = [
  "info",
  "contact",
  "hello",
  "support",
  "admin",
  "sales",
  "team",
  "marketing"
];

function isValidBusinessEmail(email) {
  if (!email || typeof email !== "string") return false;
  email = email.trim().toLowerCase();

  // Basic check for @ and dot
  if (!email.includes("@") || !email.includes(".")) return false;

  // STEP 2 - Reject blocked keywords
  for (const word of blockedKeywords) {
    if (email.includes(word)) {
      return false;
    }
  }

  // STEP 2 - Reject package style (weird version/package patterns)
  if (/\d+\.\d+\.\d+/.test(email)) {
    return false;
  }

  // STEP 2 - Reject long hash-like strings (e.g. 20+ chars)
  if (/^[a-f0-9]{20,}@/.test(email)) {
    return false;
  }

  // Common placeholders or test addresses block
  const genericPrefixes = [
    "user", "test", "email", "mail", "username", "example",
    "yourname", "myemail", "placeholder", "null", "undefined"
  ];

  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [localPart, domainPart] = parts;

  if (!localPart || !domainPart) return false;

  // Filter if localPart matches common prefixes exactly or starts with them followed by a number
  if (genericPrefixes.some(prefix => localPart === prefix || /^[a-z]+[0-9]+$/i.test(localPart) && localPart.startsWith(prefix))) {
    return false;
  }

  // TLD validation
  const domainParts = domainPart.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || tld.length > 6) return false;

  // Block matching system/asset files embedded as strings in js files (like icon.png@2x, or image.jpg)
  const invalidExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".rar", ".pdf", ".mp4", ".mp3"
  ];
  if (invalidExtensions.some(ext => domainPart.endsWith(ext) || localPart.endsWith(ext))) {
    return false;
  }

  // Filter out other generic hex hashes
  if (/^[a-f0-9]{10,}$/i.test(localPart)) return false;

  // Validate characters allowed in real business emails
  if (!/^[a-z0-9._%+-]+$/i.test(localPart)) return false;
  if (!/^[a-z0-9.-]+$/i.test(domainPart)) return false;

  // Ensure there are no double dots
  if (localPart.includes("..") || domainPart.includes("..")) return false;

  return true;
}

function scoreEmail(email) {
  if (!email) return 0;
  email = email.toLowerCase();
  let score = 0;

  priorityKeywords.forEach((word) => {
    if (email.includes(word)) {
      score += 10;
    }
  });

  if (email.endsWith(".gov")) score += 20;

  return score;
}

// content.js এর ইমেইল এক্সট্রাক্টর আরো শক্তিশালী করা হলো
function extractEmails(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
  return text.match(emailRegex) || [];
}

function extractSocials(doc = document) {
  if (!doc) return [];
  const links = [...doc.querySelectorAll("a")];

  const socials = [];

  links.forEach(link => {
    const href = link.href;

    if (!href) return;

    const patterns = [
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "twitter.com",
      "x.com",
      "youtube.com",
      "tiktok.com"
    ];

    if (patterns.some(p => href.includes(p))) {
      socials.push(href);
    }
  });

  return [...new Set(socials)];
}

function extractPhones(doc = document) {
  if (!doc || !doc.body) return [];
  
  // High Impact Regex from User Spec (match standard US/INTL structures on innerText)
  const bodyText = doc.body.innerText || "";
  const phoneRegex1 = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones1 = bodyText.match(phoneRegex1) || [];

  // Fallback pattern on HTML content
  const html = doc.body.innerHTML || "";
  const phoneRegex2 = /(\+?\d{1,3}[-.\s]?)?\d{10,12}/g;
  const phones2 = html.match(phoneRegex2) || [];

  const combined = [...phones1, ...phones2].map(p => p.trim());
  return [...new Set(combined)];
}

// STEP 3 — Contact Page Auto Finder (PRO FEATURE)
async function findContactPages() {
  const links = [...document.querySelectorAll("a")];

  const contactLinks = links
    .map(a => a.href)
    .filter(href =>
      href &&
      (href.includes("contact") || href.includes("about"))
    );

  let foundEmails = [];

  for (let url of contactLinks.slice(0, 3)) {
    try {
      const res = await fetch(url);
      const text = await res.text();

      const emails = superExtractEmails(text, null);
      if (emails) foundEmails.push(...emails);
    } catch (e) {}
  }

  return [...new Set(foundEmails.map(e => e.trim().toLowerCase()))];
}

// User Integrated core extractor function signature
function runExtractor() {
  const socialLinks = Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.href)
    .filter(link =>
      link.includes("linkedin") ||
      link.includes("facebook") ||
      link.includes("instagram") ||
      link.includes("twitter")
    );

  const emails = extractEmails(document.body ? document.body.innerText : "");
  const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
    .map(a => a.href.replace("mailto:", ""));

  const finalData = {
    emails: [...new Set([...emails, ...mailtos])],
    socialLinks: [...new Set(socialLinks)]
  };

  return {
    emails: finalData.emails,
    socials: finalData.socialLinks,
    phones: extractPhones(),
    contactEmails: []
  };
}

// Chrome MV3 compatible async listener
// Safe JSON serializer — circular ref বা undefined value থাকলে crash করে না
function safeSerialize(data) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (e) {
    console.error("CompX: Serialization error:", e);
    return null;
  }
}

// content.js er listener updating context
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ensure mode "scan_active" maps to "deep_scan"
  if (request && request.mode === "scan_active") {
    request.mode = "deep_scan";
  }

  if (request && request.type === "getPageRawHTML") {
    // Popup কে সরাসরি পেজের HTML, Socials আর Phones একসাথে পাস করা
    sendResponse({
      html: document.documentElement.innerHTML,
      socials: extractSocials(),
      phones: extractPhones()
    });
  } 
  else if (request && request.type === "enrich") {
    enrichWebsite(request.url)
      .then(result => {
        sendResponse(safeSerialize({
          company: result.company || "",
          meta: result.meta || {},
          emails: result.emails || [],
          socials: result.socialLinks || [],
          phones: result.phones || [],
          contactPages: result.contactPages || [],
          pagesScanned: result.pagesScanned || []
        }));
      })
      .catch(err => sendResponse({ error: err.message, emails: [], socials: [], phones: [], contactPages: [] }));
  } 
  else if (request && request.type === "gmaps") {
    const limit = request.limit || 100;
    scrapeGoogleMaps(limit)
      .then(async (data) => {
        const safe = safeSerialize(data);
        if (!safe || safe.length === 0) {
          sendResponse({ error: "No results found", results: [] });
        } else {
          await safeSet({ gmapsResults: safe });
          sendResponse({ useStorage: true, total: safe.length });
        }
      })
      .catch(err => sendResponse({ error: err.message, results: [] }));
  } 
  else if (request && request.type === "linkedin") {
    scrapeLinkedInCompany()
      .then(data => sendResponse(safeSerialize(data)))
      .catch(err => sendResponse({ error: err.message }));
  } 
  else if (request && request.type === "instagram") {
    try {
      const data = scrapeInstagramProfile();
      sendResponse(safeSerialize(data));
    } catch (err) {
      sendResponse({ error: err.message });
    }
  }
  else if (request && request.type === "universalScrape") {
    runUniversalScraper()
      .then(normalized => sendResponse(safeSerialize(normalized)))
      .catch(err => sendResponse({ error: err.message }));
  }
  else if (request && request.action === 'findContactPages') {
    findContactPages()
      .then(emails => sendResponse(safeSerialize(emails) || []))
      .catch(err => sendResponse([]));
  } 
  else {
    sendResponse(safeSerialize(runExtractor()));
  }
  return true; 
});

function getText(selector, doc = document) {
  return doc.querySelector(selector)
    ?.innerText
    ?.trim() || "";
}

function getField(label, doc = document) {
  // --- LAYER 1: DT/DD structure ---
  // textContent ব্যবহার করা হচ্ছে — innerText hidden elements এ কাজ করে না
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

  // --- LAYER 2: leaf elements only (performance fix) ---
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
  // textContent ব্যবহার — innerText React hidden elements এ empty string দেয়
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

// ── LinkedIn Website Extractor ───────────────────────────────────────────────
// getCompanyWebsite() এর পাশাপাশি এই function LinkedIn redirect links ভালো handle করে
const LINKEDIN_BLOCKED_DOMAINS = [
  "linkedin.com", "lnkd.in", "licdn.com",
  "google.com", "google.co", "bing.com",
  "facebook.com", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "whatsapp.com",
  "t.me", "wa.me", "glassdoor.com", "indeed.com", "ziprecruiter.com"
];

function extractLinkedInWebsite(doc = document) {
  const links = [...doc.querySelectorAll("a")];

  // Layer W1: DT "Website" এর DD এর anchor — সবচেয়ে accurate
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

  // Layer W2: dd এর ভেতরে যেকোনো redirect link
  const redirectLink = links.find(link =>
    link.href?.includes("linkedin.com/redir/redirect") && link.closest("dd")
  );
  if (redirectLink) {
    try {
      const urlParam = new URL(redirectLink.href).searchParams.get("url");
      if (urlParam) return decodeURIComponent(urlParam);
    } catch (e) {}
  }

  // Layer W3: External links — root domain prefer করো
  function _getRoot(href) {
    try {
      const parts = new URL(href).hostname.split(".");
      if (parts.length > 2 && parts[parts.length - 2].length <= 3) return parts.slice(-3).join(".");
      return parts.slice(-2).join(".");
    } catch (e) { return ""; }
  }
  function _isSub(href) {
    try {
      const h = new URL(href).hostname;
      const r = _getRoot(href);
      return h !== r && h !== `www.${r}`;
    } catch (e) { return false; }
  }

  const externalLinks = links
    .map(l => l.href || "")
    .filter(href => href.startsWith("http") && !LINKEDIN_BLOCKED_DOMAINS.some(d => href.includes(d)));

  if (externalLinks.length > 0) {
    const rootLink = externalLinks.find(href => !_isSub(href));
    if (rootLink) return rootLink;
    return externalLinks[0];
  }

  // Layer W4: Regex fallback
  return getField("Website", doc);
}

function getLinkedInCompanyJsonLd(doc = document) {
  const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent);
      
      const findSchema = (obj) => {
        if (!obj) return null;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = findSchema(item);
            if (found) return found;
          }
        } else if (typeof obj === "object") {
          const ctx = obj["@context"];
          if (ctx && ctx.includes("schema.org")) {
            return obj;
          }
          if (obj["@graph"]) {
            return findSchema(obj["@graph"]);
          }
        }
        return null;
      };

      const schema = findSchema(parsed);
      if (schema) return schema;
    } catch (e) {}
  }
  return null;
}

function getCompanyWebsite(doc = document) {
  // ── LAYER 1: JSON-LD Schema.org ──────────────────────────────────
  const schema = getLinkedInCompanyJsonLd(doc);
  if (schema) {
    if (schema.url && !schema.url.includes("linkedin.com") && !schema.url.includes("lnkd.in")) {
      return schema.url;
    }
    if (Array.isArray(schema.sameAs)) {
      const ext = schema.sameAs.find(u => !u.includes("linkedin.com") && !u.includes("lnkd.in"));
      if (ext) return ext;
    }
  }

  const links = [...doc.querySelectorAll("a")];

  // ── LAYER 2: LinkedIn redirect link (most reliable) ──────────────
  // LinkedIn wraps external URLs like: /redir/redirect?url=https%3A%2F%2Fmicrosoft.com
  const redirectLinks = links.filter(link => {
    const href = link.href || "";
    return href.includes("linkedin.com/redir/redirect") || href.includes("urlhash=");
  });

  for (const redirectLink of redirectLinks) {
    try {
      const urlObj = new URL(redirectLink.href);
      const decodedUrl = urlObj.searchParams.get("url");
      if (decodedUrl && !decodedUrl.includes("linkedin.com")) return decodeURIComponent(decodedUrl);
    } catch (e) {}
  }

  // ── LAYER 3: Raw text regex — "Website\nhttps://..." ────────────
  // LinkedIn About page shows website in plain text blocks
  const bodyText = doc.body?.innerText || "";
  const websiteMatch = bodyText.match(/Website\s*\n\s*(https?:\/\/[^\s\n]+)/i);
  if (websiteMatch) return websiteMatch[1].trim();

  // ── LAYER 4: aria-label or data-attribute anchors ────────────────
  const ariaLink = links.find(link => {
    const label = (link.getAttribute("aria-label") || "").toLowerCase();
    const href = link.href || "";
    return label.includes("website") && href.startsWith("http") && !href.includes("linkedin.com");
  });
  if (ariaLink) return ariaLink.href;

  // ── LAYER 5: Direct anchor near "Website" label ──────────────────
  const directLink = links.find(link => {
    const href = link.href || "";
    const text = link.innerText?.trim().toLowerCase();
    return (
      href.startsWith("http") &&
      !href.includes("linkedin.com") &&
      (
        text === "website" ||
        link.closest('[class*="website"]') ||
        link.closest('[class*="url"]') ||
        link.closest('[data-field="website"]')
      )
    );
  });
  if (directLink) return directLink.href;

  // ── LAYER 6: Generic external link fallback ──────────────────────
  // Root domain কে prefer করো — subdomain (news.microsoft.com) এর চেয়ে microsoft.com better
  const infrastructureDomains = [
    "linkedin.com", "lnkd.in", "licdn.com",
    "google.com", "google.co",
    "facebook.com", "twitter.com", "x.com",
    "instagram.com", "youtube.com", "tiktok.com",
    "whatsapp.com", "t.me", "wa.me"
  ];

  function _getRootDomain(href) {
    try {
      const hostname = new URL(href).hostname;
      const parts = hostname.split(".");
      if (parts.length > 2 && parts[parts.length - 2].length <= 3) return parts.slice(-3).join(".");
      return parts.slice(-2).join(".");
    } catch (e) { return ""; }
  }

  function _isSubdomain(href) {
    try {
      const hostname = new URL(href).hostname;
      const root = _getRootDomain(href);
      return hostname !== root && hostname !== `www.${root}`;
    } catch (e) { return false; }
  }

  const externalLinks = links
    .map(l => l.href || "")
    .filter(href => {
      if (!href.startsWith("http")) return false;
      return !infrastructureDomains.some(domain => href.includes(domain));
    });

  if (externalLinks.length > 0) {
    const rootLink = externalLinks.find(href => !_isSubdomain(href));
    if (rootLink) return rootLink;
    return externalLinks[0];
  }

  return "";
}

function parseTagline(rawText) {
  let industry = "";
  let companySize = "";
  
  // 1. Split on dot/dash delimiters first
  let parts = rawText.split(/\s*[·•|-]\s*/).map(s => s.trim()).filter(Boolean);
  
  if (parts.length <= 1) {
    const followersMatch = rawText.match(/(\d+(?:\.\d+)?[KMB]?\s+followers?)/i);
    const employeesMatch = rawText.match(/(\d+-\d+\s+employees?|\d+\+?\s+employees?|1\s+employee|self-employed|self\s+employed)/i);
    
    const followers = followersMatch ? followersMatch[1] : '';
    companySize = employeesMatch ? employeesMatch[1] : '';
    
    let cleanText = rawText;
    if (followersMatch) cleanText = cleanText.replace(followersMatch[0], '');
    if (employeesMatch) cleanText = cleanText.replace(employeesMatch[0], '');
    industry = cleanText.trim().replace(/\s+/g, ' ');
  } else {
    const sizePart = parts.find(p => p.toLowerCase().includes("employee") || p.match(/\d+-\d+/) || p.toLowerCase().includes("self-employed"));
    if (sizePart) companySize = sizePart;

    const firstPart = parts[0];
    if (firstPart && !firstPart.toLowerCase().includes("follower") && !firstPart.toLowerCase().includes("employee") && !firstPart.toLowerCase().includes("self-employed")) {
      industry = firstPart;
    }
  }
  
  return { industry, companySize };
}

async function goToAboutPage() {
  if (window.location.href.includes("/about/")) return;

  // FIX: current company slug দিয়ে match করো — অন্য company-র /about/ link ধরা যাবে না
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

  // Fallback: manually construct /about/ URL
  if (currentSlug) {
    window.location.href = `https://www.linkedin.com/company/${currentSlug}/about/`;
  }
}

async function scrapeLinkedInCompany() {
  // Step 1: Current page থেকে data নাও
  const data = {
    companyName: (
      document.querySelector("h1")?.textContent?.trim() ||
      document.querySelector(".top-card-layout__title")?.textContent?.trim() ||
      document.querySelector('[data-anonymize="company-name"]')?.textContent?.trim() ||
      ""
    ),
    website:     extractLinkedInWebsite(),
    industry:    getField("Industry"),
    companySize: getField("Company size"),
    linkedin:    window.location.href
  };

  // Step 2: Missing fields থাকলে /about/ background fetch করো
  const hasMissing = !data.companyName || !data.website || !data.industry || !data.companySize;
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
          if (!data.website)     data.website     = extractLinkedInWebsite(aboutDoc);
          if (!data.industry)    data.industry    = getField("Industry", aboutDoc);
          if (!data.companySize) data.companySize = getField("Company size", aboutDoc);
        }
      }
    } catch (e) {
      console.warn("CompX: /about/ background fetch failed:", e.message);
    }
  }

  // Step 3: Tagline fallback
  if (!data.industry || !data.companySize) {
    const taglineEl = document.querySelector(".top-card-layout__headline")
      || document.querySelector(".org-top-card-summary-info-list")
      || document.querySelector(".org-top-card-summary-info-item")
      || document.querySelector("h1")?.nextElementSibling;

    if (taglineEl) {
      const parsed = parseTagline(taglineEl.textContent || "");
      if (!data.industry) data.industry = parsed.industry;
      if (!data.companySize) data.companySize = parsed.companySize;
    }
  }

  // Step 4: Schema.org fallback
  const schema = getLinkedInCompanyJsonLd();
  if (schema) {
    if (!data.companyName && schema.name) data.companyName = schema.name;
    if (!data.industry && schema.industry) data.industry = schema.industry;
    if (!data.website && schema.website) data.website = schema.website;
  }

  if (!data.companyName) data.companyName = "LinkedIn Company";
  return data;
}

// ------------------------------------------------------------------
// GOOGLE MAPS SCRAPER ENGINE (Fixed & Dynamically Parameterized)
// ------------------------------------------------------------------

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBusinessNameFromPanel() {
  const s1 = document.querySelector('[role="main"] h1')?.innerText?.trim();
  if (s1 && s1.toLowerCase() !== "results" && s1.length > 1) return s1;

  const s2 = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge')?.innerText?.trim();
  if (s2 && s2.toLowerCase() !== "results" && s2.length > 1) return s2;

  const pane = document.querySelector('.bJzME, [jsaction*="pane"], [aria-label][role="region"]');
  if (pane) {
    const h1 = pane.querySelector("h1");
    const txt = h1?.innerText?.trim();
    if (txt && txt.toLowerCase() !== "results" && txt.length > 1) return txt;
  }

  const anyH1 = [...document.querySelectorAll("h1")]
    .find(el => {
      const t = el.innerText?.trim();
      return t && t.toLowerCase() !== "results" && t.length > 1;
    });
  if (anyH1) return anyH1.innerText.trim();

  const titleMatch = document.title.match(/^(.+?)\s*[-–]\s*Google Maps/i);
  if (titleMatch && titleMatch[1].toLowerCase() !== "results") return titleMatch[1].trim();

  return "";
}

async function waitForPanel() {
  const maxTries = 40; 
  for (let i = 0; i < maxTries; i++) {
    const name = getBusinessNameFromPanel();
    if (name) return name;
    await wait(200);
  }
  return "";
}

async function autoScrollResults() {
  const feed = document.querySelector('div[role="feed"]')
    || document.querySelector('div[aria-label*="Results"]');

  if (!feed) {
    console.warn("CompX Maps: Feed container not found!");
    return;
  }

  let lastHeight = 0;
  for (let i = 0; i < 20; i++) {
    feed.scrollTo(0, feed.scrollHeight);
    await wait(1800);
    if (feed.scrollHeight === lastHeight) break;
    lastHeight = feed.scrollHeight;
  }
  console.log("CompX Maps: Auto-scroll complete.");
}

function getBusinessCards() {
  return [...document.querySelectorAll('a[href*="/maps/place/"], a[href*="/place/"]')]
    .filter((el, idx, arr) => {
      return arr.findIndex(a => a.href === el.href) === idx;
    });
}

// Garbage icon clean করার এবং অতিরিক্ত স্পেস দূর করার হেল্পার ফাংশন
function cleanGmapsText(text) {
  if (!text) return "";
  // গুগল ম্যাপসের ইউনিকোড আইকন ক্যারেক্টারগুলো (\uE000-\uF8FF) রিমুভ করবে
  return text.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
}

// ডানপাশের সুনির্দিষ্ট ডিটেইলস প্যানেলকে ট্র্যাক করার সিলেক্টর (বাম পাশের লিস্টকে এড়ানোর জন্য)
function getRightDetailPanel() {
  const selectors = [
    '.bJzME',
    '[jsaction*="pane"]',
    'div[role="region"]',
    '#QA0Szd'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return document;
}

// BUG FIX 1: নিখুঁত এড্রেস এক্সট্রাকশন (Language & Icon Independent)
function extractAddress() {
  // সরাসরি গ্লোবাল বাটন টার্গেট (কারণ এই আইডি শুধু ডানপাশের ডিটেইল প্যানেলেই থাকে)
  const addrBtn = document.querySelector('button[data-item-id="address"]');
  if (addrBtn) return cleanGmapsText(addrBtn.innerText);

  const panel = getRightDetailPanel();
  const ariaBtn = [...panel.querySelectorAll('button[aria-label]')]
    .find(el => /address|location|ঠিকানা/i.test(el.getAttribute("aria-label") || ""));
  if (ariaBtn) return cleanGmapsText(ariaBtn.innerText);

  return "";
}

// BUG FIX 2: সুনির্দিষ্ট ওয়েবসাইট এক্সট্রাকশন 
function extractWebsiteFromMaps() {
  const websiteEl = document.querySelector('a[data-item-id="authority"]');
  if (websiteEl) return websiteEl.href || "";

  const panel = getRightDetailPanel();
  const ariaLink = [...panel.querySelectorAll('a[aria-label]')]
    .find(el => /website|ওয়েবসাইট/i.test(el.getAttribute("aria-label") || ""));
  if (ariaLink) return ariaLink.href || "";

  return "";
}

// BUG FIX 3: সঠিক ফোন নাম্বার এক্সট্রাকশন
function extractPhone() {
  const phoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
  if (phoneBtn) {
    const txt = phoneBtn.innerText?.trim();
    if (txt && !/send|copy|share|direction|পাঠান|কপি/i.test(txt)) return cleanGmapsText(txt);
    const itemId = phoneBtn.getAttribute("data-item-id") || "";
    const num = itemId.replace("phone:tel:", "");
    if (num) return num.trim();
  }

  const panel = getRightDetailPanel();
  const ariaBtn = [...panel.querySelectorAll('button[aria-label]')]
    .find(el => /^(phone|call|ফোন|কল)\b/i.test(el.getAttribute("aria-label") || ""));
  if (ariaBtn) {
    const label = ariaBtn.getAttribute("aria-label") || "";
    const match = label.match(/(\+?[\d\s\-().]{7,20})/);
    if (match) return match[1].trim();
    return cleanGmapsText(ariaBtn.innerText);
  }

  return "";
}

// BUG FIX 4: Ultimate Language & Position Independent Rating Extractor
function extractRating() {
  const panel = getRightDetailPanel() || document;
  
  // ১. প্রথম স্ট্র্যাটেজি: F7nice ক্লাসের ভেতর থেকে যেকোনো ডেসিমেল নাম্বার (যেমন: 4.8) খুঁজে নেওয়া (সবচেয়ে সেফ)
  const f7niceElements = document.querySelectorAll('div.F7nice');
  for (const f7 of f7niceElements) {
    // নিশ্চিত হওয়া যে এটি ডানপাশের ডিটেইল প্যানেলে আছে, বাম পাশের লিস্টে নয়
    if (!f7.closest('div[role="feed"]') && !f7.closest('[aria-label*="Results"]')) {
      const text = f7.innerText || f7.textContent || "";
      const match = text.match(/(\d+[\.,]\d+)/); // কোনো ^ চিহ্ন ছাড়া সরাসরি নাম্বার খুঁজবে
      if (match) {
        return match[1].replace(',', '.') + " stars";
      }
    }
  }

  // ২. দ্বিতীয় স্ট্র্যাটেজি: div.F7nice এর ভেতরের প্রথম স্প্যান টার্গেট করা
  const directSpan = panel.querySelector('div.F7nice span[aria-hidden="true"]');
  if (directSpan) {
    const txt = directSpan.innerText?.trim() || directSpan.textContent?.trim() || "";
    const match = txt.match(/(\d+[\.,]\d+)/);
    if (match) {
      return match[1].replace(',', '.') + " stars";
    }
  }

  // ৩. তৃতীয় স্ট্র্যাটেজি: যেকোনো ভাষার গ্লোবাল aria-label থেকে রেটিং বের করা
  const allLabels = panel.querySelectorAll('[aria-label]');
  for (const el of allLabels) {
    const label = el.getAttribute("aria-label") || "";
    // "4.5 stars", "4,5 out of 5", "stelle 4.5", "4.5/5" ইত্যাদি সব ফরম্যাট ধরবে
    const match = label.match(/(\d+[\.,]\d+)\s*(stars?|স্টার|stelle|estrellas|étoiles|punti|评分|\/5|out of 5)/i);
    if (match) {
      if (!el.closest('div[role="feed"]') && !el.closest('[aria-label*="Results"]')) {
        return match[1].replace(',', '.') + " stars";
      }
    }
  }

  // ৪. চতুর্থ স্ট্র্যাটেজি: মেইন হেডিং টাইটেলের চারপাশের টেক্সট স্ক্যান করা
  const titleEl = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge, [role="main"] h1');
  if (titleEl) {
    let parent = titleEl.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!parent) break;
      const txt = parent.innerText || parent.textContent || "";
      const match = txt.match(/(\d+[\.,]\d+)\s*(★|stars?)/i);
      if (match) return match[1].replace(',', '.') + " stars";
      parent = parent.parentElement;
    }
  }

  return "";
}

// Core Execution loop passing dynamic numeric bounds logic
async function scrapeGoogleMaps(limit = 100) {
  await autoScrollResults();

  const cards = getBusinessCards();
  const results = [];
  const seenKeys = new Set();

  console.log(`CompX Maps: Found ${cards.length} businesses. Limit: ${limit}`);

  for (const card of cards) {
    if (results.length >= limit) {
      console.log(`CompX Maps: Limit reached (${limit}). Stopping.`);
      break;
    }
    try {
      card.click();
      await wait(1500); 

      const name = await waitForPanel();
      if (!name || name.toLowerCase() === "results" || name.toLowerCase().includes("sponsored")) continue;

      // Dedupe check
      const dedupeKey = name.toLowerCase().trim();
      if (seenKeys.has(dedupeKey)) {
        console.log(`CompX Maps: Duplicate skipped — ${name}`);
        continue;
      }
      seenKeys.add(dedupeKey);

      await wait(800); // panel fully render হতে দাও

      const rating  = extractRating();
      const address = extractAddress();
      const website = extractWebsiteFromMaps();
      const phone   = extractPhone();

      results.push({
        name:    String(name    || "").trim(),
        rating:  String(rating  || "").trim(),
        address: String(address || "").replace(/\n/g, ' ').trim(),
        website: String(website || "").trim(),
        phone:   String(phone   || "").trim()
      });

      console.log(`CompX Maps: ✓ ${name} | ${phone}`);

    } catch (err) {
      console.error("CompX Maps: Error:", err);
    }

    await wait(600);
  }

  console.log(`CompX Maps: Done. Total: ${results.length}`);
  return results;
}

// ------------------------------------------------------------------
// BUNDLED ENRICHMENT ENGINE (Upgraded State-of-the-Art Crawling & Decoding)
// ------------------------------------------------------------------

// Modern Wide-matching Regex assigned by user directive
const regex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

function extractEmailsFromText(html) {
  return superExtractEmails(html, null);
}

function decodeHiddenEmails(text) {
  const cleaned = text
    .replace(/\[at\]/gi, "@")
    .replace(/\(at\)/gi, "@")
    .replace(/ at /gi, "@")
    .replace(/\[dot\]/gi, ".")
    .replace(/\(dot\)/gi, ".")
    .replace(/ dot /gi, ".");

  return cleaned.match(
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
  ) || [];
}

// --- CLOUDFLARE EMAIL DECODER HELPER ---
function decodeCloudflareEmail(encodedString) {
  try {
    let email = "";
    let r = parseInt(encodedString.substr(0, 2), 16);
    for (let n = 2; n < encodedString.length; n += 2) {
      email += String.fromCharCode(parseInt(encodedString.substr(n, 2), 16) ^ r);
    }
    return email;
  } catch (e) {
    return "";
  }
}

// --- MORE OBFUSCATED EMAIL DECODERS ---
function extractCloudflareEmailsFromHtml(html) {
  const emails = [];
  const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/gi;
  let match;
  while ((match = cfEmailRegex.exec(html)) !== null) {
    const decoded = decodeCloudflareEmail(match[1]);
    if (decoded) emails.push(decoded);
  }
  
  const cfHrefRegex = /href="[^"]*email-protection#([a-f0-9]+)"/gi;
  while ((match = cfHrefRegex.exec(html)) !== null) {
    const decoded = decodeCloudflareEmail(match[1]);
    if (decoded) emails.push(decoded);
  }
  return emails;
}

function decodeTextObfuscations(text) {
  if (!text) return "";
  return text
    .replace(/\[\s*at\s*\]/gi, "@")
    .replace(/\(\s*at\s*\)/gi, "@")
    .replace(/\{\s*at\s*\}/gi, "@")
    .replace(/\b_at_\b/gi, "@")
    .replace(/\b\s+at\s+\b/gi, "@")
    .replace(/\[\s*dot\s*\]/gi, ".")
    .replace(/\(\s*dot\s*\)/gi, ".")
    .replace(/\{\s*dot\s*\}/gi, ".")
    .replace(/\b_dot_\b/gi, ".")
    .replace(/\b\s+dot\s+\b/gi, ".");
}

function decodeHtmlEntities(str) {
  if (!str) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    return doc.documentElement.textContent || doc.body.textContent || str;
  } catch (e) {
    return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
              .replace(/&#x([a-f0-9]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
}

function extractReversedEmails(text) {
  const reversedText = text.split("").reverse().join("");
  const emails = reversedText.match(regex) || [];
  return emails.map(email => email.split("").reverse().join(""));
}

function decodeUrlEncodedEmails(text) {
  try {
    const decoded = decodeURIComponent(text);
    return decoded.match(regex) || [];
  } catch (e) {
    return [];
  }
}

function extractMailto(doc) {
  const emails = [];
  const links =
    [...doc.querySelectorAll("a")];
  links.forEach(link => {
    const href = link.href || "";
    if (href.startsWith("mailto:")) {
      emails.push(
        href.replace("mailto:", "")
      );
    }
  });
  return emails;
}

function extractEmailsFromMailto(doc = document) {
  const emails = [];
  const mailtoLinks = doc.querySelectorAll('a[href^="mailto:"]');
  mailtoLinks.forEach(link => {
    try {
      const href = link.getAttribute("href");
      if (!href) return;
      let emailPart = href.substring(7).trim();
      const qIdx = emailPart.indexOf("?");
      if (qIdx !== -1) {
        emailPart = emailPart.substring(0, qIdx);
      }
      emailPart = decodeURIComponent(emailPart);
      const parts = emailPart.split(/[,;]/);
      parts.forEach(p => {
        const clean = p.trim();
        if (clean) emails.push(clean);
      });
    } catch (e) {}
  });
  return emails;
}

function extractMailtoFromHtmlText(html) {
  const emails = [];
  const mailtoRegex = /href=["']mailto:([^"'\s?]+)/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    try {
      const emailPart = decodeURIComponent(match[1]);
      const parts = emailPart.split(/[,;]/);
      parts.forEach(p => {
        const clean = p.trim();
        if (clean) emails.push(clean);
      });
    } catch (e) {}
  }
  return emails;
}

// --- ALL-IN-ONE ROBUST EMAIL EXTRACTION PIPELINE ---
function superExtractEmails(html, doc = null) {
  // If doc is null but html is provided, dynamically construct a DOM document to parse advanced structures
  if (!doc && html && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      doc = parser.parseFromString(html, "text/html");
    } catch (e) {
      console.warn("CompX: DOMParser failed in superExtractEmails:", e);
    }
  }

  const emails = [];
  
  // 1. Direct Regex Match
  if (html) {
    const standardMatches = html.match(regex);
    if (standardMatches) emails.push(...standardMatches);
  }
  
  // 2. Mailto Link extraction
  if (doc) {
    const mailtoEmails = extractMailto(doc);
    emails.push(...mailtoEmails);
    const mailtoEmailsExtended = extractEmailsFromMailto(doc);
    emails.push(...mailtoEmailsExtended);
  } else if (html) {
    const mailtoEmails = extractMailtoFromHtmlText(html);
    emails.push(...mailtoEmails);
  }
  
  // 3. Obfuscation Format Decoder ([at], etc.)
  if (html) {
    const decodedText = decodeTextObfuscations(html);
    const obfuscatedMatches = decodedText.match(regex);
    if (obfuscatedMatches) emails.push(...obfuscatedMatches);
  }
  
  // 4. Cloudflare Protection Decoders
  if (doc) {
    const cfEmails = doc.querySelectorAll('.__cf_email__');
    cfEmails.forEach(el => {
      const cipher = el.getAttribute('data-cfemail');
      if (cipher) {
        const dec = decodeCloudflareEmail(cipher);
        if (dec) emails.push(dec);
      }
    });
    
    const protectionLinks = doc.querySelectorAll('a[href*="email-protection"]');
    protectionLinks.forEach(link => {
      const href = link.getAttribute('href');
      const hashIdx = href.indexOf('#');
      if (hashIdx !== -1) {
        const dec = decodeCloudflareEmail(href.substring(hashIdx + 1));
        if (dec) emails.push(dec);
      }
    });
  } else if (html) {
    const cfEmails = extractCloudflareEmailsFromHtml(html);
    emails.push(...cfEmails);
  }
  
  // 5. Reversed / RTL string decoding
  if (html) {
    const reversedEmails = extractReversedEmails(html);
    emails.push(...reversedEmails);
  }
  
  // 6. HTML Entities decoding
  if (html) {
    const decodedEntities = decodeHtmlEntities(html);
    const entityMatches = decodedEntities.match(regex);
    if (entityMatches) emails.push(...entityMatches);
  }
  
  // 7. URL Encoded email decoding
  if (html) {
    const decodedUrlEmails = decodeUrlEncodedEmails(html);
    if (decodedUrlEmails) emails.push(...decodedUrlEmails);
  }

  // 8. EXPLICIT JSON-LD SCHEMA EXTRACTION (PRO SaaS Good Source)
  if (doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const text = script.textContent || "";
        const matches = text.match(regex);
        if (matches) emails.push(...matches);
      } catch (e) {}
    });
  }

  // 9. EXPLICIT META TAGS EXTRACTION (PRO SaaS Good Source)
  if (doc) {
    const metas = doc.querySelectorAll('meta');
    metas.forEach(meta => {
      try {
        const content = meta.getAttribute('content') || meta.getAttribute('value') || "";
        if (content) {
          const matches = content.match(regex);
          if (matches) emails.push(...matches);
        }
      } catch (e) {}
    });
  }

  // 10. EXPLICIT VISIBLE DOM TEXT & FOOTER EXTRACTION (PRO SaaS Good Source)
  if (doc) {
    // Specifically target footers (since footers are high-probability zones for emails)
    const footers = doc.querySelectorAll('footer, [id*="footer"], [class*="footer"]');
    footers.forEach(footer => {
      try {
        const text = footer.innerText || footer.textContent || "";
        const matches = text.match(regex);
        if (matches) emails.push(...matches);
      } catch (e) {}
    });

    // Specifically target body content for visible DOM text
    if (doc.body) {
      const visibleText = doc.body.innerText || "";
      const matches = visibleText.match(regex);
      if (matches) emails.push(...matches);
    }
  }
  
  // Cleanup, validate and filter emails using the Smart Email Validator
  const validEmails = emails.filter(isValidBusinessEmail);
  const uniqueEmails = [...new Set(validEmails.map(e => e.trim().toLowerCase()))];
  return uniqueEmails;
}

// --- SMARTER CRAWLER CRAWLING LOGIC ---
function canonicalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    let host = url.hostname.replace(/^www\./, "");
    let path = url.pathname.replace(/\/$/, "");
    return `${url.protocol}//${host}${path}`;
  } catch (e) {
    return urlStr.toLowerCase();
  }
}

function getInternalLinks(htmlText, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  const links = doc.querySelectorAll("a[href]");
  const baseDomain = new URL(baseUrl).hostname;
  
  const internalPages = [];
  const seenUrls = new Set();
  seenUrls.add(canonicalizeUrl(baseUrl));
  
  links.forEach(link => {
    let href = (link.getAttribute("href") || "").trim();
    if (!href) return;
    
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      return;
    }
    
    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      const parsedUrl = new URL(absoluteUrl);
      
      if (parsedUrl.hostname !== baseDomain) {
        return;
      }
      
      if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|gz|mp4|css|js)$/i.test(parsedUrl.pathname)) {
        return;
      }
      
      const canonical = canonicalizeUrl(absoluteUrl);
      if (!seenUrls.has(canonical)) {
        seenUrls.add(canonical);
        
        let score = 0;
        const pathAndQuery = (parsedUrl.pathname + parsedUrl.search).toLowerCase();
        
        if (/contact|contact-us|reach-us|get-in-touch/i.test(pathAndQuery)) {
          score = 100;
        } else if (/about|about-us|who-we-are|our-story|team|staff/i.test(pathAndQuery)) {
          score = 90;
        } else if (/privacy|terms|legal|policy/i.test(pathAndQuery)) {
          score = 60;
        } else if (/support|help|faq|info|customer/i.test(pathAndQuery)) {
          score = 50;
        } else if (/career|job|press|news|blog/i.test(pathAndQuery)) {
          score = 30;
        } else {
          score = 10;
        }
        
        internalPages.push({ url: absoluteUrl, score });
      }
    } catch (e) {}
  });
  
  internalPages.sort((a, b) => b.score - a.score);
  return internalPages.map(item => item.url);
}

// Paths constant defined for enrichment scan (prioritizing highest accuracy paths first)
const paths = [
  "/contact",
  "/about",
  "/team",
  "/contact-us",
  "/support",
  "/privacy-policy"
];

// --- SUPER POWERFUL ENRICH WEBSITE CORE ENGINE ---
async function enrichWebsite(url) {
  const foundEmails = [];
  const foundPhones = [];
  const foundSocials = [];
  const scannedUrls = new Set();

  async function scanPage(pageUrl) {
    try {
      const canonical = pageUrl.toLowerCase().trim().replace(/\/$/, "");
      if (scannedUrls.has(canonical)) return;
      scannedUrls.add(canonical);

      const res = await fetch(pageUrl);
      if (!res.ok) return;

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const emails = superExtractEmails(html, doc);
      if (emails) {
        foundEmails.push(...emails);
      }

      const phones = extractPhones(doc);
      if (phones) {
        foundPhones.push(...phones);
      }

      const socials = extractSocials(doc);
      if (socials) {
        foundSocials.push(...socials);
      }
    } catch (err) {
      console.log("CompX: scanPage error:", err);
    }
  }

  // 1. First scan priority paths as requested (BEST PRACTICE)
  const priorityPaths = [
    "/contact",
    "/about",
    "/team",
    "/contact-us"
  ];

  for (const path of priorityPaths) {
    try {
      const targetUrl = new URL(path, url).href;
      await scanPage(targetUrl);
    } catch (e) {}
  }

  // 2. Scan main page
  await scanPage(url);

  // 3. Scan remaining fallback paths
  const fallbackPaths = [
    "/support",
    "/privacy-policy"
  ];

  for (const path of fallbackPaths) {
    try {
      const targetUrl = new URL(path, url).href;
      await scanPage(targetUrl);
    } catch (e) {}
  }

  // STEP 2: Meta enrichment (VERY IMPORTANT)
  const meta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || "",
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || ""
  };

  // STEP 3: Contact page detection
  const contactLinks = Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.href)
    .filter(link => link.includes("contact"));

  const valid = foundEmails.filter(isValidBusinessEmail);
  const localPhones = extractPhones(document);
  const localSocialLinks = extractSocials(document);

  return {
    company: meta.title || "",
    meta: meta,
    emails: [...new Set(valid)],
    phones: [...new Set([...foundPhones, ...localPhones])],
    socialLinks: [...new Set([...foundSocials, ...localSocialLinks])],
    contactPages: [...new Set(contactLinks)],
    pagesScanned: [...scannedUrls]
  };
}

// ------------------------------------------------------------------
// INSTAGRAM PUBLIC PROFILE SCRAPER & BI CLASSIFICATION
// ------------------------------------------------------------------

function isInstagramProfilePage() {
  if (!window.location.hostname.includes("instagram.com")) return false;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return false;
  
  // Instagram specific system paths to exclude from profile scraping
  const systemPaths = [
    "explore", "direct", "reels", "stories", "accounts", 
    "emails", "developer", "about", "legal", "blog", 
    "press", "jobs", "help", "api", "privacy", "terms"
  ];
  return !systemPaths.includes(parts[0].toLowerCase());
}

function detectBusinessType(bio) {
  if (!bio) return "General";
  bio = bio.toLowerCase();
  if (bio.includes("agency")) return "Agency";
  if (bio.includes("shop")) return "Ecommerce";
  if (bio.includes("coach")) return "Coach";
  if (bio.includes("designer")) return "Designer";
  return "General";
}

function scrapeInstagram() {
  const meta =
    document.querySelector(
      'meta[property="og:description"]'
    )?.content || "";

  const parts =
    meta.split("-")[0];

  return {
    username:
      window.location.pathname
        .replaceAll("/", ""),

    fullName:
      document.querySelector("h2")
        ?.innerText || "",

    bio:
      document.querySelector("header section div")
        ?.innerText || "",

    metaInfo: parts,

    website:
      [...document.querySelectorAll("a")]
        .find(a =>
          a.href.includes("http") &&
          !a.href.includes("instagram")
        )?.href || "",

    profileImage:
      document.querySelector(
        'img[alt*="profile picture"]'
      )?.src || ""
  };
}

function scrapeInstagramProfile() {
  try {
    const rawData = scrapeInstagram();
    
    // Parse followers, following, posts from meta description
    let followers = "";
    let following = "";
    let posts = "";
    
    const meta = document.querySelector('meta[property="og:description"]')?.content || "";
    const parts = meta.split("-")[0]; // e.g. "15M Followers, 250 Following, 1,200 Posts "
    if (parts) {
      const matchFollowers = parts.match(/([\d.,KMkm\s]+)\s*Followers/i);
      const matchFollowing = parts.match(/([\d.,KMkm\s]+)\s*Following/i);
      const matchPosts = parts.match(/([\d.,KMkm\s]+)\s*Posts/i);
      if (matchFollowers) followers = matchFollowers[1].trim();
      if (matchFollowing) following = matchFollowing[1].trim();
      if (matchPosts) posts = matchPosts[1].trim();
    }
    
    const businessType = detectBusinessType(rawData.bio);
    
    return {
      username: rawData.username,
      fullName: rawData.fullName || rawData.username,
      bio: rawData.bio,
      posts: posts || "0",
      followers: followers || "0",
      following: following || "0",
      website: rawData.website,
      profileImage: rawData.profileImage,
      metaInfo: rawData.metaInfo,
      businessType,
      scrapedAt: Date.now()
    };
  } catch (err) {
    console.error("Instagram scrape failed", err);
    return null;
  }
}

// ── 5. UNIVERSAL SCRAPER ENGINE ───────────────────────────────────────────
function detectPlatform(url) {
  if (!url || typeof url !== "string") return "Website";
  if (url.includes("instagram.com")) {
    return "Instagram";
  }
  if (url.includes("linkedin.com")) {
    return "LinkedIn";
  }
  if (url.includes("facebook.com")) {
    return "Facebook";
  }
  return "Website";
}

function normalizeData(platform, rawData, url) {
  let name = "";
  let website = "";
  let email = "";
  let socials = [];
  let followers = "";
  
  if (platform === "Instagram") {
    name = rawData ? (rawData.fullName || rawData.username || "") : "";
    website = rawData ? (rawData.website || "") : "";
    email = "";
    socials = [url];
    followers = rawData ? (rawData.followers || "") : "";
  } else if (platform === "LinkedIn") {
    name = rawData ? (rawData.companyName || "") : "";
    website = rawData ? (rawData.website || "") : "";
    email = "";
    socials = [rawData ? (rawData.linkedin || url) : url];
    followers = rawData ? (rawData.companySize || "") : "";
  } else {
    // General website
    name = document.title || "";
    website = url;
    email = rawData && rawData.emails && rawData.emails[0] ? rawData.emails[0] : "";
    socials = rawData && rawData.socials ? rawData.socials : [];
    followers = "";
  }
  
  return {
    platform,
    name,
    website,
    email,
    socials,
    followers,
    sourceUrl: url
  };
}

async function saveCRM(normalized) {
  // Save to leadOutreachStatuses
  const key = normalized.email || normalized.name || normalized.website || normalized.sourceUrl;
  if (!key) return;
  
  const res = await safeGet(["leadOutreachStatuses"]);
  const statuses = res.leadOutreachStatuses || {};
  
  statuses[key] = {
    ...(statuses[key] || {}),
    status: statuses[key]?.status || 'Scraped',
    sequenceStep: statuses[key]?.sequenceStep || 0,
    opened: statuses[key]?.opened || false,
    clicked: statuses[key]?.clicked || false,
    bounced: statuses[key]?.bounced || false,
    lastUpdated: Date.now(),
    normalizedData: normalized
  };
  await safeSet({ leadOutreachStatuses: statuses });
  
  // Save to active currentSession.leads
  const sessionRes = await safeGet(["currentSession"]);
  let currentSession = sessionRes.currentSession;
  if (!currentSession) {
    currentSession = {
      sessionId: Date.now().toString(),
      leads: [],
      createdAt: Date.now(),
      status: "active"
    };
  }
  
  const alreadySaved = currentSession.leads.some(l => l.website === normalized.website && l.companyName === normalized.name);
  if (!alreadySaved) {
    currentSession.leads.push({
      companyName: normalized.name || `Lead from ${normalized.platform}`,
      website: normalized.website || 'N/A',
      industry: `${normalized.platform} (Followers: ${normalized.followers || 'N/A'})`,
      timestamp: Date.now()
    });
    await safeSet({ currentSession });
  }
}

async function runUniversalScraper() {
  const url = window.location.href;
  const platform = detectPlatform(url);
  
  let rawData = {};
  if (platform === "Instagram") {
    rawData = scrapeInstagramProfile();
  } else if (platform === "LinkedIn") {
    rawData = await scrapeLinkedInCompany();
  } else {
    rawData = runExtractor();
  }
  
  const normalized = normalizeData(platform, rawData, url);
  await saveCRM(normalized);
  return normalized;
}

async function saveInstagramLead(profile) {
  const res = await safeGet(["instagramLeads"]);
  let leads = res.instagramLeads || [];
  leads.push(profile);
  await safeSet({ instagramLeads: leads });
  
  // Also save to active currentSession.leads to show on the dashboard lead list!
  const result = await safeGet(["currentSession"]);
  let currentSession = result.currentSession;
  if (!currentSession) {
    currentSession = {
      sessionId: Date.now().toString(),
      leads: [],
      createdAt: Date.now(),
      status: "active"
    };
  }
  currentSession.leads.push({
    companyName: `@${profile.username} (${profile.fullName || 'Instagram Profile'})`,
    website: profile.website || 'N/A',
    industry: `Instagram - ${profile.businessType || 'General'} (Followers: ${profile.followers || '0'})`,
    timestamp: profile.scrapedAt
  });
  await safeSet({ currentSession });
}

// ── DYNAMIC SPA ROUTER EVENT HANDLERS & TRACKING STATE ──
let lastScrapedUsername = "";
let lastUrl = window.location.href;

function runInstagramAutoScraper() {
  if (!isInstagramProfilePage()) return;
  const username = window.location.pathname.split("/").filter(Boolean)[0] || "";
  if (username === lastScrapedUsername) return;

  // Wait for dynamic layout and contents to render
  setTimeout(() => {
    const currentUsername = window.location.pathname.split("/").filter(Boolean)[0] || "";
    if (currentUsername !== username) return; // Route changed since timer started

    const profile = scrapeInstagramProfile();
    if (profile && profile.username) {
      lastScrapedUsername = profile.username;
      console.log("CompX Leads Pro: Auto-scraped Instagram profile:", profile);
      saveInstagramLead(profile);
    }
  }, 2500);
}

// Init triggers and pollers
if (window.location.hostname.includes("instagram.com")) {
  runInstagramAutoScraper();
  
  // SPA routing transition polling observer
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      runInstagramAutoScraper();
    }
  }, 1000);
}

// ── EXTRACTION UTILITIES (User Assigned Clean Content Output) ──
function extractCleanContent() {
  if (window.__extractCleanContentRun) return;
  window.__extractCleanContentRun = true;

  const main = document.querySelector("main") || document.body;
  if (!main) return;

  const blocks = main.querySelectorAll("h1,h2,h3,p,li");

  let data = [];

  blocks.forEach(el => {
    let text = el.innerText?.trim();
    if (text && text.length > 3) data.push(text);
  });

  const unique = [...new Set(data)];

  console.clear();
  console.log("=== CLEAN RESULT ===");
  console.log(unique.join("\n"));
}

// Automatically invoke to provide clean console outputs on injection
extractCleanContent();

// ==================== PHASE 1 & 2: CORE AI INTELLIGENCE & PIPELINE INTEGRATION ====================
// Mock / compatibility ES imports
// import { analyzeLead } from "./aiEngine.js";

function analyzeLead(data) {
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

function extractData() {
  const bodyText = document.body ? document.body.innerText : "";
  return {
    title: document.title,
    text: bodyText,
    email: findEmails(),
    phone: findPhones(),
    website: window.location.href,
    social: findSocialLinks(),
    hasBooking: bodyText.toLowerCase().includes("book")
  };
}

// --- EMAIL FINDER ---
function findEmails() {
  const bodyText = document.body ? document.body.innerText : "";
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return bodyText.match(emailRegex) || [];
}

// --- PHONE FINDER ---
function findPhones() {
  const bodyText = document.body ? document.body.innerText : "";
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  return bodyText.match(phoneRegex) || [];
}

// --- SOCIAL LINKS ---
function findSocialLinks() {
  const links = Array.from(document.querySelectorAll("a"));
  return links
    .map(a => a.href)
    .filter(href =>
      href.includes("linkedin") ||
      href.includes("instagram") ||
      href.includes("facebook")
    );
}

// --- MAIN EXECUTION ---
function runAILeadPipeline() {
  try {
    const rawData = extractData();
    const intelligence = analyzeLead(rawData);

    console.log("🔥 AI LEAD INTELLIGENCE:", intelligence);

    // send to background
    chrome.runtime.sendMessage({
      type: "LEAD_DATA",
      payload: {
        score: intelligence.score,
        category: intelligence.category,
        intent: intelligence.intent,
        signals: intelligence.signals,
        title: rawData.title,
        website: rawData.website,
        email: rawData.email?.[0] || "",
        phone: rawData.phone?.[0] || "",
        social: rawData.social
      }
    });
  } catch (err) {
    console.error("CompX AI Lead Pipeline error:", err);
  }
}

// Automatically invoke on page load
if (document.readyState === "complete" || document.readyState === "interactive") {
  runAILeadPipeline();
} else {
  window.addEventListener("DOMContentLoaded", runAILeadPipeline);
}

