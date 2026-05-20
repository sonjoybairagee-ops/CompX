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
    console.error("[Logs API] Error reading tokens:", e);
  }
  return null;
}

function getLogsFile(userId: string) {
  return path.join(process.cwd(), "public", `mock_logs_${userId}.json`);
}

function readLogs(userId: string) {
  try {
    const file = getLogsFile(userId);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch (e) {
    console.error("[Logs API] Error reading logs:", e);
  }
  return [];
}

function appendLog(userId: string, logLine: any) {
  try {
    const file = getLogsFile(userId);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = readLogs(userId);
    current.push({
      ...logLine,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    });
    
    // Cap to the last 40 lines to keep console neat and fast
    const trimmed = current.slice(-40);
    fs.writeFileSync(file, JSON.stringify(trimmed, null, 2), "utf-8");
    return trimmed;
  } catch (e) {
    console.error("[Logs API] Error appending log:", e);
  }
  return [];
}

function clearLogs(userId: string) {
  try {
    const file = getLogsFile(userId);
    if (fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf-8");
    }
  } catch (e) {
    console.error("[Logs API] Error clearing logs:", e);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-compx-token",
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");
    const token = request.headers.get("x-compx-token");

    // Authenticate token if present, or use param for direct dashboard queries
    if (token && !userId) {
      const mockUser = getMockUser(token);
      if (mockUser) {
        userId = mockUser.userId;
      } else if (isFirebaseConfigured && db) {
        try {
          const tokenDoc = await getDoc(doc(db, "tokens", token));
          if (tokenDoc.exists()) {
            userId = tokenDoc.data().userId;
          }
        } catch (e) {}
      }
    }

    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Missing user mapping." },
        { 
          status: 401, 
          headers: { "Access-Control-Allow-Origin": "*" } 
        }
      );
    }

    const logs = readLogs(userId);
    return NextResponse.json(
      { status: "success", logs },
      { 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { 
        status: 500, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-compx-token");
    if (!token) {
      return NextResponse.json(
        { status: "error", message: "Token missing" },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let userId = "";
    const mockUser = getMockUser(token);
    if (mockUser) {
      userId = mockUser.userId;
    } else if (isFirebaseConfigured && db) {
      try {
        const tokenDoc = await getDoc(doc(db, "tokens", token));
        if (tokenDoc.exists()) {
          userId = tokenDoc.data().userId;
        }
      } catch (e) {}
    }

    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Invalid Developer Token." },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const body = await request.json();
    const { log, level, timestamp } = body;

    const logLine = {
      text: log || "",
      level: level || "info",
      timestamp: timestamp || new Date().toISOString()
    };

    appendLog(userId, logLine);

    return NextResponse.json(
      { status: "success" },
      { 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { 
        status: 500, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { status: "error", message: "Missing userId parameters." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    clearLogs(userId);

    return NextResponse.json(
      { status: "success", message: "Logs cleared successfully." },
      { 
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        } 
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { 
        status: 500, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      }
    );
  }
}
