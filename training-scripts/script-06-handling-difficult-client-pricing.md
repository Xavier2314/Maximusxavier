# Script 06 — Handling Difficult Client Conversations: Pricing, Pushback & Scope Creep

**Purpose:** Train team members on maintaining professional boundaries when clients push on price, add requests mid-project, or try to negotiate after work has started.  
**Skill Focus:** Price anchoring, scope defense, staying calm under pressure, protecting project value.

---

## Characters

- **Morgan** — Freelancer (you)
- **Eric** — Client, owner of a staffing company

---

## Scene: A Discovery Call That Turns Into a Negotiation

---

**Morgan:** Hi Eric, thanks for being here. Based on the form you submitted, you want an automation built that connects your applicant intake form to your Monday.com board and your email system. Is that still the core of what you need?

**Eric:** Yeah, but I also want it to text the applicant automatically and notify my recruiter via Slack.

**Morgan:** Okay. So we're talking about four outputs from one trigger — Monday.com item creation, email to the applicant, SMS to the applicant, and Slack notification to your recruiter. What's the current state? How is this done manually right now?

**Eric:** My assistant does it. But honestly she has other things to do so I want to free her up. How much would this cost?

**Morgan:** Before I can give you a number that means anything, I need a few more details — I don't want to quote you something and then have to revise it because of a detail we didn't cover. Can I ask a few quick questions?

**Eric:** Sure but I've been quoted $200 for something like this before.

**Morgan:** I appreciate you sharing that. I want to be transparent — at $200, you're getting a basic proof-of-concept, not a tested, error-handled, production-ready automation. I'll give you my honest number at the end of this call and explain exactly what's included. Fair?

**Eric:** Fine, go ahead.

**Morgan:** What form platform is the intake coming from?

**Eric:** Typeform.

**Morgan:** And Monday.com — do you have an existing board for this or do we need to build the board structure too?

**Eric:** The board exists. I just need items added to it automatically.

**Morgan:** What columns does the Monday item need? Just name and email, or other fields?

**Eric:** Name, email, phone, which position they applied for, and the date they applied.

**Morgan:** Got it. For the SMS — are you using a platform like Twilio, or do you have something set up already?

**Eric:** I don't have anything. I thought you'd just handle that.

**Morgan:** I can set it up. The most reliable option is Twilio — it costs about $1 per month for a phone number plus fractions of a cent per message. You'd create the account in your name and I'd build the connection. Does that work?

**Eric:** I guess, as long as it doesn't cost much.

**Morgan:** For the volume you described, you're probably looking at under $10 a month on Twilio. Now — the SMS and email messages, do you have the content already written, or do I need to write those?

**Eric:** I'll write them. Can you just make sure there's a spot for the person's first name to be inserted?

**Morgan:** Yes, we'll use dynamic fields for personalization. Okay, I have what I need. Based on what you've described — Typeform trigger, four outputs including Twilio SMS setup, Monday.com item creation with five fields, email via your existing email tool, and Slack notification — I'd quote this at **$650**.

**Eric:** That's way more than $200.

**Morgan:** I understand. Let me explain what's in that $650 that a $200 build wouldn't have. It includes error handling so if any step fails — Twilio is down, Monday's API is slow — the workflow catches it and logs it instead of silently dropping an applicant. It includes a testing phase where we submit 10 test applications and verify every output. It includes documentation. And it includes two weeks of post-launch support for any bugs. If you want the $200 version, I can give you a basic flow without error handling or support — but I can't in good conscience recommend it for a production hiring workflow where missing an applicant has real consequences for your business.

**Eric:** Okay but can you do it for $450?

**Morgan:** I can do $600 if we remove the post-launch support window — so it's delivery only, and any fixes after handoff are billed at my hourly rate of $90. But I wouldn't go lower than that and maintain the quality I'd want to put my name on.

**Eric:** What if I refer a friend to you?

**Morgan:** I appreciate the offer — and I do have a referral bonus I give out, which is a $100 credit toward future work, not a discount on current work. The reason is that discounting this project doesn't change what it costs me to build it well.

**Eric:** Fine. $600 without the support. But I want it done in 3 days.

**Morgan:** Three business days is tight for this scope. I can commit to 5 business days. If you have a hard deadline driving the 3-day ask, tell me what it is and let's see if there's a way to structure the work to hit it — sometimes there's a critical piece that can go live first while the rest is finalized.

**Eric:** I have a hiring event on Friday.

**Morgan:** Today is Monday. If I start tomorrow, you could have the Typeform → Monday → email flow live by Thursday. The Twilio SMS setup takes a little longer because of Twilio's number provisioning process — that might be ready Friday or early next week. Does a phased delivery work?

**Eric:** Yeah, actually, as long as the core is live for the event. The SMS is secondary.

**Morgan:** Then that's what we do. I'll prioritize the Typeform, Monday, and email flow first — that'll be ready Thursday. Twilio and Slack follow by end of next week. Same $600 total. I'll send the proposal today.

**Eric:** Deal.

---

## Debrief Notes for Trainees

| Skill | What to Notice |
|---|---|
| **Pre-empting the price objection** | When Eric mentions the $200 quote early, Morgan doesn't get defensive — she acknowledges it and defers the pricing conversation until she has facts |
| **Value justification** | Morgan doesn't just defend the price — she itemizes exactly what's in it that the low quote wouldn't include |
| **Negotiation floor** | Morgan sets a floor ($600) and explains why — she doesn't keep dropping |
| **Referral deflection** | Referral ≠ discount. Morgan redirects it to a future credit without burning the relationship |
| **Creative problem-solving** | When timeline is the real issue, Morgan offers a phased delivery — unlocking the deal without compromising quality or price |

---

## Common Mistakes to Avoid

1. **Matching a competitor's low quote** — you devalue your own work and attract clients who will always price-shop
2. **Saying "I'll make an exception this time"** — clients remember and expect it again
3. **Agreeing to 3-day delivery on complex work without flagging risk** — sets you up to fail
4. **Getting emotional when pushed** — stay factual, stay warm, stay firm

---

## Practice Exercise

Role-play this script. After Morgan and Eric agree on $600, have Eric send a message the next day saying "I forgot to mention — can you also set up a second form for internal referrals? It's basically the same." Practice explaining why this is additional scope, how to price it, and how to say it without damaging the relationship.
