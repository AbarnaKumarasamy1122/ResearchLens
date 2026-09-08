export type OpenAlexSort =
  | "relevance_score"
  | "publication_date"
  | "cited_by_count"
  | "display_name";

export type SortDirection = "asc" | "desc";

export interface OpenAlexFilters {
  fromYear?: number;
  toYear?: number;

  type?: string;

  openAccess?: boolean;

  minCitations?: number;

  maxCitations?: number;

  language?: string;

  isRetracted?: boolean;

  doi?: string;

  openAlexId?: string;
}

export interface OpenAlexSearchParams {
  search?: string;

  filters?: OpenAlexFilters;

  sort?: OpenAlexSort;

  sortDirection?: SortDirection;

  page?: number;

  perPage?: number;

  cursor?: string;

  select?: string[];
}

export function buildFilters(filters?: OpenAlexFilters): string | undefined {
  if (!filters) {
    return undefined;
  }

  const result: string[] = [];

  if (filters.fromYear !== undefined) {
    result.push(`from_publication_date:${filters.fromYear}-01-01`);
  }

  if (filters.toYear !== undefined) {
    result.push(`to_publication_date:${filters.toYear}-12-31`);
  }

  if (filters.type) {
    result.push(`type:${filters.type}`);
  }

  if (filters.openAccess !== undefined) {
    result.push(`is_oa:${filters.openAccess}`);
  }

  if (filters.minCitations !== undefined) {
    result.push(`cited_by_count:>${filters.minCitations}`);
  }

  if (filters.maxCitations !== undefined) {
    result.push(`cited_by_count:<${filters.maxCitations}`);
  }

  if (filters.language) {
    result.push(`language:${filters.language}`);
  }

  if (filters.isRetracted !== undefined) {
    result.push(`is_retracted:${filters.isRetracted}`);
  }

  return result.length > 0 ? result.join(",") : undefined;
}

export function buildSort(
  sort?: OpenAlexSort,
  direction: SortDirection = "desc"
): string | undefined {
  if (!sort) {
    return undefined;
  }

  return `${sort}:${direction}`;
}