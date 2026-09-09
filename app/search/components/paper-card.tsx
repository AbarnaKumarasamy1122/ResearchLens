import Link from "next/link";

import type {
  NormalizedPaper,
} from "@/lib/papers";

interface PaperCardProps {
  paper: NormalizedPaper;
}

function formatAuthors(
  paper: NormalizedPaper
) {
  if (paper.authors.length === 0) {
    return "Unknown authors";
  }

  const names = paper.authors
    .slice(0, 3)
    .map((author) => author.name);

  if (paper.authors.length > 3) {
    return `${names.join(", ")} + ${
      paper.authors.length - 3
    } more`;
  }

  return names.join(", ");
}

export default function PaperCard({
  paper,
}: PaperCardProps) {
  return (
    <article className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {paper.publicationYear && (
          <span className="rounded-full bg-gray-100 px-3 py-1">
            {paper.publicationYear}
          </span>
        )}

        {paper.type && (
          <span className="rounded-full bg-gray-100 px-3 py-1">
            {paper.type}
          </span>
        )}

        {paper.isOpenAccess && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
            Open Access
          </span>
        )}
      </div>

      <h2 className="text-xl font-semibold leading-snug">
        {paper.title}
      </h2>

      <p className="mt-2 text-sm text-gray-800">
        {formatAuthors(paper)}
      </p>

      {paper.source?.name && (
        <p className="mt-1 text-sm text-gray-800">
          {paper.source.name}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-800">
        <span>
          {paper.citedByCount} citations
        </span>

        {paper.language && (
          <span>
            Language: {paper.language}
          </span>
        )}
      </div>

      <div className="mt-5">
        <Link
          href={`/papers/${encodeURIComponent(
            paper.openAlexId
          )}`}
          className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}