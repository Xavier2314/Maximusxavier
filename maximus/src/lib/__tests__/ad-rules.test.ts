import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkAdText, hasBlocking, productChecks } from "@/lib/ad-rules";

const ids = (t: string) => checkAdText(t).map((i) => i.id);

describe("ad rules", () => {
  it("lets safe, specific copy through", () => {
    assert.deepEqual(checkAdText("All Natural Fibre 510g. A simple daily drink mix for a healthy routine. Message us on WhatsApp to order. Delivery in Lagos."), []);
    assert.deepEqual(checkAdText("Pay on delivery in Lagos and Abuja. Chat with us to order."), []);
  });
  it("blocks disease and cure claims", () => {
    assert.ok(ids("This cures diabetes fast").includes("medical-claim"));
    assert.ok(ids("Heals ulcer and arthritis").includes("medical-claim"));
    assert.ok(ids("Managing diabetes naturally").includes("disease-named"));
  });
  it("blocks personal-attribute phrasing", () => {
    assert.ok(ids("Are you struggling with belly fat?").includes("personal-attribute"));
    assert.ok(hasBlocking(checkAdText("Do you have high blood pressure?")));
    assert.deepEqual(checkAdText("Do you have questions? Message us to order."), []);
    assert.ok(ids("Lose your belly fat now").includes("personal-attribute"));
  });
  it("blocks guarantees and quantified results", () => {
    assert.ok(ids("100% effective, guaranteed results").includes("guarantee"));
    assert.ok(ids("Lose 10kg in 2 weeks").includes("quantified-result"));
    assert.ok(ids("See results in just 7 days, flat belly").includes("quantified-result"));
  });
  it("blocks income, recruitment and before/after", () => {
    assert.ok(ids("Earn ₦200,000 per month from home").includes("income-claim"));
    assert.ok(ids("Make money online with no stress").includes("income-claim"));
    assert.ok(ids("Join my team today").includes("recruitment"));
    assert.ok(ids("Amazing before and after").includes("before-after"));
  });
  it("blocks unsafe ingredients", () => {
    assert.ok(ids("Contains ephedra extract").includes("unsafe-ingredient"));
  });
  it("warns on scarcity, testimonials, shouting and meta names", () => {
    const w = (t: string) => checkAdText(t).find((i) => i.severity === "warn")?.id;
    assert.equal(w("Only 5 left in stock"), "fake-scarcity");
    assert.equal(w("Thousands of happy customers"), "testimonial");
    assert.equal(w("BUY NOW FAST TODAY!!"), "shouting");
    assert.equal(w("As seen on Facebook"), "meta-names");
    assert.equal(hasBlocking(checkAdText("Only 5 left in stock")), false);
  });
  it("requires a registration number for health products", () => {
    assert.equal(productChecks({ healthProduct: true, registrationNumber: "" }).some((c) => !c.ok), true);
    assert.equal(productChecks({ healthProduct: true, registrationNumber: "A7-1234" }).every((c) => c.ok), true);
    assert.equal(productChecks({ healthProduct: false, registrationNumber: "" }).every((c) => c.ok), true);
  });
});
