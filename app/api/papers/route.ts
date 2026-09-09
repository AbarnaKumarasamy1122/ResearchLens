import { NextRequest, NextResponse } from "next/server";

import {
  papersQuerySchema,
} from "@/lib/papers/schemas";

import {
  searchPapers,
} from "@/lib/papers/search-service";

import {
  OpenAlexConfigurationError,
  OpenAlexError,
  OpenAlexTimeoutError,
} from "@/lib/openalex";

export async function GET(
  request: NextRequest
) {
  try {
    const searchParams =
      Object.fromEntries(
        request.nextUrl.searchParams.entries()
      );

    const parsed =
      papersQuerySchema.safeParse(
        searchParams
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid query parameters",

          errors:
            parsed.error.issues.map(
              (issue) => ({
                field:
                  issue.path.join("."),
                message:
                  issue.message,
              })
            ),
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await searchPapers(
        parsed.data
      );

    return NextResponse.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/papers failed:",
      error
    );

    if (
      error instanceof OpenAlexConfigurationError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OpenAlex API is not configured",
        },
        {
          status: 500,
        }
      );
    }

    if (
      error instanceof OpenAlexTimeoutError
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OpenAlex request timed out",
        },
        {
          status: 504,
        }
      );
    }

    if (
      error instanceof OpenAlexError
    ) {
      const status =
        error.statusCode >= 400 &&
        error.statusCode < 600
          ? error.statusCode
          : 502;

      return NextResponse.json(
        {
          success: false,
          message:
            "OpenAlex request failed",
          statusCode:
            error.statusCode,
        },
        {
          status,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}