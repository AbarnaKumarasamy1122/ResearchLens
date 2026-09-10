import { getWorksByPage } from "@/lib/openalex";

import {
  deduplicateWorks,
  normalizeWorks,
} from "@/lib/papers/normalizer";

import {
  attachWorkToExtraction,
  completeExtractionJob,
  createExtractionJob,
  failExtractionJob,
  isExtractionJobCancelled,
  startExtractionJob,
  updateExtractionProgress,
} from "@/lib/persistence/extraction-repository";

import { persistPaper } from "@/lib/persistence/work-repository";

export const XR_SEARCH_TERMS = [
  "extended reality",
  "virtual reality",
  "augmented reality",
  "mixed reality",
] as const;

export interface XRExtractionOptions {
  fromYear?: number;
  toYear?: number;
  perPage?: number;
  maxPages?: number;
}

export interface XRExtractionResult {
  jobId: string;
  status:
    | "COMPLETED"
    | "CANCELLED";
  totalResults: number;
  processedResults: number;
  failedResults: number;
  duplicateCount: number;
}

function normalizeOptions(
  options: XRExtractionOptions = {},
) {
  const fromYear =
    options.fromYear ?? 2020;

  const toYear =
    options.toYear ?? 2025;

  const perPage = Math.min(
    Math.max(
      options.perPage ?? 100,
      1,
    ),
    100,
  );

  const maxPages = Math.min(
    Math.max(
      options.maxPages ?? 10,
      1,
    ),
    100,
  );

  if (fromYear > toYear) {
    throw new Error(
      "fromYear cannot be greater than toYear",
    );
  }

  return {
    fromYear,
    toYear,
    perPage,
    maxPages,
  };
}

/**
 * Create an XR extraction job without starting the extraction.
 *
 * The job remains PENDING until processXRExtractionJob starts it.
 */
export async function createXRExtractionJob(
  options: XRExtractionOptions = {},
) {
  const normalizedOptions =
    normalizeOptions(options);

  return createExtractionJob({
    name:
      `XR Research ` +
      `${normalizedOptions.fromYear}-` +
      `${normalizedOptions.toYear}`,

    query:
      XR_SEARCH_TERMS.join(", "),
  });
}

/**
 * Process an existing extraction job.
 *
 * This function performs the actual OpenAlex extraction,
 * normalization, deduplication and persistence.
 */
export async function processXRExtractionJob(
  jobId: string,
  options: XRExtractionOptions = {},
): Promise<XRExtractionResult | null> {
  const normalizedOptions =
    normalizeOptions(options);

  const startedJob =
    await startExtractionJob(jobId);

  /*
   * If the job could not transition from PENDING to RUNNING,
   * another processor owns it or it was cancelled.
   */
  if (!startedJob) {
    return null;
  }

  const {
    fromYear,
    toYear,
    perPage,
    maxPages,
  } = normalizedOptions;

  const allWorks = new Map<
    string,
    ReturnType<typeof normalizeWorks>[number]
  >();

  let totalResults = 0;
  let processedResults = 0;
  let failedResults = 0;
  let duplicateCount = 0;

  try {
    /*
     * Check cancellation immediately after starting.
     */
    if (
      await isExtractionJobCancelled(
        jobId,
      )
    ) {
      return {
        jobId,
        status: "CANCELLED",
        totalResults,
        processedResults,
        failedResults,
        duplicateCount,
      };
    }

    /*
     * Process each XR search term.
     */
    for (const searchTerm of XR_SEARCH_TERMS) {
      /*
       * Check cancellation before starting a new term.
       */
      if (
        await isExtractionJobCancelled(
          jobId,
        )
      ) {
        return {
          jobId,
          status: "CANCELLED",
          totalResults,
          processedResults,
          failedResults,
          duplicateCount,
        };
      }

      for (
        let page = 1;
        page <= maxPages;
        page++
      ) {
        /*
         * Cooperative cancellation check before every
         * OpenAlex request.
         */
        if (
          await isExtractionJobCancelled(
            jobId,
          )
        ) {
          return {
            jobId,
            status: "CANCELLED",
            totalResults,
            processedResults,
            failedResults,
            duplicateCount,
          };
        }

        const result =
          await getWorksByPage({
            search: searchTerm,

            filters: {
              fromYear,
              toYear,
            },

            page,

            perPage,

            sort: "publication_date",

            sortDirection: "desc",
          });

        const works =
          result.data.results ?? [];

        totalResults += works.length;

        await updateExtractionProgress(
          jobId,
          {
            totalResults,
            duplicateCount,
          },
        );

        /*
         * Check cancellation after the network request.
         */
        if (
          await isExtractionJobCancelled(
            jobId,
          )
        ) {
          return {
            jobId,
            status: "CANCELLED",
            totalResults,
            processedResults,
            failedResults,
            duplicateCount,
          };
        }

        if (works.length === 0) {
          break;
        }

        const normalized =
          normalizeWorks(works);

        const deduplicated =
          deduplicateWorks(normalized);

        /*
         * Remove duplicates across all search terms and pages.
         */
        for (const paper of deduplicated) {
          const key =
            paper.doi
              ?.toLowerCase()
              .trim() ??
            paper.openAlexId;

          if (allWorks.has(key)) {
            duplicateCount++;
            continue;
          }

          allWorks.set(
            key,
            paper,
          );
        }

        await updateExtractionProgress(
          jobId,
          {
            totalResults,
            duplicateCount,
          },
        );

        /*
         * Stop when OpenAlex indicates there are no
         * additional pages.
         */
        if (
          !result.data.meta?.next_cursor &&
          works.length < perPage
        ) {
          break;
        }
      }
    }

    /*
     * Final cancellation check before persistence.
     */
    if (
      await isExtractionJobCancelled(
        jobId,
      )
    ) {
      return {
        jobId,
        status: "CANCELLED",
        totalResults,
        processedResults,
        failedResults,
        duplicateCount,
      };
    }

    /*
     * Persist normalized, deduplicated papers one by one.
     */
    for (const paper of allWorks.values()) {
      /*
       * Check cancellation before each paper.
       */
      if (
        await isExtractionJobCancelled(
          jobId,
        )
      ) {
        return {
          jobId,
          status: "CANCELLED",
          totalResults,
          processedResults,
          failedResults,
          duplicateCount,
        };
      }

      try {
        const saved =
          await persistPaper(paper);

        if (saved) {
          await attachWorkToExtraction(
            jobId,
            saved.id,
          );
        }

        processedResults++;
      } catch (error) {
        failedResults++;

        console.error(
          `Failed to persist paper ${paper.openAlexId}:`,
          error,
        );
      }

      await updateExtractionProgress(
        jobId,
        {
          totalResults,
          processedResults,
          failedResults,
          duplicateCount,
        },
      );
    }

    /*
     * Only RUNNING jobs can become COMPLETED.
     *
     * If cancellation happened concurrently,
     * this returns null and the job remains CANCELLED.
     */
    const completedJob =
      await completeExtractionJob(
        jobId,
      );

    if (!completedJob) {
      return {
        jobId,
        status: "CANCELLED",
        totalResults,
        processedResults,
        failedResults,
        duplicateCount,
      };
    }

    return {
      jobId,
      status: "COMPLETED",
      totalResults,
      processedResults,
      failedResults,
      duplicateCount,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Extraction failed";

    /*
     * Do not overwrite CANCELLED with FAILED.
     */
    await failExtractionJob(
      jobId,
      message,
    );

    throw error;
  }
}

/**
 * Backward-compatible convenience function.
 *
 * Creates a job and processes it synchronously.
 *
 * This is useful for tests or server-side callers.
 * The HTTP API should use createXRExtractionJob()
 * + processXRExtractionJob() instead.
 */
export async function extractXRPapers(
  options: XRExtractionOptions = {},
): Promise<XRExtractionResult> {
  const job =
    await createXRExtractionJob(
      options,
    );

  const result =
    await processXRExtractionJob(
      job.id,
      options,
    );

  if (!result) {
    throw new Error(
      "Extraction job could not be started",
    );
  }

  return result;
}