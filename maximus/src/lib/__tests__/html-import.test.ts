import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToBlocks } from "@/lib/html-import";
import type { FunnelBlock } from "@/lib/funnels";

const els = (blocks: FunnelBlock[]) => blocks.flatMap((b) => (b.type === "section" ? b.rows.flatMap((r) => r.columns.flatMap((c) => c.elements)) : []));

const PAGE = `<!doctype html><html><head><title>Fibre Drink</title><style>.x{color:red}</style><script>alert(1)</script></head>
<body><div id="app">
<header style="background:#112233;text-align:center"><h1>All Natural Fibre</h1><p>A simple daily drink mix. <b>Pay</b> on delivery.</p><a class="btn" href="javascript:alert(1)">Order now</a><a class="btn" href="https://wa.me/234800">Chat</a></header>
<section class="features"><div class="card"><h3>Easy</h3><p>Stir and drink.</p></div><div class="card"><h3>Natural</h3><p>No added colour.</p></div><div class="card"><h3>Local</h3><p>Delivered in Lagos.</p></div></section>
<section><img src="https://example.com/a.jpg" alt="Tin" onerror="alert(1)"><img src="/relative.png"><ul><li>One</li><li>Two</li></ul>
<details><summary>Delivery?</summary>Yes, Lagos.</details><details><summary>Pay?</summary>On delivery.</details>
<iframe src="https://evil.example/x"></iframe><iframe src="https://www.youtube.com/embed/abc123"></iframe></section>
<section><form action="https://evil.example"><h2>Order</h2><input name="name"><input type="tel" name="phone"><input name="city" placeholder="Your city" required><textarea name="note"></textarea><label><input type="checkbox"> I agree to the terms</label><button>Send order</button></form></section>
</div><nav><a href="/x">Menu</a></nav></body></html>`;

describe("html import", () => {
  const r = htmlToBlocks(PAGE);
  const all = els(r.blocks);
  it("reads the title and makes sections", () => {
    assert.equal(r.title, "Fibre Drink");
    assert.ok(r.blocks.length >= 3);
    assert.ok(r.blocks.every((b) => b.type === "section"));
  });
  it("maps headings, text, buttons, bullets and faq", () => {
    assert.ok(all.some((e) => e.type === "heading" && e.text === "All Natural Fibre" && e.level === 1));
    assert.ok(all.some((e) => e.type === "text" && e.text.includes("Pay on delivery")));
    assert.ok(all.some((e) => e.type === "bullets" && e.items === "One\nTwo"));
    const faq = all.find((e) => e.type === "faq");
    assert.ok(faq && faq.type === "faq" && faq.items.length === 2);
  });
  it("turns card groups into columns", () => {
    const sec = r.blocks.find((b) => b.type === "section" && b.rows.some((row) => row.columns.length === 3));
    assert.ok(sec, "a 3-column row exists");
  });
  it("keeps the section background colour", () => {
    assert.ok(r.blocks.some((b) => b.bg === "custom" && b.bgColor === "#112233"));
  });
  it("never carries unsafe links or scripts across", () => {
    const json = JSON.stringify(r.blocks);
    assert.ok(!/javascript:|alert\(|onerror|evil\.example|<script/i.test(json));
    const btns = all.filter((e) => e.type === "button");
    assert.equal(btns.length, 2);
    assert.equal(btns[0].type === "button" && btns[0].link, "#order"); // javascript: link replaced
    assert.equal(btns[1].type === "button" && btns[1].link, "https://wa.me/234800");
  });
  it("keeps youtube embeds only and flags the rest", () => {
    const vids = all.filter((e) => e.type === "video");
    assert.equal(vids.length, 1);
    assert.ok(r.warnings.some((w) => /Embedded videos/.test(w)));
  });
  it("rebuilds forms with their questions and consent", () => {
    const f = all.find((e) => e.type === "form");
    assert.ok(f && f.type === "form");
    if (f.type !== "form") return;
    assert.equal(f.askPhone, true);
    assert.equal(f.askMessage, true);
    assert.equal(f.buttonText, "Send order");
    assert.ok(f.consent.toLowerCase().includes("agree"));
    assert.deepEqual(f.fields.map((x) => [x.label, x.required]), [["Your city", true]]);
  });
  it("leaves relative images empty and warns, skips navigation", () => {
    assert.ok(all.some((e) => e.type === "image" && e.url === ""));
    assert.ok(r.warnings.some((w) => /nav|Navigation/.test(w)));
    assert.ok(r.warnings.some((w) => /Scripts were removed/.test(w)));
  });
  it("resolves relative images when a base address is given", () => {
    const x = htmlToBlocks('<body><section><img src="/pic.png"></section></body>', { baseUrl: "https://shop.example.com/page" });
    assert.ok(els(x.blocks).some((e) => e.type === "image" && e.url === "https://shop.example.com/pic.png"));
  });
  it("copes with empty and broken input", () => {
    assert.equal(htmlToBlocks("").blocks.length, 0);
    assert.doesNotThrow(() => htmlToBlocks("<div><p>unclosed <b>tags<section>"));
    assert.ok(htmlToBlocks("just some words").blocks.length >= 0);
  });
});
