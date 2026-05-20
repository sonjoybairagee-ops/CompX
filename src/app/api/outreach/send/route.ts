import { NextResponse } from "next/server";

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
    const { apiKey, from, to, subject, html, text } = await request.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { status: "error", message: "Missing recipient, subject, or content." },
        { status: 400 }
      );
    }

    // If no API key is provided, run a premium sending simulation
    if (!apiKey) {
      console.log(`[Outreach Send SIMULATION] To: ${to} | Subject: ${subject}`);
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      return NextResponse.json({
        status: "success",
        simulated: true,
        id: `sim_email_${Math.random().toString(36).substr(2, 9)}`,
        message: "Simulated cold email dispatch successful!",
      });
    }

    console.log(`[Outreach Send RESEND] Dispatching via Resend to: ${to}`);

    // Call Resend API directly from server side
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from || "onboarding@resend.dev",
        to,
        subject,
        html: html || text.replace(/\n/g, "<br>"),
        text,
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error("[Outreach Send RESEND] Error from Resend API:", resData);
      return NextResponse.json(
        {
          status: "error",
          message: resData.message || "Failed to dispatch via Resend API.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      status: "success",
      id: resData.id,
      message: "Email successfully dispatched via Resend API!",
    });
  } catch (err: any) {
    console.error("[Outreach Send] Critical error:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
