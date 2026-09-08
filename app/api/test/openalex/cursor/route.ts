import { NextResponse } from "next/server";

import { getWorksByCursor } from "@/lib/openalex";

export async function GET() {
  try {
    const first = await getWorksByCursor({
      search: "virtual reality",

      filters: {
        fromYear: 2020,
        toYear: 2025,
      },

      perPage: 100,
    });

    const cursor = first.data.meta?.next_cursor;

    if (!cursor) {
      return NextResponse.json({
        success: true,
        message: "No next cursor returned",
        firstPageCount: first.data.results.length,
      });
    }

    const second = await getWorksByCursor({
      search: "virtual reality",

      filters: {
        fromYear: 2020,
        toYear: 2025,
      },

      cursor,

      perPage: 100,
    });

    return NextResponse.json({
      success: true,

      firstPage: {
        returned: first.data.results.length,
        nextCursorAvailable: Boolean(cursor),
      },

      secondPage: {
        returned: second.data.results.length,
        nextCursorAvailable: Boolean(
          second.data.meta?.next_cursor
        ),
      },

      usage: {
        first: first.usage,
        second: second.usage,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Cursor test failed",
      },
      { status: 500 }
    );
  }
}