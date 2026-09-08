export interface OpenAlexMeta {
  count?: number;
  db_response_time_ms?: number;
  page?: number;
  per_page?: number;
  next_cursor?: string | null;
  cost_usd?: number;
}

export interface OpenAlexIds {
  openalex?: string;
  doi?: string;
  mag?: string | null;
  pmid?: string | null;
  pmcid?: string | null;
}

export interface OpenAlexAuthor {
  id?: string;
  display_name?: string;
  orcid?: string | null;
}

export interface OpenAlexInstitution {
  id?: string;
  display_name?: string;
  ror?: string | null;
  country_code?: string | null;
  type?: string | null;
}

export interface OpenAlexAuthorship {
  author?: OpenAlexAuthor | null;
  author_position?: string | null;
  institutions?: OpenAlexInstitution[];
  countries?: string[];
  is_corresponding?: boolean;
}

export interface OpenAlexSource {
  id?: string;
  display_name?: string;
  issn_l?: string | null;
  issn?: string[];
  type?: string | null;
}

export interface OpenAlexTopic {
  id?: string;
  display_name?: string;
  score?: number;
  subfield?: {
    id?: string;
    display_name?: string;
  } | null;
  field?: {
    id?: string;
    display_name?: string;
  } | null;
  domain?: {
    id?: string;
    display_name?: string;
  } | null;
}

export interface OpenAlexKeyword {
  id?: string;
  display_name?: string;
  score?: number;
}

export interface OpenAlexLocation {
  is_oa?: boolean;
  landing_page_url?: string | null;
  pdf_url?: string | null;

  source?: OpenAlexSource | null;

  license?: string | null;
  version?: string | null;
}

export interface OpenAlexWork {
  id: string;

  doi?: string | null;

  title?: string | null;

  display_name?: string | null;

  publication_date?: string | null;

  publication_year?: number | null;

  type?: string | null;

  language?: string | null;

  ids?: OpenAlexIds;

  authorships?: OpenAlexAuthorship[];

  primary_location?: OpenAlexLocation | null;

  locations?: OpenAlexLocation[];

  topics?: OpenAlexTopic[];

  keywords?: OpenAlexKeyword[];

  abstract_inverted_index?: Record<string, number[]> | null;

  cited_by_count?: number;

  is_retracted?: boolean;

  open_access?: {
    is_oa?: boolean;
    oa_status?: string | null;
    oa_url?: string | null;
  } | null;

  best_oa_location?: OpenAlexLocation | null;

  primary_topic?: OpenAlexTopic | null;

  referenced_works_count?: number;

  related_works?: string[];

  created_date?: string | null;

  updated_date?: string | null;
}

export interface OpenAlexWorksResponse {
  meta?: OpenAlexMeta;
  results: OpenAlexWork[];
}

export type OpenAlexSingleWorkResponse = OpenAlexWork;

export interface OpenAlexUsage {
  costUsd: number | null;
  rateLimitLimit: string | null;
  rateLimitRemaining: string | null;
  rateLimitReset: string | null;
  creditsUsed: string | null;
}