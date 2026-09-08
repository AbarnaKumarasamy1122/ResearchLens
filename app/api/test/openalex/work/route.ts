import { NextRequest, NextResponse } from "next/server";

import { getWork } from "@/lib/openalex";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing id query parameter",
      },
      { status: 400 }
    );
  }

  try {
    const result = await getWork(id);

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