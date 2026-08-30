# Script 07 — Project Delivery, Handoff & Getting Paid

**Purpose:** Train team members on how to professionally deliver a completed project, conduct a walkthrough, handle revision requests, and collect final payment.  
**Skill Focus:** Delivery framing, walkthrough structure, handling "just one more thing" after delivery, collecting the final invoice confidently.

---

## Characters

- **Casey** — Freelancer (you)
- **Natalie** — Client, marketing director at a real estate company

---

## Scene: Project Delivery Call — Completed Make.com Automation (Lead Routing + CRM + Email)

**Context:** Casey built a lead routing automation for Natalie's team. New leads from a web form automatically go into a GoHighLevel pipeline, are assigned to an agent based on zip code, and the lead receives a welcome email. This is the delivery call.

---

**Casey:** Hi Natalie, excited to walk you through the build today. I've been testing it all week and everything is running clean. I'll share my screen and walk you through how it works from end to end, and then we'll submit a test lead together live. Ready?

**Natalie:** Yes, let's do it!

**Casey:** Great. So this is the Make.com scenario — you can see it's named "Lead Routing V1 – Natalie Real Estate." I always name scenarios clearly so if you ever need to find it, it's obvious. There are six modules in this flow.

The first module watches your Typeform for new submissions — it checks every 15 minutes by default, which means the maximum delay from submission to CRM entry is 15 minutes. If you want real-time, we can upgrade the Make.com plan to use instant webhooks, but for most real estate teams 15 minutes is fine. Does that timing work for you?

**Natalie:** Yeah, 15 minutes is totally fine.

**Casey:** Perfect. Module two parses the lead's zip code. Module three looks up the zip code against this table — I built a Google Sheet that maps zip codes to agent names and their GHL user IDs. So when a lead comes from zip code 78701, it knows that belongs to Sarah Chen and routes accordingly. This sheet is yours to manage — when you add a new agent or change territories, you update this sheet and the automation picks it up automatically without any changes to Make.com.

**Natalie:** Oh that's smart. I was worried I'd have to call you every time we hired someone new.

**Casey:** Exactly — that's why I built it that way. Module four creates the contact in GoHighLevel and assigns it to the right agent. Module five tags the contact and puts them in the "New Lead" pipeline stage. Module six sends the welcome email through your GHL email sender. Here's the template — I used placeholders for the agent's name and phone number, which pull dynamically from GHL.

Let me show you the error handling module — if anything fails, this route catches it, logs the error in this separate Google Sheet, and sends you an email alert at the address you gave me. You should never have a lead silently disappear.

**Natalie:** Perfect. Can we test it now?

**Casey:** Yes, let's do it. I'll submit a test lead on your Typeform — I'm using my own email so the welcome email goes to me and we can confirm it. I'm entering a zip code in Sarah's territory. Submitting now... and we wait up to 15 minutes... actually I set it to run manually for this demo, so watch the scenario — I'll click "Run once" right now.

*[Live test is performed]*

**Casey:** See — it ran through all six modules. Let's open GoHighLevel. There's the contact, assigned to Sarah Chen, in the "New Lead" stage, tagged correctly. And here in my inbox is the welcome email with Sarah's name and number populated. Everything looks good. Any questions before I hand this off?

**Natalie:** This is amazing. Can you quickly show me where the zip code sheet is so I know where to go?

**Casey:** Of course. Here it is — I bookmarked it in the handoff document I'm sending you today. The doc has a step-by-step guide for: adding a new agent, updating territory zip codes, what to do if you get an error email, and how to reconnect the Make.com modules if authentication expires. It's written for non-technical users on your team.

**Natalie:** Wonderful. One thing — I was thinking, could we also add a step that sends a text message to the lead? Is that hard?

**Casey:** Not hard at all. That would be one additional module in Make.com connected to Twilio or GHL's built-in SMS. That's outside the original scope, but it's about **2 hours of work** — I'd quote it at **$180** as a small add-on. I can get it done this week if you want it.

**Natalie:** Yes let's do it. Can you just start on it?

**Casey:** Absolutely — I'll start once I have your approval in writing, either by replying to my proposal email or I can send a quick one-line scope add-on in the contract. I want to have it documented so we're both protected.

**Natalie:** Makes sense, I'll approve by email. What about the final payment?

**Casey:** Yes — I'll send the final invoice today. You paid 50% upfront, so the remaining 50% is due on delivery, which is today. The invoice will be $750. I typically ask for payment within 3 business days of delivery. Does that work?

**Natalie:** Yes that works. Should I use the same payment link?

**Casey:** Yep, same link — Stripe. You'll get an email from me with the invoice within the hour. Natalie, it's been great working with you. Once the SMS add-on is done, that's a complete, production-ready lead routing system.

**Natalie:** Thank you so much, Casey. Can I reach out if I have questions later?

**Casey:** Of course. You have a 2-week support window included — any bugs or issues discovered in that period are covered at no charge. After that, I'm always available for small questions via email, and for bigger changes I'll quote accordingly. I'll also follow up in about a month to check in and make sure everything's running well.

**Natalie:** That follow-up really means a lot. Not many freelancers do that.

**Casey:** It's how I prefer to work. Thanks, Natalie. Enjoy the automation!

---

## Debrief Notes for Trainees

| Skill | What to Notice |
|---|---|
| **Structured walkthrough** | Casey narrates every module in plain language — the client understands what they bought, which builds confidence |
| **Self-service design** | The zip code sheet being editable by the client is a deliberate architecture choice explained on the call |
| **Live testing** | Casey doesn't say "it works" — she proves it live on the call. Never skip this step |
| **Scope add-on handling** | "Can we add SMS?" is handled professionally: scoped, priced, and approval required before starting |
| **Collecting payment** | Casey doesn't awkwardly avoid the money conversation — she brings it up naturally as part of delivery |
| **Follow-up promise** | The 1-month follow-up differentiates Casey from transactional freelancers and opens the door for repeat work |

---

## Common Mistakes to Avoid

1. **Demoing from your own account** instead of the client's — always demo in their environment
2. **Accepting "just start on it" for scope additions** without a paper trail — always get written approval
3. **Forgetting to send the invoice on delivery day** — delayed invoices lead to delayed payments
4. **Vague support offers** ("I'm here if you need anything") — be specific about what the support window covers

---

## Practice Exercise

Role-play this script. During the walkthrough, have the client say "It looks like the email has a typo in the agent's name." Practice responding to a live bug discovery: stay calm, identify whether it's a data issue (in their GHL) or a build issue, and communicate the fix timeline clearly.
