const storage = (typeof browser !== "undefined") ? browser : chrome;

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

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

// DOM Screen Container Panels
const authScreen = document.getElementById('authScreen');
const mainScreen = document.getElementById('mainScreen');
const historyScreen = document.getElementById('historyScreen');

// Auth Form Bindings
const licenseKey = document.getElementById('licenseKey');
const activateBtn = document.getElementById('activateBtn');
const manualTokenBtn = document.getElementById('manualTokenBtn');
const authStatus = document.getElementById('authStatus');
const buyBtn = document.getElementById('buyBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Scanner Dashboard Bindings
const scanBtn = document.getElementById('scanBtn');
const downloadBtn = document.getElementById('downloadBtn');
const googleSheetsBtn = document.getElementById('googleSheetsBtn');
const saveBtn = document.getElementById('saveBtn');
const emailCountLabel = document.getElementById('emailCount');
const socialCountLabel = document.getElementById('socialCount');
const emailsContainer = document.getElementById('emails');
const socialsContainer = document.getElementById('socials');
const bulkInput = document.getElementById('bulkInput');

// Toolbar Nav Buttons
const goHistoryBtn = document.getElementById('goHistoryBtn');
const backToScanBtn = document.getElementById('backToScanBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const historyLogs = document.getElementById('historyLogs');

// Quota and SaaS Sync bindings
const syncSaaSBtn = document.getElementById('syncSaaSBtn');
const userPlanBadge = document.getElementById('userPlanBadge');
const quotaText = document.getElementById('quotaText');
const quotaBar = document.getElementById('quotaBar');

// SaaS State variables
let activeLeads = { emails: [], socials: [], phones: [], contactEmails: [] };
let activeHost = 'Unknown Domain';

// SaaS URL Helper
function getSaaSUrl() {
  return localStorage.getItem('compx_saas_url') || 'http://localhost:3000';
}

// Initialize Extension Setup
document.addEventListener('DOMContentLoaded', () => {
  // Dynamic Personalization Greeting Logic
  const userGreeting = document.getElementById('userGreeting');
  if (userGreeting) {
    const activeLicense = localStorage.getItem('licenseKey') || "Operator";
    const username = activeLicense !== "Operator" && activeLicense !== "Agent" ? activeLicense.slice(0, 5).toUpperCase() : "Operator";
    const el = userGreeting;
    el.innerText = `${getGreeting()}, ${username} 👋`;
  }

  // Dynamic Selector Panel Switcher
  const scraperSelect = document.getElementById("scraperSelect");
  const panels = document.querySelectorAll(".panel");
  if (scraperSelect) {
    scraperSelect.addEventListener("change", function() {
      panels.forEach(panel => {
        panel.classList.remove("active");
      });
      const value = this.value;
      if (value) {
        const targetPanel = document.getElementById(value + "Panel");
        if (targetPanel) {
          targetPanel.classList.add("active");
        }
      }
    });
  }

  // 2. ADD PLATFORM DETECTION (Literal user pattern)
  const platform = detectPlatform(window.location.href);
  const titleEl = document.getElementById("resultTitle");
  if (titleEl) {
    titleEl.innerText = `${platform} Result`;
  }

  // Robust chrome tab platform detection
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const activeUrl = tabs[0].url || "";
      const detected = detectPlatform(activeUrl);
      const titleElement = document.getElementById("resultTitle");
      if (titleElement) {
        titleElement.innerText = `${detected} Result`;
      }
      
      // Automatically switch dropdown panel based on detected active tab!
      if (scraperSelect) {
        if (detected === "Instagram") {
          scraperSelect.value = "instagram";
        } else if (detected === "LinkedIn") {
          scraperSelect.value = "linkedin";
        } else {
          scraperSelect.value = "website";
        }
        scraperSelect.dispatchEvent(new Event("change"));
      }
    }
  });

  // 1. Initial Authentication View Routing — check firebaseToken first, then legacy licenseKey
  function checkAndAuthenticate() {
    chrome.storage.local.get(['firebaseToken', 'licenseKey'], async (result) => {
      const fbToken = result.firebaseToken;
      const savedKey = result.licenseKey;

      if (fbToken) {
        // New secure Firebase Auth flow
        try {
          const isValid = await validateWithFirebaseToken(fbToken);
          if (isValid) {
            showScreen(mainScreen);
            await fetchSaaSQuotaWithFirebase(fbToken);
            executeActiveSiteScan();
            return;
          } else {
            // Token expired — clear and re-prompt
            chrome.storage.local.remove('firebaseToken');
          }
        } catch (e) {
          chrome.storage.local.remove('firebaseToken');
        }
      }

      if (savedKey) {
        // Legacy token fallback
        showScreen(mainScreen);
        fetchSaaSQuota(savedKey);
        return;
      }

      showScreen(authScreen);
      startAuthPolling();
    });
  }

  // Poll for firebaseToken every 2 seconds (in case dashboard sends it after popup loads)
  let authPollInterval = null;
  function startAuthPolling() {
    if (authPollInterval) return;
    if (authStatus) authStatus.innerText = 'Waiting for dashboard login...';
    authPollInterval = setInterval(() => {
      chrome.storage.local.get(['firebaseToken'], async (result) => {
        if (result.firebaseToken) {
          clearInterval(authPollInterval);
          authPollInterval = null;
          if (authStatus) authStatus.innerText = '✅ Token received! Connecting...';
          try {
            const isValid = await validateWithFirebaseToken(result.firebaseToken);
            if (isValid) {
              showToast('🟢 Auto-connected via Dashboard!');
              await fetchSaaSQuotaWithFirebase(result.firebaseToken);
              setTimeout(() => {
                showScreen(mainScreen);
                executeActiveSiteScan();
              }, 500);
            } else {
              chrome.storage.local.remove('firebaseToken');
              if (authStatus) authStatus.innerText = '❌ Token invalid. Please try again.';
              startAuthPolling();
            }
          } catch(e) {
            if (authStatus) authStatus.innerText = '⚠️ Connection error. Retrying...';
          }
        }
      });
    }, 2000);
  }

  checkAndAuthenticate();

  // Bind Vercel Landing Page buy button redirect to SaaS portal
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      window.open(`${getSaaSUrl()}/dashboard`, '_blank');
    });
  }

  // 2. Activate Button — opens dashboard in new tab for auto-connect
  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      window.open(`${getSaaSUrl()}/dashboard`, '_blank');
      if (authStatus) authStatus.innerText = '⏳ Dashboard opened. Waiting for login...';
      showToast('🔥 Login to your Dashboard to auto-connect!');
    });
  }

  // 3. Manual Token Fallback Button
  if (manualTokenBtn) {
    manualTokenBtn.addEventListener('click', async () => {
      const key = licenseKey ? licenseKey.value.trim() : '';
      if (!key) {
        showToast('⚠️ Please paste your token first!');
        return;
      }
      manualTokenBtn.disabled = true;
      manualTokenBtn.innerText = 'Validating...';
      showToast('🔥 Validating token...');
      try {
        const isValid = await validateLicense(key);
        if (isValid) {
          chrome.storage.local.set({ licenseKey: key });
          showToast('🟢 Access Granted! Token activated.');
          await fetchSaaSQuota(key);
          setTimeout(() => {
            showScreen(mainScreen);
            executeActiveSiteScan();
          }, 600);
        } else {
          showToast('❌ Invalid token! Check your Dashboard.');
        }
      } catch (err) {
        showToast('⚠️ Connection error. Check SaaS URL.');
      } finally {
        manualTokenBtn.disabled = false;
        manualTokenBtn.innerText = '🔑 Activate with Token';
      }
    });
  }

  // Double-click auth screen to easily change SaaS host URL (Local Dev vs Production)
  if (authScreen) {
    authScreen.addEventListener('dblclick', () => {
      const currentUrl = getSaaSUrl();
      const newUrl = prompt("🔥 Change SaaS Host Engine URL:", currentUrl);
      if (newUrl !== null) {
        if (newUrl.trim()) {
          localStorage.setItem('compx_saas_url', newUrl.trim());
          showToast('🔥 SaaS Engine Host URL updated!');
        } else {
          localStorage.removeItem('compx_saas_url');
          showToast('🗑️ SaaS Engine Host URL reset to default.');
        }
      }
    });
  }

  // Bind CRM Session sync button
  const syncSaaSBtn = document.getElementById('syncSaaSBtn');
  if (syncSaaSBtn) {
    syncSaaSBtn.addEventListener('click', () => {
      syncSessionLeads();
    });
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('licenseKey');
    showToast('🔒 Logged out / UI Locked.');
    showScreen(authScreen);
  });

  // 3. Scan & Save & CSV Download Bindings
  scanBtn.addEventListener('click', () => {
    executeActiveSiteScan();
  });

  const linkedinBtn = document.getElementById("linkedinBtn");
  if (linkedinBtn) {
    linkedinBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const tab = tabs[0];
        let targetUrl = tab.url || "";
        
        if (!targetUrl.includes("linkedin.com/company/")) {
          showToast('❌ Please open a LinkedIn Company page!');
          return;
        }
        
        runUniversalScraperEngine(tab);
      });
    });
  }

  const instagramBtn = document.getElementById("instagramBtn");
  if (instagramBtn) {
    instagramBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const tab = tabs[0];
        let targetUrl = tab.url || "";
        
        if (!targetUrl.includes("instagram.com")) {
          showToast('❌ Please open an Instagram Profile page!');
          return;
        }
        
        runUniversalScraperEngine(tab);
      });
    });
  }

  const enrichBtn = document.getElementById("enrichBtn");
  if (enrichBtn) {
    enrichBtn.addEventListener("click", () => {
      showToast('⚡ Deep scanning and enriching website... (Multi-Page Scan Active)');
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const activeTab = tabs[0];

        enrichBtn.disabled = true;
        enrichBtn.innerText = 'Enriching...';

        chrome.tabs.sendMessage(activeTab.id, { type: "enrich", url: activeTab.url }, (response) => {
          enrichBtn.disabled = false;
          enrichBtn.innerText = 'Enrich Website';

          if (chrome.runtime.lastError) {
            console.error("Enrich Error:", chrome.runtime.lastError);
            showToast('❌ Extension script not loaded. Please refresh the page.');
            return;
          }
          
          if (response && !response.error) {
            // Update extension dashboard state
            let enEmails = response.emails || [];
            enEmails = enEmails.filter(isValidBusinessEmail);
            enEmails.sort((a, b) => scoreEmail(b) - scoreEmail(a));

            activeLeads = {
              emails: enEmails,
              socials: response.socials || [],
              phones: response.phones || [],
              contactEmails: [],
              company: response.company || "",
              meta: response.meta || {},
              contactPages: response.contactPages || []
            };
            window.lastData = activeLeads;

            // Render details using Enriched UI renderer
            renderEnrichedUI(activeLeads);
            
            // Calculate lead score
            const scoreData = calculateLeadScore(activeLeads, activeTab.url);
            const leadScoreEl = document.getElementById("leadScore");
            if (leadScoreEl) leadScoreEl.innerText = scoreData.score;

            // Enable action triggers
            if (activeLeads.emails.length > 0 || activeLeads.socials.length > 0 || activeLeads.phones.length > 0) {
              downloadBtn.disabled = false;
              if (googleSheetsBtn) googleSheetsBtn.disabled = false;
              saveBtn.disabled = false;
            }
            
            showToast(`✅ Scraped ${activeLeads.emails.length} Emails & ${activeLeads.socials.length} Socials across ${response.pagesScanned?.length || 1} pages!`);
          } else {
            showToast('❌ Enrichment failed or returned no results.');
          }
        });
      });
    });
  }

  const gmapsBtn = document.getElementById("gmapsBtn");
  const gmapsLimitInput = document.getElementById("gmapsLimitInput");

  if (gmapsBtn) {
    gmapsBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || tabs.length === 0) return;

        // Fetch limit dynamically from UI element node with manual control bounds fallback
        let limit = 100;
        if (gmapsLimitInput) {
          limit = parseInt(gmapsLimitInput.value, 10) || 100;
        }

        // English text toast runtime interface notification
        showToast(`⏳ Starting Google Maps Scraping... (Target Limit: ${limit})`);
        gmapsBtn.disabled = true;
        gmapsBtn.innerText = 'Scraping...';

        chrome.tabs.sendMessage(tabs[0].id, { type: "gmaps", limit }, async (response) => {
          gmapsBtn.disabled = false;
          gmapsBtn.innerText = 'Google Maps';

          if (chrome.runtime.lastError) {
            showToast('❌ Please open a Google Maps Search page & refresh.');
            return;
          }

          if (response && response.useStorage) {
            const stored = await safeGet('gmapsResults');
            const results = stored.gmapsResults || [];
            storage.storage.local.remove('gmapsResults');

            if (results.length > 0) {
              showToast(`✅ Scraped ${results.length} businesses successfully!`);
              
              // Automatically save and append maps leads to active session
              for (const item of results) {
                const record = {
                  companyName: item.name,
                  website: item.website || 'N/A',
                  industry: 'Google Maps Local Business',
                  phone: item.phone || '',
                  address: item.address || '',
                  rating: item.rating || 0,
                  source: 'Google Maps',
                  timestamp: Date.now()
                };
                await saveScrapedLead(record);
              }
              
              exportGoogleMapsCSV(results);
            } else {
              showToast('❌ No valid English results found.');
            }
            return;
          }

          if (response && Array.isArray(response) && response.length > 0) {
            showToast(`✅ Scraped ${response.length} businesses successfully!`);
            
            // Automatically save and append maps leads to active session
            for (const item of response) {
              const record = {
                companyName: item.name,
                website: item.website || 'N/A',
                industry: 'Google Maps Local Business',
                phone: item.phone || '',
                address: item.address || '',
                rating: item.rating || 0,
                source: 'Google Maps',
                timestamp: Date.now()
              };
              await saveScrapedLead(record);
            }
            
            exportGoogleMapsCSV(response);
          } else {
            showToast('❌ No listings found.');
          }
        });
      });
    });
  }


  document.getElementById("downloadBtn").addEventListener("click", () => {
    if (window.lastData) {
      downloadCSV(window.lastData);
    }
  });

  if (googleSheetsBtn) {
    googleSheetsBtn.addEventListener('click', () => {
      exportToGoogleSheets();
    });

    googleSheetsBtn.addEventListener('dblclick', () => {
      const newUrl = prompt("Change Google Sheets Web App URL:", localStorage.getItem('google_sheets_webhook') || "");
      if (newUrl !== null) {
        if (newUrl.trim().startsWith('http')) {
          localStorage.setItem('google_sheets_webhook', newUrl.trim());
          showToast('💾 Web App URL updated!');
        } else if (newUrl.trim() === '') {
          localStorage.removeItem('google_sheets_webhook');
          showToast('🗑️ URL cleared.');
        }
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveLeadsToHistory();
    });
  }



  // 4. View History & Settings Router Swap
  goHistoryBtn.addEventListener('click', () => {
    renderHistoryScreen();
    showScreen(historyScreen);
  });

  backToScanBtn.addEventListener('click', () => {
    showScreen(mainScreen);
  });

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.setItem('leads', '[]');
    showToast('🗑️ Leads history database cleared!');
    renderHistoryScreen();
  });

  exportHistoryBtn.addEventListener('click', () => {
    exportMasterHistoryCsv();
  });

  // STEP 5 — Reload Button (Clear All Data)
  document.getElementById("reloadBtn").addEventListener("click", async () => {
    const confirmReset = confirm(
      "Start new session? Current leads will be archived."
    );

    if (confirmReset) {
      await archiveCurrentSession();
      await startNewSession();
      renderLeads();
      showToast("🔄 New session started! Previous leads archived safely.");
    }
  });

  // Initial dashboard leads render
  safeGet(["currentSession"]).then((res) => {
    if (!res.currentSession) {
      startNewSession().then(() => renderLeads());
    } else {
      renderLeads();
    }
  });
});

/**
 * Switch Dashboard Views smoothly
 */
function showScreen(targetScreen) {
  [authScreen, mainScreen, historyScreen].forEach(scr => {
    if (scr) scr.classList.add('hidden');
  });
  if (targetScreen) targetScreen.classList.remove('hidden');
  
  if (targetScreen === authScreen) {
    document.body.style.overflowY = 'hidden';
    document.body.style.height = '100vh';
  } else {
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
  }
}

/**
 * SaaS DEVELOPER TOKEN VALIDATION:
 * Validates the developer token against the CompX Next.js SaaS backend leads API.
 */
async function validateLicense(key) {
  const saasUrl = getSaaSUrl();
  try {
    const res = await fetch(`${saasUrl}/api/extension/leads`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-compx-token': key
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        // Cache user details locally/globally
        window.userProfile = data.user;
        await safeSet({ licenseKey: key });
        return true;
      }
    }
  } catch (err) {
    console.error('SaaS Token Validation Failed', err);
  }
  return false;
}

/**
 * Fetch dynamic quota and plan limits from SaaS cloud
 */
async function fetchSaaSQuota(token) {
  if (!token) return;
  const saasUrl = getSaaSUrl();
  try {
    const res = await fetch(`${saasUrl}/api/extension/leads`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-compx-token': token
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        window.userProfile = data.user;
        updateQuotaUI(data.user);
      }
    }
  } catch (e) {
    console.error('Failed to fetch SaaS Quota:', e);
  }
}

/**
 * FIREBASE AUTH TOKEN VALIDATION:
 * Validates a Firebase ID token against the backend using Authorization: Bearer header.
 */
async function validateWithFirebaseToken(idToken) {
  const saasUrl = getSaaSUrl();
  try {
    const res = await fetch(`${saasUrl}/api/extension/leads`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        window.userProfile = data.user;
        return true;
      }
    }
  } catch (err) {
    console.error('[CompX] Firebase token validation failed:', err);
  }
  return false;
}

/**
 * Fetch quota using Firebase ID token (Bearer auth)
 */
async function fetchSaaSQuotaWithFirebase(idToken) {
  if (!idToken) return;
  const saasUrl = getSaaSUrl();
  try {
    const res = await fetch(`${saasUrl}/api/extension/leads`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        window.userProfile = data.user;
        updateQuotaUI(data.user);
      }
    }
  } catch (e) {
    console.error('[CompX] Failed to fetch quota with Firebase token:', e);
  }
}

/**
 * Render dynamic plan badges and quota usage indicator progress bar
 */
function updateQuotaUI(profile) {
  if (!profile) return;
  
  const userPlanBadge = document.getElementById('userPlanBadge');
  const quotaText = document.getElementById('quotaText');
  const quotaBar = document.getElementById('quotaBar');
  const userGreeting = document.getElementById('userGreeting');
  
  if (userPlanBadge) {
    userPlanBadge.innerText = (profile.plan || 'FREE').toUpperCase();
    if (profile.plan?.toLowerCase() === 'pro') {
      userPlanBadge.className = 'plan';
      userPlanBadge.style.background = 'linear-gradient(90deg, #C4B5FD, #F472B6)';
    } else {
      userPlanBadge.className = 'plan free-plan';
      userPlanBadge.style.background = '#4b5563'; // gray fallback
    }
  }
  
  const used = profile.leadsUsed || 0;
  const limit = profile.leadLimit || 1000;
  if (quotaText) {
    quotaText.innerText = `${used} / ${limit} Leads`;
  }
  
  if (quotaBar) {
    const percent = Math.min(100, Math.max(0, (used / limit) * 100));
    quotaBar.style.width = `${percent}%`;
    
    // Adjust colors and glow transitions based on quota thresholds
    if (percent >= 90) {
      quotaBar.style.background = 'linear-gradient(90deg, #EF4444, #F43F5E)';
      quotaBar.style.boxShadow = '0 0 10px rgba(244, 63, 94, 0.7)';
    } else if (percent >= 70) {
      quotaBar.style.background = 'linear-gradient(90deg, #F59E0B, #D97706)';
      quotaBar.style.boxShadow = '0 0 8px rgba(217, 119, 6, 0.55)';
    } else {
      quotaBar.style.background = 'linear-gradient(90deg, #8B5CF6, #EC4899)';
      quotaBar.style.boxShadow = '0 0 8px rgba(236, 72, 153, 0.55)';
    }
  }
  
  if (userGreeting && profile.email) {
    const username = profile.email.split('@')[0].toUpperCase();
    userGreeting.innerText = `${getGreeting()}, ${username} 👋`;
  }
}

/**
 * CRM Sync Engine - Uploads accumulated session leads to CompX Next.js SaaS
 */
async function syncSessionLeads() {
  const token = localStorage.getItem('licenseKey');
  if (!token) {
    showToast('⚠️ Authenticate first to sync session leads!');
    return;
  }
  
  const result = await safeGet(["currentSession"]);
  const currentSession = result.currentSession;
  
  if (!currentSession || !currentSession.leads || currentSession.leads.length === 0) {
    showToast('⚠️ No active leads in current session to sync!');
    return;
  }
  
  const leadsCount = currentSession.leads.length;
  showToast(`⏳ Syncing ${leadsCount} leads to CompX SaaS...`);
  
  const syncBtn = document.getElementById('syncSaaSBtn');
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerText = 'Syncing...';
  }
  
  const saasUrl = getSaaSUrl();
  
  // Convert standard session storage leads structure into Next.js expected POST parameters
  const formattedLeads = currentSession.leads.map((lead, idx) => {
    let source = 'Website Scraper';
    if (lead.source) {
      source = lead.source;
    } else if (lead.companyName && lead.companyName.includes('@')) {
      source = 'Instagram';
    } else if (lead.industry && lead.industry.includes('LinkedIn')) {
      source = 'LinkedIn';
    }
    
    const email = lead.email || (lead.emails && lead.emails[0]) || '';
    const phone = lead.phone || (lead.phones && lead.phones[0]) || '';
    
    return {
      id: lead.id || `lead-ext-${lead.timestamp || Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      name: lead.companyName || lead.host || lead.name || 'Unnamed Business',
      category: lead.industry || lead.category || 'Scraped B2B Lead',
      phone: phone,
      email: email,
      address: lead.address || '',
      website: lead.website || lead.host || '',
      rating: Number(lead.rating) || 0,
      reviews: Number(lead.reviews) || 0,
      source: source
    };
  });
  
  try {
    const res = await fetch(`${saasUrl}/api/extension/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-compx-token': token
      },
      body: JSON.stringify({ leads: formattedLeads })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        showToast(`🟢 Successfully synced ${leadsCount} leads to CompX SaaS!`);
        
        // Instant update quota limits
        if (data.leadsUsed !== undefined && data.leadLimit !== undefined) {
          if (window.userProfile) {
            window.userProfile.leadsUsed = data.leadsUsed;
            window.userProfile.leadLimit = data.leadLimit;
            updateQuotaUI(window.userProfile);
          } else {
            fetchSaaSQuota(token);
          }
        } else {
          fetchSaaSQuota(token);
        }
        
        // Archive synchronized items
        await archiveCurrentSession();
        await startNewSession();
        renderLeads();
        
        // Clear active session buffers
        activeLeads = { emails: [], socials: [], phones: [], contactEmails: [] };
        window.lastData = null;
        activeHost = 'Unknown Domain';
        
        document.getElementById('emailCount').innerText = '0';
        document.getElementById('socialCount').innerText = '0';
        document.getElementById('leadScore').innerText = '0';
        
        if (emailsContainer) emailsContainer.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Scanned emails will render here</div>';
        if (socialsContainer) socialsContainer.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Scanned socials will render here</div>';
        
      } else {
        showToast(`❌ Sync failed: ${data.message || 'Unknown Server Error'}`);
      }
    } else if (res.status === 403) {
      showToast('❌ Quota Limit Exceeded! Please upgrade your plan.');
    } else {
      const errData = await res.json();
      showToast(`❌ Sync Error: ${errData.message || 'Server Connection Failed'}`);
    }
  } catch (err) {
    console.error('CRM Sync Exception:', err);
    showToast('⚠️ CRM Sync failed! Verify server connection.');
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerText = '⚡ Sync Session to CompX';
    }
  }
}


/**
 * User Specified Save Lead mechanism
 */
function saveLead(data) {
  let leads =
    JSON.parse(
      localStorage.getItem("leads")
    ) || [];

  leads.push(data);

  localStorage.setItem(
    "leads",
    JSON.stringify(leads)
  );
}

/**
 * STEP 2 — Save Leads (Cross-browser)
 */
async function saveScrapedLead(lead) {
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
    ...lead,
    timestamp: Date.now()
  });

  await safeSet({ currentSession });
  renderLeads();
}

/**
 * STEP 2 — User Specified CSV Export logic
 */
function downloadCSV(data) {
  let csv = "Type,Value\n";

  data.emails.forEach(e => {
    csv += `Email,${e}\n`;
  });

  data.socials.forEach(s => {
    csv += `Social,${s}\n`;
  });

  data.phones.forEach(p => {
    csv += `Phone,${p}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "leads.csv";
  a.click();
  showToast('📥 Scraped leads exported successfully!');
}

/**
 * PHASE 5 — User Specified AI Lead Scoring Logic
 */
function calculateLeadScore(data, url) {
  let score = 0;

  if (data.emails.length > 0) score += 30;

  if (data.phones.length > 0) score += 20;

  if (data.socials.length > 0) score += 20;

  if (data.contactEmails?.length > 0)
    score += 15;

  if (url.startsWith("https"))
    score += 15;

  return {
    score,
    level:
      score > 70
        ? "High Quality"
        : score > 40
        ? "Medium"
        : "Low"
  };
}

/**
 * PHASE 6 — Export Scraped Leads to Google Sheets via Web App Apps Script
 */
async function exportToGoogleSheets() {
  let webhookUrl = localStorage.getItem('google_sheets_webhook');
  if (!webhookUrl) {
    webhookUrl = prompt(
      "🔑 Google Sheets CRM Integration:\n\n" +
      "1. Create a Google Sheet named \"Leads\".\n" +
      "2. Open Extensions > Apps Script and paste the doPost script.\n" +
      "3. Deploy as a Web App (execute as Me, access Everyone).\n" +
      "4. Paste your Web App URL below:"
    );
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      localStorage.setItem('google_sheets_webhook', webhookUrl.trim());
      showToast('💾 Google Sheets URL saved!');
    } else {
      showToast('⚠️ Valid URL required!');
      return;
    }
  }

  if (activeLeads.emails.length === 0 && activeLeads.phones.length === 0) {
    showToast('⚠️ No leads available to export!');
    return;
  }

  showToast('📤 Connecting to Google Sheets...');
  googleSheetsBtn.disabled = true;
  googleSheetsBtn.innerText = 'Sending...';

  // Align data payload and tabUrl with user specified literal properties
  const data = activeLeads;
  let tabUrl = "https://bulk-list.com";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      tabUrl = tab.url;
    }
  } catch (e) {}

  try {
    // Send all emails and phones, not just the first one
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website: tabUrl,
        emails: data.emails.join(", "),
        email: data.emails[0] || "",
        phones: data.phones.join(", "),
        phone: data.phones[0] || "",
        socials: data.socials.join(", "),
        total_emails: data.emails.length,
        total_phones: data.phones.length
      })
    });
    showToast('🟢 Lead sent to Google Sheets!');
  } catch (err) {
    console.error('Sheet export failed', err);
    showToast('❌ Sheet export failed. Check Web App URL.');
  }

  googleSheetsBtn.disabled = false;
  googleSheetsBtn.innerText = 'Export to Sheets';
}

/**
 * STEP 4 — User Specified Bulk Website Scraper Engine
 */
async function scrapeWebsite(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();

    const emails = superExtractEmails(text, null);

    return {
      url,
      emails: [...new Set(emails)]
    };
  } catch (e) {
    return { url, emails: [] };
  }
}

/**
 * User Specified Sequential Bulk Scraper Execution
 */
async function runBulkScraper(list) {
  const results = [];

  for (let url of list) {
    const data = await scrapeWebsite(url);
    results.push(data);
  }

  return results;
}

/**
 * Executes a Bulk Scan process over multiple domains sequentially
 */
async function executeBulkScan(rawText) {
  showToast('⚡ Executing bulk domain scan...');
  emailsContainer.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Bulk scanning websites...</div>';
  socialsContainer.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Bulk mode (emails only)</div>';
  emailCountLabel.textContent = '0';
  socialCountLabel.textContent = '0';
  saveBtn.disabled = true;
  saveBtn.classList.remove('saved');
  downloadBtn.disabled = true;
  if (googleSheetsBtn) googleSheetsBtn.disabled = true;

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return;

  activeHost = `Bulk Scan (${lines.length} sites)`;

  // Normalise protocols for bulk crawler list
  const normalizedLines = lines.map(line => {
    let url = line;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  });

  // Call user specified sequential bulk crawler loop
  const bulkResults = await runBulkScraper(normalizedLines);
  
  let allEmails = [];
  bulkResults.forEach(res => {
    if (res && res.emails) {
      allEmails.push(...res.emails);
    }
  });

  let uniqueEmails = [...new Set(allEmails)];
  uniqueEmails = uniqueEmails.filter(isValidBusinessEmail);
  uniqueEmails.sort((a, b) => scoreEmail(b) - scoreEmail(a));

  activeLeads = { emails: uniqueEmails, socials: [], phones: [], contactEmails: [] };
  window.lastData = activeLeads;

  document.getElementById("emailCount").innerText = uniqueEmails.length;
  document.getElementById("socialCount").innerText = 0;

  // Map Bulk List AI Score exactly using user syntax conventions
  const data = activeLeads;
  const scoreData = calculateLeadScore(data, 'https://bulk-list.com');
  document.getElementById("leadScore").innerText = scoreData.score;

  emailsContainer.innerHTML = uniqueEmails.length === 0
    ? '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">No emails found</div>'
    : uniqueEmails.map(e => {
        const isPriority = scoreEmail(e) >= 10;
        return `
        <div class="scraped-item"${isPriority ? ' style="border-left: 2px solid #fbbf24; padding-left: 6px;"' : ''}>
          <span class="item-text" title="${e}">${isPriority ? '⭐ ' : '📧 '}${e}</span>
          <button class="copy-btn" data-value="${e}" title="Copy email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 3.375m9.25-10.375h1.125c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-3.375" />
            </svg>
          </button>
        </div>
      `}).join("");

  bindCopyButtons();
  if (uniqueEmails.length > 0) {
    saveBtn.disabled = false;
    downloadBtn.disabled = false;
    if (googleSheetsBtn) googleSheetsBtn.disabled = false;
  }
  showToast(`✅ Bulk scan complete: ${uniqueEmails.length} leads extracted!`);
}

/**
 * Execute Active-tab Scrapes and maps directly to the UI elements
 */
async function executeActiveSiteScan() {
  // Check if bulk mode is active
  const bulkText = bulkInput ? bulkInput.value.trim() : '';
  if (bulkText) {
    executeBulkScan(bulkText);
    return;
  }

  showToast('⚡ Scanning webpage leads...');
  
  emailsContainer.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Scanning page...</div>';
  socialsContainer.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Scanning page...</div>';
  emailCountLabel.textContent = '0';
  socialCountLabel.textContent = '0';
  saveBtn.disabled = true;
  saveBtn.classList.remove('saved');
  downloadBtn.disabled = true;
  if (googleSheetsBtn) googleSheetsBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab) return;
    if (tab.url.startsWith('about:') || tab.url.startsWith('chrome:') || tab.url.startsWith('edge:')) {
      showToast('❌ System pages cannot be scanned.');
      emailsContainer.innerHTML = socialsContainer.innerHTML = '';
      return;
    }

    try {
      const urlObj = new URL(tab.url);
      activeHost = urlObj.hostname;
    } catch (e) {
      activeHost = 'Unknown Domain';
    }

    // Message payload for Chrome MV3 standard messaging
    chrome.tabs.sendMessage(tab.id, { mode: "deep_scan" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Script injection fallback active (MV3 dynamic injections)...');
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            showToast(`❌ Scanner mount failure: ${chrome.runtime.lastError.message}`);
            return;
          }
          chrome.tabs.sendMessage(tab.id, { mode: "deep_scan" }, (retryResponse) => {
            let rEmails = (retryResponse && retryResponse.emails) ? retryResponse.emails : [];
            rEmails = rEmails.filter(isValidBusinessEmail);
            rEmails.sort((a, b) => scoreEmail(b) - scoreEmail(a));

            const rSocials = (retryResponse && retryResponse.socials) ? retryResponse.socials : [];
            const rPhones = (retryResponse && retryResponse.phones) ? retryResponse.phones : [];
            const rContactEmails = (retryResponse && retryResponse.contactEmails) ? retryResponse.contactEmails : [];

            activeLeads = { emails: rEmails, socials: rSocials, phones: rPhones, contactEmails: rContactEmails };
            window.lastData = activeLeads;

            document.getElementById("emailCount").innerText = rEmails.length;
            document.getElementById("socialCount").innerText = rSocials.length;

            // Execute user specified exact scoring assignment syntax on retry fallback
            const data = activeLeads;
            const scoreData = calculateLeadScore(data, tab.url);
            document.getElementById("leadScore").innerText = scoreData.score;

            emailsContainer.innerHTML = rEmails.length === 0
              ? '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">No emails found</div>'
              : rEmails.map(e => {
                  const isPriority = scoreEmail(e) >= 10;
                  return `
                  <div class="scraped-item"${isPriority ? ' style="border-left: 2px solid #fbbf24; padding-left: 6px;"' : ''}>
                    <span class="item-text" title="${e}">${isPriority ? '⭐ ' : '📧 '}${e}</span>
                    <button class="copy-btn" data-value="${e}" title="Copy email">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 3.375m9.25-10.375h1.125c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-3.375" />
                      </svg>
                    </button>
                  </div>
                `}).join("");

            socialsContainer.innerHTML = rSocials.map(s => `
              <div class="scraped-item">
                <span class="item-text" title="${s}">🔗 ${s}</span>
                <button class="copy-btn" data-value="${s}" title="Copy link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 3.375m9.25-10.375h1.125c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-3.375" />
                  </svg>
                </button>
              </div>
            `).join("");

            bindCopyButtons();
            if (rEmails.length > 0 || rSocials.length > 0 || rPhones.length > 0) {
              saveBtn.disabled = false;
              downloadBtn.disabled = false;
              if (googleSheetsBtn) googleSheetsBtn.disabled = false;
            }
            showToast('✅ Scan completed successfully!');
            runEnrichment();
          });
        });
        return;
      }

      let emails = (response && response.emails) ? response.emails : [];
      emails = emails.filter(isValidBusinessEmail);
      emails.sort((a, b) => scoreEmail(b) - scoreEmail(a));

      const socials = (response && response.socials) ? response.socials : [];
      const phones = (response && response.phones) ? response.phones : [];
      const contactEmails = (response && response.contactEmails) ? response.contactEmails : [];

      activeLeads = { emails, socials, phones, contactEmails };
      window.lastData = activeLeads;
      
      // Update stats counters
      document.getElementById("emailCount").innerText = emails.length;
      document.getElementById("socialCount").innerText = socials.length;

      // Execute user specified exact scoring assignment syntax
      const data = activeLeads;
      const scoreData = calculateLeadScore(data, tab.url);
      document.getElementById("leadScore").innerText = scoreData.score;

      // Emails render
      emailsContainer.innerHTML = emails.length === 0
        ? '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">No emails found</div>'
        : emails.map(e => {
            const isPriority = scoreEmail(e) >= 10;
            return `
            <div class="scraped-item"${isPriority ? ' style="border-left: 2px solid #fbbf24; padding-left: 6px;"' : ''}>
              <span class="item-text" title="${e}">${isPriority ? '⭐ ' : '📧 '}${e}</span>
              <button class="copy-btn" data-value="${e}" title="Copy email">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 3.375m9.25-10.375h1.125c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-3.375" />
                </svg>
              </button>
            </div>
          `}).join("");

      // Socials render
      socialsContainer.innerHTML = socials.length === 0
        ? '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">No socials found</div>'
        : socials.map(s => `
            <div class="scraped-item">
              <span class="item-text" title="${s}">🔗 ${s}</span>
              <button class="copy-btn" data-value="${s}" title="Copy link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 3.375m9.25-10.375h1.125c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-3.375" />
                </svg>
              </button>
            </div>
          `).join("");

      bindCopyButtons();
      
      if (emails.length > 0 || socials.length > 0 || phones.length > 0) {
        saveBtn.disabled = false;
        downloadBtn.disabled = false;
        if (googleSheetsBtn) googleSheetsBtn.disabled = false;
      }
      showToast('✅ Scan completed successfully!');
      runEnrichment();
    });

  } catch (error) {
    console.error('Scan Error', error);
    showToast(`❌ Scan Error: ${error.message}`);
  }
}

/**
 * Enrichment Layer - Performs deep page scans to enrich the active site leads
 */
async function runEnrichment() {
  showToast('⚡ Enrichment Layer Active: Running Deep Page Scans...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { type: "enrich", url: tab.url }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        console.warn("Enrichment Layer skipped or failed.");
        return;
      }
      
      let enEmails = response.emails || [];
      enEmails = enEmails.filter(isValidBusinessEmail);
      enEmails.sort((a, b) => scoreEmail(b) - scoreEmail(a));

      // Merge and remove duplicates
      activeLeads.emails = [...new Set([...activeLeads.emails, ...enEmails])];
      activeLeads.socials = [...new Set([...activeLeads.socials, ...(response.socials || [])])];
      activeLeads.phones = [...new Set([...activeLeads.phones, ...(response.phones || [])])];
      activeLeads.company = response.company || activeLeads.company || "";
      activeLeads.meta = response.meta || activeLeads.meta || {};
      activeLeads.contactPages = [...new Set([...(activeLeads.contactPages || []), ...(response.contactPages || [])])];
      window.lastData = activeLeads;

      // Re-render UI using Enriched UI renderer
      renderEnrichedUI(activeLeads);
      
      // Update counters
      document.getElementById("emailCount").innerText = activeLeads.emails.length;
      document.getElementById("socialCount").innerText = activeLeads.socials.length;
      
      // Calculate score
      const scoreData = calculateLeadScore(activeLeads, tab.url);
      const leadScoreEl = document.getElementById("leadScore");
      if (leadScoreEl) leadScoreEl.innerText = scoreData.score;
      
      showToast(`⚡ Enrichment complete: ${enEmails.length} extra emails found!`);
    });
  } catch (err) {
    console.error("Enrichment Layer Error:", err);
  }
}

/**
 * Save current list of scraped leads persistently using user saveLead signature
 */
function saveLeadsToHistory() {
  if (activeLeads.emails.length === 0 && activeLeads.socials.length === 0 && activeLeads.phones.length === 0) return;

  const timestamp = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const record = {
    host: activeHost,
    date: timestamp,
    emails: activeLeads.emails,
    socials: activeLeads.socials,
    phones: activeLeads.phones
  };

  // Call user specified function!
  saveLead(record);
  saveScrapedLead(record);

  saveBtn.disabled = true;
  saveBtn.classList.add('saved');
  showToast('💾 Leads list saved to database history!');
}

/**
 * Render Scan history screen logs lists using leads key (exact user match)
 */
function renderHistoryScreen() {
  historyLogs.innerHTML = '';
  
  // Exact user specified signature
  const leads =
    JSON.parse(
      localStorage.getItem("leads")
    ) || [];

  if (leads.length === 0) {
    historyLogs.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:15px;">No saved leads lists found</div>';
    return;
  }

  historyLogs.innerHTML = leads.map((item, index) => `
    <div class="history-row">
      <div class="history-info">
        <span class="history-host" title="${item.host}">${item.host}</span>
        <div class="history-meta">
          <span>📧 ${item.emails.length}</span>
          <span>🔗 ${item.socials.length}</span>
          <span>📞 ${(item.phones || []).length}</span>
          <span>${item.date}</span>
        </div>
      </div>
      <button class="copy-btn single-export-btn" data-index="${index}" title="Download list for this domain">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 10px; height: 10px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>
    </div>
  `).join("");

  // Bind single-row CSV export actions
  document.querySelectorAll('.single-export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      exportSingleDomainCsv(idx);
    });
  });
}

/**
 * Downloads a single-domain scanned leads sheet in CSV UTF-8 using leads key
 */
function exportSingleDomainCsv(index) {
  const raw = localStorage.getItem('leads') || '[]';
  const history = JSON.parse(raw);
  const item = history[index];
  if (!item) return;

  let csvContent = '\ufeff'; // Excel UTF-8 BOM
  csvContent += '"Classification","Value","Domain","Scanned Date"\r\n';

  item.emails.forEach(e => {
    csvContent += `"Email Address","${e.replace(/"/g, '""')}","${item.host}","${item.date}"\r\n`;
  });

  item.socials.forEach(s => {
    csvContent += `"Social Link","${s.replace(/"/g, '""')}","${item.host}","${item.date}"\r\n`;
  });

  (item.phones || []).forEach(p => {
    csvContent += `"Phone Number","${p.replace(/"/g, '""')}","${item.host}","${item.date}"\r\n`;
  });

  downloadBlob(csvContent, `leads-${item.host}.csv`, 'text/csv;charset=utf-8;');
  showToast(`📥 Exported ${item.host} leads list!`);
}

/**
 * Loops and downloads all saved history lists into a Master CSV sheet using leads key
 */
function exportMasterHistoryCsv() {
  const raw = localStorage.getItem('leads') || '[]';
  const history = JSON.parse(raw);
  if (history.length === 0) {
    showToast('⚠️ Leads database is empty!');
    return;
  }

  let csvContent = '\ufeff'; // Excel UTF-8 BOM
  csvContent += '"Domain","Classification","Target Value","Date Saved"\r\n';

  history.forEach(item => {
    item.emails.forEach(e => {
      csvContent += `"${item.host}","Email Address","${e.replace(/"/g, '""')}","${item.date}"\r\n`;
    });
    item.socials.forEach(s => {
      csvContent += `"${item.host}","Social Link","${s.replace(/"/g, '""')}","${item.date}"\r\n`;
    });
    (item.phones || []).forEach(p => {
      csvContent += `"${item.host}","Phone Number","${p.replace(/"/g, '""')}","${item.date}"\r\n`;
    });
  });

  downloadBlob(csvContent, 'master-leads-history.csv', 'text/csv;charset=utf-8;');
  showToast('📥 Master CSV Leads history downloaded!');
}

/**
 * Local Blob downloader
 */
function downloadBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  
  anchor.setAttribute('href', url);
  anchor.setAttribute('download', fileName);
  anchor.style.visibility = 'hidden';
  
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Bind copy triggers
 */
function bindCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = btn.getAttribute('data-value');
      if (val) {
        navigator.clipboard.writeText(val).then(() => {
          btn.classList.add('copy-success');
          showToast('📋 Copied value to clipboard!');
          setTimeout(() => btn.classList.remove('copy-success'), 1500);
        });
      }
    });
  });
}

/**
 * Notification Toast
 */
let toastTimeout;
function showToast(message) {
  const statusToast = document.getElementById('status-toast');
  const statusText = document.getElementById('status-text');
  if (!statusToast || !statusText) return;

  clearTimeout(toastTimeout);
  statusText.textContent = message;
  statusToast.classList.remove('hidden');
  
  toastTimeout = setTimeout(() => {
    statusToast.classList.add('hidden');
  }, 2500);
}

/**
 * LinkedIn CSV Exporter
 */
function exportLinkedInCSV(data) {
  const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
  const csv = `Company,Industry,Size,Website,LinkedIn Profile\n${sanitize(data.companyName)},${sanitize(data.industry)},${sanitize(data.companySize)},${sanitize(data.website)},${sanitize(data.linkedin)}`;
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `linkedin-lead-${data.companyName ? data.companyName.replace(/\s+/g, '-').toLowerCase() : 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Enrichment CSV Exporter
 */
function exportEnrichmentCSV(data) {
  const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;

  const facebook  = data.socials?.facebook?.join(" | ")  || "";
  const linkedin  = data.socials?.linkedin?.join(" | ")  || "";
  const twitter   = data.socials?.twitter?.join(" | ")   || "";
  const instagram = data.socials?.instagram?.join(" | ") || "";
  const emails    = data.emails?.join(" | ") || "";
  const pages     = data.pagesScanned?.length || 0;

  // ✅ Fix: Pages Scanned also sanitize করা হয়েছে
  const csv =
    `Website,Emails,LinkedIn,Facebook,Twitter,Instagram,Pages Scanned\n` +
    `${sanitize(data.website)},${sanitize(emails)},${sanitize(linkedin)},` +
    `${sanitize(facebook)},${sanitize(twitter)},${sanitize(instagram)},` +
    `${sanitize(String(pages))}`;  // ← এটাই আসল fix

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;

  const cleanName = data.website
    ? data.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    : 'enriched-lead';
  a.download = `enriched-${cleanName}.csv`;

  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Google Maps CSV Exporter
 */
function exportGoogleMapsCSV(results) {
  const sanitize = (str) => `"${(str || '').replace(/"/g, '""')}"`;
  let csv = "Name,Rating,Address,Website,Phone\n";
  results.forEach(item => {
    csv += `${sanitize(item.name)},${sanitize(item.rating)},${sanitize(item.address)},${sanitize(item.website)},${sanitize(item.phone)}\n`;
  });
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gmaps-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Render Enrichment Data into UI smoothly
 */
function renderEnrichedUI(data) {
  const emailsContainer = document.getElementById('emails');
  const socialsContainer = document.getElementById('socials');
  const phonesContainer = document.getElementById('phones');
  const websiteResult = document.getElementById("websiteResult");
  
  // --- CRITICAL BUG FIX: Convert Categorized Social Object into Plain Array ---
  let allSocials = [];
  if (data.socials) {
    if (Array.isArray(data.socials)) {
      allSocials = data.socials;
    } else if (typeof data.socials === 'object') {
      Object.values(data.socials).forEach(arr => {
        if (Array.isArray(arr)) {
          allSocials.push(...arr);
        }
      });
    }
  }

  // Update Counters
  const emailCountEl = document.getElementById("emailCount");
  const socialCountEl = document.getElementById("socialCount");
  if (emailCountEl) emailCountEl.innerText = data.emails ? data.emails.length : 0;
  if (socialCountEl) socialCountEl.innerText = allSocials.length;

  // Render Emails
  if (data.emails && data.emails.length > 0) {
    emailsContainer.innerHTML = data.emails.map(e => {
      const isPriority = scoreEmail(e) >= 10;
      const borderStyle = isPriority ? 'border: 1px solid #fbbf24; border-left: 3px solid #fbbf24;' : 'border: 1px solid rgba(255, 255, 255, 0.08);';
      const bgStyle = isPriority ? 'background: rgba(251, 191, 36, 0.1);' : 'background: rgba(255, 255, 255, 0.03);';
      const textColor = isPriority ? '#FBBF24' : '#E2E8F0';
      return `
      <div class="scraped-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; ${bgStyle} ${borderStyle} border-radius: 8px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: all 0.2s;">
        <span class="item-text" title="${e}" style="font-size: 11.5px; font-weight: 500; color: ${textColor}; word-break: break-all;">${isPriority ? '⭐ ' : '📧 '}${e}</span>
      </div>
    `}).join("");
  } else {
    emailsContainer.innerHTML = '<div style="font-size:10px; color:#94A3B8; text-align:center; padding:10px;">No emails found.</div>';
  }

  // Render Socials
  if (allSocials.length > 0) {
    socialsContainer.innerHTML = allSocials.map(s => {
      // Icon mapping logic
      let icon = "🔗";
      if (s.includes("linkedin.com")) icon = "💼";
      else if (s.includes("facebook.com")) icon = "📘";
      else if (s.includes("twitter.com") || s.includes("x.com")) icon = "🐦";
      else if (s.includes("instagram.com")) icon = "📸";
      else if (s.includes("youtube.com")) icon = "▶️";
      
      const cleanUrl = s.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      
      return `
      <div class="scraped-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: all 0.2s;">
        <span class="item-text" title="${s}" style="font-size: 11.5px; font-weight: 500; color: #60A5FA; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${icon} &nbsp;${cleanUrl}</span>
      </div>
    `}).join("");
  } else {
    socialsContainer.innerHTML = '<div style="font-size:10px; color:#94A3B8; text-align:center; padding:10px;">No social links found.</div>';
  }

  // Render Phones
  if (phonesContainer) {
    if (data.phones && data.phones.length > 0) {
      phonesContainer.innerHTML = data.phones.map(p => `
        <div class="scraped-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: all 0.2s;">
          <span class="item-text" title="${p}" style="font-size: 11.5px; font-weight: 500; color: #F472B6; word-break: break-all;">📞 ${p}</span>
        </div>
      `).join("");
    } else {
      phonesContainer.innerHTML = '<div style="font-size:10px; color:#94A3B8; text-align:center; padding:10px;">No phones found.</div>';
    }
  }

  // Render Company Intelligence & Metadata Cards
  if (websiteResult) {
    if (data.company || (data.meta && (data.meta.description || data.meta.ogTitle)) || (data.contactPages && data.contactPages.length > 0)) {
      websiteResult.style.display = "block";
      
      let contactsHtml = "";
      if (data.contactPages && data.contactPages.length > 0) {
        contactsHtml = `
          <div style="margin-top: 8px;">
            <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #94A3B8; display: block; margin-bottom: 4px;">Contact Links (${data.contactPages.length}):</span>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${data.contactPages.slice(0, 5).map(url => {
                let clean = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                if (clean.length > 25) clean = clean.substring(0, 22) + '...';
                return `<a href="${url}" target="_blank" style="font-size: 9px; color: #60A5FA; background: rgba(96, 165, 250, 0.1); padding: 2px 6px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(96, 165, 250, 0.15); transition: all 0.2s; white-space: nowrap;">🔗 ${clean}</a>`;
              }).join("")}
            </div>
          </div>
        `;
      }

      websiteResult.innerHTML = `
        <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; color: #E2E8F0; font-family: 'Inter', sans-serif; box-sizing: border-box; text-align: left;">
          <div style="font-weight: 700; font-size: 12px; color: #FFFFFF; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            🏢 ${data.company || "Company Intelligence"}
          </div>
          ${data.meta && data.meta.description ? `
            <div style="font-size: 10px; color: #94A3B8; line-height: 1.4; margin-bottom: 8px; font-style: italic; background: rgba(0,0,0,0.15); padding: 6px; border-radius: 6px; border-left: 2px solid #8B5CF6;">
              "${data.meta.description}"
            </div>
          ` : ''}
          ${contactsHtml}
        </div>
      `;
    } else {
      websiteResult.style.display = "none";
    }
  }
}

// ------------------------------------------------------------------
// UPGRADED EMAIL EXTRACTION & OBFUSCATION DECODERS
// ------------------------------------------------------------------

// Modern Wide-matching Regex assigned by user directive
const superRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

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
  const emails = reversedText.match(superRegex) || [];
  return emails.map(email => email.split("").reverse().join(""));
}

function decodeUrlEncodedEmails(text) {
  try {
    const decoded = decodeURIComponent(text);
    return decoded.match(superRegex) || [];
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
  
  if (html) {
    const standardMatches = html.match(superRegex);
    if (standardMatches) emails.push(...standardMatches);
  }
  
  if (doc) {
    const mailtoEmails = extractMailto(doc);
    emails.push(...mailtoEmails);
    const mailtoEmailsExtended = extractEmailsFromMailto(doc);
    emails.push(...mailtoEmailsExtended);
  } else if (html) {
    const mailtoEmails = extractMailtoFromHtmlText(html);
    emails.push(...mailtoEmails);
  }
  
  if (html) {
    const decodedText = decodeTextObfuscations(html);
    const obfuscatedMatches = decodedText.match(superRegex);
    if (obfuscatedMatches) emails.push(...obfuscatedMatches);
  }
  
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
  
  if (html) {
    const reversedEmails = extractReversedEmails(html);
    emails.push(...reversedEmails);
  }
  
  if (html) {
    const decodedEntities = decodeHtmlEntities(html);
    const entityMatches = decodedEntities.match(superRegex);
    if (entityMatches) emails.push(...entityMatches);
  }
  
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
        const matches = text.match(superRegex);
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
          const matches = content.match(superRegex);
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
        const matches = text.match(superRegex);
        if (matches) emails.push(...matches);
      } catch (e) {}
    });

    // Specifically target body content for visible DOM text
    if (doc.body) {
      const visibleText = doc.body.innerText || "";
      const matches = visibleText.match(superRegex);
      if (matches) emails.push(...matches);
    }
  }
  
  const validEmails = emails.filter(isValidBusinessEmail);
  return [...new Set(validEmails.map(e => e.trim().toLowerCase()))];
}

async function loadLeads(callback) {
  const result = await safeGet(["currentSession"]);
  const currentSession = result.currentSession;
  callback(currentSession ? currentSession.leads || [] : []);
}

/**
 * STEP 4 — Render Dashboard
 */
function renderLeads() {
  loadLeads((leads) => {
    const container = document.getElementById("leadList");
    if (!container) return;

    // Toggle Sync Session button status based on leads presence and auth token existence
    const syncBtn = document.getElementById("syncSaaSBtn");
    if (syncBtn) {
      const hasToken = !!localStorage.getItem("licenseKey");
      syncBtn.disabled = !(hasToken && leads.length > 0);
    }

    if (leads.length === 0) {
      container.innerHTML = '<div style="font-size:10px; color:#64748b; text-align:center; padding:10px;">Saved cross-browser leads will render here</div>';
      updateAILeadsWidget();
      return;
    }

    container.innerHTML = "";

    leads.forEach((lead) => {
      const div = document.createElement("div");
      div.className = "scraped-item";
      div.style.flexDirection = "column";
      div.style.alignItems = "flex-start";
      div.style.padding = "6px";
      div.style.gap = "2px";

      div.innerHTML = `
        <strong style="color: #60a5fa; font-size: 11px;">${lead.companyName || 'Unknown Company'}</strong>
        <span style="color: #94a3b8; font-size: 9.5px; font-family: monospace;">🌐 ${lead.website || 'N/A'}</span>
        <span style="color: #10b981; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px;">💼 ${lead.industry || 'N/A'}</span>
      `;

      container.appendChild(div);
    });

    updateAILeadsWidget();
  });
}

function updateAILeadsWidget() {
  chrome.runtime.sendMessage({ type: "GET_LEADS" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("CompX GET_LEADS runtime error:", chrome.runtime.lastError);
      return;
    }
    const latest = response?.[response.length - 1];

    const scoreEl = document.getElementById("score");
    const intentEl = document.getElementById("intent");
    const catBadge = document.getElementById("aiCategoryBadge");
    const signalsList = document.getElementById("aiSignalsList");

    if (scoreEl) {
      scoreEl.innerText = "Lead Score: " + (latest ? latest.score : 0);
      if (latest && latest.score >= 70) {
        scoreEl.style.color = "#10B981"; // Hot green
      } else if (latest && latest.score >= 40) {
        scoreEl.style.color = "#F59E0B"; // Warm amber
      } else {
        scoreEl.style.color = "#EF4444"; // Cold red
      }
    }

    if (intentEl) {
      intentEl.innerText = "Intent: " + (latest ? latest.intent : "COLD");
      if (latest && latest.intent === "hot") {
        intentEl.style.color = "#EC4899"; // Pink
      } else if (latest && latest.intent === "warm") {
        intentEl.style.color = "#8B5CF6"; // Violet
      } else {
        intentEl.style.color = "#60A5FA"; // Blue
      }
    }

    if (catBadge) {
      catBadge.innerText = latest ? latest.category : "UNKNOWN";
    }

    if (signalsList) {
      signalsList.innerHTML = "";
      if (latest && latest.signals && latest.signals.length > 0) {
        latest.signals.forEach(signal => {
          const badge = document.createElement("span");
          badge.className = "badge";
          badge.style.fontSize = "8px";
          badge.style.padding = "1px 4px";
          badge.style.background = "rgba(255, 255, 255, 0.05)";
          badge.style.color = "#E2E8F0";
          badge.style.border = "1px solid rgba(255, 255, 255, 0.08)";
          badge.style.borderRadius = "3px";
          badge.innerText = signal.replace("_", " ");
          signalsList.appendChild(badge);
        });
      } else {
        signalsList.innerHTML = '<span style="font-size: 8px; color: #64748B;">No signals collected</span>';
      }
    }
  });
}

/**
 * Archive Instead of Delete (PRO MOVE)
 */
async function archiveCurrentSession() {
  const res = await safeGet(["currentSession"]);
  const session = res.currentSession;

  if (!session) return;

  session.status = "archived";

  const r = await safeGet(["sessions"]);
  let sessions = r.sessions || [];
  
  // Only archive if the current session actually has leads
  if (session.leads && session.leads.length > 0) {
    sessions.push(session);
  }

  await safeSet({
    sessions,
    currentSession: null
  });
}

/**
 * Start New Session (Instead of delete / reload)
 */
async function startNewSession() {
  const newSession = {
    sessionId: Date.now().toString(),
    leads: [],
    createdAt: Date.now(),
    status: "active"
  };

  await safeSet({ currentSession: newSession });
}

/**
 * Save Instagram lead to storage (User required structures)
 */
async function saveInstagramLead(profile) {
  const res = await safeGet(["instagramLeads"]);
  let leads = res.instagramLeads || [];
  leads.push(profile);
  await safeSet({ instagramLeads: leads });
  
  // Also save to active currentSession.leads to show on the dashboard lead list!
  const record = {
    companyName: `@${profile.username} (${profile.fullName || 'Instagram Profile'})`,
    website: profile.website || 'N/A',
    industry: `Instagram - ${profile.businessType || 'General'} (Followers: ${profile.followers || '0'})`,
    timestamp: profile.scrapedAt
  };
  await saveScrapedLead(record);
}

async function runUniversalScraperEngine(tab) {
  const url = tab.url || "";
  const platform = detectPlatform(url);
  
  const titleEl = document.getElementById("resultTitle");
  if (titleEl) {
    titleEl.innerText = `${platform} Result`;
  }
  
  showToast(`🔍 Scraping ${platform} Info via Universal Engine...`);
  
  let type = "universalScrape";
  if (platform === "LinkedIn") {
    // LinkedIn company pages might need the /about/ URL redirect
    let tabId = tab.id;
    const cleanUrl = url.split(/[?#]/)[0];
    const aboutUrl = cleanUrl.replace(/\/$/, "") + "/about/";
    if (!url.includes("/about/")) {
      showToast('🚀 Opening About page... Please wait 5 seconds.');
      chrome.tabs.update(tabId, { url: aboutUrl });
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
      } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    type = "linkedin";
  } else if (platform === "Instagram") {
    type = "instagram";
  }
  
  chrome.tabs.sendMessage(tab.id, { type: type }, async (rawData) => {
    if (chrome.runtime.lastError) {
      console.error("Universal Scraper Error", chrome.runtime.lastError);
      showToast('❌ Content script not ready. Please refresh the page & try again.');
      return;
    }
    if (!rawData) {
      showToast(`❌ No data returned from ${platform} Scraper.`);
      return;
    }
    
    // Normalize Data structure exactly as requested
    const normalized = {
      platform: platform,
      name: "",
      website: "",
      email: "",
      socials: [],
      followers: "",
      sourceUrl: url
    };
    
    if (platform === "Instagram") {
      normalized.name = rawData.fullName || rawData.username || "";
      normalized.website = rawData.website || "";
      normalized.socials = [url];
      normalized.followers = rawData.followers || "";
    } else if (platform === "LinkedIn") {
      normalized.name = rawData.companyName || "";
      normalized.website = rawData.website || "";
      normalized.socials = [rawData.linkedin || url];
      normalized.followers = rawData.companySize || "";
    } else {
      normalized.name = tab.title || "";
      normalized.website = url;
      normalized.email = (rawData.emails && rawData.emails[0]) ? rawData.emails[0] : "";
      normalized.socials = rawData.socials || [];
    }
    
    // SHOW RESULT
    const resultEl = (platform === "Instagram") ? document.getElementById("instagramResult") : document.getElementById("linkedinResult");
    if (resultEl) {
      resultEl.innerText = JSON.stringify(normalized, null, 2);
    }
    
    // SAVE CRM
    await saveCRMNormalizedLead(normalized);
    
    showToast(`✅ ${platform} data normalized & saved to CRM!`);
  });
}

async function saveCRMNormalizedLead(normalized) {
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
  
  // Also push to active currentSession.leads to show on the dashboard lead list!
  const record = {
    companyName: normalized.name || `${normalized.platform} Lead`,
    website: normalized.website || 'N/A',
    industry: `${normalized.platform} (Followers: ${normalized.followers || '0'})`,
    timestamp: Date.now()
  };
  await saveScrapedLead(record);
  const statuses = await getCRMStatuses();
  const leadStatus = statuses[email] || { status: 'Scraped', sequenceStep: 0, opened: false, clicked: false, bounced: false };
  
  const badge = document.getElementById('crmStatusBadge');
  if (badge) {
    badge.innerText = leadStatus.status.toUpperCase();
    
    // Dynamically adjust badge color
    if (leadStatus.status === 'Scraped') {
      badge.style.background = '#1e293b';
      badge.style.color = '#94a3b8';
    } else if (leadStatus.status === 'Outreached') {
      badge.style.background = '#1e3a8a';
      badge.style.color = '#3b82f6';
    } else if (leadStatus.status === 'Replied') {
      badge.style.background = '#065f46';
      badge.style.color = '#34d399';
    } else if (leadStatus.status === 'Closed Client') {
      badge.style.background = '#78350f';
      badge.style.color = '#fbbf24';
    }
  }
  
  // Update timeline width and nodes
  const timelineTrack = document.getElementById('crmTimelineTrack');
  const nodes = {
    'Scraped': document.getElementById('node-scraped'),
    'Outreached': document.getElementById('node-outreached'),
    'Replied': document.getElementById('node-replied'),
    'Closed Client': document.getElementById('node-closed')
  };
  
  // Reset classes
  Object.values(nodes).forEach(node => {
    if (node) {
      node.classList.remove('active', 'completed');
      const circle = node.querySelector('.node-circle');
      if (circle) {
        circle.style.background = '#1e293b';
        circle.style.borderColor = '#334155';
        circle.style.boxShadow = 'none';
      }
      const label = node.querySelector('span');
      if (label) {
        label.style.color = '#64748b';
        label.style.fontWeight = '600';
      }
    }
  });
  
  const statusOrder = ['Scraped', 'Outreached', 'Replied', 'Closed Client'];
  const currentIndex = statusOrder.indexOf(leadStatus.status);
  
  if (timelineTrack) {
    const percentage = currentIndex * 33.33;
    timelineTrack.style.width = `${percentage}%`;
  }
  
  statusOrder.forEach((status, idx) => {
    const node = nodes[status];
    if (node) {
      const circle = node.querySelector('.node-circle');
      const label = node.querySelector('span');
      
      if (idx < currentIndex) {
        node.classList.add('completed');
        if (circle) {
          circle.style.background = '#10b981';
          circle.style.borderColor = '#0f172a';
          circle.style.boxShadow = '0 0 6px #10b981';
        }
        if (label) {
          label.style.color = '#34d399';
        }
      } else if (idx === currentIndex) {
        node.classList.add('active');
        if (circle) {
          circle.style.background = '#8b5cf6';
          circle.style.borderColor = '#0f172a';
          circle.style.boxShadow = '0 0 8px #8b5cf6, 0 0 15px rgba(139, 92, 246, 0.3)';
        }
        if (label) {
          label.style.color = '#a78bfa';
          label.style.fontWeight = '700';
        }
      }
    }
  });


