import { NextRequest, NextResponse } from "next/server";

import {
  extractXRPapers,
} from "@/lib/extraction";

export async function POST(request: NextRequest) {
  try {
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const input =
      typeof body === "object" &&
      body !== null
        ? body as Record<string, unknown>
        : {};

    const fromYear =
      typeof input.fromYear === "number"
        ? input.fromYear
        : 2020;

    const toYear =
      typeof input.toYear === "number"
        ? input.toYear
        : 2025;

    const perPage =
      typeof input.perPage === "number"
        ? input.perPage
        : 100;

    const maxPages =
      typeof input.maxPages === "number"
        ? input.maxPages
        : 10;

    if (fromYear > toYear) {
      return NextResponse.json(
        {
          success: false,
          message: "fromYear cannot be greater than toYear",
        },
        { status: 400 },
      );
    }

    const result = await extractXRPapers({
      fromYear,
      toYear,
      perPage,
      maxPages,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Extraction API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Extraction failed",
      },
      { status: 500 },
    );
  }
}