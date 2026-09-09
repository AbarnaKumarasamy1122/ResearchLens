"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { fetchPaperById } from "@/lib/papers/api-client";
import type { NormalizedPaper } from "@/lib/papers";

interface PaperDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAuthors(paper: NormalizedPaper) {
  if (paper.authors.length === 0) {
    return "Unknown authors";
  }

  return paper.authors.map((author) => author.name).join(", ");
}

function getOpenAlexShortId(openAlexId: string) {
  return openAlexId.replace(
    /^https?:\/\/openalex\.org\//i,
    "",
  );
}

export default function PaperDetailPage({
  params,
}: PaperDetailPageProps) {
  const resolvedParams = use(params);

  const [paper, setPaper] = useState<NormalizedPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPaper() {
      try {
        setLoading(true);
        setError(null);

        const decodedId = decodeURIComponent(resolvedParams.id);

        const result = await fetchPaperById(decodedId);

        if (!cancelled) {
          setPaper(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load paper",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPaper();

    return () => {
      cancelled = true;
    };
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-white p-10 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
            <p className="text-gray-600">
              Loading paper...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !paper) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <h1 className="text-xl font-semibold text-red-800">
              Unable to load paper
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error ?? "Paper not found"}
            </p>

            <Link
              href="/search"
              className="mt-6 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Back to Search
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/search"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Back to Search
        </Link>

        <article className="mt-6 overflow-hidden rounded-2xl border bg-white">
          {/* Header */}
          <div className="border-b p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {paper.publicationYear && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                  {paper.publicationYear}
                </span>
              )}

              {paper.type && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize">
                  {paper.type.replaceAll("-", " ")}
                </span>
              )}

              {paper.isOpenAccess && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  Open Access
                </span>
              )}

              {paper.isRetracted && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  Retracted
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              {paper.title}
            </h1>

            <p className="mt-4 leading-7 text-gray-600">
              {formatAuthors(paper)}
            </p>

            {/* Summary cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Citations
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {paper.citedByCount.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Publication Date
                </p>

                <p className="mt-1 font-medium">
                  {formatDate(paper.publicationDate)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Language
                </p>

                <p className="mt-1 font-medium">
                  {paper.language ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8">
            {/* Abstract */}
            <section>
              <h2 className="text-xl font-semibold">
                Abstract
              </h2>

              <div className="mt-3 whitespace-pre-line leading-7 text-gray-700">
                {paper.abstract || "No abstract available."}
              </div>
            </section>

            {/* Authors */}
            <section>
              <h2 className="text-xl font-semibold">
                Authors & Institutions
              </h2>

              <div className="mt-4 space-y-4">
                {paper.authors.length === 0 ? (
                  <p className="text-gray-600">
                    No author information available.
                  </p>
                ) : (
                  paper.authors.map((author, index) => (
                    <div
                      key={`${author.id ?? author.name}-${index}`}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {author.name}
                          </p>

                          {author.orcid && (
                            <p className="mt-1 text-sm text-gray-500">
                              ORCID: {author.orcid}
                            </p>
                          )}
                        </div>

                        <span className="text-xs text-gray-400">
                          #{index + 1}
                        </span>
                      </div>

                      {author.institutions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {author.institutions.map(
                            (institution, institutionIndex) => (
                              <span
                                key={`${institution.id ?? institution.name}-${institutionIndex}`}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                              >
                                {institution.name}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Topics */}
            <section>
              <h2 className="text-xl font-semibold">
                Topics
              </h2>

              {paper.topics.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {paper.topics.map((topic, index) => (
                    <span
                      key={`${topic.id ?? topic.name}-${index}`}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                    >
                      {topic.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-gray-600">
                  No topics available.
                </p>
              )}
            </section>

            {/* Keywords */}
            <section>
              <h2 className="text-xl font-semibold">
                Keywords
              </h2>

              {paper.keywords.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {paper.keywords.map((keyword, index) => (
                    <span
                      key={`${keyword.name}-${index}`}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                    >
                      {keyword.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-gray-600">
                  No keywords available.
                </p>
              )}
            </section>

            {/* Publication */}
            <section>
              <h2 className="text-xl font-semibold">
                Publication
              </h2>

              <div className="mt-4 rounded-xl border">
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Source
                    </p>

                    <p className="mt-1 font-medium">
                      {paper.source?.name ?? "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Publication Type
                    </p>

                    <p className="mt-1 capitalize">
                      {paper.type?.replaceAll("-", " ") ?? "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      DOI
                    </p>

                    {paper.doi ? (
                      <a
                        href={paper.doi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-sm text-blue-600 hover:underline"
                      >
                        {paper.doi}
                      </a>
                    ) : (
                      <p className="mt-1 text-gray-600">
                        Not available
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      OpenAlex ID
                    </p>

                    <p className="mt-1 break-all font-mono text-sm text-gray-600">
                      {getOpenAlexShortId(paper.openAlexId)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Access */}
            <section>
              <h2 className="text-xl font-semibold">
                Access
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">
                {paper.landingPageUrl && (
                  <a
                    href={paper.landingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Open Landing Page
                  </a>
                )}

                {paper.pdfUrl && (
                  <a
                    href={paper.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Open PDF
                  </a>
                )}

                {!paper.landingPageUrl &&
                  !paper.pdfUrl && (
                    <p className="text-gray-600">
                      No external access link available.
                    </p>
                  )}
              </div>
            </section>

            {/* Traceability */}
            <section className="border-t pt-6">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Data Source
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                This record was retrieved from OpenAlex and
                normalized by Research Lens.
              </p>

              <a
                href={paper.openAlexId}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-blue-600 hover:underline"
              >
                View original OpenAlex record →
              </a>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}