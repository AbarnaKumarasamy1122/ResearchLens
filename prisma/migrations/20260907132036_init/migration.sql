-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "openAlexId" TEXT NOT NULL,
    "doi" TEXT,
    "title" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3),
    "publicationYear" INTEGER,
    "type" TEXT,
    "language" TEXT,
    "abstract" TEXT,
    "citedByCount" INTEGER NOT NULL DEFAULT 0,
    "isOpenAccess" BOOLEAN,
    "isRetracted" BOOLEAN,
    "landingPageUrl" TEXT,
    "pdfUrl" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "openAlexId" TEXT NOT NULL,
    "orcid" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "openAlexId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ror" TEXT,
    "countryCode" TEXT,
    "countryName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAuthor" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorPosition" INTEGER,

    CONSTRAINT "WorkAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorInstitution" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "AuthorInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "openAlexId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "issn" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkKeyword" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,

    CONSTRAINT "WorkKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "openAlexId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "subfield" TEXT,
    "field" TEXT,
    "domain" TEXT,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTopic" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "WorkTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLocation" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "landingPageUrl" TEXT,
    "pdfUrl" TEXT,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "isOpenAccess" BOOLEAN,

    CONSTRAINT "WorkLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "processedResults" INTEGER NOT NULL DEFAULT 0,
    "failedResults" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionJobWork" (
    "id" TEXT NOT NULL,
    "extractionJobId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionJobWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Work_openAlexId_key" ON "Work"("openAlexId");

-- CreateIndex
CREATE UNIQUE INDEX "Work_doi_key" ON "Work"("doi");

-- CreateIndex
CREATE INDEX "Work_publicationYear_idx" ON "Work"("publicationYear");

-- CreateIndex
CREATE INDEX "Work_type_idx" ON "Work"("type");

-- CreateIndex
CREATE INDEX "Work_citedByCount_idx" ON "Work"("citedByCount");

-- CreateIndex
CREATE INDEX "Work_isOpenAccess_idx" ON "Work"("isOpenAccess");

-- CreateIndex
CREATE INDEX "Work_isRetracted_idx" ON "Work"("isRetracted");

-- CreateIndex
CREATE UNIQUE INDEX "Author_openAlexId_key" ON "Author"("openAlexId");

-- CreateIndex
CREATE INDEX "Author_displayName_idx" ON "Author"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_openAlexId_key" ON "Institution"("openAlexId");

-- CreateIndex
CREATE INDEX "Institution_countryCode_idx" ON "Institution"("countryCode");

-- CreateIndex
CREATE INDEX "WorkAuthor_authorId_idx" ON "WorkAuthor"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkAuthor_workId_authorId_key" ON "WorkAuthor"("workId", "authorId");

-- CreateIndex
CREATE INDEX "AuthorInstitution_institutionId_idx" ON "AuthorInstitution"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorInstitution_authorId_institutionId_key" ON "AuthorInstitution"("authorId", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_openAlexId_key" ON "Source"("openAlexId");

-- CreateIndex
CREATE INDEX "Source_displayName_idx" ON "Source"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_displayName_key" ON "Keyword"("displayName");

-- CreateIndex
CREATE INDEX "WorkKeyword_keywordId_idx" ON "WorkKeyword"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkKeyword_workId_keywordId_key" ON "WorkKeyword"("workId", "keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_openAlexId_key" ON "Topic"("openAlexId");

-- CreateIndex
CREATE INDEX "WorkTopic_topicId_idx" ON "WorkTopic"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkTopic_workId_topicId_key" ON "WorkTopic"("workId", "topicId");

-- CreateIndex
CREATE INDEX "WorkLocation_workId_idx" ON "WorkLocation"("workId");

-- CreateIndex
CREATE INDEX "ExtractionJob_status_idx" ON "ExtractionJob"("status");

-- CreateIndex
CREATE INDEX "ExtractionJob_createdAt_idx" ON "ExtractionJob"("createdAt");

-- CreateIndex
CREATE INDEX "ExtractionJobWork_workId_idx" ON "ExtractionJobWork"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionJobWork_extractionJobId_workId_key" ON "ExtractionJobWork"("extractionJobId", "workId");

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAuthor" ADD CONSTRAINT "WorkAuthor_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAuthor" ADD CONSTRAINT "WorkAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorInstitution" ADD CONSTRAINT "AuthorInstitution_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorInstitution" ADD CONSTRAINT "AuthorInstitution_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkKeyword" ADD CONSTRAINT "WorkKeyword_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkKeyword" ADD CONSTRAINT "WorkKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTopic" ADD CONSTRAINT "WorkTopic_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTopic" ADD CONSTRAINT "WorkTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLocation" ADD CONSTRAINT "WorkLocation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionJobWork" ADD CONSTRAINT "ExtractionJobWork_extractionJobId_fkey" FOREIGN KEY ("extractionJobId") REFERENCES "ExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionJobWork" ADD CONSTRAINT "ExtractionJobWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
