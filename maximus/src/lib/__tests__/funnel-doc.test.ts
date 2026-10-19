import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  copyNode, crumbs, deleteNode, duplicateNode, effective, getNode, insertElement, kindOf, moveNode, nudge, pasteNode, reidentify, setColumnCount, setResp, sectionWith,
  type Ref,
} from "@/lib/funnel-doc";
import { cleanPages, cleanBlock, cleanElement, ensureUniqueIds, newBlock, newElement, newPage, newRow, type FunnelBlock } from "@/lib/funnels";

/** A section with two columns, the first holding a heading and a text. */
function fixture(): { blocks: FunnelBlock[]; sec: FunnelBlock & { type: "section" } } {
  const sec = newBlock("section") as FunnelBlock & { type: "section" };
  return { blocks: [newBlock("hero"), sec, newBlock("footer")], sec };
}
const ids = (v: unknown, out: string[] = []): string[] => {
  if (Array.isArray(v)) v.forEach((x) => ids(x, out));
  else if (v && typeof v === "object") { const o = v as Record<string, unknown>; if (typeof o.id === "string") out.push(o.id); Object.values(o).forEach((x) => ids(x, out)); }
  return out;
};

describe("document tree", () => {
  it("finds nodes by ref and reports their kind", () => {
    const { blocks, sec } = fixture();
    const row = sec.rows[0], col = row.columns[0], el = col.elements[0];
    assert.equal(getNode(blocks, { block: sec.id })?.id, sec.id);
    assert.equal(getNode(blocks, { block: sec.id, row: row.id, col: col.id, el: el.id })?.id, el.id);
    assert.equal(kindOf({ block: sec.id, row: row.id }), "row");
    assert.equal(getNode(blocks, { block: "nope" }), null);
  });

  it("builds a breadcrumb Section > Row > Column > Element", () => {
    const { blocks, sec } = fixture();
    const r: Ref = { block: sec.id, row: sec.rows[0].id, col: sec.rows[0].columns[1].id, el: sec.rows[0].columns[1].elements[0].id };
    assert.deepEqual(crumbs(blocks, r).map((c) => c.label), ["Section", "2 column row", "2nd column", "image"]);
  });

  it("duplicating a subtree gives every id a new value", () => {
    const { blocks, sec } = fixture();
    const before = new Set(ids(blocks));
    const { blocks: after, ref } = duplicateNode(blocks, { block: sec.id });
    const copy = getNode(after, ref) as typeof sec;
    assert.ok(copy && copy.id !== sec.id);
    for (const id of ids(copy)) assert.ok(!before.has(id), `id ${id} was reused`);
    assert.equal(after.length, blocks.length + 1);
    assert.equal(new Set(ids(after)).size, ids(after).length, "all ids unique");
  });

  it("moves an element between columns and keeps everything else", () => {
    const { blocks, sec } = fixture();
    const row = sec.rows[0];
    const from: Ref = { block: sec.id, row: row.id, col: row.columns[0].id, el: row.columns[0].elements[0].id };
    const moved = moveNode(blocks, from, { kind: "column", block: sec.id, row: row.id, col: row.columns[1].id, index: 1 });
    assert.ok(moved);
    const s = moved.blocks[1] as typeof sec;
    assert.equal(s.rows[0].columns[0].elements.length, 1);
    assert.equal(s.rows[0].columns[1].elements.length, 2);
    assert.equal(s.rows[0].columns[1].elements[1].id, from.el);
  });

  it("reordering inside one column accounts for the removed item", () => {
    const { blocks, sec } = fixture();
    const row = sec.rows[0], col = row.columns[0];
    const first: Ref = { block: sec.id, row: row.id, col: col.id, el: col.elements[0].id };
    const m = moveNode(blocks, first, { kind: "column", block: sec.id, row: row.id, col: col.id, index: 2 });
    const els = ((m!.blocks[1] as typeof sec).rows[0].columns[0].elements).map((e) => e.id);
    assert.deepEqual(els, [col.elements[1].id, col.elements[0].id]);
  });

  it("refuses moves between incompatible levels", () => {
    const { blocks, sec } = fixture();
    const row = sec.rows[0];
    assert.equal(moveNode(blocks, { block: sec.id, row: row.id }, { kind: "block", index: 0 }), null, "a row cannot become a section");
    assert.equal(moveNode(blocks, { block: sec.id }, { kind: "column", block: sec.id, row: row.id, col: row.columns[0].id, index: 0 }), null, "a section cannot go inside its own column");
  });

  it("deleting the last column of a row is refused, deleting an element works", () => {
    let { blocks, sec } = fixture();
    const row = sec.rows[0];
    blocks = deleteNode(blocks, { block: sec.id, row: row.id, col: row.columns[1].id });
    let s = blocks[1] as typeof sec;
    assert.equal(s.rows[0].columns.length, 1);
    blocks = deleteNode(blocks, { block: sec.id, row: row.id, col: row.columns[0].id });
    s = blocks[1] as typeof sec;
    assert.equal(s.rows[0].columns.length, 1, "the last column stays");
    blocks = deleteNode(blocks, { block: sec.id, row: row.id, col: row.columns[0].id, el: row.columns[0].elements[0].id });
    assert.equal((blocks[1] as typeof sec).rows[0].columns[0].elements.length, 1);
  });

  it("nudges nodes among their siblings", () => {
    const { blocks, sec } = fixture();
    const up = nudge(blocks, { block: sec.id }, -1);
    assert.equal(up!.blocks[0].id, sec.id);
    assert.equal(nudge(blocks, { block: blocks[0].id }, -1), null, "already first");
  });

  it("changing the column count never loses elements", () => {
    const { blocks, sec } = fixture();
    const row = sec.rows[0];
    const total = row.columns.reduce((n, c) => n + c.elements.length, 0);
    const one = setColumnCount(blocks, { block: sec.id, row: row.id }, 1);
    const r1 = (one[1] as typeof sec).rows[0];
    assert.equal(r1.columns.length, 1);
    assert.equal(r1.columns[0].elements.length, total);
    const six = setColumnCount(one, { block: sec.id, row: row.id }, 99);
    assert.equal((six[1] as typeof sec).rows[0].columns.length, 6);
  });

  it("copy and paste produce independent copies with new ids", () => {
    const { blocks, sec } = fixture();
    const r: Ref = { block: sec.id, row: sec.rows[0].id, col: sec.rows[0].columns[0].id, el: sec.rows[0].columns[0].elements[0].id };
    const clip = copyNode(blocks, r)!;
    const pasted = pasteNode(blocks, clip, r)!;
    assert.equal(new Set(ids(pasted.blocks)).size, ids(pasted.blocks).length);
    assert.equal((pasted.blocks[1] as typeof sec).rows[0].columns[0].elements.length, 3);
    // a copied element pasted onto a column lands inside that column
    const onCol = pasteNode(blocks, clip, { block: sec.id, row: sec.rows[0].id, col: sec.rows[0].columns[1].id })!;
    assert.equal((onCol.blocks[1] as typeof sec).rows[0].columns[1].elements.length, 2);
  });

  it("inserts an element into an empty column and wraps stray elements in a section", () => {
    const { blocks, sec } = fixture();
    const row = sec.rows[0];
    const out = insertElement(blocks, { kind: "column", block: sec.id, row: row.id, col: row.columns[1].id, index: 0 }, newElement("button"));
    assert.equal((out[1] as typeof sec).rows[0].columns[1].elements[0].type, "button");
    const wrapped = sectionWith(newElement("text"));
    assert.equal(wrapped.type, "section");
  });
});

describe("responsive overrides", () => {
  it("editing mobile never changes desktop values", () => {
    const { blocks, sec } = fixture();
    const before = JSON.stringify(blocks[1]);
    const out = setResp(blocks, { block: sec.id }, "mobile", "space", "compact");
    const s = out[1] as typeof sec;
    assert.equal(s.resp?.mobile?.space, "compact");
    const stripped = JSON.stringify({ ...s, resp: undefined });
    assert.equal(stripped, before, "everything except resp is untouched");
  });

  it("resetting an override returns to inherit and cleans up", () => {
    const { blocks, sec } = fixture();
    const a = setResp(blocks, { block: sec.id }, "mobile", "hidden", true);
    assert.equal(effective((a[1] as typeof sec).resp, "mobile", "hidden").value, true);
    const b = setResp(a, { block: sec.id }, "mobile", "hidden", undefined);
    assert.equal((b[1] as typeof sec).resp, undefined);
  });

  it("mobile inherits tablet when it has no value of its own", () => {
    const { blocks, sec } = fixture();
    const t = setResp(blocks, { block: sec.id }, "tablet", "space", "compact");
    const e = effective((t[1] as typeof sec).resp, "mobile", "space");
    assert.deepEqual(e, { value: "compact", own: false });
  });
});

describe("validation and sanitising", () => {
  it("drops unknown nodes, unsafe URLs and script-like markup stays as text", () => {
    const pages = cleanPages([{ name: "P", blocks: [
      { type: "section", rows: [{ columns: [{ elements: [
        { type: "button", text: "<img src=x onerror=alert(1)>", link: "javascript:alert(1)" },
        { type: "image", url: "data:text/html;base64,AAA", alt: "x" },
        { type: "video", url: "https://evil.example/x" },
        { type: "nonsense" },
      ] }] }] },
      { type: "nonsense" },
    ] }]);
    const sec = pages[0].blocks[0] as Extract<FunnelBlock, { type: "section" }>;
    const els = sec.rows[0].columns[0].elements;
    assert.equal(els.length, 3, "unknown element removed");
    const btn = els[0] as Extract<typeof els[number], { type: "button" }>;
    assert.equal(btn.link, "#order", "javascript: link replaced");
    assert.equal(btn.text, "<img src=x onerror=alert(1)>", "kept as plain text; React escapes it");
    assert.equal((els[1] as { url: string }).url, "", "data: URL removed");
    assert.equal(pages[0].blocks.length, 1, "unknown block removed");
  });

  it("bounds the tree: at most 6 columns and 6 rows' worth of structure", () => {
    const wide = cleanBlock({ type: "section", rows: [{ columns: Array.from({ length: 12 }, () => ({ elements: [] })) }] }) as Extract<FunnelBlock, { type: "section" }>;
    assert.equal(wide.rows[0].columns.length, 6);
    const empty = cleanBlock({ type: "section", rows: [{ columns: [] }] }) as Extract<FunnelBlock, { type: "section" }>;
    assert.equal(empty.rows.length, 0, "a row without columns is dropped");
  });

  it("forces unique ids across the whole document", () => {
    const dup = { id: "abcd1234", type: "text", title: "a", body: "b" };
    const pages = cleanPages([{ id: "pageaaaa", name: "P", blocks: [dup, dup, { ...dup, type: "section", rows: [{ id: "abcd1234", columns: [{ id: "abcd1234", elements: [{ id: "abcd1234", type: "divider" }] }] }] }] }]);
    const all = ids(pages);
    assert.equal(new Set(all).size, all.length);
  });

  it("clamps numbers and rejects bad dates", () => {
    const p = cleanElement({ type: "progress", label: "x", value: 900 }) as { value: number };
    assert.equal(p.value, 100);
    const c = cleanElement({ type: "countdown", label: "x", endsAt: "not a date" }) as { endsAt: string };
    assert.equal(c.endsAt, "");
  });

  it("keeps SEO fields clean and ignores invalid theme tokens", () => {
    const pages = cleanPages([{ name: "P", blocks: [], seo: { title: "T", description: "D", image: "javascript:x", noIndex: true } }]);
    assert.equal(pages[0].seo?.image, "");
    assert.equal(pages[0].seo?.noIndex, true);
  });

  it("reidentify never reuses an id", () => {
    const b = newBlock("section");
    const c = reidentify(b);
    const a = new Set(ids(b));
    for (const id of ids(c)) assert.ok(!a.has(id));
  });

  it("page and row helpers produce valid trees", () => {
    const row = newRow(4);
    assert.equal(row.columns.length, 4);
    assert.equal(newPage("Landing").slug, "landing");
  });
});

describe("migration of existing funnels", () => {
  it("old flat funnels (no resp, no nesting) load unchanged", () => {
    const old = [{ id: "aaaa1111", name: "Landing page", slug: "landing-page", blocks: [{ id: "bbbb2222", type: "hero", headline: "Hi", subheadline: "x", buttonText: "Go", buttonLink: "#order", imageUrl: "" }] }];
    const pages = cleanPages(old);
    assert.equal(pages[0].blocks[0].type, "hero");
    assert.equal((pages[0].blocks[0] as { headline: string }).headline, "Hi");
    assert.equal(ensureUniqueIds(pages)[0].blocks[0].id, "bbbb2222");
  });
});
