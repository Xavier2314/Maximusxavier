import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blankForm, cleanForm, newField, summarize, toCsv, validateAnswers, type FormDef } from "@/lib/forms";

const def = (): FormDef => cleanForm({
  consent: "I agree to be contacted", submitText: "Send",
  steps: [
    { id: "s1", title: "About you", fields: [
      { id: "name", type: "short", label: "Your name", required: true },
      { id: "mail", type: "email", label: "Email", required: true },
      { id: "city", type: "select", label: "City", options: ["Lagos", "Abuja"], required: true },
      { id: "tags", type: "checkbox", label: "Interests", options: ["Health", "Beauty", "Tech"] },
    ] },
    { id: "s2", title: "Feedback", fields: [
      { id: "r", type: "rating", label: "Rate us", required: true },
      { id: "n", type: "nps", label: "Recommend?" },
      { id: "y", type: "yesno", label: "Order again?" },
    ] },
  ],
});
const good = { name: "Ada", mail: "ada@example.com", city: "Lagos", tags: ["Health", "Tech"], r: "5", n: "10", y: "Yes", __consent: "on" };

describe("form definition", () => {
  it("cleans hostile input and keeps limits", () => {
    const d = cleanForm({ redirectUrl: "javascript:alert(1)", theme: { style: "nope", accent: "red" }, steps: [{ fields: [{ label: "A", type: "script" }, { label: "", type: "short" }, { label: "Pick", type: "select", options: ["only one"] }] }, { fields: [] }] });
    assert.equal(d.redirectUrl, "");
    assert.equal(d.theme.style, "clean");
    assert.match(d.theme.accent, /^#[0-9a-f]{6}$/i);
    assert.equal(d.steps.length, 1);
    assert.equal(d.steps[0].fields[0].type, "short");
    assert.equal(d.steps[0].fields.length, 2);
    assert.ok(d.steps[0].fields[1].options.length >= 2);
  });
  it("makes ids unique and caps fields", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: "same", type: "short", label: `Q${i}` }));
    const d = cleanForm({ steps: [{ id: "x", fields: many }] });
    const ids = d.steps.flatMap((s) => s.fields.map((f) => f.id));
    assert.equal(ids.length, 40);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("starts from a usable blank form", () => {
    const b = blankForm("survey", "Feedback");
    assert.equal(b.steps[0].fields[0].type, "short");
    assert.equal(newField("radio").options.length, 2);
  });
});

describe("answers are checked against the published form", () => {
  it("accepts good answers and extracts name, email", () => {
    const r = validateAnswers(def(), good);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.email, "ada@example.com");
    assert.equal(r.name, "Ada");
    assert.equal(r.answers.tags, "Health | Tech");
  });
  it("rejects missing required, bad types and unknown options", () => {
    assert.equal(validateAnswers(def(), { ...good, name: "" }).ok, false);
    assert.equal(validateAnswers(def(), { ...good, mail: "nope" }).ok, false);
    assert.equal(validateAnswers(def(), { ...good, city: "Mars" }).ok, false);
    assert.equal(validateAnswers(def(), { ...good, tags: ["Hacking"] }).ok, false);
    assert.equal(validateAnswers(def(), { ...good, r: "9" }).ok, false);
    assert.equal(validateAnswers(def(), { ...good, n: "11" }).ok, false);
    assert.equal(validateAnswers(def(), { ...good, y: "Maybe" }).ok, false);
  });
  it("requires consent when the form asks for it, and ignores unknown fields", () => {
    assert.equal(validateAnswers(def(), { ...good, __consent: "" }).ok, false);
    const r = validateAnswers(def(), { ...good, injected: "<script>" });
    assert.ok(r.ok);
    if (r.ok) assert.equal("injected" in r.answers, false);
  });
});

describe("results", () => {
  it("summarises choices, ratings and NPS", () => {
    const d = def();
    const rows: { answers: Record<string, string> }[] = [{ answers: { city: "Lagos", r: "5", n: "10", tags: "Health | Tech" } }, { answers: { city: "Lagos", r: "3", n: "6", tags: "Health" } }, { answers: { city: "Abuja", r: "4", n: "9" } }];
    const sum = summarize(d, rows);
    const city = sum.find((x) => x.id === "city")!;
    assert.deepEqual(city.counts?.map((c) => [c.option, c.n]), [["Lagos", 2], ["Abuja", 1]]);
    assert.equal(sum.find((x) => x.id === "r")!.average, 4);
    const nps = sum.find((x) => x.id === "n")!.nps!;
    assert.deepEqual([nps.promoters, nps.detractors, nps.score], [2, 1, 33]);
    assert.equal(sum.find((x) => x.id === "tags")!.counts?.[0].n, 2);
  });
  it("exports a CSV that cannot run formulas", () => {
    const csv = toCsv(def(), [{ created_at: "2026-01-01", answers: { name: '=HYPERLINK("x")', mail: 'a,"b"' } }]);
    assert.ok(csv.includes("'=HYPERLINK"));
    assert.ok(csv.includes('"a,""b"""'));
    assert.equal(csv.split("\r\n").length, 2);
  });
});

import { cleanDesign, DEFAULT_DESIGN, insertField, moveField } from "@/lib/forms";

describe("design", () => {
  it("keeps valid choices and drops anything unsafe", () => {
    const d = cleanDesign({ headingFont: "playfair", bodyFont: "comic", pageColor: "#ABCDEF", cardColor: "red", textColor: "javascript:1", bg: "image", bgImage: "javascript:alert(1)", overlay: 500, width: "huge", card: "glass", radius: "pill", logo: "https://x.com/l.png", logoSize: "xl", buttonAlign: "left" });
    assert.equal(d.headingFont, "playfair");
    assert.equal(d.bodyFont, "");
    assert.equal(d.pageColor, "#abcdef");
    assert.equal(d.cardColor, "");
    assert.equal(d.textColor, "");
    assert.equal(d.bgImage, "");
    assert.equal(d.overlay, 80);
    assert.equal(d.width, DEFAULT_DESIGN.width);
    assert.equal(d.card, "glass");
    assert.equal(d.radius, "pill");
    assert.equal(d.logo, "https://x.com/l.png");
    assert.equal(d.logoSize, "md");
    assert.equal(d.buttonAlign, "left");
  });
  it("falls back to defaults for junk", () => {
    assert.deepEqual(cleanDesign("nope"), DEFAULT_DESIGN);
    assert.deepEqual(cleanForm({}).design, DEFAULT_DESIGN);
  });
  it("keeps field width and placeholder", () => {
    const d = cleanForm({ steps: [{ fields: [{ label: "A", width: "half", placeholder: "e.g. Ada" }, { label: "B", width: "wide" }] }] });
    assert.equal(d.steps[0].fields[0].width, "half");
    assert.equal(d.steps[0].fields[0].placeholder, "e.g. Ada");
    assert.equal(d.steps[0].fields[1].width, "full");
  });
});

describe("drag and drop moves", () => {
  const mk = () => cleanForm({ steps: [{ id: "s1", fields: ["A", "B", "C"].map((l) => ({ id: l.toLowerCase(), label: l })) }, { id: "s2", fields: [{ id: "d", label: "D" }] }] });
  const order = (d: ReturnType<typeof mk>) => d.steps.map((s) => s.fields.map((f) => f.label).join(""));
  it("moves down and up inside a step", () => {
    assert.deepEqual(order(moveField(mk(), { step: 0, index: 0 }, { step: 0, index: 3 })), ["BCA", "D"]);
    assert.deepEqual(order(moveField(mk(), { step: 0, index: 2 }, { step: 0, index: 0 })), ["CAB", "D"]);
    assert.deepEqual(order(moveField(mk(), { step: 0, index: 1 }, { step: 0, index: 2 })), ["ABC", "D"]);
  });
  it("moves between steps and into an empty position", () => {
    assert.deepEqual(order(moveField(mk(), { step: 0, index: 1 }, { step: 1, index: 0 })), ["AC", "BD"]);
    assert.deepEqual(order(moveField(mk(), { step: 1, index: 0 }, { step: 0, index: 3 })), ["ABCD", ""]);
  });
  it("ignores impossible moves and inserts new questions", () => {
    assert.deepEqual(order(moveField(mk(), { step: 0, index: 9 }, { step: 0, index: 0 })), ["ABC", "D"]);
    assert.deepEqual(order(insertField(mk(), { step: 1, index: 0 }, newField("short"))), ["ABC", "Your questionD"]);
    assert.equal(insertField(mk(), { step: 5, index: 0 }, newField()).steps.length, 2);
  });
});
