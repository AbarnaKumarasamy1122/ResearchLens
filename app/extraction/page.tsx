"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  message?: string;
  data: {
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
  };
}

interface JobResponse {
  success: boolean;
  message?: string;
  data: ExtractionJob;
}

interface ExtractionHistoryJob {
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
}

interface HistoryResponse {
  success: boolean;
  message?: string;
  data: ExtractionHistoryJob[];
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

  const [history, setHistory] = useState<
    ExtractionHistoryJob[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [loadingJob, setLoadingJob] =
    useState(false);

  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [actionJobId, setActionJobId] =
    useState<string | null>(null);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [searchDataset, setSearchDataset] =
    useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = DEFAULT_PAGE_SIZE;

  /*
   * Load extraction history.
   */
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);

      const response = await fetch(
        "/api/extraction?limit=20",
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
            : "Failed to load extraction history",
        );
      }

      const result = body as HistoryResponse;

      if (!result.success) {
        throw new Error(
          result.message ??
            "Failed to load extraction history",
        );
      }

      setHistory(result.data);
    } catch (err) {
      console.error(
        "Failed to load extraction history:",
        err,
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  /*
   * Load one extraction job.
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

        const result = body as JobResponse;

        if (!result.success) {
          throw new Error(
            result.message ??
              "Failed to load extraction job",
          );
        }

        setJob(result.data);
        setCurrentPage(1);
        setSearchDataset("");
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
   * Initial extraction history load.
   */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHistory]);

  /*
   * Start a new asynchronous extraction job.
   *
   * The POST endpoint should return immediately
   * with status PENDING.
   */
  const startExtraction = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/extraction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
            : "Failed to create extraction job",
        );
      }

      const result =
        body as ExtractionResponse;

      if (!result.success) {
        throw new Error(
          result.message ??
            "Failed to create extraction job",
        );
      }

      const createdJob: ExtractionJob = {
        id: result.data.id,
        name: result.data.name,
        query: result.data.query,
        status: result.data.status,
        totalResults:
          result.data.totalResults,
        processedResults:
          result.data.processedResults,
        failedResults:
          result.data.failedResults,
        duplicateCount:
          result.data.duplicateCount,
        errorMessage:
          result.data.errorMessage,
        startedAt: result.data.startedAt,
        completedAt:
          result.data.completedAt,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        papers: [],
      };

      setJob(createdJob);
      setCurrentPage(1);
      setSearchDataset("");

      /*
       * Refresh history immediately so the new
       * PENDING job appears in the history table.
       */
      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create extraction job",
      );
    } finally {
      setLoading(false);
    }
  }, [
    fromYear,
    toYear,
    perPage,
    maxPages,
    loadHistory,
  ]);

  /*
   * Poll the selected job while it is active.
   */
  useEffect(() => {
    const jobId = job?.id;
    const jobStatus = job?.status;

    if (
      !jobId ||
      !jobStatus ||
      !["PENDING", "RUNNING"].includes(
        jobStatus,
      )
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadJob(jobId);
      void loadHistory();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    job?.id,
    job?.status,
    loadJob,
    loadHistory,
  ]);

  /*
   * Cancel an active extraction job.
   */
  const cancelJob = useCallback(
    async (jobId: string) => {
      const confirmed = window.confirm(
        "Cancel this extraction job?",
      );

      if (!confirmed) {
        return;
      }

      try {
        setActionJobId(jobId);
        setError(null);

        const response = await fetch(
          `/api/extraction/${encodeURIComponent(
            jobId,
          )}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "cancel",
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
              : "Failed to cancel extraction job",
          );
        }

        /*
         * Reload both the current job and history
         * so the CANCELLED status appears immediately.
         */
        await loadJob(jobId);
        await loadHistory();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to cancel extraction job",
        );
      } finally {
        setActionJobId(null);
      }
    },
    [loadJob, loadHistory],
  );

  /*
   * Delete a completed/failed/cancelled job.
   */
  const deleteJob = useCallback(
    async (jobId: string) => {
      const confirmed = window.confirm(
        "Delete this extraction job?\n\nThe extraction history record will be deleted. Saved research papers will remain in the database.",
      );

      if (!confirmed) {
        return;
      }

      try {
        setActionJobId(jobId);
        setError(null);

        const response = await fetch(
          `/api/extraction/${encodeURIComponent(
            jobId,
          )}`,
          {
            method: "DELETE",
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
              : "Failed to delete extraction job",
          );
        }

        /*
         * If the deleted job is currently selected,
         * clear the current dataset.
         */
        if (job?.id === jobId) {
          setJob(null);
          setCurrentPage(1);
          setSearchDataset("");
        }

        await loadHistory();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete extraction job",
        );
      } finally {
        setActionJobId(null);
      }
    },
    [job, loadHistory],
  );

  /*
   * Filter extracted dataset locally.
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
  }, [job?.papers, searchDataset]);

  /*
   * Dataset pagination.
   */
  const totalDatasetPages = Math.max(
    1,
    Math.ceil(
      filteredPapers.length / pageSize,
    ),
  );

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

  /*
   * Export JSON.
   */
  function exportJSON() {
    if (
      !job ||
      job.papers.length === 0
    ) {
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

  /*
   * Export CSV.
   */
  function exportCSV() {
    if (
      !job ||
      job.papers.length === 0
    ) {
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

  /*
   * Progress percentage.
   */
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
            Extract, normalize, deduplicate,
            inspect, and export research papers
            related to Extended Reality, Virtual
            Reality, Augmented Reality, and Mixed
            Reality.
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
                <option value={25}>
                  25
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
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
              ["PENDING", "RUNNING"].includes(
                job?.status ?? "",
              ) ||
              fromYear > toYear
            }
            className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Starting extraction..."
              : job?.status === "RUNNING"
                ? "Extraction Running..."
                : job?.status === "PENDING"
                  ? "Extraction Pending..."
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

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="mt-3 text-sm font-medium text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Current Job */}
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

                  <p className="mt-1 text-xs text-gray-400">
                    Job ID: {job.id}
                  </p>
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
                  value={job.processedResults}
                />

                <Metric
                  label="Duplicates"
                  value={job.duplicateCount}
                />

                <Metric
                  label="Failed"
                  value={job.failedResults}
                />
              </div>

              {job.status === "PENDING" && (
                <p className="mt-5 text-sm text-yellow-700">
                  The extraction job has been
                  created and is waiting to start.
                </p>
              )}

              {job.status === "RUNNING" && (
                <p className="mt-5 text-sm text-gray-500">
                  Extraction is running. This page
                  automatically refreshes the job
                  progress.
                </p>
              )}

              {job.status === "CANCELLED" && (
                <p className="mt-5 text-sm text-gray-600">
                  This extraction job was cancelled.
                </p>
              )}

              {job.status === "COMPLETED" && (
                <p className="mt-5 text-sm text-green-700">
                  Extraction completed successfully.
                </p>
              )}

              {job.errorMessage && (
                <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {job.errorMessage}
                </div>
              )}

              {/* Current job actions */}
              {(job.status === "PENDING" ||
                job.status === "RUNNING") && (
                <button
                  type="button"
                  onClick={() =>
                    void cancelJob(job.id)
                  }
                  disabled={
                    actionJobId === job.id
                  }
                  className="mt-5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionJobId === job.id
                    ? "Cancelling..."
                    : "Cancel Extraction"}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Extraction History */}
        <section className="mt-8">
          <div className="rounded-2xl border bg-white">
            <div className="border-b p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-semibold">
                    Extraction History
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    View and manage previous
                    extraction jobs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadHistory()
                  }
                  disabled={loadingHistory}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingHistory
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No extraction jobs yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 font-medium">
                        Job
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Status
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Results
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Processed
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Duplicates
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Failed
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Created
                      </th>

                      <th className="px-5 py-3 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((item) => {
                      const isActive =
                        item.status ===
                          "PENDING" ||
                        item.status ===
                          "RUNNING";

                      const isCurrent =
                        job?.id === item.id;

                      return (
                        <tr
                          key={item.id}
                          className={`border-b last:border-0 ${
                            isCurrent
                              ? "bg-gray-50"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-4">
                            <p className="font-medium">
                              {item.name}
                            </p>

                            <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                              {item.query ??
                                "XR extraction"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                item.status
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            {item.totalResults.toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            {item.processedResults.toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            {item.duplicateCount.toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            {item.failedResults.toLocaleString()}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                            {new Date(
                              item.createdAt,
                            ).toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void loadJob(
                                    item.id,
                                  )
                                }
                                disabled={
                                  loadingJob
                                }
                                className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                              >
                                {isCurrent
                                  ? "Selected"
                                  : "View"}
                              </button>

                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void cancelJob(
                                      item.id,
                                    )
                                  }
                                  disabled={
                                    actionJobId ===
                                    item.id
                                  }
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {actionJobId ===
                                  item.id
                                    ? "Cancelling..."
                                    : "Cancel"}
                                </button>
                              )}

                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteJob(
                                      item.id,
                                    )
                                  }
                                  disabled={
                                    actionJobId ===
                                    item.id
                                  }
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {actionJobId ===
                                  item.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

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
                      disabled={
                        job.papers.length ===
                        0
                      }
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Export CSV
                    </button>

                    <button
                      type="button"
                      onClick={exportJSON}
                      disabled={
                        job.papers.length ===
                        0
                      }
                      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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

              {paginatedPapers.length ===
              0 ? (
                <div className="p-10 text-center text-gray-500">
                  No papers match the current
                  search.
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
                                    (
                                      author,
                                    ) =>
                                      author.name,
                                  )
                                  .join(
                                    ", ",
                                  ) ||
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
                        setCurrentPage(
                          (page) =>
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
                        setCurrentPage(
                          (page) =>
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