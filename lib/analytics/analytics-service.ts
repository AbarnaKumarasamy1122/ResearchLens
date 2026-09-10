import { prisma } from "@/lib/prisma";

export interface AnalyticsResult {
  job: {
    id: string;
    name: string;
    status:
      | "PENDING"
      | "RUNNING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED";
    createdAt: string;
    completedAt: string | null;
  };

  overview: {
    totalPapers: number;
    totalCitations: number;
    averageCitations: number;
    medianCitations: number;
    openAccessPercentage: number;
    openAccessPapers: number;
    retractedPapers: number;
  };

  papersByType: Array<{
    type: string;
    count: number;
  }>;

  papersByLanguage: Array<{
    language: string;
    count: number;
  }>;

  citationRanking: Array<{
    rank: number;
    openAlexId: string;
    title: string;
    year: number | null;
    citations: number;
    doi: string | null;
  }>;

  keywordFrequency: Array<{
    keyword: string;
    frequency: number;
  }>;

  topicFrequency: Array<{
    topic: string;
    frequency: number;
  }>;

  institutionDistribution: Array<{
    institution: string;
    papers: number;
  }>;

  countryDistribution: Array<{
    countryCode: string;
    country: string;
    papers: number;
  }>;

  publicationTrends: Array<{
    year: number;
    papers: number;
  }>;
}

function normalizeLabel(
  value: string | null | undefined,
  fallback: string,
) {
  const normalized =
    value?.trim();

  return normalized || fallback;
}

function getCountryName(
  countryCode: string,
) {
  try {
    const displayNames =
      new Intl.DisplayNames(
        ["en"],
        {
          type: "region",
        },
      );

    return (
      displayNames.of(
        countryCode.toUpperCase(),
      ) ??
      countryCode.toUpperCase()
    );
  } catch {
    return countryCode.toUpperCase();
  }
}

function calculateMedian(
  values: number[],
) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const middle =
    Math.floor(
      sorted.length / 2,
    );

  if (
    sorted.length % 2 ===
    0
  ) {
    return (
      (sorted[middle - 1] +
        sorted[middle]) /
      2
    );
  }

  return sorted[middle];
}

export async function getJobAnalytics(
  jobId: string,
): Promise<AnalyticsResult | null> {
  const job =
    await prisma.extractionJob.findUnique(
      {
        where: {
          id: jobId,
        },

        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          completedAt: true,

          works: {
            select: {
              work: {
                select: {
                  openAlexId: true,
                  doi: true,
                  title: true,
                  publicationYear: true,
                  type: true,
                  language: true,
                  citedByCount: true,
                  isOpenAccess: true,
                  isRetracted: true,

                  authors: {
                    select: {
                      author: {
                        select: {
                          institutions: {
                            select: {
                              institution: {
                                select: {
                                  displayName:
                                    true,
                                  countryCode:
                                    true,
                                  countryName:
                                    true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },

                  keywords: {
                    select: {
                      keyword: {
                        select: {
                          displayName: true,
                        },
                      },
                    },
                  },

                  topics: {
                    select: {
                      topic: {
                        select: {
                          displayName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

  if (!job) {
    return null;
  }

  const works =
    job.works.map(
      (item) => item.work,
    );

  /*
   * ---------------------------------------------------------
   * Overview
   * ---------------------------------------------------------
   */

  const citationValues =
    works.map(
      (work) =>
        Math.max(
          0,
          work.citedByCount ?? 0,
        ),
    );

  const totalPapers =
    works.length;

  const totalCitations =
    citationValues.reduce(
      (sum, value) =>
        sum + value,
      0,
    );

  const averageCitations =
    totalPapers > 0
      ? totalCitations /
        totalPapers
      : 0;

  const medianCitations =
    calculateMedian(
      citationValues,
    );

  const openAccessPapers =
    works.filter(
      (work) =>
        work.isOpenAccess === true,
    ).length;

  const retractedPapers =
    works.filter(
      (work) =>
        work.isRetracted === true,
    ).length;

  const openAccessPercentage =
    totalPapers > 0
      ? (openAccessPapers /
          totalPapers) *
        100
      : 0;

  /*
   * ---------------------------------------------------------
   * Papers by type
   * ---------------------------------------------------------
   */

  const typeCounts =
    new Map<
      string,
      number
    >();

  for (const work of works) {
    const type =
      normalizeLabel(
        work.type,
        "Unknown",
      );

    typeCounts.set(
      type,
      (typeCounts.get(type) ??
        0) + 1,
    );
  }

  const papersByType =
    Array.from(
      typeCounts.entries(),
    )
      .map(
        ([type, count]) => ({
          type,
          count,
        }),
      )
      .sort(
        (a, b) =>
          b.count - a.count,
      );

  /*
   * ---------------------------------------------------------
   * Papers by language
   * ---------------------------------------------------------
   */

  const languageCounts =
    new Map<
      string,
      number
    >();

  for (const work of works) {
    const language =
      normalizeLabel(
        work.language,
        "Unknown",
      );

    languageCounts.set(
      language,
      (languageCounts.get(
        language,
      ) ?? 0) + 1,
    );
  }

  const papersByLanguage =
    Array.from(
      languageCounts.entries(),
    )
      .map(
        ([language, count]) => ({
          language,
          count,
        }),
      )
      .sort(
        (a, b) =>
          b.count - a.count,
      );

  /*
   * ---------------------------------------------------------
   * Citation ranking
   * ---------------------------------------------------------
   */

  const citationRanking =
    [...works]
      .sort(
        (a, b) =>
          (b.citedByCount ?? 0) -
          (a.citedByCount ?? 0),
      )
      .slice(0, 50)
      .map(
        (work, index) => ({
          rank: index + 1,

          openAlexId:
            work.openAlexId,

          title:
            work.title,

          year:
            work.publicationYear,

          citations:
            work.citedByCount ?? 0,

          doi:
            work.doi,
        }),
      );

  /*
   * ---------------------------------------------------------
   * Keyword frequency
   *
   * A keyword is counted once per paper.
   * ---------------------------------------------------------
   */

  const keywordCounts =
    new Map<
      string,
      number
    >();

  for (const work of works) {
    const uniqueKeywords =
      new Set<string>();

    for (const relation of
      work.keywords) {
      const keyword =
        relation.keyword.displayName
          .trim();

      if (!keyword) {
        continue;
      }

      const normalized =
        keyword.toLowerCase();

      uniqueKeywords.add(
        normalized,
      );
    }

    for (const keyword of
      uniqueKeywords) {
      keywordCounts.set(
        keyword,
        (keywordCounts.get(
          keyword,
        ) ?? 0) + 1,
      );
    }
  }

  const keywordFrequency =
    Array.from(
      keywordCounts.entries(),
    )
      .map(
        ([keyword, frequency]) => ({
          keyword,
          frequency,
        }),
      )
      .sort(
        (a, b) =>
          b.frequency -
          a.frequency,
      )
      .slice(0, 50);

  /*
   * ---------------------------------------------------------
   * Topic frequency
   *
   * A topic is counted once per paper.
   * ---------------------------------------------------------
   */

  const topicCounts =
    new Map<
      string,
      number
    >();

  for (const work of works) {
    const uniqueTopics =
      new Set<string>();

    for (const relation of
      work.topics) {
      const topic =
        relation.topic.displayName
          .trim();

      if (!topic) {
        continue;
      }

      const normalized =
        topic.toLowerCase();

      uniqueTopics.add(
        normalized,
      );
    }

    for (const topic of
      uniqueTopics) {
      topicCounts.set(
        topic,
        (topicCounts.get(
          topic,
        ) ?? 0) + 1,
      );
    }
  }

  const topicFrequency =
    Array.from(
      topicCounts.entries(),
    )
      .map(
        ([topic, frequency]) => ({
          topic,
          frequency,
        }),
      )
      .sort(
        (a, b) =>
          b.frequency -
          a.frequency,
      )
      .slice(0, 50);

  /*
   * ---------------------------------------------------------
   * Institution distribution
   *
   * Count each institution once per paper.
   * ---------------------------------------------------------
   */

  const institutionCounts =
    new Map<
      string,
      number
    >();

  for (const work of works) {
    const institutions =
      new Set<string>();

    for (const workAuthor of
      work.authors) {
      for (const authorInstitution of
        workAuthor.author
          .institutions) {
        const institution =
          authorInstitution
            .institution
            .displayName
            .trim();

        if (institution) {
          institutions.add(
            institution,
          );
        }
      }
    }

    for (const institution of
      institutions) {
      institutionCounts.set(
        institution,
        (institutionCounts.get(
          institution,
        ) ?? 0) + 1,
      );
    }
  }

  const institutionDistribution =
    Array.from(
      institutionCounts.entries(),
    )
      .map(
        ([institution, papers]) => ({
          institution,
          papers,
        }),
      )
      .sort(
        (a, b) =>
          b.papers -
          a.papers,
      )
      .slice(0, 50);

  /*
   * ---------------------------------------------------------
   * Country distribution
   *
   * Count each country once per paper.
   * ---------------------------------------------------------
   */

  const countryCounts =
    new Map<
      string,
      number
    >();

  const countryNames =
    new Map<
      string,
      string
    >();

  for (const work of works) {
    const countries =
      new Set<string>();

    for (const workAuthor of
      work.authors) {
      for (const authorInstitution of
        workAuthor.author
          .institutions) {
        const institution =
          authorInstitution
            .institution;

        const countryCode =
          institution.countryCode
            ?.trim()
            .toUpperCase();

        if (!countryCode) {
          continue;
        }

        countries.add(
          countryCode,
        );

        if (
          !countryNames.has(
            countryCode,
          )
        ) {
          countryNames.set(
            countryCode,
            institution.countryName ??
              getCountryName(
                countryCode,
              ),
          );
        }
      }
    }

    for (const countryCode of
      countries) {
      countryCounts.set(
        countryCode,
        (countryCounts.get(
          countryCode,
        ) ?? 0) + 1,
      );
    }
  }

  const countryDistribution =
    Array.from(
      countryCounts.entries(),
    )
      .map(
        ([
          countryCode,
          papers,
        ]) => ({
          countryCode,
          country:
            countryNames.get(
              countryCode,
            ) ??
            getCountryName(
              countryCode,
            ),
          papers,
        }),
      )
      .sort(
        (a, b) =>
          b.papers -
          a.papers,
      )
      .slice(0, 50);

  /*
   * ---------------------------------------------------------
   * Publication trends
   * ---------------------------------------------------------
   */

  const publicationCounts =
    new Map<
      number,
      number
    >();

  for (const work of works) {
    const year =
      work.publicationYear;

    if (
      typeof year !==
      "number"
    ) {
      continue;
    }

    publicationCounts.set(
      year,
      (publicationCounts.get(
        year,
      ) ?? 0) + 1,
    );
  }

  const publicationTrends =
    Array.from(
      publicationCounts.entries(),
    )
      .map(
        ([year, papers]) => ({
          year,
          papers,
        }),
      )
      .sort(
        (a, b) =>
          a.year - b.year,
      );

  return {
    job: {
      id: job.id,
      name: job.name,
      status: job.status,
      createdAt:
        job.createdAt.toISOString(),
      completedAt:
        job.completedAt?.toISOString() ??
        null,
    },

    overview: {
      totalPapers,

      totalCitations,

      averageCitations:
        Number(
          averageCitations.toFixed(
            2,
          ),
        ),

      medianCitations:
        Number(
          medianCitations.toFixed(
            2,
          ),
        ),

      openAccessPercentage:
        Number(
          openAccessPercentage.toFixed(
            2,
          ),
        ),

      openAccessPapers,

      retractedPapers,
    },

    papersByType,

    papersByLanguage,

    citationRanking,

    keywordFrequency,

    topicFrequency,

    institutionDistribution,

    countryDistribution,

    publicationTrends,
  };
}