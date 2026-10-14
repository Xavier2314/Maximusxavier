/** Minimal structured logger (JSON lines → visible in Vercel/hosting logs). Never log secrets or personal note contents. */
type Level = "info" | "warn" | "error";
function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
export const log = {
  info: (e: string, d?: Record<string, unknown>) => emit("info", e, d),
  warn: (e: string, d?: Record<string, unknown>) => emit("warn", e, d),
  error: (e: string, d?: Record<string, unknown>) => emit("error", e, d),
};
