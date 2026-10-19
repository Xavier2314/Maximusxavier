import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanPlan, conceptIssues, planBlocked, trackedUrl } from "@/lib/ad-plan";

const concept = (over: Record<string, unknown> = {}) => ({ id: "c1", name: "Demo", format: "video", primaryText: "All Natural Fibre 510g. Message us to order.", headline: "Fibre drink mix", description: "Delivery in Lagos", cta: "WHATSAPP_MESSAGE", creativeBrief: "Product on a table", video: { hook: "Meet the drink mix", scenes: ["Open the tin", "Stir"], voiceover: "A simple daily routine.", onScreenText: "Pay on delivery", lengthSec: 20 }, ...over });

describe("ad plan", () => {
  it("cleans hostile or oversized input and keeps limits", () => {
    const p = cleanPlan({ inputs: { objective: "nonsense", dailyBudgetNgn: -5, areas: "x".repeat(999) }, audience: { ageMin: 5, ageMax: 200, gender: "robots", locations: ["Lagos", 7, ""] }, concepts: [concept(), concept({ id: "../x", cta: "HACK" }), { primaryText: "", headline: "" }, ...Array.from({ length: 9 }, () => concept())], testing: ["a", 3] });
    assert.ok(p);
    assert.equal(p.inputs.objective, "whatsapp");
    assert.equal(p.inputs.dailyBudgetNgn, 1000);
    assert.equal(p.inputs.areas.length, 200);
    assert.equal(p.audience.ageMin, 18);
    assert.equal(p.audience.ageMax, 65);
    assert.equal(p.audience.gender, "all");
    assert.deepEqual(p.audience.locations, ["Lagos"]);
    assert.ok(p.concepts.length <= 6);
    assert.equal(p.concepts[1].id, "x");
    assert.equal(p.concepts[1].cta, "WHATSAPP_MESSAGE");
  });
  it("returns null without any usable ad", () => {
    assert.equal(cleanPlan({ concepts: [{ primaryText: "", headline: "" }] }), null);
    assert.equal(cleanPlan("nope"), null);
  });
  it("flags rule-breaking concepts, including words inside the video script", () => {
    const ok = cleanPlan({ concepts: [concept()] })!;
    assert.equal(planBlocked(ok), false);
    const bad = cleanPlan({ concepts: [concept({ video: { hook: "Cures diabetes", scenes: [], voiceover: "", onScreenText: "" } })] })!;
    assert.equal(planBlocked(bad), true);
    assert.ok(conceptIssues(bad.concepts[0]).some((i) => i.id === "medical-claim"));
  });
  it("tags the funnel link so leads show their ad", () => {
    const u = new URL(trackedUrl("https://x.app", "my-slug", "12345678-aaaa", "c2"));
    assert.equal(u.pathname, "/f/my-slug");
    assert.equal(u.searchParams.get("utm_source"), "facebook");
    assert.equal(u.searchParams.get("utm_campaign"), "12345678");
    assert.equal(u.searchParams.get("utm_content"), "c2");
  });
});
