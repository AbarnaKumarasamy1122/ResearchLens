import { NextRequest, NextResponse } from "next/server";

import {
  OpenAlexConfigurationError,
  OpenAlexError,
  OpenAlexTimeoutError,
  getWork,
} from "@/lib/openalex";

import { normalizeWork } from "@/lib/papers/normalizer";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "OpenAlex ID is required",
        },
        { status: 400 },
      );
    }

    const decodedId = decodeURIComponent(id);

    const result = await getWork(decodedId);
    const paper = normalizeWork(result.data);

    return NextResponse.json({
      success: true,
      data: paper,
      meta: {
        source: "openalex",
        usage: {
          costUsd: result.usage.costUsd,
          rateLimitLimit: result.usage.rateLimitLimit,
          rateLimitRemaining: result.usage.rateLimitRemaining,
          rateLimitReset: result.usage.rateLimitReset,
          creditsUsed: result.usage.creditsUsed,
        },
      },
    });
  } catch (error) {
    console.error("Paper detail API error:", error);

    if (error instanceof OpenAlexConfigurationError) {
      return NextResponse.json(
        {
          success: false,
          message: "OpenAlex API is not configured",
        },
        { status: 500 },
      );
    }

    if (error instanceof OpenAlexTimeoutError) {
      return NextResponse.json(
        {
          success: false,
          message: "OpenAlex request timed out. Please try again.",
        },
        { status: 504 },
      );
    }

    if (error instanceof OpenAlexError) {
      if (error.statusCode === 404) {
        return NextResponse.json(
          {
            success: false,
            message: "Paper not found in OpenAlex",
          },
          { status: 404 },
        );
      }

      if (error.statusCode === 429) {
        return NextResponse.json(
          {
            success: false,
            message: "OpenAlex rate limit reached. Please try again later.",
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "OpenAlex could not retrieve this paper.",
        },
        { status: error.statusCode >= 400 ? error.statusCode : 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve paper",
      },
      { status: 500 },
    );
  }
}