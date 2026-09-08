import { NextResponse } from "next/server";

import { searchWorks } from "@/lib/openalex";

const XR_QUERIES = [
  "extended reality",
  "virtual reality",
  "augmented reality",
  "mixed reality",
];

export async function GET() {
  try {
    const results = [];

    for (const query of XR_QUERIES) {
      const response = await searchWorks({
        search: query,

        filters: {
          fromYear: 2020,
          toYear: 2025,
        },

        sort: "relevance_score",

        sortDirection: "desc",

        perPage: 10,

        select: [
          "id",
          "doi",
          "title",
          "publication_date",
          "publication_year",
          "type",
          "language",
          "authorships",
          "primary_location",
          "topics",
          "keywords",
          "cited_by_count",
          "is_retracted",
          "open_access",
          "best_oa_location",
        ],
      });

      results.push({
        query,

        count:
          response.data.meta?.count ?? 0,

        returned:
          response.data.results.length,

        usage: response.usage,

        works: response.data.results,
      });
    }

    return NextResponse.json({
      success: true,
      queryCount: XR_QUERIES.length,
      results,
    });
  } catch (error) {
    console.error("XR search failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "XR search failed",
      },
      { status: 500 }
    );
  }
}