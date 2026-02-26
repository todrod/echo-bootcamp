import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  createIfMissing: z.boolean().optional().default(true),
});

export const createAttemptSchema = z.object({
  mode: z.enum(["FULL", "PRACTICE"]),
  examTrack: z.enum(["RSC", "ACS"]).default("RSC"),
  count: z.number().int().min(5).max(170).optional(),
  categories: z.array(z.enum(["A", "B", "C", "D", "E"])) .optional(),
  timerSetting: z.enum(["EXACT", "CUSTOM", "UNTIMED"]),
  timeLimitMinutes: z.number().int().min(5).max(240).nullable().optional(),
  useWeighting: z.boolean().optional(),
});

export const answerSchema = z.object({
  questionId: z.number().int().positive(),
  selectedChoice: z.enum(["A", "B", "C", "D", "E"]).nullable().optional(),
  selectedChoices: z.array(z.enum(["A", "B", "C", "D", "E"])).optional(),
  markedForReview: z.boolean().optional(),
  lastViewedQuestionIndex: z.number().int().min(0).optional(),
});

export const finishSchema = z.object({
  forceExpire: z.boolean().optional(),
});

export const weightSchema = z.object({
  weights: z.array(
    z.object({
      categoryCode: z.enum(["A", "B", "C", "D", "E"]),
      weight: z.number().min(0).max(1),
    }),
  ).length(5),
});

export const patchQuestionSchema = z.object({
  category: z.enum(["A", "B", "C", "D", "E"]).nullable().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).nullable().optional(),
  explanation: z.string().max(6000).nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).optional(),
  tagConfidence: z.number().min(0).max(1).optional(),
});
