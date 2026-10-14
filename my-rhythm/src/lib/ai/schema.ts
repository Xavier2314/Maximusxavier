import { z } from "zod";

export const CATEGORY_KEYS = ["spiritual", "gym", "keyboard", "office", "podcast", "personal", "travel", "events"] as const;

/** What the natural-language parser extracts. Every field is nullable: missing ≠ guessed. */
export const ParsedRequestSchema = z.object({
  intent: z.enum(["create", "trip", "find_time", "question", "unclear"]),
  title: z.string().nullable(),
  category_key: z.enum(CATEGORY_KEYS).nullable(),
  kind: z.enum(["event", "appointment", "meeting", "trip", "conference", "church", "family", "project", "task", "block"]).nullable(),
  date: z.string().nullable().describe("YYYY-MM-DD in the user's timezone"),
  start_time: z.string().nullable().describe("HH:mm 24h"),
  end_time: z.string().nullable().describe("HH:mm 24h"),
  end_date: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  all_day: z.boolean(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  recurrence: z
    .object({ freq: z.enum(["daily", "weekly", "monthly", "yearly"]), by_weekday: z.array(z.number()) })
    .nullable(),
  classification: z.enum(["fixed", "flexible", "essential", "optional"]).nullable(),
  trip: z
    .object({
      destination: z.string(),
      return_date: z.string().nullable(),
      return_time: z.string().nullable(),
      travel_method: z.string().nullable(),
    })
    .nullable(),
  find_time: z
    .object({
      duration_minutes: z.number(),
      range_start: z.string().describe("YYYY-MM-DD"),
      range_end: z.string().describe("YYYY-MM-DD"),
      part_of_day: z.enum(["morning", "afternoon", "evening", "any"]),
    })
    .nullable(),
  missing: z.array(z.string()).describe("essential details the user did not give"),
  clarification: z.string().nullable().describe("one short question to ask if something essential is missing"),
  assumptions: z.array(z.string()).describe("anything you inferred that the user should double-check"),
});
export type ParsedRequest = z.infer<typeof ParsedRequestSchema>;
