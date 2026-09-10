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

/**
 * Atomically transition a job from PENDING -> RUNNING.
 *
 * If another processor already started the job, or the job was
 * cancelled before processing began, this returns null.
 */
export async function startExtractionJob(jobId: string) {
  const result = await prisma.extractionJob.updateMany({
    where: {
      id: jobId,
      status: "PENDING",
    },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      errorMessage: null,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
  });
}

/**
 * Update progress only while the job is still active.
 */
export async function updateExtractionProgress(
  jobId: string,
  params: {
    totalResults?: number;
    processedResults?: number;
    failedResults?: number;
    duplicateCount?: number;
  },
) {
  const result = await prisma.extractionJob.updateMany({
    where: {
      id: jobId,
      status: {
        in: ["PENDING", "RUNNING"],
      },
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

  if (result.count === 0) {
    return null;
  }

  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
  });
}

/**
 * Complete only a currently RUNNING job.
 *
 * This prevents a concurrent cancellation from being overwritten
 * by COMPLETED.
 */
export async function completeExtractionJob(jobId: string) {
  const result = await prisma.extractionJob.updateMany({
    where: {
      id: jobId,
      status: "RUNNING",
    },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
  });
}

/**
 * Fail only an active job.
 *
 * CANCELLED jobs cannot be overwritten by FAILED.
 */
export async function failExtractionJob(
  jobId: string,
  errorMessage: string,
) {
  const result = await prisma.extractionJob.updateMany({
    where: {
      id: jobId,
      status: {
        in: ["PENDING", "RUNNING"],
      },
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage,
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
  });
}

/**
 * Cancel only an active job.
 *
 * This is intentionally conditional so that two cancellation requests
 * cannot produce an invalid state.
 */
export async function cancelExtractionJob(jobId: string) {
  const result = await prisma.extractionJob.updateMany({
    where: {
      id: jobId,
      status: {
        in: ["PENDING", "RUNNING"],
      },
    },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
  });
}

/**
 * Check whether an extraction job has been cancelled.
 */
export async function isExtractionJobCancelled(
  jobId: string,
) {
  const job = await prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
    select: {
      status: true,
    },
  });

  if (!job) {
    return false;
  }

  return job.status === "CANCELLED";
}

/**
 * Get only the status of a job.
 */
export async function getExtractionJobStatus(
  jobId: string,
) {
  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
    select: {
      id: true,
      status: true,
    },
  });
}

/**
 * Attach a persisted Work to an extraction job.
 */
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

/**
 * Retrieve a complete extraction job including its papers.
 */
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

/**
 * List recent extraction jobs for the history screen.
 */
export async function listExtractionJobs(limit = 20) {
  return prisma.extractionJob.findMany({
    orderBy: {
      createdAt: "desc",
    },

    take: Math.min(
      Math.max(limit, 1),
      100,
    ),

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

      _count: {
        select: {
          works: true,
        },
      },
    },
  });
}

/**
 * Delete a terminal extraction job.
 *
 * The API layer already prevents deletion of active jobs.
 * This repository function also protects against deleting an active
 * job if called from another server-side location.
 */
export async function deleteExtractionJob(
  jobId: string,
) {
  const result = await prisma.extractionJob.deleteMany({
    where: {
      id: jobId,
      status: {
        in: [
          "COMPLETED",
          "FAILED",
          "CANCELLED",
        ],
      },
    },
  });

  if (result.count === 0) {
    return null;
  }

  return {
    id: jobId,
  };
}