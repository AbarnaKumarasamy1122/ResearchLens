import {
  NextResponse,
} from "next/server";

import {
  extractXRPapers,
} from "@/lib/extraction";

export async function POST() {
  try {
    const result =
      await extractXRPapers({
        fromYear: 2020,
        toYear: 2025,
        perPage: 100,
        maxPages: 10,
      });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/extraction failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Extraction failed",
      },
      {
        status: 500,
      }
    );
  }
}