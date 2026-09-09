"use client";

interface PaginationProps {
  page: number;
  totalResults: number | null;
  perPage: number;
  onPageChange: (
    page: number
  ) => void;
}

export default function Pagination({
  page,
  totalResults,
  perPage,
  onPageChange,
}: PaginationProps) {
  const totalPages =
    totalResults !== null
      ? Math.ceil(
          totalResults / perPage
        )
      : null;

  const canGoPrevious =
    page > 1;

  const canGoNext =
    totalPages !== null
      ? page < totalPages
      : true;

  return (
    <div className="flex items-center justify-between border-t pt-5">
      <button
        type="button"
        disabled={!canGoPrevious}
        onClick={() =>
          onPageChange(page - 1)
        }
        className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Previous
      </button>

      <span className="text-sm text-gray-600">
        Page {page}
        {totalPages !== null &&
          ` of ${totalPages}`}
      </span>

      <button
        type="button"
        disabled={!canGoNext}
        onClick={() =>
          onPageChange(page + 1)
        }
        className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}