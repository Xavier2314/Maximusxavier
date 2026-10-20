import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanTags, contactsToCsv, importContacts, normaliseEmail, normalisePhone, parseCsv } from "@/lib/contacts";

describe("phone and email", () => {
  it("normalises Nigerian and international numbers", () => {
    assert.equal(normalisePhone("0803 123 4567"), "2348031234567");
    assert.equal(normalisePhone("+234 803 123 4567"), "2348031234567");
    assert.equal(normalisePhone("8031234567"), "2348031234567");
    assert.equal(normalisePhone("00233201234567"), "233201234567");
    assert.equal(normalisePhone("+1 (415) 555-2671"), "14155552671");
  });
  it("rejects junk", () => {
    assert.equal(normalisePhone("abc"), null);
    assert.equal(normalisePhone("123"), null);
    assert.equal(normalisePhone(""), null);
    assert.equal(normalisePhone(null), null);
  });
  it("cleans emails", () => {
    assert.equal(normaliseEmail("  ADA@Example.COM "), "ada@example.com");
    assert.equal(normaliseEmail("nope"), null);
    assert.equal(normaliseEmail("a@b"), null);
  });
});

describe("tags", () => {
  it("trims, dedupes ignoring case, strips unsafe characters and caps", () => {
    assert.deepEqual(cleanTags("Lead, lead ; VIP,  <b>x</b>"), ["Lead", "VIP", "bx/b"]);
    assert.deepEqual(cleanTags(["a", "A", " b "]), ["a", "b"]);
    assert.equal(cleanTags(Array.from({ length: 50 }, (_, i) => `t${i}`)).length, 20);
    assert.equal(cleanTags("x".repeat(100))[0].length, 30);
  });
});

describe("csv", () => {
  it("reads quotes, commas, newlines in cells, CRLF, BOM and semicolons", () => {
    assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","line1\nline2"\r\n'), [["a", "b"], ["x, y", "line1\nline2"]]);
    assert.deepEqual(parseCsv("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
    assert.deepEqual(parseCsv('a\n"he said ""hi"""'), [["a"], ['he said "hi"']]);
  });
  it("imports contacts, skipping rows with no way to reach them and duplicates", () => {
    const r = importContacts("Name,Mobile,Email,Tags,Source\nAda Obi,0803 111 2222,,vip; lead,Expo\n,,bola@x.com,,\nNo contact,,,,\nAda again,2348031112222,,,\nChidi,abc,chidi@x.com,,");
    assert.equal(r.rows.length, 3);
    assert.deepEqual(r.rows[0], { name: "Ada Obi", phone: "2348031112222", email: null, tags: ["vip", "lead"], notes: "", source: "Expo" });
    assert.equal(r.rows[1].name, "bola");
    assert.deepEqual(r.skipped.map((s) => [s.line, s.reason]), [[4, "No valid phone number or email"], [5, "Duplicate in this file"]]);
  });
  it("joins first and last name columns", () => {
    const r = importContacts("First Name,Last Name,Phone\nAda,Obi,08031112222");
    assert.equal(r.rows[0].name, "Ada Obi");
  });
  it("exports a CSV that cannot run formulas", () => {
    const csv = contactsToCsv([{ full_name: '=CMD("x")', phone: "2348031112222", email: null, stage: "new", source: null, tags: ["a", "b"], notes: 'He said "hi", ok', created_at: "2026-10-20T10:00:00Z" }]);
    assert.ok(csv.includes("'=CMD"));
    assert.ok(csv.includes("+2348031112222"));
    assert.ok(csv.includes('"He said ""hi"", ok"'));
    assert.ok(csv.includes("a; b"));
  });
});
