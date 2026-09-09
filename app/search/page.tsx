"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fetchPapers,
  type SearchPapersParams,
} from "@/lib/papers/api-client";

import type {
  NormalizedPaper,
} from "@/lib/papers";

import FilterPanel from "./components/filter-panel";
import Pagination from "./components/pagination";
import PaperList from "./components/paper-list";
import SearchForm from "./components/search-form";

const DEFAULT_PER_PAGE = 25;

export default function SearchPage() {
  const [search, setSearch] =
    useState("");

  const [fromYear, setFromYear] =
    useState(2020);

  const [toYear, setToYear] =
    useState(2025);

  const [type, setType] =
    useState("");

  const [openAccess, setOpenAccess] =
    useState<boolean | undefined>(
      undefined,
    );

  const [minCitations, setMinCitations] =
    useState<number | undefined>(
      undefined,
    );

  const [maxCitations, setMaxCitations] =
    useState<number | undefined>(
      undefined,
    );

  const [sort, setSort] =
    useState<
      SearchPapersParams["sort"]
    >("relevance_score");

  const [sortDirection, setSortDirection] =
    useState<
      SearchPapersParams["sortDirection"]
    >("desc");

  const [page, setPage] =
    useState(1);

  const [papers, setPapers] =
    useState<NormalizedPaper[]>(
      [],
    );

  const [totalResults, setTotalResults] =
    useState<number | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const loadPapers =
    useCallback(
      async (
        targetPage: number,
      ) => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await fetchPapers({
              search:
                search || undefined,

              fromYear,

              toYear,

              type:
                type || undefined,

              openAccess,

              minCitations,

              maxCitations,

              sort,

              sortDirection,

              page: targetPage,

              perPage:
                DEFAULT_PER_PAGE,
            });

          setPapers(
            result.data,
          );

          setTotalResults(
            result.pagination
              .totalResults,
          );
        } catch (err) {
          setPapers([]);

          setTotalResults(null);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load papers",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        search,
        fromYear,
        toYear,
        type,
        openAccess,
        minCitations,
        maxCitations,
        sort,
        sortDirection,
      ],
    );

  /*
   * Load papers whenever the search/filter
   * state changes.
   *
   * The request is deferred to the next
   * task so the effect itself does not
   * synchronously trigger state updates.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadPapers(1);
      }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPapers]);

  function handleSearch(
    value: string,
  ) {
    setSearch(value);
    setPage(1);
  }

  function handleFilterChange(
    values: {
      fromYear?: number;
      toYear?: number;
      type?: string;
      openAccess?: boolean;
      minCitations?: number;
      maxCitations?: number;
      sort?:
        SearchPapersParams["sort"];
      sortDirection?:
        SearchPapersParams[
          "sortDirection"
        ];
    },
  ) {
    if (
      values.fromYear !==
      undefined
    ) {
      setFromYear(
        values.fromYear,
      );
    }

    if (
      values.toYear !==
      undefined
    ) {
      setToYear(
        values.toYear,
      );
    }

    if (
      values.type !==
      undefined
    ) {
      setType(
        values.type,
      );
    }

    if (
      values.openAccess !==
      undefined
    ) {
      setOpenAccess(
        values.openAccess,
      );
    }

    if (
      values.minCitations !==
      undefined
    ) {
      setMinCitations(
        values.minCitations,
      );
    }

    if (
      values.maxCitations !==
      undefined
    ) {
      setMaxCitations(
        values.maxCitations,
      );
    }

    if (
      values.sort !==
      undefined
    ) {
      setSort(
        values.sort,
      );
    }

    if (
      values.sortDirection !==
      undefined
    ) {
      setSortDirection(
        values.sortDirection,
      );
    }

    setPage(1);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}

        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Research Lens
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Research Paper Explorer
          </h1>

          <p className="mt-3 max-w-2xl text-gray-600">
            Search and explore research papers
            indexed by OpenAlex.
          </p>
        </header>

        {/* Search + Filters */}

        <section className="space-y-5">
          <SearchForm
            initialSearch={
              search
            }
            onSearch={
              handleSearch
            }
          />

          <FilterPanel
            fromYear={
              fromYear
            }

            toYear={
              toYear
            }

            type={
              type
            }

            openAccess={
              openAccess
            }

            minCitations={
              minCitations
            }

            maxCitations={
              maxCitations
            }

            sort={
              sort ??
              "relevance_score"
            }

            sortDirection={
              sortDirection ??
              "desc"
            }

            onChange={
              handleFilterChange
            }
          />
        </section>

        {/* Results */}

        <section className="mt-8">

          {totalResults !==
            null && (
            <p className="mb-4 text-sm text-gray-600">
              {totalResults.toLocaleString()}{" "}
              papers found
            </p>
          )}

          {/* Loading */}

          {loading && (
            <div className="rounded-xl border bg-white p-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />

              <p className="text-gray-600">
                Searching OpenAlex...
              </p>
            </div>
          )}

          {/* Error */}

          {!loading &&
            error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h2 className="font-semibold text-red-800">
                  Search failed
                </h2>

                <p className="mt-2 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadPapers(
                      page,
                    )
                  }
                  className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            )}

          {/* Results */}

          {!loading &&
            !error && (
              <PaperList
                papers={
                  papers
                }
              />
            )}
        </section>

        {/* Pagination */}

        {!loading &&
          !error &&
          papers.length >
            0 && (
            <div className="mt-8">
              <Pagination
                page={
                  page
                }

                totalResults={
                  totalResults
                }

                perPage={
                  DEFAULT_PER_PAGE
                }

                onPageChange={(
                  nextPage,
                ) => {
                  setPage(
                    nextPage,
                  );
                }}
              />
            </div>
          )}
      </div>
    </main>
  );
}