import type {
  OpenAlexAuthor,
  OpenAlexAuthorship,
  OpenAlexInstitution,
  OpenAlexKeyword,
  OpenAlexLocation,
  OpenAlexSource,
  OpenAlexTopic,
  OpenAlexWork,
} from "@/lib/openalex/types";

import type {
  NormalizedAuthor,
  NormalizedKeyword,
  NormalizedLocation,
  NormalizedPaper,
  NormalizedSource,
  NormalizedTopic,
} from "./types";

function reconstructAbstract(
  invertedIndex?: Record<string, number[]> | null
): string | null {
  if (!invertedIndex) {
    return null;
  }

  const words: Array<{
    word: string;
    position: number;
  }> = [];

  for (const [word, positions] of Object.entries(
    invertedIndex
  )) {
    for (const position of positions) {
      words.push({
        word,
        position,
      });
    }
  }

  if (words.length === 0) {
    return null;
  }

  words.sort(
    (a, b) => a.position - b.position
  );

  return words
    .map((item) => item.word)
    .join(" ");
}

function normalizeInstitution(
  institution: OpenAlexInstitution
) {
  return {
    id: institution.id ?? null,

    name:
      institution.display_name ??
      "Unknown institution",

    ror: institution.ror ?? null,

    countryCode:
      institution.country_code ?? null,
  };
}

function normalizeAuthor(
  authorship: OpenAlexAuthorship
): NormalizedAuthor {
  const author: OpenAlexAuthor =
    authorship.author ?? {};

  const institutions =
    authorship.institutions ?? [];

  return {
    id: author.id ?? null,

    name:
      author.display_name ??
      "Unknown author",

    orcid: author.orcid ?? null,

    institutions: institutions.map(
      normalizeInstitution
    ),
  };
}

function normalizeKeyword(
  keyword: OpenAlexKeyword
): NormalizedKeyword {
  return {
    id: keyword.id ?? null,

    name:
      keyword.display_name ??
      "Unknown keyword",

    score:
      typeof keyword.score === "number"
        ? keyword.score
        : null,
  };
}

function normalizeTopic(
  topic: OpenAlexTopic
): NormalizedTopic {
  return {
    id: topic.id ?? null,

    name:
      topic.display_name ??
      "Unknown topic",

    score:
      typeof topic.score === "number"
        ? topic.score
        : null,

    subfield:
      topic.subfield?.display_name ??
      null,

    field:
      topic.field?.display_name ??
      null,

    domain:
      topic.domain?.display_name ??
      null,
  };
}

function normalizeLocation(
  location: OpenAlexLocation,
  isBest = false
): NormalizedLocation {
  return {
    landingPageUrl:
      location.landing_page_url ?? null,

    pdfUrl:
      location.pdf_url ?? null,

    isOpenAccess:
      location.is_oa ?? null,

    isBest,
  };
}

function normalizeSource(
  source?: OpenAlexSource | null
): NormalizedSource | null {
  if (!source) {
    return null;
  }

  return {
    id: source.id ?? null,

    name: source.display_name ?? null,

    issn:
      source.issn_l ??
      source.issn?.[0] ??
      null,

    type: source.type ?? null,
  };
}

export function normalizeWork(
  work: OpenAlexWork
): NormalizedPaper {
  const primaryLocation =
    work.primary_location ?? null;

  const bestLocation =
    work.best_oa_location ?? null;

  const locations: NormalizedLocation[] = [];

  if (primaryLocation) {
    locations.push(
      normalizeLocation(
        primaryLocation,
        false
      )
    );
  }

  for (const location of work.locations ?? []) {
    const alreadyExists = locations.some(
      (existing) =>
        existing.landingPageUrl ===
          (location.landing_page_url ?? null) &&
        existing.pdfUrl ===
          (location.pdf_url ?? null)
    );

    if (!alreadyExists) {
      locations.push(
        normalizeLocation(
          location,
          Boolean(
            bestLocation &&
              location.landing_page_url ===
                bestLocation.landing_page_url &&
              location.pdf_url ===
                bestLocation.pdf_url
          )
        )
      );
    }
  }

  if (
    bestLocation &&
    !locations.some(
      (location) =>
        location.landingPageUrl ===
          (bestLocation.landing_page_url ??
            null) &&
        location.pdfUrl ===
          (bestLocation.pdf_url ?? null)
    )
  ) {
    locations.push(
      normalizeLocation(
        bestLocation,
        true
      )
    );
  }

  return {
    id: work.id,

    openAlexId: work.id,

    doi: work.doi ?? null,

    title:
      work.display_name ??
      work.title ??
      "Untitled",

    publicationDate:
      work.publication_date ?? null,

    publicationYear:
      work.publication_year ?? null,

    type: work.type ?? null,

    language: work.language ?? null,

    abstract: reconstructAbstract(
      work.abstract_inverted_index
    ),

    citedByCount:
      work.cited_by_count ?? 0,

    isOpenAccess:
      work.open_access?.is_oa ??
      primaryLocation?.is_oa ??
      null,

    isRetracted:
      work.is_retracted ?? false,

    landingPageUrl:
      primaryLocation?.landing_page_url ??
      bestLocation?.landing_page_url ??
      null,

    pdfUrl:
      bestLocation?.pdf_url ??
      primaryLocation?.pdf_url ??
      null,

    source: normalizeSource(
      primaryLocation?.source
    ),

    authors:
      (work.authorships ?? []).map(
        normalizeAuthor
      ),

    keywords:
      (work.keywords ?? []).map(
        normalizeKeyword
      ),

    topics:
      (work.topics ?? []).map(
        normalizeTopic
      ),

    locations,
  };
}

export function normalizeWorks(
  works: OpenAlexWork[]
): NormalizedPaper[] {
  return works.map(normalizeWork);
}

export function deduplicateWorks(
  works: NormalizedPaper[]
): NormalizedPaper[] {
  const seen = new Set<string>();

  return works.filter((work) => {
    const normalizedDoi = work.doi
      ?.trim()
      .toLowerCase()
      .replace(
        /^https?:\/\/doi\.org\//,
        ""
      );

    const key =
      normalizedDoi ||
      work.openAlexId
        .trim()
        .toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}