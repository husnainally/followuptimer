import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push-notification";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "VAPID key not configured",
      },
      { status: 500 }
    );
  }
}
