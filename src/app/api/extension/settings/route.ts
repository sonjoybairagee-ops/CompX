import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/utils/firebase";
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
    console.error("[Settings API] Error reading tokens:", e);
  }
  return null;
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
  try {
    const token = request.headers.get("x-compx-token");
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Token missing" },
        { 
          status: 401, 
          headers: { "Access-Control-Allow-Origin": "*" } 
        }
      );
    }

    let userId = "";
    if (isFirebaseConfigured && db) {
      try {
        const tokenDoc = await getDoc(doc(db, "tokens", token));
        if (tokenDoc.exists()) {
          userId = tokenDoc.data().userId;
        }
      } catch (e) {
        console.error("[Settings API] Firestore get token error:", e);
      }
    }

    if (!userId) {
      const mockUser = getMockUser(token);
      if (mockUser) {
        userId = mockUser.userId;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized Developer Token." },
        { 
          status: 401, 
          headers: { "Access-Control-Allow-Origin": "*" } 
        }
      );
    }

    // Default premium scraper settings to synchronize with the Chrome/Firefox extension
    const defaultSettings = {
      velocityDelay: 1200,      // velocity in ms
      deepEmailSearch: true,     // whether to deep search emails on website domains
      phoneVerification: false,  // verify phone carriers
      linkedinScale: "all",      // capture scale
    };

    if (isFirebaseConfigured && db) {
      try {
        const settingsDoc = await getDoc(doc(db, "users", userId, "settings", "scraper"));
        if (settingsDoc.exists()) {
          return NextResponse.json(
            { status: "success", settings: { ...defaultSettings, ...settingsDoc.data() } },
            { headers: { "Access-Control-Allow-Origin": "*" } }
          );
        }
      } catch (e) {
        console.error("[Settings API] Error loading user Firestore settings:", e);
      }
    }

    // Return fallback settings if not configured
    return NextResponse.json(
      { status: "success", settings: defaultSettings },
      { 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  } catch (err: any) {
    console.error("[Settings API] Exception handler:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { 
        status: 500, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      }
    );
  }
}
