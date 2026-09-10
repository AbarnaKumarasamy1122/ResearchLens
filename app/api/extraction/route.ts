import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createXRExtractionJob,
  processXRExtractionJob,
} from "@/lib/extraction";

import {
  listExtractionJobs,
} from "@/lib/persistence/extraction-repository";

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

/**
 * GET /api/extraction?limit=20
 *
 * Returns extraction history.
 */
export async function GET(
  request: NextRequest,
) {
  try {
    const searchParams =
      request.nextUrl.searchParams;

    const rawLimit =
      Number(
        searchParams.get("limit") ?? "20",
      );

    const limit =
      Number.isFinite(rawLimit)
        ? rawLimit
        : 20;

    const jobs =
      await listExtractionJobs(
        limit,
      );

    return NextResponse.json({
      success: true,

      data: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        query: job.query,
        status: job.status,
        totalResults: job.totalResults,
        processedResults:
          job.processedResults,
        failedResults:
          job.failedResults,
        duplicateCount:
          job.duplicateCount,
        errorMessage:
          job.errorMessage,
        startedAt:
          job.startedAt,
        completedAt:
          job.completedAt,
        createdAt:
          job.createdAt,
        updatedAt:
          job.updatedAt,

        paperCount:
          job._count.works,
      })),
    });
  } catch (error) {
    console.error(
      "Extraction history API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load extraction history",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * POST /api/extraction
 *
 * Creates an extraction job and immediately returns HTTP 202.
 *
 * The actual extraction is started asynchronously.
 */
export async function POST(
  request: NextRequest,
) {
  try {
    let body: unknown = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const input =
      typeof body === "object" &&
      body !== null
        ? (body as Record<
            string,
            unknown
          >)
        : {};

    const fromYear =
      typeof input.fromYear ===
      "number"
        ? input.fromYear
        : 2020;

    const toYear =
      typeof input.toYear ===
      "number"
        ? input.toYear
        : 2025;

    const perPage =
      typeof input.perPage ===
      "number"
        ? input.perPage
        : 100;

    const maxPages =
      typeof input.maxPages ===
      "number"
        ? input.maxPages
        : 10;

    if (
      !Number.isInteger(fromYear) ||
      !Number.isInteger(toYear)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "fromYear and toYear must be integers",
        },
        {
          status: 400,
        },
      );
    }

    if (fromYear > toYear) {
      return NextResponse.json(
        {
          success: false,
          message:
            "fromYear cannot be greater than toYear",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(perPage) ||
      perPage < 1 ||
      perPage > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "perPage must be between 1 and 100",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(maxPages) ||
      maxPages < 1 ||
      maxPages > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "maxPages must be between 1 and 100",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Only create the database job here.
     */
    const job =
      await createXRExtractionJob({
        fromYear,
        toYear,
        perPage,
        maxPages,
      });

    /*
     * Start processing without blocking the HTTP response.
     *
     * Important:
     * This is suitable for the local assessment/demo environment.
     * For production serverless execution, a durable worker/queue
     * such as Inngest, Trigger.dev or BullMQ would be preferable.
     */
    void processXRExtractionJob(
      job.id,
      {
        fromYear,
        toYear,
        perPage,
        maxPages,
      },
    ).catch((error) => {
      console.error(
        `Background extraction failed for job ${job.id}:`,
        error,
      );
    });

    return NextResponse.json(
      {
        success: true,

        data: {
          id: job.id,
          name: job.name,
          query: job.query,
          status: job.status,
          totalResults:
            job.totalResults,
          processedResults:
            job.processedResults,
          failedResults:
            job.failedResults,
          duplicateCount:
            job.duplicateCount,
          errorMessage:
            job.errorMessage,
          startedAt:
            job.startedAt,
          completedAt:
            job.completedAt,
          createdAt:
            job.createdAt,
          updatedAt:
            job.updatedAt,
        },
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    console.error(
      "Extraction API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create extraction job",
      },
      {
        status: 500,
      },
    );
  }
}