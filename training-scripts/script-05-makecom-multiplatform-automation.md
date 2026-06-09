# Script 05 — Make.com Automation and Multi-Platform Integration Project

**Purpose:** Train team members on scoping a complex multi-tool automation using Make.com as the central hub.  
**Skill Focus:** Multi-step scenario design, Make.com-specific concepts (scenarios, modules, operations), managing scope across many platforms.

---

## Characters

- **Riley** — Freelancer (you)
- **Cassandra** — Client, founder of a lead generation agency

---

## Scene: Discovery Call — Multi-Platform Lead Management Automation

---

**Riley:** Hi Cassandra, great to connect. I see you're running a lead gen agency and want to automate your lead delivery and reporting process. That's a common need in your space. Walk me through what's happening today.

**Cassandra:** Sure. So we run Facebook and Google ads for our clients. Leads come in through the ad platforms and right now my team manually downloads them, puts them in a spreadsheet, and then either emails them to the client or logs into the client's CRM and adds them one by one. We have 11 clients right now and it's eating like 3-4 hours a day.

**Riley:** I can see why that's painful. Before I map out a solution, I need to understand the variability across your 11 clients — because that's usually what makes or breaks a Make.com build. Are all your clients using the same CRM, or is it different tools per client?

**Cassandra:** It's different. Some are on HubSpot, some on GoHighLevel, and two of them just want a spreadsheet — they don't have a CRM.

**Riley:** Okay, so we're looking at three destination types: HubSpot, GoHighLevel, and Google Sheets. That's actually very manageable in Make.com. Do all 11 clients source their leads from both Facebook and Google, or does it vary?

**Cassandra:** Most are on Facebook only. Three are running Google Ads too.

**Riley:** Good. That means the Facebook Lead Ads connection is the most critical path. Make.com has a native Facebook Lead Ads module, so that's clean. For Google Ads, lead data comes through a Lead Form Extension — it doesn't have the same native connector, so we'd route it through a Google Sheet as an intermediary. That's still fully automatic, just one extra step. Is that okay?

**Cassandra:** Sure, whatever works. I just need the leads to flow.

**Riley:** Got it. Now let me ask about data — when a lead comes in, what fields does it include and what does the client want to receive?

**Cassandra:** Usually first name, last name, email, phone, and which ad they came from. Clients want all of that plus the date and time the lead came in.

**Riley:** Does any client have custom fields on their lead forms? Like "What's your budget?" or "Which service are you interested in?"

**Cassandra:** Two of them do, yes. One has a dropdown for budget range and one has a checkbox for which service they want.

**Riley:** Those custom fields need to be mapped individually in the Make.com scenario, so those two clients are slightly more complex builds. It's not a problem, just worth noting for the scope. Now — notification. After a lead is delivered to the CRM or spreadsheet, does the client want to be notified? Email, SMS, Slack?

**Cassandra:** Most want an email notification. Two of them want it to also go to a Slack channel.

**Riley:** Easy. Make.com has native Gmail and Slack modules. One more question — do you want any kind of deduplication? Like if the same person submits a lead form twice, do you want to check if they're already in the CRM before creating a duplicate?

**Cassandra:** Oh wow, I never thought about that. Do people actually do that?

**Riley:** It happens more than you'd think, especially with retargeting campaigns. For HubSpot, Make.com can do a "search contacts" step before creating — if it finds a match by email, it updates the existing record instead of creating a new one. GoHighLevel has a similar lookup. It adds complexity but it keeps your clients' CRMs clean.

**Cassandra:** I want that. My clients will love that.

**Riley:** Great, we'll build it in. Okay — I want to be transparent about how I'd structure this in Make.com. Rather than one giant scenario that tries to handle all 11 clients in one flow, I'd build a **scenario template** and then clone and configure it per client. This means: each client has their own Make.com scenario, they're independent of each other, and if one client's integration breaks or needs changes, it doesn't affect the others. Does that sound logical to you?

**Cassandra:** It does. Is that more expensive though?

**Riley:** It's a slightly larger upfront build, but it makes maintenance dramatically easier and cheaper. The per-client scenario can usually be set up in about 30-40 minutes once the template is built. I'll factor that into the pricing. So here's how I'd structure the quote: there's a base build fee for the template and the first two clients — let's say one HubSpot, one GoHighLevel — and then a per-client configuration fee for the remaining nine. Does your business model allow you to pass that per-client cost to your clients, or do you need to absorb it?

**Cassandra:** I'd pass it on as a setup fee, actually. That's a good idea.

**Riley:** Smart. Okay, here's a rough scope: base build including the Facebook Ads connection, deduplication logic, email and Slack notifications, and full configuration for two clients — **$1,500**. Each additional client configured — **$150**. For 11 clients total that's **$1,500 + $1,350 = $2,850**. Timeline is about **10 to 14 business days**. After that, if you bring on new clients, you have two options — you pay me $150 to configure each new one, or I can train someone on your team to do it themselves, which is about a 2-hour training session.

**Cassandra:** I like the training idea. What does that cost?

**Riley:** $350 for the session, and I'll provide a setup checklist so your team member can follow it every time.

**Cassandra:** That's valuable. Let me ask — what happens if Facebook or one of the CRMs changes their API and the connection breaks?

**Riley:** Great question. Facebook API changes are usually announced in advance — Meta gives developers a deprecation window. If that happens, Make.com updates their module and you reconnect with one click. For the CRMs, same thing. The scenarios themselves don't break from API changes usually — it's authentication tokens that expire. I'll show you how to refresh those in the handoff. If something does break unexpectedly, I offer a maintenance retainer for $200/month that covers up to 3 hours of fixes and updates. A lot of clients with this many scenarios find it worth it.

**Cassandra:** I'll probably want that. Can we include it in the contract?

**Riley:** Absolutely. I'll put it as an optional add-on in the proposal with a month-to-month commitment — no long-term contract required. You can cancel anytime.

**Cassandra:** This is really thorough. I wasn't expecting this level of detail on the first call.

**Riley:** That's how I make sure we don't have surprises halfway through the build. I'll send you the proposal by tomorrow with all of this broken down. One thing I'll need from you before I start: access to your Make.com account, your Facebook Ads Manager, and a test client's CRM in a sandbox mode if available. We test everything before it ever touches live leads.

**Cassandra:** Perfect. I'll get you that access once I approve the proposal.

**Riley:** Sounds great. Looking forward to working with you, Cassandra.

---

## Debrief Notes for Trainees

| Skill | What to Notice |
|---|---|
| **Variability mapping** | Riley immediately identifies that client differences (different CRMs, different fields) are the complexity driver |
| **Architecture explanation** | Riley explains the "one scenario per client" approach in plain language and gets buy-in before pricing it |
| **Upsell flow** | Maintenance retainer, training session, and per-client fee are all introduced naturally as logical solutions to real concerns |
| **Deduplication suggestion** | Riley proactively raises a problem the client didn't know she had — this is expert-level trust building |
| **Make.com specifics** | References native modules, scenario cloning, and token refresh — shows platform depth without overwhelming the client |

---

## Practice Exercise

Role-play this script. Have the client ask: "What if I want to add a 12th client who's on Salesforce instead of HubSpot?" Practice explaining whether the template applies, what the additional effort is, and how to price it — all without going back to square one on the call.
