import { prisma } from "@/lib/prisma";

export async function createExtractionJob(params: {
  name: string;
  query?: string;
}) {
  return prisma.extractionJob.create({
    data: {
      name: params.name,
      query: params.query,
      status: "PENDING",
    },
  });
}

export async function startExtractionJob(jobId: string) {
  return prisma.extractionJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function updateExtractionProgress(
  jobId: string,
  params: {
    totalResults?: number;
    processedResults?: number;
    failedResults?: number;
    duplicateCount?: number;
  },
) {
  return prisma.extractionJob.update({
    where: {
      id: jobId,
    },
    data: {
      ...(params.totalResults !== undefined && {
        totalResults: params.totalResults,
      }),
      ...(params.processedResults !== undefined && {
        processedResults: params.processedResults,
      }),
      ...(params.failedResults !== undefined && {
        failedResults: params.failedResults,
      }),
      ...(params.duplicateCount !== undefined && {
        duplicateCount: params.duplicateCount,
      }),
    },
  });
}

export async function completeExtractionJob(jobId: string) {
  return prisma.extractionJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
}

export async function failExtractionJob(
  jobId: string,
  errorMessage: string,
) {
  return prisma.extractionJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage,
    },
  });
}

export async function cancelExtractionJob(jobId: string) {
  return prisma.extractionJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });
}

export async function attachWorkToExtraction(
  extractionJobId: string,
  workId: string,
) {
  return prisma.extractionJobWork.upsert({
    where: {
      extractionJobId_workId: {
        extractionJobId,
        workId,
      },
    },
    update: {},
    create: {
      extractionJobId,
      workId,
    },
  });
}

export async function getExtractionJob(jobId: string) {
  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      works: {
        include: {
          work: {
            include: {
              authors: {
                include: {
                  author: {
                    include: {
                      institutions: {
                        include: {
                          institution: true,
                        },
                      },
                    },
                  },
                },
              },
              keywords: {
                include: {
                  keyword: true,
                },
              },
              topics: {
                include: {
                  topic: true,
                },
              },
              locations: true,
              source: true,
            },
          },
        },
      },
    },
  });
}

export async function listExtractionJobs(limit = 20) {
  return prisma.extractionJob.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      name: true,
      query: true,
      status: true,
      totalResults: true,
      processedResults: true,
      failedResults: true,
      duplicateCount: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}