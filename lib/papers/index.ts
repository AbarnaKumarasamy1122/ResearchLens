export {
  papersQuerySchema,
} from "./schemas";

export type {
  PapersQuery,
} from "./schemas";

export {
  searchPapers,
} from "./search-service";

export {
  normalizeWork,
  normalizeWorks,
  deduplicateWorks,
} from "./normalizer";

export type {
  NormalizedPaper,
  NormalizedAuthor,
  NormalizedKeyword,
  NormalizedTopic,
  NormalizedLocation,
  NormalizedSource,
  PapersResponse,
  PapersPagination,
} from "./types";