import { NextResponse } from "next/server";
import { doc, getDoc, setDoc, writeBatch, collection, addDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import { adminDb, adminAuth } from "@/utils/firebaseAdmin";
import fs from "fs";
import path from "path";

const TOKENS_FILE = path.join(process.cwd(), "public", "mock_db_tokens.json");

function getMockUser(token: string) {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
      return tokens[token] || null;
    }
  } catch (e) {
    console.error("[Leads Endpoint] Error reading mock user token:", e);
  }
  return null;
}

function updateMockUserUsage(token: string, additionalLeads: number) {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
      if (tokens[token]) {
        tokens[token].leadsUsed += additionalLeads;
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
        return tokens[token];
      }
    }
  } catch (e) {
    console.error("[Leads Endpoint] Error updating mock user usage:", e);
  }
  return null;
}

function writeMockLeads(userId: string, newLeads: any[]) {
  try {
    const file = path.join(process.cwd(), "public", `mock_db_${userId}.json`);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let currentLeads: any[] = [];
    if (fs.existsSync(file)) {
      currentLeads = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    
    // Add unique ones only or merge
    const existingIds = new Set(currentLeads.map(l => l.id));
    const uniqueNew = newLeads.filter(l => !existingIds.has(l.id));
    
    const merged = [...uniqueNew, ...currentLeads];
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
  } catch (e) {
    console.error("[Leads Endpoint] Error writing mock leads:", e);
  }
  return newLeads;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-compx-token",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qUserId = searchParams.get("userId");
  
  if (qUserId) {
    try {
      const fs = require("fs");
      const path = require("path");
      const file = path.join(process.cwd(), "public", `mock_db_${qUserId}.json`);
      if (fs.existsSync(file)) {
        const leads = JSON.parse(fs.readFileSync(file, "utf-8"));
        return NextResponse.json(
          { status: "success", leads },
          { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
        );
      }
    } catch(e) {
      console.error("[Leads Endpoint] Error reading mock leads:", e);
    }
    return NextResponse.json(
      { status: "success", leads: [] },
      { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }

  // ── PRIORITY 1: Firebase ID Token via Authorization: Bearer ─────────────────
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ") && adminAuth) {
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const uid = decoded.uid;

      // Fetch user data from Firestore via Admin SDK
      let userProfile = { email: decoded.email || "user@compx.ai", plan: "free", leadsUsed: 0, leadLimit: 1000 };
      if (adminDb) {
        const userSnap = await adminDb.collection("users").doc(uid).get();
        if (userSnap.exists) {
          const d = userSnap.data() as any;
          userProfile = {
            email: d.email || decoded.email || "user@compx.ai",
            plan: d.plan || "free",
            leadsUsed: d.leadsUsed || 0,
            leadLimit: d.leadLimit || 1000,
          };
        }
      }

      return NextResponse.json(
        { status: "success", user: userProfile },
        { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    } catch (verifyErr) {
      console.error("[Leads API] Firebase ID token verification failed:", verifyErr);
      return NextResponse.json(
        { status: "error", message: "Invalid or expired Firebase token." },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
  }

  // ── LEGACY: x-compx-token header support ─────────────────────────────────
  const token = request.headers.get("x-compx-token");
  if (!token) {
    return NextResponse.json(
      { status: "error", message: "Token missing" },
      { 
        status: 401, 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  }

  // 1. Try Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const tokenDoc = await getDoc(doc(db, "tokens", token));
      if (tokenDoc.exists()) {
        const data = tokenDoc.data();
        const userDoc = await getDoc(doc(db, "users", data.userId));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        return NextResponse.json(
          {
            status: "success",
            user: {
              email: userData.email || data.email || "user@compx.ai",
              plan: userData.plan || "free",
              leadsUsed: userData.leadsUsed || 0,
              leadLimit: userData.leadLimit || 1000,
            }
          },
          { 
            headers: { 
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json"
            } 
          }
        );
      }
    } catch (e) {
      console.error("[Leads Endpoint] Firestore token fetch failed:", e);
    }
  }

  // 2. Try Local Mock DB Fallback
  const mockUser = getMockUser(token);
  if (mockUser) {
    return NextResponse.json(
      {
        status: "success",
        user: {
          email: mockUser.email,
          plan: mockUser.plan,
          leadsUsed: mockUser.leadsUsed,
          leadLimit: mockUser.leadLimit,
        }
      },
      { 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  }

  return NextResponse.json(
    { status: "error", message: "Unauthorized Developer Token." },
    { 
      status: 401, 
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      } 
    }
  );
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-compx-token");
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Token missing" },
        { 
          status: 401, 
          headers: { 
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          } 
        }
      );
    }

    const body = await request.json();
    const { leads } = body;
    
    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json(
        { status: "error", message: "Invalid payload format. Must supply array of leads." },
        { 
          status: 400, 
          headers: { 
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          } 
        }
      );
    }

    // Resolve user profile details
    let user: any = null;
    let userId = "";

    if (isFirebaseConfigured && db) {
      try {
        const tokenDoc = await getDoc(doc(db, "tokens", token));
        if (tokenDoc.exists()) {
          const tokenData = tokenDoc.data();
          userId = tokenData.userId;
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            user = userDoc.data();
          }
        }
      } catch (e) {
        console.error("[Leads Endpoint] Firestore POST resolve error:", e);
      }
    }

    // Fallback mock check
    if (!userId) {
      const mockUser = getMockUser(token);
      if (mockUser) {
        user = mockUser;
        userId = mockUser.userId;
      }
    }

    if (!userId || !user) {
      return NextResponse.json(
        { status: "error", message: "Invalid Developer Token." },
        { 
          status: 401, 
          headers: { 
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          } 
        }
      );
    }

    const leadsUsed = user.leadsUsed || 0;
    const leadLimit = user.leadLimit || 1000;

    if (leadsUsed + leads.length > leadLimit) {
      return NextResponse.json(
        { status: "error", message: "Plan lead limit exceeded. Upgrade required." },
        { 
          status: 403, 
          headers: { 
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          } 
        }
      );
    }

    // Reformat and sanitize raw extension scraped fields
    const formattedLeads = leads.map((l: any, idx: number) => ({
      id: l.id || `lead-ext-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      name: l.name || "Unnamed Lead",
      category: l.category || "Scraped Lead",
      phone: l.phone || "",
      email: l.email || "",
      address: l.address || "",
      website: l.website || "",
      rating: Number(l.rating) || 0,
      reviews: Number(l.reviews) || 0,
      status: "Synced" as const,
      date: new Date().toISOString().split("T")[0],
      source: l.source || "Google Maps",
      // Source-specific enrichment indicators
      followersCount: l.followersCount !== undefined ? Number(l.followersCount) : undefined,
      biography: l.biography || undefined,
      linkedinUrl: l.linkedinUrl || undefined,
      companySize: l.companySize || undefined,
      enrichmentData: l.enrichmentData || undefined,
    }));

    // Firestore Batch Write
    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        formattedLeads.forEach((lead) => {
          const leadRef = doc(db, "users", userId, "leads", lead.id);
          batch.set(leadRef, lead);
        });
        
        const newUsage = leadsUsed + leads.length;
        const userRef = doc(db, "users", userId);
        batch.update(userRef, { leadsUsed: newUsage });
        
        const tokenRef = doc(db, "tokens", token);
        batch.update(tokenRef, { leadsUsed: newUsage });

        await batch.commit();
        user.leadsUsed = newUsage;
        console.log(`[Leads Endpoint] Successfully batch saved ${leads.length} leads in Firestore.`);
      } catch (dbErr) {
        console.error("[Leads Endpoint] Firestore batch write exception:", dbErr);
      }
    }

    // Always keep public mock DB file synced to ensure complete offline sandbox capability
    writeMockLeads(userId, formattedLeads);
    const updatedMock = updateMockUserUsage(token, leads.length);
    if (updatedMock) {
      user.leadsUsed = updatedMock.leadsUsed;
    } else {
      user.leadsUsed = (user.leadsUsed || 0) + leads.length;
    }

    return NextResponse.json(
      {
        status: "success",
        message: `${leads.length} leads imported successfully.`,
        leadsUsed: user.leadsUsed,
        leadLimit: user.leadLimit
      },
      { 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  } catch (err: any) {
    console.error("[Leads Endpoint] POST route exception handler:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Internal server error" },
      { 
        status: 500, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      }
    );
  }
}
