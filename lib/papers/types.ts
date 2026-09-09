export interface NormalizedAuthor {
  id: string | null;
  name: string;
  orcid: string | null;
  institutions: Array<{
    id: string | null;
    name: string;
    ror: string | null;
    countryCode: string | null;
  }>;
}

export interface NormalizedKeyword {
  id: string | null;
  name: string;
  score: number | null;
}

export interface NormalizedTopic {
  id: string | null;
  name: string;
  score: number | null;
  subfield: string | null;
  field: string | null;
  domain: string | null;
}

export interface NormalizedLocation {
  landingPageUrl: string | null;
  pdfUrl: string | null;
  isOpenAccess: boolean | null;
  isBest: boolean;
}

export interface NormalizedSource {
  id: string | null;
  name: string | null;
  issn: string | null;
  type: string | null;
}

export interface NormalizedPaper {
  id: string;
  openAlexId: string;
  doi: string | null;

  title: string;

  publicationDate: string | null;
  publicationYear: number | null;

  type: string | null;
  language: string | null;

  abstract: string | null;

  citedByCount: number;

  isOpenAccess: boolean | null;
  isRetracted: boolean;

  landingPageUrl: string | null;
  pdfUrl: string | null;

  source: NormalizedSource | null;

  authors: NormalizedAuthor[];

  keywords: NormalizedKeyword[];

  topics: NormalizedTopic[];

  locations: NormalizedLocation[];
}

export interface PapersPagination {
  page: number | null;
  perPage: number;

  currentCursor: string | null;
  nextCursor: string | null;

  totalResults: number | null;

  mode: "page" | "cursor";
}

export interface PapersResponse {
  success: true;

  data: NormalizedPaper[];

  pagination: PapersPagination;

  meta: {
    source: "openalex";
    usage: {
      costUsd: number | null;
      rateLimitLimit: string | null;
      rateLimitRemaining: string | null;
      rateLimitReset: string | null;
      creditsUsed: string | null;
    };
  };
}