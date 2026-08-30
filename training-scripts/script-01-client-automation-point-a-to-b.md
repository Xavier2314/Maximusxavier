# Script 01 — Client Automation Project: Taking a Client from Point A to Point B

**Purpose:** Train team members on how to run a discovery call for a general automation project.  
**Skill Focus:** Needs discovery, current-state vs. desired-state mapping, solution framing, closing.

---

## Characters

- **Alex** — Freelancer (you)
- **Maria** — Client, owner of a mid-size e-commerce brand

---

## Scene: Initial Discovery Call (Video / Phone)

---

**Alex:** Hi Maria, thanks for making time today. I looked over the intake form you filled out and it gave me a solid starting point, but I'd love to hear directly from you — what's the main problem you're trying to solve right now?

**Maria:** Sure. So right now, whenever we get a new order, my team has to manually copy the order details into our internal spreadsheet, then send a Slack message to the fulfillment team, and separately email the customer a confirmation. It takes about 15 minutes per order and we're getting 40–60 orders a day. Someone always misses a step.

**Alex:** That makes total sense, and honestly that's a very solvable problem. Before I jump into solutions, can I ask a few questions so I make sure I'm scoping this correctly?

**Maria:** Of course, go ahead.

**Alex:** Great. First — where are your orders coming from? Is it one platform, like Shopify or WooCommerce, or multiple sources?

**Maria:** Primarily Shopify, but we also take orders through a wholesale form on our website — that one goes into a Google Form right now.

**Alex:** Got it. And when you say the fulfillment team gets a Slack message, are they doing anything with that message manually, or do they have their own system they need the data pushed into?

**Maria:** They use a warehouse management tool called ShipStation. Right now they get the Slack ping and then log in manually to check it.

**Alex:** Okay, so ShipStation is actually where the fulfillment action happens — Slack is almost acting as a redundant middleman. That's good to know. Last question on the current state: the customer confirmation email — is that going out from Gmail, or from something like Klaviyo or Mailchimp?

**Maria:** Gmail right now. We have Klaviyo but nobody set it up properly.

**Alex:** Perfect. So let me reflect back what I'm hearing to make sure I have it right. Right now the flow is: order comes in from Shopify or a Google Form → your team manually copies it to a spreadsheet → they send a Slack message → they email the customer from Gmail. And none of those steps are connected. Does that sound right?

**Maria:** Exactly. It's a lot of copy-paste and it's error-prone.

**Alex:** Makes sense. So what would *ideal* look like for you? If this worked perfectly, what would your team's day look like?

**Maria:** Honestly? An order comes in, it just... appears in ShipStation, the customer gets an email automatically, and maybe our spreadsheet updates too so we still have a record. My team shouldn't have to touch any of it.

**Alex:** I love that. That's a very clean "Point B." Here's how I'd approach getting you there.

I'd build an automated workflow — most likely using **Make.com** or **n8n** — that triggers the moment an order is placed. For Shopify orders, there's a native webhook we can connect to. For the Google Form orders, we can trigger off a new form submission. From that single trigger, the workflow would: one, push the order directly into ShipStation via their API; two, update your Google Sheet automatically; and three, send the customer a branded confirmation email — we can route it through Klaviyo so you finally get use out of that tool, or keep it through Gmail if you prefer.

The Slack message becomes optional at that point — we can keep it as a notification if your team wants visibility, but it's no longer a required manual step.

**Maria:** That sounds exactly like what I want. How long would something like that take?

**Alex:** For a clean, tested build with both the Shopify and Google Form triggers, plus all three outputs, I'd estimate **5 to 7 business days**. That includes a testing phase where we run live orders through the system before we hand it off to you.

**Maria:** And what does that look like in terms of cost?

**Alex:** For a project scoped like this, I'd put it in the range of **$800 to $1,200**, depending on whether we include the Klaviyo setup or keep it to Gmail. I'll send you a formal proposal with a clear breakdown by end of day.

**Maria:** That works. One thing I'm wondering — what happens if the automation breaks? We can't have orders falling through the cracks.

**Alex:** Great question, and that's actually something I build into every automation. We add error handling so that if any step fails — say ShipStation's API is down — the workflow catches that, logs the error, and sends your team an alert so a human can step in. Nothing gets silently dropped. I also include a two-week support window after delivery for any bugs or adjustments.

**Maria:** That makes me feel a lot better. Okay, send me the proposal and let's move forward.

**Alex:** Perfect. I'll have it to you by 5 PM today. Before I let you go — is there anything else about your current workflow I should know that might affect the build?

**Maria:** I don't think so. You've pretty much captured it.

**Alex:** Great. Thanks, Maria. Talk soon.

---

## Debrief Notes for Trainees

| Skill | What to Notice |
|---|---|
| **Active listening** | Alex restates everything before proposing — never skips this step |
| **Layered questions** | Each question builds on the last answer; nothing is asked cold |
| **Current state → desired state** | Alex gets Maria to describe "Point B" in her own words before he frames the solution |
| **Objection handling** | The "what if it breaks?" objection is answered with specifics, not reassurances |
| **Closing with action** | Alex commits to a concrete deliverable (proposal by 5 PM) before ending the call |

---

## Practice Exercise

Role-play this script with a partner. The person playing the client should add one additional complication (e.g., "we also sell on Amazon") and see if the freelancer can adapt the questions and solution on the fly.
