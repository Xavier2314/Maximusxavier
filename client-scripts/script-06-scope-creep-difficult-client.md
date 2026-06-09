# Script 06 — BONUS: Handling Scope Creep and a Difficult Client Mid-Project

**Scenario:** A freelancer is in the middle of a Make.com + Monday.com project when the client starts requesting additions that were not in the original scope. The freelancer must professionally handle scope creep, protect their time, maintain the relationship, and turn the situation into an upsell.

**Platforms Featured:** Make.com, Monday.com, Airtable

---

## PART 1 — THE SETUP

*Context: Three weeks into a project, the freelancer (Kai) delivers the first working version of a Monday.com + Make.com integration. The client (Michelle) comes back with a long list of new requests that weren't in the original scope. This script shows how to handle it professionally.*

**Client (Michelle) — via message before the call:**
> "Hey Kai! The workflow looks great. Quick thing — can we also add: an Airtable sync so our data goes to both Monday and Airtable, a weekly PDF report emailed to our board, an SMS notification when a task is overdue, and can the Monday items have color-coded statuses that update automatically based on the task age? Also, can the whole thing run faster? Thanks!"

---

## PART 2 — THE CALL

**Kai:** Hey Michelle, great to connect. I got your message and I want to make sure we handle everything the right way. Before we get into the new requests, how are you feeling about the core workflow we built? Is it doing what we discussed in the original scope?

**Michelle:** Yes, honestly it's working really well. My team loves it. That's actually why I'm thinking about adding more.

**Kai:** That's great to hear — really glad it's landed well with the team. So the excitement makes sense — when automation works, you immediately start seeing more places you want it. I want to be upfront with you about something, and I hope you'll take it in the spirit it's intended.

**Michelle:** Of course.

**Kai:** The original project scope covered the Monday.com integration, the Make.com trigger workflows, and the Slack notifications. Everything in that scope is delivered and working. The items in your message — the Airtable sync, the PDF report, the SMS workflow, and the dynamic status coloring — those are all new features that weren't part of our original agreement. Each of them is doable, but they each require build time, and I want to make sure we handle them properly rather than just absorbing them into the current project without a plan.

---

## PART 3 — HANDLING THE PUSHBACK

**Michelle:** Oh. I kind of assumed those small things would just be included. Some of them seem minor.

**Kai:** I completely understand why it feels that way, and I appreciate you being direct with me. Here's how I think about it: from the outside, things like "add an Airtable sync" sound simple. But the Airtable sync alone means building a new Make.com scenario, mapping fields between three systems, handling edge cases when records exist in one system but not the other, and testing it thoroughly so it doesn't corrupt your existing data. That's several hours of work. Similarly, a weekly PDF report requires pulling data from Monday, formatting it, and automating the email delivery — that's not a checkbox, it's a workflow.

I say this not to push back on you, but because I want you to understand the value of what you're asking for — it's real, substantial work and it deserves proper attention.

**Michelle:** Okay, that makes sense. I didn't realize it was that involved.

**Kai:** Most people don't, and that's totally fine — it's my job to explain it. Here's what I'd suggest: let's go through your list, prioritize the ones that are most important to you, and I'll put together a Phase 2 proposal. That way everything gets built properly, scoped correctly, and you know exactly what you're getting.

---

## PART 4 — TURNING SCOPE CREEP INTO AN UPSELL

**Kai:** Let's go through your list one by one. First — the Airtable sync. Can you tell me why Airtable specifically? Is there something Airtable gives you that Monday doesn't?

**Michelle:** Our leadership team uses Airtable and refuses to move to Monday. So we need data in both places.

**Kai:** That's a legitimate need. That's actually a full integration project on its own — syncing two project management tools in real time is non-trivial. I'd scope that at around $600 to $800.

**Michelle:** What about the PDF report?

**Kai:** The weekly board report — what data does it need to include? Just Monday task statuses, or also financial data?

**Michelle:** Just the Monday tasks. A summary of what was completed, what's overdue, and what's coming up.

**Kai:** That's a cleaner build than I initially thought. That would be around $400.

**Michelle:** SMS notifications for overdue tasks?

**Kai:** That one I'd actually push back on slightly. SMS adds a cost per message through a service like Twilio, and it tends to get noisy fast — people start ignoring it. What if we did a smarter escalation instead? Slack DM to the task owner, and only SMS if no action is taken within 4 hours?

**Michelle:** That's actually better than what I was thinking.

**Kai:** Good. That tiered escalation is around $350. And the color-coded statuses based on task age — that's actually a Make.com scheduled workflow that checks task ages and updates Monday statuses dynamically. That's $250.

**Michelle:** So all four would be...

**Kai:** If we bundle them as a Phase 2 project, I'd put the total at $1,800 rather than the sum of the parts, which would be closer to $2,000. That's a 10% discount for bundling.

**Michelle:** Okay. That's fair. I appreciate you being upfront about it instead of just doing the work and charging me later.

**Kai:** That's never a good situation for either of us. Better to have the conversation now.

---

## PART 5 — THE "RUN FASTER" REQUEST

**Kai:** One more thing from your message — you asked if the workflow could run faster. Can you tell me more about that? Is there a specific step that feels slow?

**Michelle:** When a task gets created, it sometimes takes a few minutes before the Slack notification comes through.

**Kai:** Got it. So the trigger to Slack feels slow. That's likely a Make.com polling interval issue — by default, some scenarios poll for changes every 15 minutes rather than running on a real-time webhook. That's a quick configuration fix on my end, not a new feature. I'll take care of that as part of the current project this week at no extra charge.

**Michelle:** Oh great! I thought it was just how it worked.

**Kai:** No, we can get that to near-real-time. I'll send you a quick update once I've adjusted the scenario.

---

## PART 6 — CLOSING

**Kai:** So to recap: the core project is delivered and working. I'll fix the notification delay this week, no charge. I'll put together a Phase 2 proposal for the four new features — Airtable sync, PDF report, tiered SMS escalation, and dynamic status coloring — bundled at $1,800, with a similar timeline of about 2 to 3 weeks. Does that sound like a plan?

**Michelle:** Yes. This is actually a bigger project than I realized when I first reached out to you.

**Kai:** That happens a lot — automating one thing always reveals five other things you want to automate. That's a good thing. It means the business is growing and you're thinking more strategically. I enjoy these kinds of multi-phase projects.

**Michelle:** I'll watch for the Phase 2 proposal. And thanks for being straightforward about the scope thing — I've had freelancers just do extra work and surprise me with a big invoice.

**Kai:** Never. If anything is going to cost you money, you'll know about it before I touch it. That's a promise.

---

## KEY LESSONS FOR TEAM MEMBERS

| Skill | What to Notice in This Script |
|---|---|
| **Scope creep framing** | Kai acknowledged the client's excitement first, then introduced the scope conversation — not the other way around |
| **Educating without condescending** | Kai explained WHY something "simple" is actually complex — he didn't just say "that's extra work" |
| **Turning objections into questions** | When Michelle said "seems minor," Kai asked her to walk through the list with him — this defuses the standoff |
| **Asking "why Airtable"** | Never accept a request at face value — understand the business reason behind it |
| **Pushback done professionally** | The SMS pushback was Kai proposing a BETTER solution, not refusing a request |
| **Bundling for upsell** | Bundling Phase 2 at a discount was a legitimate commercial tactic that the client appreciated |
| **Quick wins maintain trust** | Fixing the notification delay for free was smart — it showed goodwill and technical competence |
| **No surprise invoices** | Kai's closing promise is the cornerstone of long-term freelance relationships |
