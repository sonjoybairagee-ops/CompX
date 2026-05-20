import { db, isFirebaseConfigured } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";

export interface EmailHistoryEntry {
  sentAt: string;         // ISO timestamp
  subject: string;
  status: "sent" | "bounced" | "opened";
  day: 0 | 3 | 7;
  method: "resend" | "gmail" | "simulated";
}

export interface Lead {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  rating: number;
  reviews: number;
  status: "Synced" | "Pending";
  date: string;
  // Source platform columns
  source?: "Google Maps" | "Website" | "LinkedIn" | "Instagram";
  followersCount?: number;
  biography?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  companySize?: string;
  enrichmentData?: Array<{ type: string; value: string }>;
  // Cold Outreach Telemetry Columns
  outreachStatus?: "Scraped" | "Outreached" | "Replied" | "Closed Client";
  opened?: boolean;
  clicked?: boolean;
  bounced?: boolean;
  score?: number;
  sentAt?: string;                        // Last sent timestamp
  emailHistory?: EmailHistoryEntry[];     // Full send history log
}

const defaultSeedLeads: Lead[] = [
  {
    id: "lead-1",
    name: "London Dental Group",
    category: "Dentist",
    phone: "+44 20 7946 0958",
    email: "info@londondental.co.uk",
    address: "12 Baker St, London NW1 6XE",
    website: "https://www.londondental.co.uk",
    rating: 4.8,
    reviews: 124,
    status: "Synced",
    date: "2026-05-20",
    source: "Google Maps",
  },
  {
    id: "lead-2",
    name: "Vesper Digital Corp",
    category: "Software Enterprise",
    phone: "+1 415-555-0199",
    email: "growth@vesperdigital.com",
    address: "201 Mission St, San Francisco, CA",
    website: "https://vesperdigital.com",
    rating: 4.9,
    reviews: 42,
    status: "Synced",
    date: "2026-05-20",
    source: "Website",
    enrichmentData: [
      { type: "Email", value: "growth@vesperdigital.com" },
      { type: "Email", value: "support@vesperdigital.com" },
      { type: "Social", value: "https://facebook.com/vesperdigital" },
      { type: "Social", value: "https://twitter.com/vesperdigital" },
      { type: "Social", value: "https://linkedin.com/company/vesperdigital" },
      { type: "Social", value: "https://instagram.com/vesperdigital" }
    ]
  },
  {
    id: "lead-3",
    name: "Apex AI Solutions",
    category: "Artificial Intelligence",
    phone: "+1 650-555-8833",
    email: "contact@apexai.io",
    address: "3000 Sand Hill Rd, Menlo Park, CA",
    website: "https://apexai.io",
    rating: 4.7,
    reviews: 156,
    status: "Synced",
    date: "2026-05-20",
    source: "LinkedIn",
    linkedinUrl: "https://www.linkedin.com/company/apexai",
    companySize: "51-200 employees",
  },
  {
    id: "lead-4",
    name: "Aura Fashion Label",
    category: "Apparel & Retail",
    phone: "",
    email: "collaboration@aurafashion.co",
    address: "Instagram Profile (@aura_fashion)",
    website: "https://aurafashion.co",
    rating: 4.6,
    reviews: 88,
    status: "Synced",
    date: "2026-05-19",
    source: "Instagram",
    instagramUrl: "https://www.instagram.com/aura_fashion",
    followersCount: 48200,
    biography: "Voted top eco-friendly brand. Direct B2B inquiries: collaboration@aurafashion.co 🌿",
  },
  {
    id: "lead-5",
    name: "City Dental Clinic",
    category: "Dentist",
    phone: "+44 20 7946 0233",
    email: "contact@citydental.co.uk",
    address: "45 Fleet St, London EC4Y 1BJ",
    website: "https://www.citydental.co.uk",
    rating: 4.5,
    reviews: 82,
    status: "Synced",
    date: "2026-05-18",
    source: "Google Maps",
  },
  {
    id: "lead-6",
    name: "Jane Smith (GrowthFlow)",
    category: "SaaS Business",
    phone: "+1 415-555-0177",
    email: "jane@growthflow.io",
    address: "555 Mission St, San Francisco, CA",
    website: "https://www.growthflow.io",
    rating: 4.6,
    reviews: 12,
    status: "Synced",
    date: "2026-05-18",
    source: "Website",
    enrichmentData: [
      { type: "Email", value: "jane@growthflow.io" },
      { type: "Social", value: "https://twitter.com/growthflow" }
    ]
  },
  {
    id: "lead-7",
    name: "PixelCraft Agency",
    category: "Design Services",
    phone: "+1 212-555-0988",
    email: "hello@pixelcraft.agency",
    address: "Instagram Profile (@pixelcraft)",
    website: "https://pixelcraft.agency",
    rating: 4.4,
    reviews: 29,
    status: "Synced",
    date: "2026-05-17",
    source: "Instagram",
    instagramUrl: "https://www.instagram.com/pixelcraft",
    followersCount: 15400,
    biography: "We build award winning websites. Hit us up for details!",
  }
];

/**
 * Fetch all leads for a given user.
 * Seeds default leads if the database is currently empty.
 */
export const fetchUserLeads = async (userId: string): Promise<Lead[]> => {
  if (isFirebaseConfigured && db) {
    try {
      const leadsCollectionRef = collection(db, "users", userId, "leads");
      const snapshot = await getDocs(leadsCollectionRef);

      let leads: Lead[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          leads.push({
            id: docSnap.id,
            name: data.name || "",
            category: data.category || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            website: data.website || "",
            rating: data.rating || 0,
            reviews: data.reviews || 0,
            status: data.status || "Pending",
            date: data.date || new Date().toISOString().split("T")[0],
            source: data.source || "Google Maps",
            followersCount: data.followersCount,
            biography: data.biography,
            linkedinUrl: data.linkedinUrl,
            instagramUrl: data.instagramUrl,
            companySize: data.companySize,
            enrichmentData: data.enrichmentData,
          });
        });
      }

      // Merge with mock DB leads (since Next.js API route writes to mock DB due to Firebase security rules)
      try {
        const res = await fetch(`/api/extension/leads?userId=${userId}`);
        const data = await res.json();
        if (data.status === "success" && data.leads) {
          const firestoreIds = new Set(leads.map(l => l.id));
          data.leads.forEach((l: Lead) => {
            if (!firestoreIds.has(l.id)) {
              leads.push(l);
            }
          });
        }
      } catch (mockErr) {
        console.warn("[Leads DB] Mock merge failed:", mockErr);
      }

      // If both are completely empty, seed default leads
      if (leads.length === 0) {
        console.log(`[Leads DB] Seeding default leads in Firestore for user: ${userId}`);
        await saveUserLeads(userId, defaultSeedLeads);
        return defaultSeedLeads;
      }

      return leads;
    } catch (err) {
      console.error("[Leads DB] Error fetching leads from Firestore:", err);
      // Even if Firestore fails completely, try to load mock DB leads
      try {
        const res = await fetch(`/api/extension/leads?userId=${userId}`);
        const data = await res.json();
        if (data.status === "success" && data.leads && data.leads.length > 0) {
          return data.leads;
        }
      } catch (mockErr) {}
      
      return [];
    }
  } else {
    // LocalStorage Fallback Mode
    try {
      const localKey = `compx_user_leads_${userId}`;
      const savedLeadsStr = localStorage.getItem(localKey);
      
      let localLeads: Lead[] = [];
      if (savedLeadsStr) {
        localLeads = JSON.parse(savedLeadsStr);
      } else {
        console.log(`[Leads DB] Seeding default leads in LocalStorage for user: ${userId}`);
        localStorage.setItem(localKey, JSON.stringify(defaultSeedLeads));
        localLeads = defaultSeedLeads;
      }

      // Sync with server-side mock JSON database if available
      // When the browser extension POSTs leads to /api/extension/leads, it writes them into the server public directory.
      // This fetch block dynamically merges them so that the client dashboard shows live extension scraped leads!
      try {
        const res = await fetch(`/mock_db_${userId}.json`);
        if (res.ok) {
          const serverMockLeads: Lead[] = await res.json();
          // Merge unique leads by ID
          const existingIds = new Set(localLeads.map(l => l.id));
          const uniqueServerLeads = serverMockLeads.filter(l => !existingIds.has(l.id));
          
          if (uniqueServerLeads.length > 0) {
            console.log(`[Leads DB] Discovered ${uniqueServerLeads.length} new leads on server mock database. Merging...`);
            localLeads = [...uniqueServerLeads, ...localLeads];
            localStorage.setItem(localKey, JSON.stringify(localLeads));
          }
        }
      } catch (mockFetchErr) {
        // Statically served mock leads file may not exist yet, ignore
      }

      return localLeads;
    } catch (err) {
      console.error("[Leads DB] LocalStorage mock fetch leads error:", err);
      return [];
    }
  }
};

/**
 * Save/insert a batch of new leads to the user's collection.
 */
export const saveUserLeads = async (userId: string, newLeads: Lead[]): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      newLeads.forEach((lead) => {
        const leadDocRef = doc(db, "users", userId, "leads", lead.id);
        batch.set(leadDocRef, {
          name: lead.name,
          category: lead.category,
          phone: lead.phone,
          email: lead.email,
          address: lead.address,
          website: lead.website,
          rating: lead.rating,
          reviews: lead.reviews,
          status: lead.status,
          date: lead.date,
          // Source platforms
          source: lead.source || "Google Maps",
          followersCount: lead.followersCount || null,
          biography: lead.biography || null,
          linkedinUrl: lead.linkedinUrl || null,
          instagramUrl: lead.instagramUrl || null,
          companySize: lead.companySize || null,
          enrichmentData: lead.enrichmentData || null,
        });
      });
      await batch.commit();
      console.log(`[Leads DB] Successfully committed batch of ${newLeads.length} leads in Firestore.`);
    } catch (err) {
      console.error("[Leads DB] Error batch writing leads in Firestore:", err);
    }
  } else {
    // LocalStorage Fallback Mode
    try {
      const localKey = `compx_user_leads_${userId}`;
      const currentLeadsStr = localStorage.getItem(localKey);
      const currentLeads: Lead[] = currentLeadsStr ? JSON.parse(currentLeadsStr) : [];
      
      // Merge unique leads by ID
      const currentIds = new Set(currentLeads.map(l => l.id));
      const filteredNew = newLeads.filter(l => !currentIds.has(l.id));
      
      const mergedLeads = [...filteredNew, ...currentLeads];
      localStorage.setItem(localKey, JSON.stringify(mergedLeads));
      console.log(`[Leads DB] Successfully committed ${newLeads.length} leads in LocalStorage.`);
    } catch (err) {
      console.error("[Leads DB] LocalStorage mock save leads error:", err);
    }
  }
};

/**
 * Delete a specific lead from the database.
 */
export const deleteUserLead = async (userId: string, leadId: string): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      const leadDocRef = doc(db, "users", userId, "leads", leadId);
      await deleteDoc(leadDocRef);
      console.log(`[Leads DB] Successfully deleted lead ${leadId} from Firestore.`);
    } catch (err) {
      console.error("[Leads DB] Error deleting lead from Firestore:", err);
    }
  } else {
    // LocalStorage Fallback Mode
    try {
      const localKey = `compx_user_leads_${userId}`;
      const currentLeadsStr = localStorage.getItem(localKey);
      if (currentLeadsStr) {
        const currentLeads: Lead[] = JSON.parse(currentLeadsStr);
        const filteredLeads = currentLeads.filter((lead) => lead.id !== leadId);
        localStorage.setItem(localKey, JSON.stringify(filteredLeads));
        console.log(`[Leads DB] Successfully deleted lead ${leadId} from LocalStorage.`);
      }
    } catch (err) {
      console.error("[Leads DB] LocalStorage mock delete lead error:", err);
    }
  }
};

/**
 * Clear all leads from the user's database.
 */
export const clearAllUserLeads = async (userId: string): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      const leadsCollectionRef = collection(db, "users", userId, "leads");
      const snapshot = await getDocs(leadsCollectionRef);
      
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.log(`[Leads DB] Successfully purged all leads from Firestore.`);
    } catch (err) {
      console.error("[Leads DB] Error clearing all leads from Firestore:", err);
    }
  } else {
    // LocalStorage Fallback Mode
    try {
      const localKey = `compx_user_leads_${userId}`;
      localStorage.setItem(localKey, JSON.stringify([]));
      console.log(`[Leads DB] Successfully cleared all leads from LocalStorage.`);
    } catch (err) {
      console.error("[Leads DB] LocalStorage mock clear leads error:", err);
    }
  }
};

/**
 * Update CRM Synchronization status for a list of leads (e.g. syncing to HubSpot)
 */
export const updateLeadsSyncStatusInDb = async (userId: string, leadIds: string[], status: "Synced" | "Pending"): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      leadIds.forEach((leadId) => {
        const leadDocRef = doc(db, "users", userId, "leads", leadId);
        batch.update(leadDocRef, { status: status });
      });
      await batch.commit();
      console.log(`[Leads DB] Updated CRM status to ${status} for ${leadIds.length} leads in Firestore.`);
    } catch (err) {
      console.error("[Leads DB] Error updating lead sync status in Firestore:", err);
    }
  } else {
    // LocalStorage Fallback Mode
    try {
      const localKey = `compx_user_leads_${userId}`;
      const currentLeadsStr = localStorage.getItem(localKey);
      if (currentLeadsStr) {
        const currentLeads: Lead[] = JSON.parse(currentLeadsStr);
        const updatedLeads = currentLeads.map((lead) =>
          leadIds.includes(lead.id) ? { ...lead, status: status } : lead
        );
        localStorage.setItem(localKey, JSON.stringify(updatedLeads));
        console.log(`[Leads DB] Updated CRM status to ${status} for ${leadIds.length} leads in LocalStorage.`);
      }
    } catch (err) {
      console.error("[Leads DB] LocalStorage mock sync status error:", err);
    }
  }
};

/**
 * Update Cold Outreach fields for a lead in Firestore or LocalStorage.
 */
export const updateLeadOutreachFieldsInDb = async (
  userId: string,
  leadId: string,
  fields: Partial<Pick<Lead, "outreachStatus" | "opened" | "clicked" | "bounced" | "score" | "sentAt" | "emailHistory">>
): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const leadDocRef = doc(db, "users", userId, "leads", leadId);
      await setDoc(leadDocRef, fields, { merge: true });
      console.log(`[Leads DB] Updated outreach fields for lead ${leadId} in Firestore:`, fields);
    } catch (err) {
      console.error("[Leads DB] Error updating lead outreach fields in Firestore:", err);
    }
  } else {
    // LocalStorage Fallback Mode
    try {
      const localKey = `compx_user_leads_${userId}`;
      const currentLeadsStr = localStorage.getItem(localKey);
      if (currentLeadsStr) {
        const currentLeads: Lead[] = JSON.parse(currentLeadsStr);
        const updatedLeads = currentLeads.map((lead) =>
          lead.id === leadId ? { ...lead, ...fields } : lead
        );
        localStorage.setItem(localKey, JSON.stringify(updatedLeads));
        console.log(`[Leads DB] Updated outreach fields for lead ${leadId} in LocalStorage:`, fields);
      }
    } catch (err) {
      console.error("[Leads DB] LocalStorage mock outreach update error:", err);
    }
  }
};

