# Script 05 — Make.com Automation and Multi-Platform Integration Project

**Scenario:** A freelancer is speaking with the founder of a growing real estate investment company. They use multiple tools across their business — a CRM, a document signing tool, a spreadsheet, a communication platform, and an accounting tool — and nothing is connected. The freelancer needs to audit their entire tech stack, map out the automation opportunities, and propose a phased Make.com implementation.

**Platforms Featured:** Make.com, HubSpot CRM, DocuSign, Google Sheets, Slack, QuickBooks, Typeform, Gmail

---

## PART 1 — OPENING

**Freelancer (Zoe):** Hi Raymond, great to finally connect. I know from your message that you're dealing with a lot of disconnected tools and manual work across your business. Rather than me guessing what to build, I'd love to spend the first part of this call doing a quick audit of your current tech stack so I can actually see the full picture. Is that okay?

**Client (Raymond):** Yeah, let's do it. Honestly I'm not even sure what's possible — I just know that my team is spending too much time on things that feel like they should just... happen automatically.

**Zoe:** That's exactly the right instinct. Let's find out where those hours are actually going.

---

## PART 2 — TECH STACK AUDIT

**Zoe:** Let's go through your tools one by one. Tell me what each one does for you and how your team uses it day to day.

**Raymond:** Okay. So we use HubSpot as our CRM — that's where all our investor contacts live, our deal pipeline, everything. We use DocuSign for contracts and investment agreements. Google Sheets is kind of our catch-all — there are like 15 sheets floating around for different things. Slack is how we communicate internally. QuickBooks is our accounting. And we recently started using Typeform for our investor onboarding questionnaire.

**Zoe:** That's a solid stack. Six tools, all doing their own thing. Let me ask about each one briefly.

Starting with HubSpot — when a new investor contact is created, how does that happen right now?

**Raymond:** Either someone on my team enters it manually after a call, or occasionally it comes from a website form.

**Zoe:** And after the contact is created, what's the next step in your process?

**Raymond:** We send them an investor questionnaire — that's the Typeform — and once they complete it, someone manually reviews it and if they're a good fit, we send them a DocuSign agreement.

**Zoe:** So there are two manual handoffs right there: sending the Typeform after contact creation, and sending DocuSign after Typeform completion. How often do those handoffs get delayed?

**Raymond:** More than I'd like to admit. The Typeform usually goes out same day, but the DocuSign step can take 2 to 3 days depending on who's available to review.

**Zoe:** Okay. Let's keep going. Google Sheets — what's actually living in those 15 sheets?

**Raymond:** Oh man. There's one for tracking active deals, one for investor payments, one for property ROI calculations, a contacts overflow sheet, a few others I honestly haven't opened in months.

**Zoe:** Got it. Are any of those sheets being updated manually from data that already exists in HubSpot or QuickBooks?

**Raymond:** The investor payments one definitely is. Someone exports from QuickBooks and pastes it in.

**Zoe:** That's a classic automation opportunity — manual export and paste is almost always replaceable. What about DocuSign — when a contract gets signed, what happens next?

**Raymond:** The signed PDF goes to our admin's email. She downloads it, saves it to a folder, and logs it in a sheet.

**Zoe:** So a human is manually bridging DocuSign to your file system and your spreadsheet. Does the signed contract also need to create anything in HubSpot?

**Raymond:** It should update the deal to "Contract Signed" stage but that almost never happens because it's a manual step.

**Zoe:** And QuickBooks — when do invoices or payment records get created there?

**Raymond:** When we receive a wire transfer from an investor. Our bookkeeper logs it manually.

**Zoe:** Does any of the data already exist elsewhere at that point — like the investor's details and the investment amount?

**Raymond:** It's all in HubSpot and in the deal notes.

**Zoe:** So your bookkeeper is re-entering data into QuickBooks that already exists in HubSpot. That's duplicated data entry and a source of error.

**Raymond:** Yeah, we've had mistakes there before.

---

## PART 3 — MAPPING THE AUTOMATION OPPORTUNITIES

**Zoe:** Okay, let me reflect back what I'm hearing. You have seven distinct manual processes that are candidates for automation:

1. Sending the Typeform questionnaire when a new HubSpot contact is created
2. Reviewing Typeform responses and triggering DocuSign when someone qualifies
3. Updating the HubSpot deal stage when a DocuSign contract is signed
4. Saving signed PDFs to your file system automatically
5. Logging signed contracts in a Google Sheet
6. Creating QuickBooks payment records from HubSpot deal data
7. Syncing investor payment data from QuickBooks to your tracking spreadsheet

Does that cover the main pain points?

**Raymond:** That's literally a list of my nightmares. Yes.

**Zoe:** Good. Now, not all of these are equally urgent or equally complex. I'd suggest we prioritize by two factors: impact and complexity. The Typeform trigger and the DocuSign pipeline are highest impact because they affect investor experience directly. The QuickBooks sync is probably highest complexity. Does that feel right to you?

**Raymond:** Yeah, the investor-facing stuff is definitely most important. We've had investors mention the slow follow-up before.

---

## PART 4 — PHASED SOLUTION PRESENTATION

**Zoe:** Here's how I'd approach this. Rather than trying to build all seven automations at once — which gets complex and risky — I'd recommend a phased approach using Make.com as the central automation hub.

**Phase 1 — Investor Pipeline Automation (Weeks 1–2):**
- When a new contact is created in HubSpot, Make.com automatically sends them the Typeform questionnaire via a personalized email
- When a Typeform response is submitted, Make.com evaluates the responses against your qualification criteria and either: moves the HubSpot deal to "Qualified" and sends the DocuSign agreement, OR moves it to "Not Qualified" and triggers a polite rejection sequence
- When DocuSign is signed, Make.com updates HubSpot deal stage to "Contract Signed," saves the PDF to your Google Drive in the correct folder, and logs the contract in your tracking sheet

**Phase 2 — Financial Data Sync (Weeks 3–4):**
- When an investment is received and logged in HubSpot, Make.com creates the corresponding QuickBooks invoice/payment record automatically
- A weekly sync pulls QuickBooks payment data back to your investor payments spreadsheet so it's always current without manual exports

**Phase 3 — Internal Operations (Weeks 5–6):**
- Slack notifications for key pipeline events
- Automated weekly deal summary emailed to leadership
- Cleanup and consolidation of overlapping Google Sheets

**Raymond:** Breaking it into phases makes sense. I like that the investor-facing stuff comes first.

**Zoe:** That's always the right call. Investor experience directly affects your ability to raise capital. Internal ops, while important, can wait a few weeks.

---

## PART 5 — HANDLING OBJECTIONS

**Raymond:** I've had an employee try to set up some automations in HubSpot's built-in workflows before and it was a mess. Why would Make.com be different?

**Zoe:** HubSpot's native workflows are great for things that stay inside HubSpot. The moment you need to touch a system outside HubSpot — like DocuSign, QuickBooks, or Google Sheets — they hit a wall or require expensive add-ons. Make.com is purpose-built to connect different platforms. It's like the translation layer between all your tools. I'd actually keep HubSpot workflows for anything purely HubSpot-internal, and use Make.com for anything that crosses platforms.

**Raymond:** That makes sense. What happens to all this if we switch CRMs down the road?

**Zoe:** Good question to ask upfront. I build automations with that in mind — using clean, documented scenarios in Make.com that are easy to re-point to a different CRM if you migrate. The logic doesn't change; only the CRM connector does. And I document everything so that whoever maintains this after me — whether that's me or someone on your team — knows exactly what each automation does and why.

**Raymond:** How do we handle it if one of the tools changes their API or there's a rate limit issue?

**Zoe:** Make.com has built-in error handling and retry logic. I'll configure alerts so if any scenario fails, you and I both get notified immediately. And I'll build in sensible rate limiting for tools like QuickBooks that are strict about it. This is actually one of the advantages of a professional build versus a DIY setup — these edge cases get handled from day one.

---

## PART 6 — INVESTMENT AND CLOSING

**Zoe:** Here's how I'd price this. Phase 1 is the core investor pipeline — that's $2,200. Phase 2, the financial sync, is $1,400. Phase 3, internal ops, is $900. Full project: $4,500 over 6 weeks.

I'd invoice it in three parts: Phase 1 upfront, Phase 2 at kickoff of Phase 2, Phase 3 at kickoff of Phase 3. That way you're only paying for what you've seen delivered before the next phase starts.

**Raymond:** That's a fair structure. Is there a retainer after the build?

**Zoe:** Yes, and I'd recommend one given the number of platforms involved. My standard retainer is $300/month — it covers monitoring, fixes for any platform-update-related breaks, and up to 2 hours of modifications per month. Given you have 6+ platforms in play, something will inevitably need adjustment as these tools evolve.

**Raymond:** That seems reasonable. Let me review the proposal with my partner and get back to you.

**Zoe:** Of course. I'll send the proposal today with the phased scope, timeline, and pricing laid out clearly. One thing I'd mention — Phase 1 includes a 3-week window once I receive credentials, so if you want this live before your next investor cohort, it's worth moving relatively quickly on sign-off.

**Raymond:** Duly noted. Send it over and we'll review it tonight.

**Zoe:** Perfect. I'll also include a one-page overview of the full automation map — all seven workflows laid out visually — so you can share it with your partner without needing to explain everything from scratch.

**Raymond:** That would actually be really helpful. Looking forward to it.

---

## KEY LESSONS FOR TEAM MEMBERS

| Skill | What to Notice in This Script |
|---|---|
| **Tech stack audit technique** | Zoe audited all 6 tools systematically before proposing anything — this is discovery at scale |
| **Identifying duplicated data entry** | Spotting manual re-entry between systems is always an automation opportunity |
| **Prioritization framework** | Impact × Complexity = priority order — teach this to clients who want everything at once |
| **Phased approach** | Breaking a large project into phases reduces risk, improves cash flow, and builds trust |
| **Defending your tool choice** | Zoe explained WHY Make.com vs. HubSpot native workflows — always justify your tool selection |
| **Future-proofing objections** | Addressed "what if we switch CRMs" with a concrete, reassuring answer |
| **Visual deliverables** | Offering a visual automation map as part of the proposal is a closer — it shows thoroughness |
| **Urgency without pressure** | Zoe mentioned the investor cohort timeline as a natural nudge — not as a pressure tactic |
