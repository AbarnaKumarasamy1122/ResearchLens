import {
  getWorksByPage,
} from "@/lib/openalex";

import {
  deduplicateWorks,
  normalizeWorks,
} from "@/lib/papers/normalizer";

import {
  attachWorkToExtraction,
  completeExtractionJob,
  createExtractionJob,
  failExtractionJob,
  startExtractionJob,
  updateExtractionProgress,
} from "@/lib/persistence/extraction-repository";

import {
  persistPaper,
} from "@/lib/persistence/work-repository";

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
  status: "COMPLETED";
  totalResults: number;
  processedResults: number;
  failedResults: number;
  duplicateCount: number;
}

export async function extractXRPapers(
  options: XRExtractionOptions = {},
): Promise<XRExtractionResult> {
  const fromYear = options.fromYear ?? 2020;
  const toYear = options.toYear ?? 2025;
  const perPage = Math.min(options.perPage ?? 100, 100);
  const maxPages = Math.max(options.maxPages ?? 10, 1);

  const job = await createExtractionJob({
    name: `XR Research ${fromYear}-${toYear}`,
    query: XR_SEARCH_TERMS.join(", "),
  });

  await startExtractionJob(job.id);

  const allWorks = new Map<
    string,
    ReturnType<typeof normalizeWorks>[number]
  >();

  let totalResults = 0;
  let processedResults = 0;
  let failedResults = 0;
  let duplicateCount = 0;

  try {
    for (const searchTerm of XR_SEARCH_TERMS) {
      for (let page = 1; page <= maxPages; page++) {
        const result = await getWorksByPage({
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

        const works = result.data.results ?? [];

        totalResults += works.length;

        await updateExtractionProgress(job.id, {
          totalResults,
        });

        if (works.length === 0) {
          break;
        }

        const normalized = normalizeWorks(works);
        const deduplicated = deduplicateWorks(normalized);

        for (const paper of deduplicated) {
          const key =
            paper.doi?.toLowerCase().trim() ??
            paper.openAlexId;

          if (allWorks.has(key)) {
            duplicateCount++;

            await updateExtractionProgress(job.id, {
              duplicateCount,
            });

            continue;
          }

          allWorks.set(key, paper);
        }

        /*
         * Stop if OpenAlex has no next page.
         */
        if (!result.data.meta?.next_cursor && works.length < perPage) {
          break;
        }
      }
    }

    await updateExtractionProgress(job.id, {
      totalResults,
      duplicateCount,
    });

    for (const paper of allWorks.values()) {
      try {
        const saved = await persistPaper(paper);

        if (saved) {
          await attachWorkToExtraction(
            job.id,
            saved.id,
          );
        }

        processedResults++;

        await updateExtractionProgress(job.id, {
          processedResults,
          failedResults,
          duplicateCount,
        });
      } catch (error) {
        failedResults++;

        console.error(
          `Failed to persist paper ${paper.openAlexId}:`,
          error,
        );

        await updateExtractionProgress(job.id, {
          processedResults,
          failedResults,
          duplicateCount,
        });
      }
    }

    await completeExtractionJob(job.id);

    return {
      jobId: job.id,
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

    await failExtractionJob(job.id, message);

    throw error;
  }
}