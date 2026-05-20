import { NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import fs from "fs";
import path from "path";

const TOKENS_FILE = path.join(process.cwd(), "public", "mock_db_tokens.json");

function readMockTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("[Token Registry] Error reading mock tokens:", e);
  }
  return {};
}

function writeMockTokens(tokens: any) {
  try {
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
  } catch (e) {
    console.error("[Token Registry] Error writing mock tokens:", e);
  }
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

export async function POST(request: Request) {
  try {
    const { userId, email, token } = await request.json();
    
    if (!userId || !token) {
      return NextResponse.json(
        { status: "error", message: "Missing userId or token." },
        { 
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    console.log(`[Token Registry] Registering token for user ${userId} (${email}): ${token}`);

    if (isFirebaseConfigured && db) {
      try {
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { developerToken: token, email: email || "" }, { merge: true });
        
        const tokenRef = doc(db, "tokens", token);
        await setDoc(tokenRef, { 
          userId, 
          email: email || "", 
          plan: "free", 
          leadLimit: 1000, 
          leadsUsed: 0 
        }, { merge: true });
        
        console.log(`[Token Registry] Successfully committed token to Firestore for user: ${userId}`);
      } catch (dbErr) {
        console.error("[Token Registry] Firestore write failure, falling back to local store:", dbErr);
      }
    }

    // Always keep local/offline mock database in sync
    const tokens = readMockTokens();
    tokens[token] = {
      userId,
      email: email || "developer@compx.ai",
      plan: "pro", // Default to pro for smooth developer unpacked testing
      leadLimit: 10000,
      leadsUsed: tokens[token]?.leadsUsed || 0
    };
    writeMockTokens(tokens);

    return NextResponse.json(
      { status: "success", message: "Token registered successfully." },
      { 
        status: 200,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err: any) {
    console.error("[Token Registry] Error handling token registration:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    );
  }
}
