import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ZodError, type ZodType } from "zod";
import { createClient } from "./supabase/server";
import { isEmailAllowed } from "./env";
import { log } from "./log";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export interface Ctx {
  supabase: SupabaseClient;
  user: User;
}

type Handler<P> = (req: Request, ctx: Ctx, params: P) => Promise<unknown>;

/**
 * Wrap an API route: authenticates the single allowed owner, runs the handler
 * with an RLS-bound Supabase client, and converts errors into JSON responses.
 */
export function route<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: Request, context: { params: Promise<P> }) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isEmailAllowed(user.email)) throw new HttpError(401, "Unauthorized");
      const params = context?.params ? await context.params : ({} as P);
      const result = await handler(req, { supabase, user }, params);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", details: e.issues }, { status: 400 });
  log.error("api.unhandled", { error: e instanceof Error ? e.message : String(e) });
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  return schema.parse(raw);
}

/** Throw on Supabase errors with a useful message. */
export function must<T>(res: { data: T; error: { message: string; code?: string } | null }, what = "query"): T {
  if (res.error) {
    if (res.error.code === "23505") throw new HttpError(409, "That already exists (duplicate).");
    log.error("db.error", { what, error: res.error.message });
    throw new HttpError(500, `Database error during ${what}`);
  }
  return res.data;
}
