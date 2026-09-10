import { NextRequest, NextResponse } from "next/server";

import {
  getExtractionJob,
} from "@/lib/persistence/extraction-repository";

import {
  normalizeWorks,
} from "@/lib/papers/normalizer";

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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Extraction job ID is required",
        },
        { status: 400 },
      );
    }

    const job = await getExtractionJob(id);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Extraction job not found",
        },
        { status: 404 },
      );
    }

    const normalizedWorks = normalizeWorks(
      job.works.map((item) => ({
        id: item.work.openAlexId,
        doi: item.work.doi,
        title: item.work.title,
        display_name: item.work.title,
        publication_date:
          item.work.publicationDate
            ?.toISOString()
            .slice(0, 10) ?? null,
        publication_year:
          item.work.publicationYear,
        type: item.work.type,
        language: item.work.language,
        cited_by_count:
          item.work.citedByCount,
        is_retracted:
          item.work.isRetracted,
        open_access: {
          is_oa:
            item.work.isOpenAccess ?? false,
        },
        landing_page_url:
          item.work.landingPageUrl,
        authorships: item.work.authors.map(
          (workAuthor) => ({
            author: {
              id: workAuthor.author.openAlexId,
              display_name:
                workAuthor.author.displayName,
              orcid:
                workAuthor.author.orcid,
            },
            institutions:
              workAuthor.author.institutions.map(
                (authorInstitution) => ({
                  id:
                    authorInstitution.institution
                      .openAlexId,
                  display_name:
                    authorInstitution.institution
                      .displayName,
                  ror:
                    authorInstitution.institution.ror,
                  country_code:
                    authorInstitution.institution
                      .countryCode,
                }),
              ),
          }),
        ),
        keywords: item.work.keywords.map(
          (workKeyword) => ({
            id: workKeyword.keyword.id,
            display_name:
              workKeyword.keyword.displayName,
            score:
              workKeyword.keyword.score ?? undefined,
          }),
        ),
        topics: item.work.topics.map(
          (workTopic) => ({
            id: workTopic.topic.openAlexId,
            display_name:
              workTopic.topic.displayName,
            score:
              workTopic.topic.score ?? undefined,
          }),
        ),
        locations: item.work.locations.map(
          (location) => ({
            landing_page_url:
              location.landingPageUrl,
            pdf_url:
              location.pdfUrl,
            is_oa:
              location.isOpenAccess ?? false,
          }),
        ),
        primary_location: {
          landing_page_url:
            item.work.landingPageUrl,
          pdf_url:
            item.work.pdfUrl,
          is_oa:
            item.work.isOpenAccess ?? false,
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
        totalResults: job.totalResults,
        processedResults: job.processedResults,
        failedResults: job.failedResults,
        duplicateCount: job.duplicateCount,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        papers: normalizedWorks,
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
      { status: 500 },
    );
  }
}