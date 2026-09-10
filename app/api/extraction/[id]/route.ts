import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  cancelExtractionJob,
  deleteExtractionJob,
  getExtractionJob,
  getExtractionJobStatus,
} from "@/lib/persistence/extraction-repository";

import { normalizeWorks } from "@/lib/papers/normalizer";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const runtime = "nodejs";

export const dynamic =
  "force-dynamic";

/**
 * GET /api/extraction/:id
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const job =
      await getExtractionJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job not found",
        },
        {
          status: 404,
        },
      );
    }

    const normalizedWorks =
      normalizeWorks(
        job.works.map((item) => ({
          id: item.work.openAlexId,

          doi: item.work.doi,

          title: item.work.title,

          display_name:
            item.work.title,

          publication_date:
            item.work.publicationDate
              ?.toISOString()
              .slice(0, 10) ??
            null,

          publication_year:
            item.work.publicationYear,

          type: item.work.type,

          language:
            item.work.language,

          cited_by_count:
            item.work.citedByCount,

          is_retracted:
            item.work.isRetracted,

          open_access: {
            is_oa:
              item.work
                .isOpenAccess ??
              false,
          },

          landing_page_url:
            item.work
              .landingPageUrl,

          authorships:
            item.work.authors.map(
              (workAuthor) => ({
                author: {
                  id:
                    workAuthor.author
                      .openAlexId,

                  display_name:
                    workAuthor.author
                      .displayName,

                  orcid:
                    workAuthor.author
                      .orcid,
                },

                institutions:
                  workAuthor.author
                    .institutions.map(
                      (
                        authorInstitution,
                      ) => ({
                        id:
                          authorInstitution
                            .institution
                            .openAlexId,

                        display_name:
                          authorInstitution
                            .institution
                            .displayName,

                        ror:
                          authorInstitution
                            .institution
                            .ror,

                        country_code:
                          authorInstitution
                            .institution
                            .countryCode,
                      }),
                    ),
              }),
            ),

          keywords:
            item.work.keywords.map(
              (workKeyword) => ({
                id:
                  workKeyword.keyword
                    .id,

                display_name:
                  workKeyword.keyword
                    .displayName,

                score:
                  workKeyword.keyword
                    .score ??
                  undefined,
              }),
            ),

          topics:
            item.work.topics.map(
              (workTopic) => ({
                id:
                  workTopic.topic
                    .openAlexId,

                display_name:
                  workTopic.topic
                    .displayName,

                score:
                  workTopic.topic
                    .score ??
                  undefined,
              }),
            ),

          locations:
            item.work.locations.map(
              (location) => ({
                landing_page_url:
                  location
                    .landingPageUrl,

                pdf_url:
                  location.pdfUrl,

                is_oa:
                  location
                    .isOpenAccess ??
                  false,
              }),
            ),

          primary_location: {
            landing_page_url:
              item.work
                .landingPageUrl,

            pdf_url:
              item.work.pdfUrl,

            is_oa:
              item.work
                .isOpenAccess ??
              false,
          },
        })),
      );

    return NextResponse.json({
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
        papers:
          normalizedWorks,
      },
    });
  } catch (error) {
    console.error(
      "Extraction job API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to retrieve extraction job",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * PATCH /api/extraction/:id
 *
 * Currently supports:
 *
 * {
 *   "action": "cancel"
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const existingJob =
      await getExtractionJobStatus(
        id,
      );

    if (!existingJob) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job not found",
        },
        {
          status: 404,
        },
      );
    }

    let body: unknown = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const action =
      typeof body === "object" &&
      body !== null &&
      "action" in body &&
      typeof body.action ===
        "string"
        ? body.action
        : null;

    if (action !== "cancel") {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unsupported action. Use { "action": "cancel" }.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      existingJob.status !==
        "PENDING" &&
      existingJob.status !==
        "RUNNING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Job cannot be cancelled because it is already ${existingJob.status}.`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Conditional database update prevents a concurrent
     * completion/failure from being overwritten incorrectly.
     */
    const cancelledJob =
      await cancelExtractionJob(
        id,
      );

    if (!cancelledJob) {
      const latest =
        await getExtractionJobStatus(
          id,
        );

      if (!latest) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Extraction job not found",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            `Extraction job is already ${latest.status}.`,
          data: {
            id: latest.id,
            status:
              latest.status,
          },
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Extraction job cancelled successfully",

      data: {
        id:
          cancelledJob.id,

        status:
          cancelledJob.status,

        completedAt:
          cancelledJob.completedAt,
      },
    });
  } catch (error) {
    console.error(
      "Cancel extraction job API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to cancel extraction job",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * DELETE /api/extraction/:id
 *
 * Only COMPLETED, FAILED and CANCELLED jobs can be deleted.
 *
 * Work records are intentionally preserved.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const job =
      await getExtractionJobStatus(
        id,
      );

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job not found",
        },
        {
          status: 404,
        },
      );
    }

    if (
      job.status === "PENDING" ||
      job.status === "RUNNING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Running extraction jobs cannot be deleted. Cancel the job first.",
        },
        {
          status: 409,
        },
      );
    }

    const deleted =
      await deleteExtractionJob(
        id,
      );

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Extraction job could not be deleted",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Extraction job deleted successfully",

      data: {
        jobId: id,
      },
    });
  } catch (error) {
    console.error(
      "Delete extraction job API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete extraction job",
      },
      {
        status: 500,
      },
    );
  }
}