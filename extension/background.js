// Chrome & Firefox compatible background script
const extensionAPI = typeof chrome !== 'undefined' ? chrome : browser;

extensionAPI.action.onClicked.addListener(() => {
  extensionAPI.windows.create({
    url: extensionAPI.runtime.getURL("popup.html"),
    type: "popup",
    width: 400,
    height: 650
  });
});

// --- BACKGROUND STORAGE SYSTEM (Phase 3 Integration with MV3 Persistence) ---
let leads = [];

// Initialize memory array from persistent storage on service worker startup
extensionAPI.storage.local.get(["leads"], (result) => {
  if (result.leads) {
    leads = result.leads;
    console.log("📊 Loaded existing leads from storage:", leads.length);
  }
});

// Listener for leads pipeline
extensionAPI.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "LEAD_DATA") {
    const leadRecord = {
      ...msg.payload,
      timestamp: Date.now()
    };
    leads.push(leadRecord);

    // Save to persistent storage to survive MV3 Service Worker suspensions
    extensionAPI.storage.local.set({ leads: leads }, () => {
      console.log("📊 Lead stored persistently. Total:", leads.length);
    });

    console.log("📊 Lead stored:", leads.length);
  }
  
  else if (msg.type === "AUTH_TOKEN") {
    extensionAPI.storage.local.set({ firebaseToken: msg.token }, () => {
      console.log("🔐 Firebase Auth Token saved to extension storage.");
    });
  }

  else if (msg.type === "GET_LEADS") {
    // Return all leads to popup or other requesting components
    extensionAPI.storage.local.get(["leads"], (result) => {
      sendResponse(result.leads || leads);
    });
    return true; // Keep channel open for asynchronous sendResponse
  }
});
