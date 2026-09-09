import { NextRequest, NextResponse } from "next/server";

import {
  OpenAlexConfigurationError,
  OpenAlexError,
  OpenAlexTimeoutError,
  getWork,
  getWorkByDOI,
} from "@/lib/openalex";

import { normalizeWork } from "@/lib/papers/normalizer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const doi = searchParams.get("doi")?.trim();
    const openAlexId = searchParams.get("openAlexId")?.trim();

    if (!doi && !openAlexId) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide either a DOI or OpenAlex ID",
        },
        { status: 400 },
      );
    }

    if (doi && openAlexId) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide either a DOI or OpenAlex ID, not both",
        },
        { status: 400 },
      );
    }

    const result = doi
      ? await getWorkByDOI(doi)
      : await getWork(openAlexId!);

    const paper = normalizeWork(result.data);

    return NextResponse.json({
      success: true,
      data: paper,
      meta: {
        source: "openalex",
        lookupType: doi ? "doi" : "openalex_id",
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
    console.error("Paper lookup API error:", error);

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
            message: "No paper was found for the provided identifier.",
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
          message: "OpenAlex lookup failed.",
        },
        { status: error.statusCode >= 400 ? error.statusCode : 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to look up paper",
      },
      { status: 500 },
    );
  }
}