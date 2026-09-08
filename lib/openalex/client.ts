import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_PER_PAGE,
  DEFAULT_TIMEOUT_MS,
  MAX_PER_PAGE,
  OPENALEX_BASE_URL,
  RETRYABLE_STATUS_CODES,
} from "./constants";

import {
  OpenAlexConfigurationError,
  OpenAlexError,
  OpenAlexTimeoutError,
} from "./errors";

import type {
  OpenAlexSingleWorkResponse,
  OpenAlexUsage,
  OpenAlexWorksResponse,
} from "./types";

import {
  buildFilters,
  buildSort,
  type OpenAlexSearchParams,
} from "./queries";

interface OpenAlexResponseBody {
  meta?: {
    cost_usd?: number;
  };
  [key: string]: unknown;
}

function getApiKey(): string {
  const apiKey = process.env.OPENALEX_API_KEY;

  if (!apiKey) {
    throw new OpenAlexConfigurationError(
      "OPENALEX_API_KEY is not configured"
    );
  }

  return apiKey;
}

function extractUsage(
  response: Response,
  body: unknown
): OpenAlexUsage {
  const responseBody =
    typeof body === "object" && body !== null
      ? (body as OpenAlexResponseBody)
      : undefined;

  return {
    costUsd:
      typeof responseBody?.meta?.cost_usd === "number"
        ? responseBody.meta.cost_usd
        : null,

    rateLimitLimit:
      response.headers.get("X-RateLimit-Limit"),

    rateLimitRemaining:
      response.headers.get("X-RateLimit-Remaining"),

    rateLimitReset:
      response.headers.get("X-RateLimit-Reset"),

    creditsUsed:
      response.headers.get("X-RateLimit-Credits-Used"),
  };
}

function calculateBackoff(attempt: number): number {
  const baseDelay = 500;

  return baseDelay * Math.pow(2, attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function request<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  options?: {
    maxRetries?: number;
    timeoutMs?: number;
  }
): Promise<{
  data: T;
  usage: OpenAlexUsage;
}> {
  const apiKey = getApiKey();

  const maxRetries =
    options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  const timeoutMs =
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {
    const url = new URL(
      `${OPENALEX_BASE_URL}${path}`
    );

    url.searchParams.set("api_key", apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(
        url.toString(),
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
          cache: "no-store",
        }
      );

      clearTimeout(timeout);

      let body: unknown = null;

      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.ok) {
        return {
          data: body as T,
          usage: extractUsage(response, body),
        };
      }

      if (
        RETRYABLE_STATUS_CODES.has(response.status) &&
        attempt < maxRetries
      ) {
        const retryAfter =
          response.headers.get("Retry-After");

        const retryAfterSeconds = retryAfter
          ? Number(retryAfter)
          : NaN;

        const delay =
          Number.isFinite(retryAfterSeconds)
            ? retryAfterSeconds * 1000
            : calculateBackoff(attempt);

        await sleep(delay);

        continue;
      }

      throw new OpenAlexError(
        `OpenAlex request failed with status ${response.status}`,
        response.status,
        body
      );
    } catch (error) {
      clearTimeout(timeout);

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        lastError = new OpenAlexTimeoutError();

        if (attempt < maxRetries) {
          await sleep(calculateBackoff(attempt));
          continue;
        }

        throw lastError;
      }

      if (error instanceof OpenAlexError) {
        throw error;
      }

      lastError = error;

      if (attempt < maxRetries) {
        await sleep(calculateBackoff(attempt));
        continue;
      }
    }
  }

  throw (
    lastError ??
    new Error("OpenAlex request failed")
  );
}

export async function getWork(
  id: string
): Promise<{
  data: OpenAlexSingleWorkResponse;
  usage: OpenAlexUsage;
}> {
  const normalizedId = id
    .trim()
    .replace(
      /^https?:\/\/openalex\.org\//i,
      ""
    );

  return request<OpenAlexSingleWorkResponse>(
    `/works/${encodeURIComponent(normalizedId)}`
  );
}

export async function getWorkByDOI(
  doi: string
): Promise<{
  data: OpenAlexSingleWorkResponse;
  usage: OpenAlexUsage;
}> {
  const normalizedDoi = doi
    .trim()
    .replace(
      /^https?:\/\/doi\.org\//i,
      ""
    );

  return request<OpenAlexSingleWorkResponse>(
    `/works/https://doi.org/${encodeURIComponent(normalizedDoi)}`
  );
}

export async function searchWorks(
  params: OpenAlexSearchParams = {}
): Promise<{
  data: OpenAlexWorksResponse;
  usage: OpenAlexUsage;
}> {
  const perPage = Math.min(
    params.perPage ?? DEFAULT_PER_PAGE,
    MAX_PER_PAGE
  );

  const filters = buildFilters(
    params.filters
  );

  const sort = buildSort(
    params.sort,
    params.sortDirection
  );

  const select = params.select?.join(",");

  return request<OpenAlexWorksResponse>(
    "/works",
    {
      search: params.search,
      filter: filters,
      sort,
      page: params.cursor
        ? undefined
        : params.page,
      per_page: perPage,
      cursor: params.cursor,
      select,
    }
  );
}

export async function getWorksByPage(
  params: OpenAlexSearchParams
) {
  return searchWorks({
    ...params,
    cursor: undefined,
    page: params.page ?? 1,
    perPage: params.perPage ?? 100,
  });
}

export async function getWorksByCursor(
  params: OpenAlexSearchParams
) {
  return searchWorks({
    ...params,
    cursor: params.cursor ?? "*",
    page: undefined,
    perPage: params.perPage ?? 100,
  });
}