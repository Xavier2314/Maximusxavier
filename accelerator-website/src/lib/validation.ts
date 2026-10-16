import { z } from "zod";
import { POSITION_IDS } from "./fees";

/**
 * DRAFT registration fields.
 * The official Google Form requires sign-in, so its exact questions have not been received yet.
 * When they arrive, update this schema, `REGISTRATION_FIELDS` and the database `extra` mapping.
 */
export const REFERRAL_OPTIONS = ["A friend or member", "Instagram", "Facebook", "WhatsApp", "X (Twitter)", "Flyer or poster", "Other"] as const;

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^(\+?234|0)[789][01]\d{8}$/.test(v) || /^\+\d{8,15}$/.test(v), "Enter a valid phone number, e.g. 0803 123 4567 or +234 803 123 4567");

export const registrationSchema = z.object({
  position: z.enum(POSITION_IDS, { errorMap: () => ({ message: "Choose your membership position" }) }),
  method: z.enum(["bank_transfer", "card"]).default("bank_transfer"),
  fullName: z.string().trim().min(3, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  phone,
  city: z.string().trim().min(2, "Enter your city or state").max(80),
  organisation: z.string().trim().max(120).optional().or(z.literal("")),
  referralSource: z.enum(REFERRAL_OPTIONS, { errorMap: () => ({ message: "Choose one option" }) }),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue" }) }),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export const CONTACT_TOPICS = ["Community enquiry", "Event enquiry", "Partnership or sponsorship", "Media", "Other"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: "Choose a topic" }) }),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(3000),
  // spam traps
  website: z.string().max(0).optional().or(z.literal("")),
  startedAt: z.coerce.number(),
});

export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path[0]?.toString() ?? "form";
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export const transferConfirmSchema = z.object({
  reference: z.string().regex(/^ACC26-[A-Z0-9]{8}$/, "Invalid reference"),
  senderName: z.string().trim().min(2, "Enter the name on the account you paid from").max(120),
  senderBank: z.string().trim().max(80).optional().or(z.literal("")),
});
