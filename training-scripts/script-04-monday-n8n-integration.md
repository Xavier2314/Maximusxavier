# Script 04 — Monday.com + n8n Integration Project

**Purpose:** Train team members on scoping a Monday.com workflow automation using n8n, including self-hosted vs. cloud conversations and internal operations use cases.  
**Skill Focus:** Technical platform discussion (n8n), internal automation vs. client-facing automation, handling a client who doesn't know what they want.

---

## Characters

- **Taylor** — Freelancer (you)
- **James** — Client, COO of a 30-person SaaS company

---

## Scene: Discovery Call — Monday.com Internal Automation

---

**Taylor:** Hey James, good to meet you. I saw on the form you mentioned Monday.com and wanting to automate some internal processes. Can you give me a quick overview of where the pain is?

**James:** Yeah, so we use Monday.com pretty heavily for our operations and project management. But right now a lot of the stuff that should happen automatically just... doesn't. Like when a task hits a certain status, someone is supposed to notify a client, update another board, maybe create a new item somewhere else. It's all manual and it's inconsistent.

**Taylor:** Okay, I want to make sure I understand the scope before we go further — are you looking to automate things that happen *within* Monday, or are you also looking to connect Monday to other tools outside of it?

**James:** Both, honestly. We use Slack, Google Sheets, and we have a PostgreSQL database internally. Some stuff should flow between all of those.

**Taylor:** Got it. Monday does have its own built-in automation rules, so I want to make sure we use those for the simple stuff and only bring in an external tool like n8n for the things Monday can't do on its own. That keeps things simpler for your team to maintain. Does that approach make sense?

**James:** Yeah, that makes sense. We've actually tried Monday's built-in automations but they hit limits pretty fast.

**Taylor:** That's common. Monday's native automations are good for linear, one-step actions but they struggle with conditional logic, multi-step flows, or anything that touches an external database. n8n is perfect for bridging those gaps. Let me ask about a couple of specific workflows so I can scope this accurately. Can you give me your single most painful manual process right now?

**James:** Probably this: when a task on our "Client Deliverables" board is marked as "Completed," three things need to happen. One, the client should get an automated email from our team — but the email template differs based on which client it is. Two, a row in our Google Sheet tracker should update. Three, a record in our PostgreSQL database should log the completion with a timestamp.

**Taylor:** That's a great concrete example. Let me dig into each piece. The email — when you say it differs by client, do you mean the client's name is inserted, or the entire message is different?

**James:** The structure is the same but there are custom fields — client name, the deliverable name, sometimes a link to the file. And we have about 15 clients so there are 15 versions of "slightly customized."

**Taylor:** Okay, that's a templating problem, not 15 completely different emails. We'd use one template with dynamic variables pulled from the Monday item. The client name, deliverable name, and file link would all be columns on your Monday board — are those fields already there?

**James:** The client name is a column, the deliverable name is the item name, but the file link is just dropped in the updates section, not a dedicated column.

**Taylor:** We'll need to move that file link to a dedicated column — a "link" type column in Monday — so the automation can reliably grab it. That's a small board change your team can make. Does that work?

**James:** Yeah, we can do that.

**Taylor:** Good. For the Google Sheet — is this a master tracker that logs every completed deliverable, or is there a separate tab per client?

**James:** Separate tab per client. Each tab is named after the client.

**Taylor:** So when an item completes, n8n needs to identify which client it is, find the matching tab in the Sheet, and append a row. That's doable. How is the Google Sheet shared — is it in a shared drive your whole team accesses?

**James:** Yes, it's in our Google Workspace shared drive.

**Taylor:** Perfect, we can connect to that with a service account. Now the PostgreSQL piece — is your database hosted internally, on a cloud server, or something like Supabase?

**James:** It's on an AWS RDS instance.

**Taylor:** Okay. Is it publicly accessible or only accessible from within your VPC?

**James:** Only from within our network.

**Taylor:** That's an important detail. If it's inside a VPC, we have two options: we either self-host n8n inside your AWS environment so it has direct access, or we open a specific port with IP whitelisting to allow n8n Cloud to connect. Which route sounds better for your infrastructure team?

**James:** We'd probably prefer self-hosted since our DevOps guy can manage it.

**Taylor:** That's the cleaner solution for your use case honestly. Self-hosted n8n on a small EC2 instance gives you full control and no monthly subscription cost beyond the server. I can handle the n8n deployment and configuration as part of the project, or scope it separately if your DevOps team wants to do it themselves.

**James:** Let's include it in the scope. He's stretched thin.

**Taylor:** Understood. Okay, so here's what I'm scoping: self-hosted n8n deployment on AWS, the workflow I just described for the Deliverables board completion trigger, and I'd want to build in a second workflow for one more use case while we're at it — do you have another high-pain process you'd like to include?

**James:** Yeah — when a new item is created on our "New Projects" board, I want it to automatically create a folder structure in Google Drive for that client and send a Slack message to the project channel.

**Taylor:** Good one. Does the Google Drive folder structure follow a standard template? Like Client Name > Project Name > subfolders for deliverables, assets, feedback?

**James:** Exactly that, yes. Every project gets the same structure.

**Taylor:** Perfect, that's straightforward to automate. The Slack message — is there an existing channel per project or does a new channel need to be created?

**James:** There's an existing #operations channel that gets the notification. We don't create per-project Slack channels.

**Taylor:** Simple. Alright, let me scope the full project: n8n self-hosted deployment on AWS, workflow one for the deliverable completion trigger with email, Google Sheets update, and Postgres log, and workflow two for new project creation with Google Drive folder structure and Slack notification. I'd quote this in the range of **$1,800 to $2,400**. Timeline is approximately **10 to 14 business days** including deployment, build, and a testing period.

**James:** That's within budget. Can you also train our team on how to maintain n8n after you're done?

**Taylor:** Yes — I include a one-hour handoff call and written documentation in every project. If you want a longer training session, I can add a half-day workshop for an additional $300. Most teams find the documentation plus the handoff call is enough to handle minor edits and new simple workflows.

**James:** The documentation and call should be fine for now.

**Taylor:** Perfect. I'll put together a detailed proposal by end of week. Once you sign off, I'll also need temporary AWS access credentials to deploy the n8n instance — I can walk your DevOps person through setting up a scoped IAM role so you're comfortable with what access I have.

**James:** Good thinking. Let's set that up properly.

**Taylor:** Great. Looking forward to it, James.

---

## Debrief Notes for Trainees

| Skill | What to Notice |
|---|---|
| **Native vs. external tool** | Taylor checks what Monday's built-in automations can do before adding complexity — this builds trust |
| **Infrastructure questions** | The VPC/database access question is critical — missing this could make the project impossible after it starts |
| **Client-driven scoping** | Taylor lets James give a second use case rather than inventing scope, then prices it together |
| **Training as an upsell** | The training request is handled as a tiered offering — included at a basic level, optional upgrade available |
| **Security awareness** | Scoped IAM role comment signals professionalism to a technical client |

---

## Practice Exercise

Role-play this script. Have the client say mid-call: "We also use HubSpot — can n8n connect to that too?" Practice confirming HubSpot's API availability, asking what specific data needs to flow, and deciding whether to include it in this scope or a phase two.
