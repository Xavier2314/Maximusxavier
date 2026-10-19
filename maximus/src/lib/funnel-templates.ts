import { newBlock, newPage, type FunnelBlock, type FunnelPage, type FunnelProduct, type FunnelType } from "@/lib/funnels";

const ICONS = ["✨", "💪", "🌿", "⚡", "🎯", "🕒"];
const lines = (t: string) => t.split("\n").map((l) => l.replace(/^(?:[-•*]|\d+[.)])\s+/, "").trim()).filter(Boolean).slice(0, 6);
const firstSentence = (t: string) => (t.split(/(?<=[.!?])\s/)[0] ?? "").slice(0, 200);

function make<T extends FunnelBlock["type"]>(type: T, patch: Record<string, unknown> = {}): FunnelBlock {
  return { ...newBlock(type), ...patch } as FunnelBlock;
}

/** A ready-made, editable draft for a funnel type, filled from the seller's own product details (no AI). */
export function starterPages(type: FunnelType, p: FunnelProduct): FunnelPage[] {
  const name = p.name || "Your product";
  const benefitLines = lines(p.benefits);
  const benefits = make("benefits", {
    title: `Why people choose ${name}`, bg: "tint",
    items: (benefitLines.length ? benefitLines : ["Made for everyday use", "Simple to order", "Support when you need it"]).map((l, i) => {
      const [title, ...rest] = l.split(/\s[-–:]\s/);
      return { icon: ICONS[i % ICONS.length], title: title.slice(0, 80), text: rest.join(" - ").slice(0, 200) };
    }),
  });
  const hero = (button: string, link: string, extra: Record<string, unknown> = {}) => make("hero", {
    headline: name, subheadline: firstSentence(p.description) || "Tell your customers, in one sentence, what this does for them.",
    buttonText: button, buttonLink: link, imageUrl: p.imageUrl, variant: p.imageUrl ? "split" : "center", ...extra,
  });
  const product = make("product", { name, price: p.price, description: p.description, imageUrl: p.imageUrl, buttonText: "Order now", points: benefitLines.slice(0, 4).join("\n") });
  const faq = make("faq", { title: "Questions? Answered.", bg: "tint", items: [
    { q: "How do I order?", a: "Fill in the order form. We will contact you to confirm and arrange delivery." },
    { q: "How can I pay?", a: "We confirm payment options with you when we contact you." },
    { q: "How long does delivery take?", a: "We will give you a delivery time when we confirm your order." },
    { q: "Who can I ask about this product?", a: "Message us on WhatsApp and we will help." },
  ] });
  const order = make("order_form", { productName: name, price: p.price, text: p.offer ? p.offer : "Fill in your details and we will confirm your order." });
  const footer = make("footer");
  const announcement = p.offer ? [make("announcement", { text: p.offer })] : [];
  const thanks = (title: string, body: string) => newPage("Thank you", [
    make("text", { title, body, align: "center", space: "roomy" }),
    make("steps", { title: "What happens next", items: [
      { icon: "", title: "We review", text: "We check your details right away." },
      { icon: "", title: "We contact you", text: "By phone or WhatsApp, to confirm." },
      { icon: "", title: "You are all set", text: "We take care of the rest." },
    ] }),
    footer,
  ]);

  switch (type) {
    case "sales":
      return [
        newPage("Sales page", [...announcement, hero("Get yours now", "#next"), benefits, product, make("steps", { title: "How to order" }), make("offer", { title: `What you get with ${name}`, items: [{ title: name, text: "", value: p.price }], price: p.price, buttonText: "Order now" }), faq, make("cta", { headline: `Ready for ${name}?`, text: p.offer || "Order today and we will take care of the rest.", buttonText: "Order now", buttonLink: "#next" }), footer]),
        newPage("Order", [make("text", { title: "Almost there", body: "Check your order, then fill in your details below.", align: "center" }), { ...product, variant: "stacked" } as FunnelBlock, order, footer]),
        thanks("Thank you! Your order is in.", "We have received your order and will contact you very soon to confirm it."),
      ];
    case "quick":
      return [
        newPage("Offer page", [...announcement, hero("Order now", "#order"), benefits, product, make("steps", { title: "How to order" }), faq, order, footer]),
        thanks("Thank you! Your order is in.", "We have received your order and will contact you very soon to confirm it."),
      ];
    case "leadmagnet":
      return [
        newPage("Sign-up page", [hero("Get it free", "#order", { variant: "center" }), { ...benefits, title: "What you will get" } as FunnelBlock, make("lead_form", { title: `Get ${name}`, text: "Enter your details and we will send it to you.", buttonText: "Send it to me", imageUrl: p.imageUrl, variant: p.imageUrl ? "split" : "card" }), footer]),
        newPage("Thank you", [make("text", { title: "It is on its way!", body: "Thank you. Check your phone and email. We will be in touch shortly.", align: "center", space: "roomy" }), make("button", { text: "Message us on WhatsApp", link: "#" }), footer]),
      ];
    case "webinar":
      return [
        newPage("Registration", [make("announcement", { text: "Free live session. Seats are limited." }), hero("Save my seat", "#order", { badge: "Live session", imageUrl: "", variant: "center" }), make("event", { title: name }), { ...benefits, title: "What you will learn" } as FunnelBlock, make("about", { title: "Your host" }), make("lead_form", { title: "Save your seat", text: "Enter your details and we will send you the joining details.", buttonText: "Save my seat", askPhone: true }), footer]),
        newPage("Confirmed", [make("text", { title: "You are in!", body: "Your seat is saved. We will send you the joining details.", align: "center", space: "roomy" }), make("event", { title: name }), footer]),
      ];
    case "call":
      return [
        newPage("Apply page", [hero("Apply now", "#order", { variant: "center" }), { ...benefits, title: "Is this right for you?" } as FunnelBlock, make("steps", { title: "What happens next", items: [{ icon: "", title: "You apply", text: "Tell us a little about you." }, { icon: "", title: "We call you", text: "A short, friendly conversation." }, { icon: "", title: "We decide together", text: "No pressure." }] }), make("about", { title: "Who you will speak to" }), faq, make("lead_form", { title: "Tell us about you", text: "A few details so we can prepare for our conversation.", buttonText: "Send my application", askPhone: true, askMessage: true }), footer]),
        thanks("Application received!", "Thank you. We will contact you soon to arrange a time to talk."),
      ];
  }
}
