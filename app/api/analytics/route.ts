import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

/**
 * GET /api/analytics
 *
 * Analytics are calculated for a specific extraction job.
 *
 * Use:
 *
 * GET /api/analytics/:jobId
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,

      message:
        "A job ID is required. Use /api/analytics/:jobId.",
    },
    {
      status: 400,
    },
  );
}