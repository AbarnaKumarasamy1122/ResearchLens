import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

/**
 * Cache API
 *
 * Reserved for the optional Phase 9/10 caching layer.
 */
export async function GET() {
  return NextResponse.json({
    success: true,

    data: {
      enabled: false,
      entries: 0,
    },

    message:
      "Cache endpoint is ready for future caching implementation.",
  });
}