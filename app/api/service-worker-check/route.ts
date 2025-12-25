import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/**
 * Check if service worker file exists and is accessible
 * GET /api/service-worker-check
 */
export async function GET() {
  try {
    const swPath = join(process.cwd(), "public", "sw.js");
    const swContent = await readFile(swPath, "utf-8");

    return NextResponse.json({
      exists: true,
      size: swContent.length,
      firstLine: swContent.split("\n")[0],
      message: "Service worker file exists and is readable",
    });
  } catch (error) {
    return NextResponse.json(
      {
        exists: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Service worker file not found or not readable",
      },
      { status: 404 }
    );
  }
}

