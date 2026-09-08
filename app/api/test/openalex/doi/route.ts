import { NextRequest, NextResponse } from "next/server";

import { getWorkByDOI } from "@/lib/openalex";

export async function GET(request: NextRequest) {
  const doi = request.nextUrl.searchParams.get("doi");

  if (!doi) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing doi query parameter",
      },
      { status: 400 }
    );
  }

  try {
    const result = await getWorkByDOI(doi);

    return NextResponse.json({
      success: true,
      usage: result.usage,
      work: result.data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}