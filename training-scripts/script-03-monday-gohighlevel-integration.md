# Script 03 — Monday.com + GoHighLevel Integration Project

**Purpose:** Train team members on scoping a CRM-to-project-management integration between GoHighLevel and Monday.com.  
**Skill Focus:** Technical discovery for integration projects, mapping data fields, managing client assumptions about "easy" integrations.

---

## Characters

- **Sam** — Freelancer (you)
- **Priya** — Client, runs a digital marketing agency with 12 employees

---

## Scene: Discovery Call — CRM + Project Management Integration

---

**Sam:** Hi Priya, thanks for jumping on. I saw you want to connect GoHighLevel with Monday.com — I've built a few of these, so this should be a productive call. Can you tell me what's not working right now?

**Priya:** Yeah, so we use GoHighLevel for all our client leads and pipeline management. When a lead becomes a client and pays their invoice, we need to create a project in Monday.com for that client. Right now, someone on my team does that manually every time and it takes forever and things get missed.

**Sam:** Okay, so the trigger is a specific event in GoHighLevel — a contact moving to a certain pipeline stage, or a paid invoice, or something else?

**Priya:** It's when they pay the invoice. We use GHL's invoicing feature and when the payment goes through, that's when we know they're officially a client.

**Sam:** Perfect. That's a clean trigger — paid invoice in GHL fires the automation. What needs to happen in Monday.com when that trigger fires? Walk me through what a manually created project looks like right now.

**Priya:** So we have a board in Monday called "Active Clients." When my team creates a new project, they add a new group — named after the client — and then inside that group there are about 15 standard tasks that every new client gets. Like "Send welcome email," "Schedule onboarding call," "Set up reporting dashboard," and so on.

**Sam:** Got it. So we're creating a new group on an existing board, not a new board entirely?

**Priya:** Correct, same board, new group, pre-loaded with the 15 tasks.

**Sam:** That's very doable. Now let me ask about the data coming from GHL — what information about the client do you want pulled into Monday? Just the name, or other fields too?

**Priya:** Name, email, the service they bought — we have different packages — and their assigned account manager.

**Sam:** Okay, the name and email are standard fields in GHL. The "service they bought" — is that a custom field you've set up in GHL or is it a product/line item on the invoice?

**Priya:** It's a tag we apply to the contact. Like "SEO Package" or "Ads Management."

**Sam:** Good. Tags are accessible via the GHL API. And the assigned account manager — is that a GHL user assigned to the contact?

**Priya:** Yes, each contact has an assigned user in GHL.

**Sam:** Perfect. So we'd map: contact name → group name in Monday, email → a text column in Monday, tag/service → a column in Monday, and assigned user → the person column in Monday. Do your account manager names match exactly between GHL and Monday, or will we need a mapping table?

**Priya:** Oh... they might not match. In GHL they're listed by full name, in Monday they're listed by their login email.

**Sam:** That's the kind of thing that breaks automations, so I'm glad we caught it. We'll need to build a lookup table that maps each GHL user name to their Monday email address. It's a one-time setup but it's important. Can you pull me a list of your account managers and their emails in both systems?

**Priya:** Yeah, I can do that. There are only 6 of them.

**Sam:** Easy. Now — the 15 standard tasks you mentioned. Are those always exactly the same regardless of which service the client bought, or does an SEO client get different tasks than an Ads client?

**Priya:** Oh, that's a good question. They're actually slightly different. SEO clients have a few extra tasks around keyword research and site audit.

**Sam:** So we have at least two task templates. Do you have those written down somewhere or do I need to help you build them out?

**Priya:** I have them in a Google Doc, I can share it.

**Sam:** Perfect, please do. That doc becomes the source of truth for the automation. One more question — when this integration goes live, do you want it to work retroactively on existing paid clients, or only for new payments going forward?

**Priya:** Only going forward. We don't want to mess with the current board.

**Sam:** Smart. Okay, let me summarize the scope. We're building an automation triggered by a paid invoice in GoHighLevel. When that fires, the workflow — most likely built in **Make.com** since it has strong native connectors for both GHL and Monday — will: pull the contact's name, email, service tag, and assigned user; look up the correct Monday account manager email; create a new group on your "Active Clients" board named after the client; and populate that group with the appropriate task template based on the service type. Does that match what you're envisioning?

**Priya:** Yes, exactly. I didn't realize it involved that many moving parts.

**Sam:** It's more nuanced than it looks on the surface, but it's a well-defined project. The scope I'd quote for this is **$1,000 to $1,400**, which includes the Make.com scenario build, the task template logic, the user mapping table, testing with three or four live invoices, and documentation so your team knows how it works. Timeline is **7 to 10 business days** once I have the Google Doc with the task templates and the user mapping list.

**Priya:** That seems reasonable. I was quoted $400 by someone else — why is there such a difference?

**Sam:** That's a fair question. A $400 quote usually means someone is building the most basic version — no conditional logic for different service types, no user mapping, no error handling. You'd likely get a fragile automation that breaks the first time a tag is missing or a user name doesn't match. The price difference is in the details that make it actually reliable. That said, I can scope a "lite" version without the conditional task templates if you want to reduce cost — it would just mean one standard task list for all clients.

**Priya:** No, I want it done right. Let's do the full version.

**Sam:** Great. I'll send you a proposal by tomorrow morning with a clear breakdown. Once you approve and send the deposit, I'll request access to your Make.com account — or set up a fresh scenario in your account — and your Monday workspace.

**Priya:** Sounds good. One thing — can we add an automatic Slack notification to the team when a new client comes in?

**Sam:** Absolutely, that's a simple add-on. I'd add $100 to the project cost for a Slack notification step — I'll include it as an optional line item in the proposal so you can decide.

**Priya:** Perfect. Looking forward to the proposal.

**Sam:** Likewise. Talk soon, Priya.

---

## Debrief Notes for Trainees

| Skill | What to Notice |
|---|---|
| **Assumption-busting** | Sam doesn't assume the 15 tasks are the same for all clients — he asks |
| **Technical depth without jargon** | Sam explains the user-mapping issue in plain language so the client understands why it matters |
| **Price objection handling** | Sam doesn't discount — he explains what the price difference *buys* and offers a scoped-down alternative |
| **Add-on upsell** | The Slack notification request is handled smoothly as an optional add-on, not a free throwaway |
| **Trigger precision** | Sam confirms the exact trigger event (paid invoice, not stage change) to avoid building the wrong thing |

---

## Practice Exercise

Role-play this script. Midway through, the client should say: "Can we also sync it the other way — so when a task is completed in Monday, it updates the contact in GHL?" Practice scoping this as a phase two or add-on without shutting the client down.
