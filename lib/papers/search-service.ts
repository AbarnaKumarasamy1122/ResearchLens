import {
  searchWorks,
  getWorksByPage,
  getWorksByCursor,
} from "@/lib/openalex";

import type {
  OpenAlexUsage,
} from "@/lib/openalex/types";

import {
  deduplicateWorks,
  normalizeWorks,
} from "./normalizer";

import type {
  PapersQuery,
} from "./schemas";

import type {
  PapersResponse,
} from "./types";

function mapUsage(
  usage: OpenAlexUsage,
) {
  return {
    costUsd: usage.costUsd,
    rateLimitLimit:
      usage.rateLimitLimit,
    rateLimitRemaining:
      usage.rateLimitRemaining,
    rateLimitReset:
      usage.rateLimitReset,
    creditsUsed:
      usage.creditsUsed,
  };
}

/**
 * OpenAlex only supports relevance_score
 * when a search query is provided.
 *
 * Therefore, when the user has not entered
 * a search query, fall back to publication date.
 */
function getEffectiveSort(
  query: PapersQuery,
) {
  if (
    query.sort === "relevance_score" &&
    !query.search
  ) {
    return "publication_date" as const;
  }

  return query.sort;
}

export async function searchPapers(
  query: PapersQuery,
): Promise<PapersResponse> {
  const filters = {
    fromYear: query.fromYear,
    toYear: query.toYear,
    type: query.type,
    openAccess: query.openAccess,
    minCitations:
      query.minCitations,
    maxCitations:
      query.maxCitations,
    language: query.language,
    isRetracted:
      query.isRetracted,
  };

  const effectiveSort =
    getEffectiveSort(query);

  const useCursor =
    query.cursor !== undefined;

  const result = useCursor
    ? await getWorksByCursor({
        search: query.search,
        filters,
        sort: effectiveSort,
        sortDirection:
          query.sortDirection,
        cursor: query.cursor,
        perPage: query.perPage,
      })
    : query.page !== undefined
      ? await getWorksByPage({
          search: query.search,
          filters,
          sort: effectiveSort,
          sortDirection:
            query.sortDirection,
          page: query.page,
          perPage: query.perPage,
        })
      : await searchWorks({
          search: query.search,
          filters,
          sort: effectiveSort,
          sortDirection:
            query.sortDirection,
          perPage: query.perPage,
        });

  const normalized =
    normalizeWorks(
      result.data.results,
    );

  const deduplicated =
    deduplicateWorks(
      normalized,
    );

  const mode =
    useCursor
      ? "cursor"
      : "page";

  return {
    success: true,

    data: deduplicated,

    pagination: {
      page:
        mode === "page"
          ? query.page ?? 1
          : null,

      perPage:
        query.perPage,

      currentCursor:
        mode === "cursor"
          ? query.cursor ?? null
          : null,

      nextCursor:
        result.data.meta
          ?.next_cursor ??
        null,

      totalResults:
        result.data.meta?.count ??
        null,

      mode,
    },

    meta: {
      source: "openalex",

      usage:
        mapUsage(
          result.usage,
        ),
    },
  };
}