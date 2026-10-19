import { STYLE_KEYS, type FunnelTheme, type StyleKey } from "@/lib/funnels";
import { STYLES } from "@/lib/funnel-styles";

export const FIELD_TYPES = [
  { key: "short", label: "Short answer" }, { key: "long", label: "Long answer" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
  { key: "number", label: "Number" }, { key: "select", label: "Dropdown" }, { key: "radio", label: "Pick one" }, { key: "checkbox", label: "Pick several" },
  { key: "yesno", label: "Yes / No" }, { key: "rating", label: "Rating (1 to 5)" }, { key: "nps", label: "Score (0 to 10)" }, { key: "date", label: "Date" },
] as const;
export type FieldType = (typeof FIELD_TYPES)[number]["key"];
export const FIELD_KEYS = FIELD_TYPES.map((t) => t.key) as FieldType[];

export type FormFieldDef = { id: string; type: FieldType; label: string; help: string; required: boolean; options: string[] };
export type FormStep = { id: string; title: string; fields: FormFieldDef[] };
export type FormDef = {
  intro: { title: string; text: string }; steps: FormStep[]; submitText: string;
  successTitle: string; successText: string; redirectUrl: string; consent: string;
  theme: Pick<FunnelTheme, "style" | "accent" | "mode">;
};
export type FormKind = "form" | "survey";

export const MAX_STEPS = 8, MAX_FIELDS = 40, MAX_OPTIONS = 20;
const uid = () => Math.random().toString(36).slice(2, 10);
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const OPTION_TYPES: FieldType[] = ["select", "radio", "checkbox"];

export const newField = (type: FieldType = "short"): FormFieldDef => ({
  id: uid(), type, label: type === "yesno" ? "Yes or no question" : "Your question", help: "", required: false,
  options: OPTION_TYPES.includes(type) ? ["Option 1", "Option 2"] : [],
});
export const newStep = (title = ""): FormStep => ({ id: uid(), title, fields: [newField()] });
export function blankForm(kind: FormKind, title: string): FormDef {
  const st = STYLES.clean;
  return {
    intro: { title, text: kind === "survey" ? "It takes about a minute. Thank you for your time." : "" },
    steps: [newStep()], submitText: kind === "survey" ? "Send my answers" : "Send",
    successTitle: "Thank you!", successText: "We have received your answers.", redirectUrl: "", consent: "",
    theme: { style: "clean", accent: st.accent, mode: st.mode },
  };
}

export function cleanForm(raw: unknown): FormDef {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const seen = new Set<string>();
  const uniq = (v: unknown) => { let id = s(v, 20).replace(/[^a-z0-9_-]/gi, "") || uid(); while (seen.has(id)) id = uid(); seen.add(id); return id; };
  let fieldCount = 0;
  const steps = (Array.isArray(r.steps) ? r.steps : []).slice(0, MAX_STEPS).map((st): FormStep => {
    const o = obj(st);
    const fields = (Array.isArray(o.fields) ? o.fields : []).flatMap((f): FormFieldDef[] => {
      if (fieldCount >= MAX_FIELDS) return [];
      const fo = obj(f);
      const type = (FIELD_KEYS as string[]).includes(String(fo.type)) ? (fo.type as FieldType) : "short";
      const label = s(fo.label, 200);
      if (!label) return [];
      fieldCount += 1;
      const options = OPTION_TYPES.includes(type) ? (Array.isArray(fo.options) ? fo.options : []).map((x) => s(x, 80)).filter(Boolean).slice(0, MAX_OPTIONS) : [];
      return [{ id: uniq(fo.id), type, label, help: s(fo.help, 200), required: fo.required === true, options: OPTION_TYPES.includes(type) && options.length < 2 ? ["Option 1", "Option 2"] : options }];
    });
    return { id: uniq(o.id), title: s(o.title, 100), fields };
  }).filter((st) => st.fields.length > 0);
  const t = obj(r.theme);
  const style: StyleKey = (STYLE_KEYS as string[]).includes(String(t.style)) ? (t.style as StyleKey) : "clean";
  const accent = /^#[0-9a-f]{6}$/i.test(String(t.accent)) ? String(t.accent) : STYLES[style].accent;
  const url = s(r.redirectUrl, 500);
  const i = obj(r.intro);
  return {
    intro: { title: s(i.title, 120), text: s(i.text, 600) }, steps: steps.length ? steps : [newStep()],
    submitText: s(r.submitText, 40) || "Send", successTitle: s(r.successTitle, 120) || "Thank you!", successText: s(r.successText, 400),
    redirectUrl: /^https?:\/\/[^\s<>"']+$/i.test(url) ? url : "", consent: s(r.consent, 200),
    theme: { style, accent, mode: t.mode === "dark" ? "dark" : t.mode === "light" ? "light" : STYLES[style].mode },
  };
}

export const allFields = (d: FormDef) => d.steps.flatMap((st) => st.fields);

/** Validates a visitor's answers against the PUBLISHED form (never trusting the browser) and returns clean answers keyed by field id. */
export function validateAnswers(def: FormDef, input: Record<string, unknown>): { ok: true; answers: Record<string, string>; name: string; email: string; phone: string } | { ok: false; message: string } {
  const answers: Record<string, string> = {};
  let name = "", email = "", phone = "";
  for (const f of allFields(def)) {
    const raw = input[f.id];
    const vals = Array.isArray(raw) ? raw.map((x) => String(x)) : [String(raw ?? "")];
    const val = f.type === "checkbox" ? vals.map((x) => x.trim()).filter(Boolean) : [vals[0].trim()];
    const empty = f.type === "checkbox" ? val.length === 0 : val[0] === "";
    if (empty) { if (f.required) return { ok: false, message: `Please answer “${f.label}”.` }; continue; }
    const one = val[0];
    switch (f.type) {
      case "short": answers[f.id] = one.slice(0, 300); break;
      case "long": answers[f.id] = one.slice(0, 2000); break;
      case "email": if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(one) || one.length > 254) return { ok: false, message: `“${f.label}” needs a valid email address.` }; answers[f.id] = one; email ||= one; break;
      case "phone": if (!/^[+0-9()\s-]{6,25}$/.test(one)) return { ok: false, message: `“${f.label}” needs a valid phone number.` }; answers[f.id] = one; phone ||= one; break;
      case "number": if (!Number.isFinite(Number(one)) || one.length > 20) return { ok: false, message: `“${f.label}” needs a number.` }; answers[f.id] = one; break;
      case "select": case "radio": if (!f.options.includes(one)) return { ok: false, message: `Pick one of the options for “${f.label}”.` }; answers[f.id] = one; break;
      case "checkbox": if (!val.every((x) => f.options.includes(x))) return { ok: false, message: `Pick from the options for “${f.label}”.` }; answers[f.id] = val.join(" | "); break;
      case "yesno": if (one !== "Yes" && one !== "No") return { ok: false, message: `Answer Yes or No for “${f.label}”.` }; answers[f.id] = one; break;
      case "rating": if (!/^[1-5]$/.test(one)) return { ok: false, message: `Give “${f.label}” a rating from 1 to 5.` }; answers[f.id] = one; break;
      case "nps": if (!/^(10|[0-9])$/.test(one)) return { ok: false, message: `Give “${f.label}” a score from 0 to 10.` }; answers[f.id] = one; break;
      case "date": if (!/^\d{4}-\d{2}-\d{2}$/.test(one) || Number.isNaN(Date.parse(one))) return { ok: false, message: `“${f.label}” needs a date.` }; answers[f.id] = one; break;
    }
    if (f.type === "short" && !name && /\bname\b/i.test(f.label)) name = one.slice(0, 200);
  }
  if (def.consent && input.__consent !== "on") return { ok: false, message: "Please tick the box to agree before sending." };
  return { ok: true, answers, name, email, phone };
}

export type FieldSummary = { id: string; label: string; type: FieldType; answered: number; average?: number; counts?: { option: string; n: number; pct: number }[]; nps?: { score: number; promoters: number; passives: number; detractors: number } };

/** Counts per choice, averages for ratings and a Net Promoter Score, for the responses screen. */
export function summarize(def: FormDef, rows: { answers: Record<string, string> }[]): FieldSummary[] {
  return allFields(def).map((f) => {
    const vals = rows.map((r) => r.answers?.[f.id]).filter((v): v is string => typeof v === "string" && v !== "");
    const out: FieldSummary = { id: f.id, label: f.label, type: f.type, answered: vals.length };
    if (f.type === "rating" || f.type === "nps" || f.type === "number") {
      const nums = vals.map(Number).filter(Number.isFinite);
      if (nums.length) out.average = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
      if (f.type === "nps" && nums.length) {
        const p = nums.filter((n) => n >= 9).length, d = nums.filter((n) => n <= 6).length;
        out.nps = { score: Math.round(((p - d) / nums.length) * 100), promoters: p, passives: nums.length - p - d, detractors: d };
      }
    }
    const opts = f.type === "yesno" ? ["Yes", "No"] : f.type === "rating" ? ["1", "2", "3", "4", "5"] : f.options;
    if (["select", "radio", "checkbox", "yesno", "rating"].includes(f.type)) {
      const flat = f.type === "checkbox" ? vals.flatMap((v) => v.split(" | ")) : vals;
      out.counts = opts.map((o) => { const n = flat.filter((v) => v === o).length; return { option: o, n, pct: vals.length ? Math.round((n / vals.length) * 100) : 0 }; });
    }
    return out;
  });
}

const csvCell = (v: string) => { const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
/** CSV for a spreadsheet. Cells starting with = + - @ are prefixed so a spreadsheet can't run them as formulas. */
export function toCsv(def: FormDef, rows: { created_at: string; answers: Record<string, string> }[]): string {
  const fields = allFields(def);
  const head = ["Submitted", ...fields.map((f) => f.label)].map(csvCell).join(",");
  const lines = rows.map((r) => [r.created_at, ...fields.map((f) => r.answers?.[f.id] ?? "")].map((v) => csvCell(String(v))).join(","));
  return [head, ...lines].join("\r\n");
}
