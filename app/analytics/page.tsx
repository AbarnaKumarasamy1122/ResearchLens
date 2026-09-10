"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsData {
  job: {
    id: string;
    name: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    createdAt: string;
    completedAt: string | null;
  };

  overview: {
    totalPapers: number;
    totalCitations: number;
    averageCitations: number;
    medianCitations: number;
    openAccessPercentage: number;
    openAccessPapers: number;
    retractedPapers: number;
  };

  papersByType: Array<{
    type: string;
    count: number;
  }>;

  papersByLanguage: Array<{
    language: string;
    count: number;
  }>;

  citationRanking: Array<{
    rank: number;
    openAlexId: string;
    title: string;
    year: number | null;
    citations: number;
    doi: string | null;
  }>;

  keywordFrequency: Array<{
    keyword: string;
    frequency: number;
  }>;

  topicFrequency: Array<{
    topic: string;
    frequency: number;
  }>;

  institutionDistribution: Array<{
    institution: string;
    papers: number;
  }>;

  countryDistribution: Array<{
    countryCode: string;
    country: string;
    papers: number;
  }>;

  publicationTrends: Array<{
    year: number;
    papers: number;
  }>;
}

interface AnalyticsResponse {
  success: boolean;
  message?: string;
  data: AnalyticsData;
}

interface HistoryJob {
  id: string;
  name: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalResults: number;
  processedResults: number;
  failedResults: number;
  duplicateCount: number;
  createdAt: string;
}

interface HistoryResponse {
  success: boolean;
  message?: string;
  data: HistoryJob[];
}

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);

  const [selectedJobId, setSelectedJobId] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const [loadingJobs, setLoadingJobs] = useState(true);

  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);

      const response = await fetch("/api/extraction?limit=50", {
        cache: "no-store",
      });

      const body = (await response.json()) as HistoryResponse;

      if (!response.ok || !body.success) {
        throw new Error(body.message ?? "Failed to load extraction jobs");
      }

      const completedJobs = body.data.filter(
        (job) => job.status === "COMPLETED",
      );

      setJobs(completedJobs);

      if (completedJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(completedJobs[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load extraction jobs",
      );
    } finally {
      setLoadingJobs(false);
    }
  }, [selectedJobId]);

  const loadAnalytics = useCallback(async (jobId: string) => {
    if (!jobId) {
      setAnalytics(null);
      return;
    }

    try {
      setLoadingAnalytics(true);

      setError(null);

      const response = await fetch(
        `/api/analytics/${encodeURIComponent(jobId)}`,
        {
          cache: "no-store",
        },
      );

      const body = (await response.json()) as AnalyticsResponse;

      if (!response.ok || !body.success) {
        throw new Error(body.message ?? "Failed to load analytics");
      }

      setAnalytics(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadAnalytics(selectedJobId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedJobId, loadAnalytics]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Research Lens
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              XR Extraction Dashboard
            </h1>

            <p className="mt-3 max-w-3xl text-gray-600">
              Extract, normalize, deduplicate, inspect, and export research
              papers related to Extended Reality, Virtual Reality, Augmented
              Reality, and Mixed Reality.
            </p>
          </div>

          <a
            href="/analytics"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium hover:bg-gray-50"
          >
            View Analytics
          </a>
        </div>
        
        {/* Header */}
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Research Lens
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Research Analytics
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            Explore citation patterns, research topics, keywords, institutions,
            countries, publication trends, and dataset statistics.
          </p>
        </header>

        {/* Job selector */}
        <section className="mt-8 rounded-2xl border bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block w-full max-w-xl">
              <span className="text-sm font-medium">Extraction dataset</span>

              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                disabled={loadingJobs || jobs.length === 0}
                className="mt-2 w-full rounded-lg border px-3 py-3"
              >
                <option value="">Select a completed extraction</option>

                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name} — {new Date(job.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadJobs()}
              disabled={loadingJobs}
              className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingJobs ? "Refreshing..." : "Refresh datasets"}
            </button>
          </div>

          {jobs.length === 0 && !loadingJobs && (
            <p className="mt-4 text-sm text-gray-500">
              No completed extraction datasets are available yet. Run an
              extraction first.
            </p>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-semibold text-red-800">Analytics error</h2>

            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {loadingAnalytics && (
          <div className="mt-8 rounded-2xl border bg-white p-8 text-center text-gray-500">
            Calculating analytics...
          </div>
        )}

        {analytics && !loadingAnalytics && (
          <>
            {/* Dataset heading */}
            <section className="mt-8">
              <div className="rounded-2xl border bg-white p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm text-gray-500">Analytics for</p>

                    <h2 className="mt-1 text-xl font-semibold">
                      {analytics.job.name}
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      Job ID: {analytics.job.id}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    {analytics.job.status}
                  </span>
                </div>
              </div>
            </section>

            {/* Overview cards */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Papers"
                value={analytics.overview.totalPapers.toLocaleString()}
              />

              <MetricCard
                label="Total Citations"
                value={analytics.overview.totalCitations.toLocaleString()}
              />

              <MetricCard
                label="Average Citations"
                value={analytics.overview.averageCitations.toLocaleString()}
              />

              <MetricCard
                label="Median Citations"
                value={analytics.overview.medianCitations.toLocaleString()}
              />

              <MetricCard
                label="Open Access"
                value={`${analytics.overview.openAccessPercentage}%`}
              />

              <MetricCard
                label="Open Access Papers"
                value={analytics.overview.openAccessPapers.toLocaleString()}
              />

              <MetricCard
                label="Retracted Papers"
                value={analytics.overview.retractedPapers.toLocaleString()}
              />

              <MetricCard
                label="Top Citation"
                value={
                  analytics.citationRanking[0]?.citations.toLocaleString() ??
                  "0"
                }
              />
            </section>

            {/* Publication trends */}
            <section className="mt-8 rounded-2xl border bg-white p-6">
              <SectionTitle
                title="Publication Trends"
                description="Number of papers published in each year."
              />

              <div className="mt-6 h-80">
                {analytics.publicationTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.publicationTrends}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="year" />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Line
                        type="monotone"
                        dataKey="papers"
                        stroke="currentColor"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </section>

            {/* Keywords + Topics */}
            <section className="mt-8 grid gap-8 lg:grid-cols-2">
              <FrequencyChart
                title="Top Keywords"
                description="Most frequent normalized keywords."
                data={analytics.keywordFrequency.slice(0, 15)}
                labelKey="keyword"
                valueKey="frequency"
              />

              <FrequencyChart
                title="Top Topics"
                description="Most frequent OpenAlex topics."
                data={analytics.topicFrequency.slice(0, 15)}
                labelKey="topic"
                valueKey="frequency"
              />
            </section>

            {/* Institutions + Countries */}
            <section className="mt-8 grid gap-8 lg:grid-cols-2">
              <FrequencyChart
                title="Top Institutions"
                description="Institutions represented across the extracted papers."
                data={analytics.institutionDistribution.slice(0, 15)}
                labelKey="institution"
                valueKey="papers"
              />

              <FrequencyChart
                title="Country Distribution"
                description="Countries represented across the extracted papers."
                data={analytics.countryDistribution.slice(0, 15)}
                labelKey="country"
                valueKey="papers"
              />
            </section>

            {/* Type + Language */}
            <section className="mt-8 grid gap-8 lg:grid-cols-2">
              <PieDistribution
                title="Papers by Type"
                data={analytics.papersByType.slice(0, 10)}
                labelKey="type"
                valueKey="count"
              />

              <PieDistribution
                title="Papers by Language"
                data={analytics.papersByLanguage.slice(0, 10)}
                labelKey="language"
                valueKey="count"
              />
            </section>

            {/* Citation ranking */}
            <section className="mt-8 rounded-2xl border bg-white">
              <div className="border-b p-6">
                <h2 className="text-xl font-semibold">Top Cited Papers</h2>

                <p className="mt-1 text-sm text-gray-500">
                  Top 50 papers ranked by OpenAlex citation count.
                </p>
              </div>

              {analytics.citationRanking.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No citation data available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 font-medium">Rank</th>

                        <th className="px-5 py-3 font-medium">Paper</th>

                        <th className="px-5 py-3 font-medium">Year</th>

                        <th className="px-5 py-3 font-medium">Citations</th>
                      </tr>
                    </thead>

                    <tbody>
                      {analytics.citationRanking.map((paper) => (
                        <tr
                          key={paper.openAlexId}
                          className="border-b last:border-0"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {paper.rank}
                          </td>

                          <td className="max-w-2xl px-5 py-4">
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
                            {paper.year ?? "—"}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {paper.citations.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>

      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">
      No data available for this chart.
    </div>
  );
}

function FrequencyChart({
  title,
  description,
  data,
  labelKey,
  valueKey,
}: {
  title: string;
  description: string;
  data: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <SectionTitle title={title} description={description} />

      <div className="mt-6 h-[420px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 5,
                right: 20,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis type="number" allowDecimals={false} />

              <YAxis
                type="category"
                dataKey={labelKey}
                width={150}
                tick={{
                  fontSize: 11,
                }}
              />

              <Tooltip />

              <Bar dataKey={valueKey} fill="currentColor" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </section>
  );
}

function PieDistribution({
  title,
  data,
  labelKey,
  valueKey,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-6 h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={labelKey}
                cx="50%"
                cy="50%"
                outerRadius={110}
                label
              />

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </section>
  );
}
