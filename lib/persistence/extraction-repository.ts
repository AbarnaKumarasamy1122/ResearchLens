import { prisma } from "@/lib/prisma";

export async function createExtractionJob(
  name: string,
  query?: string
) {
  return prisma.extractionJob.create({
    data: {
      name,
      query,
      status: "PENDING",
    },
  });
}

export async function startExtractionJob(
  jobId: string
) {
  return prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function completeExtractionJob(
  jobId: string,
  data: {
    totalResults: number;
    processedResults: number;
    failedResults: number;
    duplicateCount: number;
  }
) {
  return prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      totalResults: data.totalResults,
      processedResults:
        data.processedResults,
      failedResults:
        data.failedResults,
      duplicateCount:
        data.duplicateCount,
      completedAt: new Date(),
    },
  });
}

export async function failExtractionJob(
  jobId: string,
  errorMessage: string
) {
  return prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt: new Date(),
    },
  });
}

export async function attachWorkToExtraction(
  extractionJobId: string,
  workId: string
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

export async function getExtractionJob(
  jobId: string
) {
  return prisma.extractionJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      works: {
        include: {
          work: true,
        },
      },
    },
  });
}