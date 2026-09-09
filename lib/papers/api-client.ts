import type {
  NormalizedPaper, PapersResponse,
} from "./types";

export interface SearchPapersParams {
  search?: string;

  fromYear?: number;

  toYear?: number;

  type?: string;

  openAccess?: boolean;

  minCitations?: number;

  maxCitations?: number;

  language?: string;

  isRetracted?: boolean;

  sort?:
    | "relevance_score"
    | "publication_date"
    | "cited_by_count"
    | "display_name";

  sortDirection?:
    | "asc"
    | "desc";

  page?: number;

  perPage?: number;

  cursor?: string;
}

function buildQuery(
  params: SearchPapersParams,
) {
  const searchParams =
    new URLSearchParams();

  const normalizedSearch =
    params.search?.trim();

  if (normalizedSearch) {
    searchParams.set(
      "search",
      normalizedSearch,
    );
  }

  if (
    params.fromYear !==
    undefined
  ) {
    searchParams.set(
      "fromYear",
      String(
        params.fromYear,
      ),
    );
  }

  if (
    params.toYear !==
    undefined
  ) {
    searchParams.set(
      "toYear",
      String(
        params.toYear,
      ),
    );
  }

  if (params.type) {
    searchParams.set(
      "type",
      params.type,
    );
  }

  if (
    params.openAccess !==
    undefined
  ) {
    searchParams.set(
      "openAccess",
      String(
        params.openAccess,
      ),
    );
  }

  if (
    params.minCitations !==
    undefined
  ) {
    searchParams.set(
      "minCitations",
      String(
        params.minCitations,
      ),
    );
  }

  if (
    params.maxCitations !==
    undefined
  ) {
    searchParams.set(
      "maxCitations",
      String(
        params.maxCitations,
      ),
    );
  }

  if (params.language) {
    searchParams.set(
      "language",
      params.language,
    );
  }

  if (
    params.isRetracted !==
    undefined
  ) {
    searchParams.set(
      "isRetracted",
      String(
        params.isRetracted,
      ),
    );
  }

  /*
   * OpenAlex requires a search query
   * when using relevance_score.
   *
   * If no search exists, use
   * publication_date instead.
   */
  const effectiveSort =
    params.sort ===
      "relevance_score" &&
    !normalizedSearch
      ? "publication_date"
      : params.sort;

  if (effectiveSort) {
    searchParams.set(
      "sort",
      effectiveSort,
    );
  }

  if (
    params.sortDirection
  ) {
    searchParams.set(
      "sortDirection",
      params.sortDirection,
    );
  }

  if (
    params.page !==
    undefined
  ) {
    searchParams.set(
      "page",
      String(
        params.page,
      ),
    );
  }

  if (
    params.perPage !==
    undefined
  ) {
    searchParams.set(
      "perPage",
      String(
        params.perPage,
      ),
    );
  }

  if (params.cursor) {
    searchParams.set(
      "cursor",
      params.cursor,
    );
  }

  return searchParams.toString();
}

export async function fetchPapers(
  params: SearchPapersParams,
): Promise<PapersResponse> {
  const query =
    buildQuery(params);

  const response =
    await fetch(
      `/api/papers?${query}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

  let body: unknown;

  try {
    body =
      await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      typeof body ===
        "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message ===
        "string"
        ? body.message
        : "Failed to fetch papers";

    throw new Error(
      message,
    );
  }

  return body as PapersResponse;
}

export interface PaperResponse {
  success: boolean;
  data: NormalizedPaper;
  meta?: {
    source: string;
    lookupType?: string;
    usage?: {
      costUsd: number | null;
      rateLimitLimit: string | null;
      rateLimitRemaining: string | null;
      rateLimitReset: string | null;
      creditsUsed: string | null;
    };
  };
}

async function parseApiResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return fallback;
}

export async function fetchPaperById(
  openAlexId: string,
): Promise<PaperResponse> {
  const response = await fetch(
    `/api/papers/${encodeURIComponent(openAlexId)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const body = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(body, "Failed to fetch paper"),
    );
  }

  return body as PaperResponse;
}

export async function lookupPaper(params: {
  doi?: string;
  openAlexId?: string;
}): Promise<PaperResponse> {
  const searchParams = new URLSearchParams();

  if (params.doi?.trim()) {
    searchParams.set("doi", params.doi.trim());
  }

  if (params.openAlexId?.trim()) {
    searchParams.set("openAlexId", params.openAlexId.trim());
  }

  const response = await fetch(
    `/api/papers/lookup?${searchParams.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const body = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(body, "Paper lookup failed"),
    );
  }

  return body as PaperResponse;
}