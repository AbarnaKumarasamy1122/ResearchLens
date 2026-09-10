"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Papa from "papaparse";

import type { NormalizedPaper } from "@/lib/papers";

interface ExtractionJob {
  id: string;
  name: string;
  query: string | null;
  status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  totalResults: number;
  processedResults: number;
  failedResults: number;
  duplicateCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  papers: NormalizedPaper[];
}

interface ExtractionResponse {
  success: boolean;
  data: {
    jobId: string;
    status: string;
    totalResults: number;
    processedResults: number;
    failedResults: number;
    duplicateCount: number;
  };
}

interface JobResponse {
  success: boolean;
  data: ExtractionJob;
}

const DEFAULT_FROM_YEAR = 2020;
const DEFAULT_TO_YEAR = 2025;
const DEFAULT_PAGE_SIZE = 20;

function downloadFile(
  content: string,
  filename: string,
  type: string,
) {
  const blob = new Blob([content], {
    type,
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function flattenPaperForExport(
  paper: NormalizedPaper,
) {
  return {
    openAlexId: paper.openAlexId,
    doi: paper.doi ?? "",
    title: paper.title,
    publicationDate: paper.publicationDate ?? "",
    publicationYear: paper.publicationYear ?? "",
    type: paper.type ?? "",
    language: paper.language ?? "",
    citedByCount: paper.citedByCount,
    isOpenAccess: paper.isOpenAccess ?? false,
    isRetracted: paper.isRetracted ?? false,

    authors: paper.authors
      .map((author) => author.name)
      .join("; "),

    institutions: Array.from(
      new Set(
        paper.authors.flatMap((author) =>
          author.institutions.map(
            (institution) => institution.name,
          ),
        ),
      ),
    ).join("; "),

    keywords: paper.keywords
      .map((keyword) => keyword.name)
      .join("; "),

    topics: paper.topics
      .map((topic) => topic.name)
      .join("; "),

    source: paper.source?.name ?? "",
    landingPageUrl: paper.landingPageUrl ?? "",
    pdfUrl: paper.pdfUrl ?? "",
  };
}

export default function ExtractionPage() {
  const [fromYear, setFromYear] = useState(
    DEFAULT_FROM_YEAR,
  );

  const [toYear, setToYear] = useState(
    DEFAULT_TO_YEAR,
  );

  const [perPage, setPerPage] = useState(100);
  const [maxPages, setMaxPages] = useState(10);

  const [job, setJob] =
    useState<ExtractionJob | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [loadingJob, setLoadingJob] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [searchDataset, setSearchDataset] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const pageSize = DEFAULT_PAGE_SIZE;

  /*
   * Start a new extraction.
   */
  const startExtraction = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/extraction",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              fromYear,
              toYear,
              perPage,
              maxPages,
            }),
          },
        );

        let body: unknown;

        try {
          body = await response.json();
        } catch {
          body = null;
        }

        if (!response.ok) {
          throw new Error(
            typeof body === "object" &&
              body !== null &&
              "message" in body &&
              typeof body.message === "string"
              ? body.message
              : "Extraction failed",
          );
        }

        const result =
          body as ExtractionResponse;

        setJob({
          id: result.data.jobId,
          name: `XR Research ${fromYear}-${toYear}`,
          query:
            "extended reality, virtual reality, augmented reality, mixed reality",
          status:
            result.data.status as ExtractionJob["status"],
          totalResults:
            result.data.totalResults,
          processedResults:
            result.data.processedResults,
          failedResults:
            result.data.failedResults,
          duplicateCount:
            result.data.duplicateCount,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          createdAt:
            new Date().toISOString(),
          updatedAt:
            new Date().toISOString(),
          papers: [],
        });

        setCurrentPage(1);
        setSearchDataset("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Extraction failed",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      fromYear,
      toYear,
      perPage,
      maxPages,
    ],
  );

  /*
   * Load the latest job state.
   */
  const loadJob = useCallback(
    async (jobId: string) => {
      try {
        setLoadingJob(true);

        const response = await fetch(
          `/api/extraction/${encodeURIComponent(jobId)}`,
          {
            cache: "no-store",
          },
        );

        let body: unknown;

        try {
          body = await response.json();
        } catch {
          body = null;
        }

        if (!response.ok) {
          throw new Error(
            typeof body === "object" &&
              body !== null &&
              "message" in body &&
              typeof body.message === "string"
              ? body.message
              : "Failed to load extraction job",
          );
        }

        const result =
          body as JobResponse;

        setJob(result.data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load extraction job",
        );
      } finally {
        setLoadingJob(false);
      }
    },
    [],
  );

  /*
   * Poll while extraction is running.
   *
   * The timer callback is asynchronous, so this does
   * not synchronously update state inside the effect.
   */
  useEffect(() => {
  const jobId = job?.id;
  const jobStatus = job?.status;

  if (
    !jobId ||
    !jobStatus ||
    !["PENDING", "RUNNING"].includes(jobStatus)
  ) {
    return;
  }

  const timer = window.setInterval(() => {
    void loadJob(jobId);
  }, 2000);

  return () => {
    window.clearInterval(timer);
  };
}, [job?.id, job?.status, loadJob]);

  /*
   * Filter the extracted dataset locally.
   */
  const filteredPapers = useMemo(() => {
    const query =
      searchDataset.trim().toLowerCase();

    if (!query) {
      return job?.papers ?? [];
    }

    return (job?.papers ?? []).filter(
      (paper) => {
        const searchable = [
          paper.title,
          paper.doi,
          paper.type,
          paper.language,
          paper.source?.name,

          ...paper.authors.map(
            (author) => author.name,
          ),

          ...paper.keywords.map(
            (keyword) => keyword.name,
          ),

          ...paper.topics.map(
            (topic) => topic.name,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      },
    );
  }, [
    job?.papers,
    searchDataset,
  ]);

  /*
   * Dataset pagination.
   */
  const totalDatasetPages = Math.max(
    1,
    Math.ceil(
      filteredPapers.length / pageSize,
    ),
  );

  /*
   * Instead of calling setCurrentPage() from an effect,
   * derive a safe page value.
   */
  const safeCurrentPage = Math.min(
    currentPage,
    totalDatasetPages,
  );

  const paginatedPapers = useMemo(() => {
    const start =
      (safeCurrentPage - 1) * pageSize;

    return filteredPapers.slice(
      start,
      start + pageSize,
    );
  }, [
    filteredPapers,
    safeCurrentPage,
    pageSize,
  ]);

  function exportJSON() {
    if (!job || job.papers.length === 0) {
      return;
    }

    const data = job.papers.map(
      flattenPaperForExport,
    );

    downloadFile(
      JSON.stringify(data, null, 2),
      `research-lens-${job.id}.json`,
      "application/json",
    );
  }

  function exportCSV() {
    if (!job || job.papers.length === 0) {
      return;
    }

    const data = job.papers.map(
      flattenPaperForExport,
    );

    const csv = Papa.unparse(data);

    downloadFile(
      csv,
      `research-lens-${job.id}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  const progress =
    job && job.totalResults > 0
      ? Math.min(
          100,
          Math.round(
            (job.processedResults /
              job.totalResults) *
              100,
          ),
        )
      : job?.status === "COMPLETED"
        ? 100
        : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Research Lens
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            XR Extraction Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            Extract, normalize, deduplicate, inspect,
            and export research papers related to
            Extended Reality, Virtual Reality,
            Augmented Reality, and Mixed Reality.
          </p>
        </header>

        {/* Configuration */}
        <section className="mt-8 rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold">
            Extraction Configuration
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <label className="block">
              <span className="text-sm font-medium">
                From year
              </span>

              <input
                type="number"
                min={1900}
                max={2100}
                value={fromYear}
                onChange={(event) =>
                  setFromYear(
                    Number(event.target.value),
                  )
                }
                className="mt-2 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                To year
              </span>

              <input
                type="number"
                min={1900}
                max={2100}
                value={toYear}
                onChange={(event) =>
                  setToYear(
                    Number(event.target.value),
                  )
                }
                className="mt-2 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Results per page
              </span>

              <select
                value={perPage}
                onChange={(event) =>
                  setPerPage(
                    Number(event.target.value),
                  )
                }
                className="mt-2 w-full rounded-lg border px-3 py-2"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Maximum pages / term
              </span>

              <input
                type="number"
                min={1}
                max={100}
                value={maxPages}
                onChange={(event) =>
                  setMaxPages(
                    Number(event.target.value),
                  )
                }
                className="mt-2 w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-medium">
              Search terms
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "Extended Reality",
                "Virtual Reality",
                "Augmented Reality",
                "Mixed Reality",
              ].map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-white px-3 py-1 text-sm text-gray-700 ring-1 ring-gray-200"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void startExtraction()
            }
            disabled={
              loading ||
              loadingJob ||
              fromYear > toYear
            }
            className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Starting extraction..."
              : "Start XR Extraction"}
          </button>

          {fromYear > toYear && (
            <p className="mt-2 text-sm text-red-600">
              From year must not be greater than
              to year.
            </p>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-semibold text-red-800">
              Something went wrong
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Job progress */}
        {job && (
          <section className="mt-8">
            <div className="rounded-2xl border bg-white p-6">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    Extraction Job
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {job.name}
                  </h2>
                </div>

                <StatusBadge
                  status={job.status}
                />
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-600">
                    Processing progress
                  </span>

                  <span className="font-medium">
                    {progress}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-black transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="API Results"
                  value={job.totalResults}
                />

                <Metric
                  label="Processed"
                  value={
                    job.processedResults
                  }
                />

                <Metric
                  label="Duplicates"
                  value={
                    job.duplicateCount
                  }
                />

                <Metric
                  label="Failed"
                  value={
                    job.failedResults
                  }
                />
              </div>

              {job.status === "RUNNING" && (
                <p className="mt-5 text-sm text-gray-500">
                  Extraction is running. This page
                  automatically refreshes the job
                  progress.
                </p>
              )}

              {job.errorMessage && (
                <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {job.errorMessage}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Dataset */}
        {job?.status === "COMPLETED" && (
          <section className="mt-8">
            <div className="rounded-2xl border bg-white">

              <div className="border-b p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                  <div>
                    <h2 className="text-xl font-semibold">
                      Extracted Dataset
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {filteredPapers.length.toLocaleString()}{" "}
                      papers in the current dataset
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={exportCSV}
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                      Export CSV
                    </button>

                    <button
                      type="button"
                      onClick={exportJSON}
                      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <input
                    type="search"
                    placeholder="Search extracted papers..."
                    value={searchDataset}
                    onChange={(event) => {
                      setSearchDataset(
                        event.target.value,
                      );
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-lg border px-4 py-3 text-sm"
                  />
                </div>
              </div>

              {paginatedPapers.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No papers match the current search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 font-medium">
                          Title
                        </th>

                        <th className="px-5 py-3 font-medium">
                          Year
                        </th>

                        <th className="px-5 py-3 font-medium">
                          Authors
                        </th>

                        <th className="px-5 py-3 font-medium">
                          Citations
                        </th>

                        <th className="px-5 py-3 font-medium">
                          OA
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedPapers.map(
                        (paper) => (
                          <tr
                            key={
                              paper.openAlexId
                            }
                            className="border-b last:border-0"
                          >
                            <td className="max-w-md px-5 py-4">
                              <a
                                href={`/papers/${encodeURIComponent(
                                  paper.openAlexId,
                                )}`}
                                className="font-medium hover:underline"
                              >
                                {paper.title}
                              </a>

                              {paper.doi && (
                                <p className="mt-1 truncate text-xs text-gray-500">
                                  {paper.doi}
                                </p>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              {paper.publicationYear ??
                                "—"}
                            </td>

                            <td className="max-w-xs px-5 py-4">
                              <span className="line-clamp-2">
                                {paper.authors
                                  .slice(0, 3)
                                  .map(
                                    (author) =>
                                      author.name,
                                  )
                                  .join(", ") ||
                                  "Unknown"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {paper.citedByCount.toLocaleString()}
                            </td>

                            <td className="px-5 py-4">
                              {paper.isOpenAccess ? (
                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dataset pagination */}
              {filteredPapers.length > 0 && (
                <div className="flex items-center justify-between border-t p-5">

                  <p className="text-sm text-gray-500">
                    Page {safeCurrentPage} of{" "}
                    {totalDatasetPages}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        safeCurrentPage <= 1
                      }
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.max(
                            1,
                            page - 1,
                          ),
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={
                        safeCurrentPage >=
                        totalDatasetPages
                      }
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(
                            totalDatasetPages,
                            page + 1,
                          ),
                        )
                      }
                      className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ExtractionJob["status"];
}) {
  const styles: Record<
    ExtractionJob["status"],
    string
  > = {
    PENDING:
      "bg-yellow-100 text-yellow-700",

    RUNNING:
      "bg-blue-100 text-blue-700",

    COMPLETED:
      "bg-green-100 text-green-700",

    FAILED:
      "bg-red-100 text-red-700",

    CANCELLED:
      "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}