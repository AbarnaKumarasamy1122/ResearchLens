import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getJobAnalytics,
} from "@/lib/analytics/analytics-service";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { jobId } =
      await context.params;

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Job ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const analytics =
      await getJobAnalytics(
        jobId,
      );

    if (!analytics) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error(
      "Analytics API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to calculate analytics",
      },
      {
        status: 500,
      },
    );
  }
}