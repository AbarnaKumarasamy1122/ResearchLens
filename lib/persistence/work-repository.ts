import { Prisma } from "@/src/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  NormalizedAuthor,
  NormalizedPaper,
} from "@/lib/papers/types";

const MAX_TRANSACTION_RETRIES = 3;

function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function upsertAuthor(
  tx: Prisma.TransactionClient,
  author: NormalizedAuthor
) {
  if (!author.id) {
    return null;
  }

  const savedAuthor = await tx.author.upsert({
    where: {
      openAlexId: author.id,
    },
    update: {
      displayName: author.name,
      orcid: author.orcid,
    },
    create: {
      openAlexId: author.id,
      displayName: author.name,
      orcid: author.orcid,
    },
  });

  for (const institution of author.institutions) {
    if (!institution.id) {
      continue;
    }

    const savedInstitution = await tx.institution.upsert({
      where: {
        openAlexId: institution.id,
      },
      update: {
        displayName: institution.name,
        ror: institution.ror,
        countryCode: institution.countryCode,
      },
      create: {
        openAlexId: institution.id,
        displayName: institution.name,
        ror: institution.ror,
        countryCode: institution.countryCode,
      },
    });

    await tx.authorInstitution.upsert({
      where: {
        authorId_institutionId: {
          authorId: savedAuthor.id,
          institutionId: savedInstitution.id,
        },
      },
      update: {},
      create: {
        authorId: savedAuthor.id,
        institutionId: savedInstitution.id,
      },
    });
  }

  return savedAuthor;
}

async function upsertSource(
  tx: Prisma.TransactionClient,
  source: NormalizedPaper["source"]
) {
  if (!source?.id) {
    return null;
  }

  return tx.source.upsert({
    where: {
      openAlexId: source.id,
    },
    update: {
      displayName: source.name ?? "Unknown source",
      issn: source.issn,
      type: source.type,
    },
    create: {
      openAlexId: source.id,
      displayName: source.name ?? "Unknown source",
      issn: source.issn,
      type: source.type,
    },
  });
}

async function upsertKeyword(
  tx: Prisma.TransactionClient,
  keyword: NormalizedPaper["keywords"][number]
) {
  if (!keyword.name) {
    return null;
  }

  return tx.keyword.upsert({
    where: {
      displayName: keyword.name,
    },
    update: {
      score: keyword.score,
    },
    create: {
      displayName: keyword.name,
      score: keyword.score,
    },
  });
}

async function upsertTopic(
  tx: Prisma.TransactionClient,
  topic: NormalizedPaper["topics"][number]
) {
  if (!topic.id) {
    return null;
  }

  return tx.topic.upsert({
    where: {
      openAlexId: topic.id,
    },
    update: {
      displayName: topic.name,
      score: topic.score,
      subfield: topic.subfield,
      field: topic.field,
      domain: topic.domain,
    },
    create: {
      openAlexId: topic.id,
      displayName: topic.name,
      score: topic.score,
      subfield: topic.subfield,
      field: topic.field,
      domain: topic.domain,
    },
  });
}

export async function persistPaper(
  paper: NormalizedPaper
) {
  for (
    let attempt = 1;
    attempt <= MAX_TRANSACTION_RETRIES;
    attempt++
  ) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          /*
           * Source
           */

          const source = await upsertSource(
            tx,
            paper.source
          );

          /*
           * Publication date
           */

          const publicationDate =
            paper.publicationDate
              ? new Date(paper.publicationDate)
              : null;

          /*
           * Work
           */

          const work = await tx.work.upsert({
            where: {
              openAlexId: paper.openAlexId,
            },
            update: {
              doi: paper.doi,
              title: paper.title,
              publicationDate,
              publicationYear:
                paper.publicationYear,
              type: paper.type,
              language: paper.language,
              abstract: paper.abstract,
              citedByCount:
                paper.citedByCount,
              isOpenAccess:
                paper.isOpenAccess,
              isRetracted:
                paper.isRetracted,
              landingPageUrl:
                paper.landingPageUrl,
              pdfUrl: paper.pdfUrl,
              sourceId:
                source?.id ?? null,
            },
            create: {
              openAlexId: paper.openAlexId,
              doi: paper.doi,
              title: paper.title,
              publicationDate,
              publicationYear:
                paper.publicationYear,
              type: paper.type,
              language: paper.language,
              abstract: paper.abstract,
              citedByCount:
                paper.citedByCount,
              isOpenAccess:
                paper.isOpenAccess,
              isRetracted:
                paper.isRetracted,
              landingPageUrl:
                paper.landingPageUrl,
              pdfUrl: paper.pdfUrl,
              sourceId:
                source?.id ?? null,
            },
          });

          /*
           * Replace existing relationships.
           *
           * This keeps the database synchronized with the
           * latest normalized OpenAlex data.
           */

          await tx.workAuthor.deleteMany({
            where: {
              workId: work.id,
            },
          });

          await tx.workKeyword.deleteMany({
            where: {
              workId: work.id,
            },
          });

          await tx.workTopic.deleteMany({
            where: {
              workId: work.id,
            },
          });

          await tx.workLocation.deleteMany({
            where: {
              workId: work.id,
            },
          });

          /*
           * Authors
           */

          for (
            let index = 0;
            index < paper.authors.length;
            index++
          ) {
            const author =
              paper.authors[index];

            const savedAuthor =
              await upsertAuthor(
                tx,
                author
              );

            if (!savedAuthor) {
              continue;
            }

            await tx.workAuthor.create({
              data: {
                workId: work.id,
                authorId:
                  savedAuthor.id,
                authorPosition:
                  index + 1,
              },
            });
          }

          /*
           * Keywords
           */

          for (const keyword of paper.keywords) {
            const savedKeyword =
              await upsertKeyword(
                tx,
                keyword
              );

            if (!savedKeyword) {
              continue;
            }

            await tx.workKeyword.create({
              data: {
                workId: work.id,
                keywordId:
                  savedKeyword.id,
              },
            });
          }

          /*
           * Topics
           */

          for (const topic of paper.topics) {
            const savedTopic =
              await upsertTopic(
                tx,
                topic
              );

            if (!savedTopic) {
              continue;
            }

            await tx.workTopic.create({
              data: {
                workId: work.id,
                topicId:
                  savedTopic.id,
              },
            });
          }

          /*
           * Locations
           */

          for (const location of paper.locations) {
            await tx.workLocation.create({
              data: {
                workId: work.id,
                landingPageUrl:
                  location.landingPageUrl,
                pdfUrl:
                  location.pdfUrl,
                isBest:
                  location.isBest,
                isOpenAccess:
                  location.isOpenAccess,
              },
            });
          }

          return work;
        },
        {
          maxWait: 10_000,
          timeout: 30_000,
        }
      );

      return result;
    } catch (error) {
      const shouldRetry =
        isRetryableTransactionError(error) &&
        attempt < MAX_TRANSACTION_RETRIES;

      if (!shouldRetry) {
        throw error;
      }

      const delay = 500 * attempt;

      console.warn(
        `Transaction conflict while persisting ` +
          `${paper.openAlexId}. ` +
          `Retrying (${attempt}/${MAX_TRANSACTION_RETRIES}) ` +
          `in ${delay}ms...`
      );

      await wait(delay);
    }
  }

  throw new Error(
    `Failed to persist paper ${paper.openAlexId}`
  );
}

export async function persistPapers(
  papers: NormalizedPaper[]
) {
  let savedCount = 0;
  let failedCount = 0;

  const errors: Array<{
    openAlexId: string;
    message: string;
  }> = [];

  for (const paper of papers) {
    try {
      await persistPaper(paper);

      savedCount++;
    } catch (error) {
      failedCount++;

      errors.push({
        openAlexId: paper.openAlexId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown persistence error",
      });
    }
  }

  return {
    savedCount,
    failedCount,
    errors,
  };
}