import { z } from "zod";

const booleanFromQuery = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return undefined;
  });

const positiveInt = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : undefined;
  });

const nonNegativeInt = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed >= 0
      ? parsed
      : undefined;
  });

const sortSchema = z.enum([
  "relevance_score",
  "publication_date",
  "cited_by_count",
  "display_name",
]);

const sortDirectionSchema = z.enum([
  "asc",
  "desc",
]);

export const papersQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(500)
      .optional(),

    fromYear: positiveInt,

    toYear: positiveInt,

    type: z
      .string()
      .trim()
      .max(100)
      .optional(),

    openAccess: booleanFromQuery,

    minCitations: nonNegativeInt,

    maxCitations: nonNegativeInt,

    language: z
      .string()
      .trim()
      .max(20)
      .optional(),

    isRetracted: booleanFromQuery,

    sort: sortSchema.optional(),

    sortDirection:
      sortDirectionSchema.optional(),

    page: positiveInt,

    perPage: z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined || value === "") {
          return 25;
        }

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
          return 25;
        }

        return Math.min(
          Math.max(parsed, 1),
          100
        );
      }),

    cursor: z
      .string()
      .trim()
      .optional(),
  })
  .superRefine((data, context) => {
    if (
      data.fromYear !== undefined &&
      data.toYear !== undefined &&
      data.fromYear > data.toYear
    ) {
      context.addIssue({
        code: "custom",
        path: ["fromYear"],
        message:
          "fromYear must be less than or equal to toYear",
      });
    }

    if (
      data.minCitations !== undefined &&
      data.maxCitations !== undefined &&
      data.minCitations > data.maxCitations
    ) {
      context.addIssue({
        code: "custom",
        path: ["minCitations"],
        message:
          "minCitations must be less than or equal to maxCitations",
      });
    }

    if (
      data.page !== undefined &&
      data.cursor !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["cursor"],
        message:
          "Use either page pagination or cursor pagination, not both",
      });
    }
  });

export type PapersQuery = z.infer<
  typeof papersQuerySchema
>;