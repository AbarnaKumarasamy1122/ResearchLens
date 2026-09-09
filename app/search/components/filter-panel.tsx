"use client";

interface FilterPanelProps {
  fromYear: number;
  toYear: number;
  type: string;
  openAccess: boolean | undefined;
  minCitations: number | undefined;
  maxCitations: number | undefined;
  sort:
    | "relevance_score"
    | "publication_date"
    | "cited_by_count"
    | "display_name";
  sortDirection: "asc" | "desc";
  onChange: (
    values: {
      fromYear?: number;
      toYear?: number;
      type?: string;
      openAccess?: boolean;
      minCitations?: number;
      maxCitations?: number;
      sort?:
        | "relevance_score"
        | "publication_date"
        | "cited_by_count"
        | "display_name";
      sortDirection?: "asc" | "desc";
    }
  ) => void;
}

export default function FilterPanel({
  fromYear,
  toYear,
  type,
  openAccess,
  minCitations,
  maxCitations,
  sort,
  sortDirection,
  onChange,
}: FilterPanelProps) {
  return (
    <div className="grid gap-4 rounded-xl border bg-gray-50 p-5 md:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1">
        <span className="text-sm font-medium">
          From year
        </span>

        <input
          type="number"
          value={fromYear}
          onChange={(event) =>
            onChange({
              fromYear: Number(
                event.target.value
              ),
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        />
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">
          To year
        </span>

        <input
          type="number"
          value={toYear}
          onChange={(event) =>
            onChange({
              toYear: Number(
                event.target.value
              ),
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        />
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">
          Type
        </span>

        <select
          value={type}
          onChange={(event) =>
            onChange({
              type: event.target.value,
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        >
          <option value="">
            All types
          </option>
          <option value="article">
            Article
          </option>
          <option value="review">
            Review
          </option>
          <option value="book-chapter">
            Book Chapter
          </option>
          <option value="dataset">
            Dataset
          </option>
          <option value="preprint">
            Preprint
          </option>
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">
          Citations minimum
        </span>

        <input
          type="number"
          min="0"
          value={minCitations ?? ""}
          onChange={(event) =>
            onChange({
              minCitations:
                event.target.value
                  ? Number(
                      event.target.value
                    )
                  : undefined,
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        />
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">
          Citations maximum
        </span>

        <input
          type="number"
          min="0"
          value={maxCitations ?? ""}
          onChange={(event) =>
            onChange({
              maxCitations:
                event.target.value
                  ? Number(
                      event.target.value
                    )
                  : undefined,
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-3 pt-6">
        <input
          type="checkbox"
          checked={openAccess === true}
          onChange={(event) =>
            onChange({
              openAccess:
                event.target.checked
                  ? true
                  : undefined,
            })
          }
        />

        <span className="text-sm font-medium">
          Open access only
        </span>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">
          Sort
        </span>

        <select
          value={sort}
          onChange={(event) =>
            onChange({
              sort:
                event.target
                  .value as FilterPanelProps["sort"],
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        >
          <option value="relevance_score">
            Relevance
          </option>
          <option value="publication_date">
            Publication date
          </option>
          <option value="cited_by_count">
            Citations
          </option>
          <option value="display_name">
            Title
          </option>
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium">
          Direction
        </span>

        <select
          value={sortDirection}
          onChange={(event) =>
            onChange({
              sortDirection:
                event.target
                  .value as "asc" | "desc",
            })
          }
          className="w-full rounded-lg border bg-white px-3 py-2"
        >
          <option value="desc">
            Descending
          </option>
          <option value="asc">
            Ascending
          </option>
        </select>
      </label>
    </div>
  );
}