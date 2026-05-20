/**
 * CompX Leads Pro - Google Maps Scraper (Fixed Version 2)
 * File: googleMapsScraper.js
 *
 * Fixes:
 * - Rating: aria-label থেকে proper selector
 * - Address: data-item-id attribute দিয়ে accurate match
 * - Website: Google redirect বাদ দিয়ে actual external URL
 * - Phone: data-item-id দিয়ে accurate match
 */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoScrollResults() {
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) {
    console.warn("Maps feed container not found!");
    return;
  }

  let lastHeight = 0;
  for (let i = 0; i < 20; i++) {
    feed.scrollTo(0, feed.scrollHeight);
    await wait(2000);
    if (feed.scrollHeight === lastHeight) break;
    lastHeight = feed.scrollHeight;
  }
  console.log("Auto-scrolling complete!");
}

function getBusinessCards() {
  return [...document.querySelectorAll('a[href*="/place/"]')];
}

function extractRating() {
  // aria-label এ "stars" থাকে — e.g. "4.5 stars 120 reviews"
  const ratingEl = document.querySelector('div[role="img"][aria-label*="star"]');
  if (ratingEl) return ratingEl.getAttribute("aria-label").trim();

  // Fallback: span এ rating text
  const spans = [...document.querySelectorAll("span")];
  const ratingSpan = spans.find(el => /^\d\.\d$/.test(el.textContent?.trim()));
  return ratingSpan?.textContent?.trim() || "";
}

function extractAddress() {
  // Google Maps address button এ data-item-id="address" থাকে
  const addressBtn = document.querySelector('button[data-item-id="address"]');
  if (addressBtn) return addressBtn.textContent?.trim() || "";

  // Fallback: aria-label এ "address" থাকে
  const ariaBtn = [...document.querySelectorAll("button")]
    .find(el => el.getAttribute("aria-label")?.toLowerCase().includes("address"));
  if (ariaBtn) return ariaBtn.textContent?.trim() || "";

  return "";
}

function extractWebsite() {
  // Google Maps website link এ data-item-id="authority" থাকে
  const websiteBtn = document.querySelector('a[data-item-id="authority"]');
  if (websiteBtn) {
    const href = websiteBtn.href || "";
    // Google redirect decode করো
    if (href.includes("google.com/url") || href.includes("maps.google")) {
      try {
        const url = new URL(href);
        const q = url.searchParams.get("q") || url.searchParams.get("url");
        if (q) return q;
      } catch (e) {}
    }
    return href;
  }

  // Fallback: aria-label "website" আছে এমন link
  const websiteLink = [...document.querySelectorAll("a")]
    .find(el => el.getAttribute("aria-label")?.toLowerCase().includes("website"));
  if (websiteLink) return websiteLink.href || "";

  return "";
}

function extractPhone() {
  // Google Maps phone button এ data-item-id তে "phone" থাকে
  const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
  if (phoneBtn) return phoneBtn.textContent?.trim() || "";

  // Fallback: aria-label এ "phone" থাকে
  const ariaBtn = [...document.querySelectorAll("button")]
    .find(el => el.getAttribute("aria-label")?.toLowerCase().includes("phone"));
  if (ariaBtn) return ariaBtn.textContent?.trim() || "";

  // Fallback: +44 বা phone number pattern
  const allBtns = [...document.querySelectorAll("button")];
  const phonePattern = allBtns.find(el => /^\+?[\d\s\-().]{7,}$/.test(el.textContent?.trim()));
  return phonePattern?.textContent?.trim() || "";
}

async function scrapeGoogleMaps() {
  await autoScrollResults();

  const cards = getBusinessCards();
  const results = [];
  const seen = new Set(); // duplicate check

  console.log(`Found ${cards.length} businesses. Starting extraction...`);

  for (const card of cards) {
    try {
      card.click();
      await wait(3000);

      const name = document.querySelector("h1")?.textContent?.trim() || "";

      // Duplicate skip
      if (seen.has(name)) continue;
      seen.add(name);

      const rating   = extractRating();
      const address  = extractAddress();
      const website  = extractWebsite();
      const phone    = extractPhone();

      results.push({ name, rating, address, website, phone });
      console.log(`✅ Extracted: ${name} | ${website}`);

    } catch (err) {
      console.error("Error extracting card:", err);
    }
  }

  console.log(`\n🎉 Done! Total: ${results.length} businesses`);
  console.log(JSON.stringify(results, null, 2));
  return results;
}

scrapeGoogleMaps();
