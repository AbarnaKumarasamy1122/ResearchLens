import { NextResponse } from "next/server";
import { searchWorks } from "@/lib/openalex";

export async function GET() {
  try {
    const result = await searchWorks({
      search: "virtual reality",

      filters: {
        fromYear: 2020,
        toYear: 2025,
      },

      sort: "cited_by_count",
      sortDirection: "desc",

      perPage: 5,

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

    return NextResponse.json({
      success: true,
      usage: result.usage,
      meta: result.data.meta,
      results: result.data.results,
    });
  } catch (error) {
    console.error(
      "OpenAlex test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown OpenAlex error",
      },
      {
        status: 500,
      }
    );
  }
}