import {
  searchWorks,
} from "@/lib/openalex";

import {
  deduplicateWorks,
  normalizeWorks,
} from "@/lib/papers";

import {
  attachWorkToExtraction,
  completeExtractionJob,
  createExtractionJob,
  failExtractionJob,
  persistPaper,
  startExtractionJob,
} from "@/lib/persistence";

import type {
  NormalizedPaper,
} from "@/lib/papers";

const XR_SEARCH_TERMS = [
  "extended reality",
  "virtual reality",
  "augmented reality",
  "mixed reality",
];

export interface ExtractionOptions {
  fromYear?: number;
  toYear?: number;
  perPage?: number;
  maxPages?: number;
}

export async function extractXRPapers(
  options: ExtractionOptions = {}
) {
  const {
    fromYear = 2020,
    toYear = 2025,
    perPage = 100,
    maxPages = 10,
  } = options;

  const job = await createExtractionJob(
    "XR Research Papers Extraction",
    XR_SEARCH_TERMS.join(" OR ")
  );

  await startExtractionJob(job.id);

  try {
    const allPapers: NormalizedPaper[] = [];

    for (const searchTerm of XR_SEARCH_TERMS) {
      for (
        let page = 1;
        page <= maxPages;
        page++
      ) {
        const result =
          await searchWorks({
            search: searchTerm,
            filters: {
              fromYear,
              toYear,
            },
            page,
            perPage,
          });

        const normalized =
          normalizeWorks(
            result.data.results
          );

        allPapers.push(
          ...normalized
        );

        if (
          result.data.results.length <
          perPage
        ) {
          break;
        }
      }
    }

    const totalFetched =
      allPapers.length;

    /*
     * Global deduplication across
     * all four search terms.
     */
    const deduplicated =
      deduplicateWorks(allPapers);

    const duplicateCount =
      totalFetched -
      deduplicated.length;

    let processedResults = 0;
    let failedResults = 0;

    for (const paper of deduplicated) {
      try {
        const saved =
          await persistPaper(paper);

        await attachWorkToExtraction(
          job.id,
          saved.id
        );

        processedResults++;
      } catch {
        failedResults++;
      }
    }

    await completeExtractionJob(
      job.id,
      {
        totalResults:
          deduplicated.length,
        processedResults,
        failedResults,
        duplicateCount,
      }
    );

    return {
      jobId: job.id,
      totalFetched,
      duplicateCount,
      uniqueResults:
        deduplicated.length,
      processedResults,
      failedResults,
    };
  } catch (error) {
    await failExtractionJob(
      job.id,
      error instanceof Error
        ? error.message
        : "Extraction failed"
    );

    throw error;
  }
}