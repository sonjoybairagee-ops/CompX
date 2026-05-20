import { NextResponse } from "next/server";
import crypto from "crypto";
import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/utils/firebase";

export async function POST(request: Request) {
  try {
    // 1. Signature Verification
    const rawBody = await request.text();
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
    
    if (!webhookSecret) {
      console.error("[Lemon Squeezy Webhook] Missing LEMON_SQUEEZY_WEBHOOK_SECRET env variable.");
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const xSignature = request.headers.get("x-signature") || "";
    if (!xSignature) {
      console.warn("[Lemon Squeezy Webhook] Missing x-signature header.");
      return new NextResponse("Unsigned request", { status: 401 });
    }

    // Generate hmac hash signature
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const calculatedSignature = hmac.update(rawBody).digest("hex");

    // Timing-safe comparison to prevent timing side-channel attacks
    const calculatedBuffer = Buffer.from(calculatedSignature, "hex");
    const signatureBuffer = Buffer.from(xSignature, "hex");

    if (
      calculatedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(calculatedBuffer, signatureBuffer)
    ) {
      console.warn("[Lemon Squeezy Webhook] Signature verification failed.");
      return new NextResponse("Invalid signature verification", { status: 401 });
    }

    // 2. Parse Webhook Event Body
    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;
    const userId = customData?.user_id || customData?.userId;

    console.log(`[Lemon Squeezy Webhook] Received verified event: "${eventName}"`);

    if (!userId) {
      console.warn("[Lemon Squeezy Webhook] Event payload is missing user_id in custom_data metadata.");
      return new NextResponse("Missing custom user ID metadata parameter", { status: 400 });
    }

    // We respond to billing event cycles: order_created, subscription_created, subscription_updated
    const upgradeEvents = ["order_created", "subscription_created", "subscription_updated"];

    if (upgradeEvents.includes(eventName)) {
      console.log(`[Lemon Squeezy Webhook] Upgrading user: ${userId} to PRO...`);

      if (isFirebaseConfigured && db) {
        try {
          const userDocRef = doc(db, "users", userId);
          // Set plan to pro and set lead limit to 10,000
          await setDoc(
            userDocRef,
            {
              plan: "pro",
              leadLimit: 10000,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log(`[Lemon Squeezy Webhook] Firestore successfully updated for user: ${userId}.`);
        } catch (dbError) {
          console.error(`[Lemon Squeezy Webhook] Failed to update Firestore user record:`, dbError);
          return new NextResponse("Database connection failed", { status: 500 });
        }
      } else {
        console.warn(`[Lemon Squeezy Webhook] Firebase Firestore is currently unconfigured or offline. Mocking upgrade for userId: ${userId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verified event "${eventName}" processed successfully.`,
      user: userId,
    });
  } catch (error: any) {
    console.error("[Lemon Squeezy Webhook] Processing error:", error);
    return new NextResponse(error?.message || "Internal server error occurred", { status: 500 });
  }
}
