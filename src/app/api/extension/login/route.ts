import { NextResponse } from "next/server";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import fs from "fs";
import path from "path";

const TOKENS_FILE = path.join(process.cwd(), "public", "mock_db_tokens.json");

function readMockTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("[Extension Login] Error reading mock tokens:", e);
  }
  return {};
}

function writeMockTokens(tokens: any) {
  try {
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
  } catch (e) {
    console.error("[Extension Login] Error writing mock tokens:", e);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { status: "error", message: "Email and password are required." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let userId = "";
    let userEmail = email.toLowerCase();
    
    // 1. Authenticate with Firebase if configured
    if (isFirebaseConfigured && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      
      const authRes = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password, returnSecureToken: true })
      });
      
      const authData = await authRes.json();
      
      if (!authRes.ok) {
        console.error("[Extension Login] Firebase Auth error:", authData);
        return NextResponse.json(
          { status: "error", message: "Invalid email or password" },
          { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
      
      userId = authData.localId;
    } 
    // 2. Fallback to mock authentication (if no Firebase)
    else {
      console.log("[Extension Login] Firebase not configured, using mock login.");
      // Accept any password for "test@test.com" or dynamically generate a mock user ID
      userId = "mock_user_" + Buffer.from(userEmail).toString('base64').substring(0, 10);
    }

    // 3. Fetch or generate Developer Sync Token
    let tokenToReturn = "";
    
    if (isFirebaseConfigured && db && userId) {
      try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().developerToken) {
          tokenToReturn = userDoc.data().developerToken;
        } else {
          // User doesn't have a token yet, generate one
          tokenToReturn = `compx_live_sk_${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
          
          const batch = writeBatch(db);
          // Save to user profile
          batch.set(userRef, { developerToken: tokenToReturn, email: userEmail }, { merge: true });
          
          // Save to tokens collection
          const tokenRef = doc(db, "tokens", tokenToReturn);
          batch.set(tokenRef, { 
            userId, 
            email: userEmail, 
            plan: userDoc.exists() && userDoc.data().plan ? userDoc.data().plan : "free",
            leadLimit: userDoc.exists() && userDoc.data().leadLimit ? userDoc.data().leadLimit : 1000,
            leadsUsed: userDoc.exists() && userDoc.data().leadsUsed ? userDoc.data().leadsUsed : 0
          }, { merge: true });
          
          await batch.commit();
          console.log(`[Extension Login] Generated and saved new token for user: ${userId}`);
        }
      } catch (dbErr) {
        console.error("[Extension Login] Firestore error:", dbErr);
        // Fallback to generating a temporary token if DB fails
        tokenToReturn = `compx_live_sk_${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
      }
    } else {
      // Mock mode token generation
      tokenToReturn = `compx_live_sk_${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
    }

    // 4. Always ensure token is in the mock_db_tokens.json for offline extension sync
    const tokens = readMockTokens();
    if (!tokens[tokenToReturn]) {
      tokens[tokenToReturn] = {
        userId,
        email: userEmail,
        plan: "pro", // Default to pro for extension mock testing
        leadLimit: 10000,
        leadsUsed: 0
      };
      writeMockTokens(tokens);
    }

    // 5. Return the token to the extension
    return NextResponse.json(
      { 
        status: "success", 
        message: "Login successful",
        token: tokenToReturn
      },
      { 
        status: 200,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      }
    );
    
  } catch (err: any) {
    console.error("[Extension Login] Route exception:", err);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
