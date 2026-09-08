export const OPENALEX_BASE_URL =
  "https://api.openalex.org";

export const DEFAULT_PER_PAGE = 25;

export const MAX_PER_PAGE = 100;

export const DEFAULT_TIMEOUT_MS = 15_000;

export const DEFAULT_MAX_RETRIES = 3;

export const RETRYABLE_STATUS_CODES = new Set([
  408,
  429,
  500,
  502,
  503,
  504,
]);