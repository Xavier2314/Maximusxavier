# Fiverr Chat Conversation Script
## Topic: Support Ticket Routing via Gmail + Make.com + Airtable

---

## STAGE 1 — FIRST CONTACT (Messages 1–35)

---

[1] 🟨
Hi! I found your gig on automating Gmail workflows and I think I need something like that. We're getting swamped with customer support emails and it's becoming a mess. Is this something you can help with?

---

[2] 🟦
Hey! Yes, absolutely — this is exactly the kind of thing I work on. Overwhelmed inboxes that need some structure are pretty much my bread and butter. Can you tell me a bit more about what's happening? Like, are emails going to one shared inbox, or do different people check different accounts?

---

💡 **Instructor Note:** Notice how the freelancer doesn't dump a list of questions right away. One focused question to get the client talking naturally. This builds rapport and makes the client feel heard, not interrogated.

---

[3] 🟨
It all goes into one Gmail inbox right now. We have like three or four people on the team and basically whoever sees it first picks it up. The problem is billing questions end up with our tech person and product issues end up with our billing person. Nobody knows who's supposed to handle what.

---

[4] 🟦
Got it — so right now it's whoever gets there first, which means the wrong person is handling tickets and the right person doesn't even know it came in. That's a really common problem and honestly it's an easy one to fix with some automation. What does your team look like on the receiving end — do they each have their own email address, or do you use something like Slack or another tool to communicate internally?

---

[5] 🟨
Everyone has their own company email. We don't really use Slack much, it's mostly just email for everything. So like billing goes to Sarah, tech support goes to Marcus, and general stuff I guess would go to me.

---

[6] 🟦
Perfect, that actually makes this cleaner. So what we'd essentially build is a system that watches your shared support inbox, reads the incoming email, figures out what category it falls into based on the words in the subject line or body, and then routes it directly to the right person — Sarah, Marcus, or you. And while it's doing that, it can log everything in Airtable so you have a running record of every ticket. Does that sound like what you're after?

---

[7] 🟨
Yeah that's exactly it. And honestly if we could also send the customer some kind of automatic reply saying "hey we got your email, someone will be in touch" that would be huge. Right now customers just wait and hear nothing.

---

[8] 🟦
That's a great add-on and it's totally doable in the same workflow. The auto-acknowledgment goes out instantly when the email hits, so customers know they're not shouting into a void. Do you have any kind of template reply you'd want to use, or would you need help writing one?

---

[9] 🟨
We don't have anything. I'd probably need help with that. Also — how does this actually work? Like what tools do you use?

---

[10] 🟦
I use Make.com to build the automation. It's a visual workflow builder — you connect your apps (in this case Gmail and Airtable) and set up logic between them. So your scenario in Make would start with a Gmail trigger that watches the inbox, then a router that checks the email content against keyword filters, then branches off to the right person's email, the Airtable log, and the auto-reply all at once. No code needed, just connections and logic. Have you heard of Make.com before, or is this new territory?

---

[11] 🟨
I've heard of Zapier but not Make. Is it similar?

---

[12] 🟦
Very similar concept but Make is more powerful for this kind of branching logic. Zapier is great for simple one-step automations, but when you need a router that splits into multiple paths based on conditions, Make handles it much more cleanly. It also tends to be more affordable at higher volumes. You'd need a Make account but the free plan might be enough depending on how many emails you get per month — I'll help you figure that out once we get going.

---

[13] 🟨
Ok that makes sense. How much does something like this cost? Like what would you charge for it?

---

[14] 🟦
For this setup — Gmail trigger, keyword-based router, three routing paths, Airtable logging, and the auto-reply template — I'd be looking at around $150. That covers building the full scenario, testing it, writing the acknowledgment template, and a short walkthrough so you understand how to manage it. If you ever need to add a new category later, you'd be able to do it yourself or come back to me for a small update. Does that range work for you?

---

💡 **Instructor Note:** The freelancer gives a clear price with a scope summary attached. This prevents "why does it cost that much" confusion because the client already knows what's included. Notice also the mention of client empowerment — "you'd be able to do it yourself" builds confidence and reduces dependency anxiety.

---

[15] 🟨
That's a bit more than I was expecting honestly. Is there any flexibility there?

---

[16] 🟦
I hear you. The honest answer is that the price reflects the time it takes to build this properly — setting up the connections, mapping out the filters, testing every routing path, and making sure the Airtable logging is clean. If budget is a concern, I could strip it down to just the routing and Airtable log and leave out the auto-reply, which would bring it to around $110. But the auto-reply is genuinely one of the highest-impact pieces for your customers, so I'd hate to see you skip it. What's your rough budget ceiling?

---

[17] 🟨
Honestly if it does everything you said I can probably do $150. I just wanted to make sure I wasn't getting ripped off, you know?

---

[18] 🟦
Completely fair — and you're not. I'd rather you ask than have that doubt sitting there. And I'll say this: with Fiverr, your payment goes into escrow when you place the order, so I don't get paid until you've reviewed the work and approved the delivery. If I don't deliver what I promised, you can raise a dispute. So the platform actually protects you through the whole process.

---

[19] 🟨
Oh I didn't know that. So my money is safe until I say I'm happy with it?

---

[20] 🟦
Exactly. Fiverr holds the funds in escrow from the moment you pay. I only get released once you mark the delivery as accepted. If something's wrong, you can request a revision and I'll fix it before anything gets paid out. It's a clean system and it works in your favor as a buyer.

---

[21] 🟨
Ok good. How many revisions do I get?

---

[22] 🟦
I include two rounds of revisions in the offer. In practice though, if something small is off — like a keyword filter is catching the wrong emails or a routing path needs tweaking — I just fix it, I don't count that as a formal revision. Revisions in my world are for genuine scope adjustments, not minor corrections. I want the thing to work right, full stop.

---

[23] 🟨
That's reassuring. How long would the whole thing take?

---

[24] 🟦
I'd say three to four business days for the full build and test. The first day or so is usually me reviewing your setup and mapping the plan. Then the build itself takes a day or two depending on how straightforward your email categories are. Last stretch is testing — I like to test with the client so you can see it working in real time before I submit the delivery.

---

[25] 🟨
What do you need from me to get started?

---

[26] 🟦
Good question — before we finalize the offer, I want to make sure I have a clear picture of your setup. A few things would help: Do you already have a Make.com account, or would you be starting fresh? And the shared Gmail inbox — is it a standard Gmail account or a Google Workspace address?

---

[27] 🟨
No Make account yet, I'd be starting fresh. And it's Google Workspace — like it's name@ourcompany.com format.

---

[28] 🟦
Perfect, Google Workspace works great with Make's Gmail modules. For the Make account, the free plan gives you 1,000 operations per month — that's basically 1,000 emails processed. If you're getting more than that, the Core plan is $9/month and covers 10,000 operations, which is usually plenty for a growing support queue. We can look at your email volume together and pick the right tier. How many support emails do you think you get in a typical month, rough estimate?

---

[29] 🟨
Maybe 200-300? It's not huge but it's growing. We're launching a new product next month so I expect it to go up.

---

[30] 🟦
At 200-300 now, the free plan technically covers you, but with a product launch coming I'd lean toward starting on the Core plan at $9/month. It's cheap insurance and you won't have to think about hitting a ceiling right when things get busy. That's your call though — I'll make it work either way. I think I have enough to put together a solid offer for you. Want me to send that over now?

---

[31] 🟨
Yes please go ahead.

---

[32] 🟦
Sent! I've put together a custom offer for $150 covering the full setup: Gmail watch trigger connected to a keyword router, three routing paths to Sarah, Marcus, and you, Airtable ticket logging with timestamp and category, and a professional auto-acknowledgment template. Delivery in 4 days with 2 rounds of revisions. Take a look and let me know if you have any questions before you accept.

---

💡 **Instructor Note:** When sending a custom offer, always summarize what's in it in the chat message. Clients often accept offers without reading the fine print, so this makes sure they know exactly what they're buying. It also reduces revision disputes later.

---

[33] 🟨
Looks good. One last thing — you've done this kind of thing before right? Do you have examples?

---

[34] 🟦
Yes — I've built routing automations for e-commerce support teams, SaaS companies, and a few service businesses. The specific details stay private since those are client setups, but the architecture is very consistent. What changes is the keywords and the team structure, which is what we'd customize to your operation. My reviews on the gig page show a few clients who had similar setups if you want to browse those for peace of mind.

---

[35] 🟨
Ok I'm going to accept the offer now. Thanks for being so patient with all my questions!

---

🟦
No patience needed — these are all the right questions to ask. Accepting an offer is a real commitment and you should feel good about it going in. Welcome aboard, let's build something useful.

---

## STAGE 2 — ORDER PLACED & ONBOARDING (Messages 36–50)

---

[36] 🟦
Order confirmed — thanks for moving forward! First things first: I'll need a few things to get set up on my end. No rush, but when you get a chance, can you create a Make.com account at make.com and send me your login email? Don't send the password — I'll send you a connection invite through the platform instead.

---

[37] 🟨
Done! I just signed up. My email is the same as my work email, hello@ourcompany.com. What's next?

---

[38] 🟦
Great. I'll also need read access to the Gmail inbox where support emails land. The easiest way is to go into your Google Workspace admin and add me as a delegate on that account — my Gmail is the one on my Fiverr profile. Alternatively, if you're not comfortable with that, you can share the login credentials through Fiverr's encrypted message system. Which feels easier for you?

---

[39] 🟨
I'll do the delegate thing, that sounds safer. Give me a few minutes.

---

[40] 🟦
Take your time. While you do that, can you also drop me the email addresses for Sarah, Marcus, and yourself? Those are the three routing destinations we'll be sending tickets to.

---

[41] 🟨
Sure. Sarah is sarah@ourcompany.com, Marcus is marcus@ourcompany.com, and I'm at james@ourcompany.com. Delegate access should be coming through now.

---

[42] 🟦
Got the delegation request, I'll accept it now. Last piece for setup: do you already have an Airtable account? If not, the free tier is totally fine for this — we'll be creating one table to log incoming tickets, so you don't need anything paid.

---

[43] 🟨
We have an Airtable account but we've barely used it. I can share the workspace with you. What's your Airtable email?

---

[44] 🟦
You can invite me using the email on my Fiverr profile — same one as the Gmail. Just invite me as a collaborator on the workspace and I'll set up the table structure from there. I'll create a base called "Support Tickets" with fields for date received, sender email, subject, category, assigned team member, and status.

---

[45] 🟨
Invite sent! Are you going to need anything else from me right now?

---

💡 **Instructor Note:** Notice how the freelancer is collecting everything in stages, not dumping a giant checklist on the client at once. This keeps onboarding from feeling overwhelming. Each request is specific and explainable — the client always knows why something is being asked for.

---

[46] 🟦
That's everything I need for now. I have Gmail access, Make.com account, Airtable workspace, and the three routing addresses. I'm going to spend today reviewing the Gmail inbox to understand what kinds of emails are coming in, and then I'll come back with a proposed plan before I build anything. You'll get to approve the approach before I touch anything. Sound good?

---

[47] 🟨
Yes that sounds great. How long before you come back with the plan?

---

[48] 🟦
I'll have a first look done by tomorrow and send you a summary. Probably mid-morning your time — just let me know what timezone you're in so I can set realistic expectations.

---

[49] 🟨
We're EST. And just to confirm — you're not going to accidentally mess with any of our actual emails right? I just want to make sure nothing gets deleted or moved without us knowing.

---

[50] 🟦
100% — in this phase I'm only reading, not touching anything. Make.com's Gmail trigger is read-only when we're setting up the connection. I won't configure any write actions until you've seen and approved the full plan. Your inbox stays exactly as it is right now.

---

## STAGE 3 — DIAGNOSIS / PLANNING (Messages 51–80)

---

[51] 🟦
Morning! I've had a good look at the inbox and I'm ready to walk you through what I'm thinking. Before I do — did you want to jump on a quick voice call, or do you prefer to keep it in chat? Either works for me.

---

[52] 🟨
Chat is fine! I can read at my own pace. Go ahead.

---

[53] 🟦
Perfect. So here's what I found in the inbox: emails are coming in from all kinds of senders and they're all over the place in terms of subject lines. Some say "help with my order," some say "billing question," some just say "hi." The good news is that the actual email body almost always has clear signals — words like "invoice," "charge," "refund" show up for billing stuff, and words like "not working," "error," "bug," "login" show up for technical issues. That's what we'll use for routing.

---

[54] 🟨
So it reads the body of the email, not just the subject line?

---

[55] 🟦
Exactly — we'll check both. The way the router in Make works is: it takes the email bundle (which includes subject, body, sender) and then runs each one through a series of filters. Filter one checks: does the subject OR body contain any billing-related keywords? If yes, route to Sarah. Filter two checks for tech keywords. If yes, route to Marcus. If neither matches, it falls to a default "General" path that routes to you. Nothing slips through uncategorized.

---

[56] 🟨
That makes sense. What kind of keywords were you thinking for each category?

---

[57] 🟦
Based on what I saw in the inbox, here's what I'd start with — but you know your customers better than I do, so let's treat this as a draft. For billing: "invoice," "payment," "charge," "refund," "subscription," "billing," "receipt," "price." For technical: "error," "bug," "not working," "broken," "login," "crash," "issue," "glitch." And then anything that doesn't match either goes to General. Do those lists feel right to you, or are there terms you'd want to add or remove?

---

[58] 🟨
Those look pretty solid. I'd add "cancel" and "cancellation" to billing since people usually contact us when they want to cancel a plan.

---

[59] 🟦
Great catch — that's exactly the kind of thing only you'd know. Added. Anything on the tech side that you know customers commonly use when something's broken?

---

[60] 🟨
"Can't log in" is a really common one. And "access" — like "I can't access my account."

---

[61] 🟦
Both going in. For "can't log in" I'll set up the filter to check for the phrase "can't log in" as well as just "login" and "access" separately, so we catch all the variations. Make's text filter supports both exact phrase matching and individual keyword matching — I'll use a combination so we're not too strict or too loose.

---

[62] 🟨
How does the keyword detection actually work technically? Like does it scan the whole email?

---

💡 **Instructor Note:** The client is asking a technical "how does it work" question. The freelancer's job here is to explain clearly without either dumbing it down or drowning them in jargon. Real expertise shows in the ability to translate, not in using complex terms.

---

[63] 🟦
Good question. In Make, when the Gmail trigger fires, it captures the email as a "bundle" — basically a package of data that includes the sender, subject, body text, date, and a few other fields. The router module then evaluates that bundle against each filter condition. The filter in our case uses a text operator called "contains" — so it checks whether the text field (subject + body combined) contains any of the keywords we define. If the condition is true, the bundle goes down that branch. If false, it moves to the next filter. It's sequential logic, not simultaneous, so order matters.

---

[64] 🟨
What does "order matters" mean?

---

[65] 🟦
So if an email mentions both "refund" and "login issue" — which is rare but possible — the router will send it down whichever branch it hits first. In Make, the router checks filters from top to bottom. So if billing filter is first and the email has both billing and tech keywords, it goes to Sarah. We just want to make sure the order of priority makes sense to you. Should billing take priority over tech in a conflict, or the other way around?

---

[66] 🟨
Billing first. Those ones are usually more time-sensitive.

---

[67] 🟦
Done — billing filter goes at the top of the router. Tech second, General as the fallback. That's actually the full routing architecture sorted. The Airtable side is straightforward: every email that comes in, regardless of which path it takes, gets a new row created in the Support Tickets table. Fields will be: Ticket ID (auto), Date Received, Sender Name, Sender Email, Subject, Category, Assigned To, and Status (defaulting to "Open").

---

[68] 🟨
Will we be able to search the Airtable log? Like if Sarah wants to find all her open tickets?

---

[69] 🟦
Yes — Airtable has built-in filtering and views. I'll set up three personal views when I build the base: one filtered to Sarah's tickets, one for Marcus, one for General. Each person can open their own view and see only what's assigned to them. They can also sort by date or status. I'll add a short note in the handover document explaining how to use the views.

---

[70] 🟨
That's actually more than I expected. That's cool.

---

[71] 🟦
Happy to do it — it takes an extra 20 minutes and makes the whole thing actually usable day-to-day. One more thing on the plan: the auto-acknowledgment. This goes out instantly via Gmail when a new email hits the trigger. It'll come from your support inbox so customers see your address, not some random automation address. I'll write it in a warm but professional tone — something like "Thanks for reaching out, we've received your message and a team member will be in touch within [X] hours." What's your target response time to give customers?

---

[72] 🟨
We try to respond within 24 hours but we're not always great at that honestly.

---

[73] 🟦
I'd suggest saying "within 1 business day" rather than 24 hours — it's more honest and gives you weekends without breaking the promise. Want me to write the full template and send it to you for approval before I bake it into the scenario?

---

[74] 🟨
Yes please, I'd like to review it before it goes live.

---

[75] 🟦
Will do. I'll draft it and send it here for your sign-off before anything gets connected. So to recap the full plan: Gmail instant trigger watches the support inbox, the bundle goes to a router with three branches (billing → Sarah, tech → Marcus, general → James), each path triggers an email notification to the right person AND creates an Airtable record AND fires the auto-acknowledgment to the customer. Does that architecture make sense to you?

---

[76] 🟨
It does. I'm kind of amazed this is all possible without code.

---

[77] 🟦
That's Make's whole value proposition — it's a lot of power with a visual interface. The logic is real, the connections are real, it's just that you're configuring them with a drag-and-drop builder instead of writing API calls. Ok — I'm going to move into the build phase. I expect to have a working draft in about two days. I'll send you updates as I go.

---

[78] 🟨
Sounds great. What's the auto-reply template going to look like?

---

[79] 🟦
Here's the draft — let me know what you think:

Subject: We received your message — [Your Company Name] Support

Hi [Customer Name],

Thank you for getting in touch. We've received your message and a member of our team will be with you within 1 business day.

In the meantime, if your issue is urgent, please reply to this email and include "URGENT" in the subject line.

Thanks for your patience,
The [Your Company Name] Support Team

I can personalize the customer name dynamically using the sender's name from the email header, so it won't say "[Customer Name]" — it'll actually say their name.

---

[80] 🟨
I love that. Let's go with that. "URGENT" in the subject is a nice touch — does that do anything in the system?

---

## STAGE 4 — WORK IN PROGRESS (Messages 81–105)

---

[81] 🟦
Not yet — but it's a great segue into something I was already planning to suggest. I can add a priority detection layer to the router so that if an email subject or body contains words like "urgent," "ASAP," "refund," or "lawyer," it gets flagged as high priority in Airtable and routes to the right person with a special subject line like "[HIGH PRIORITY]" prepended to the forwarded email. Want that included?

---

[82] 🟨
Oh wow, yes. Especially the refund one — those tend to get heated if ignored.

---

[83] 🟦
Agreed. "Refund" will pull double duty — it routes to Sarah via the billing filter AND triggers the priority flag. I'll build that in as part of the main scenario. Doesn't add to the cost, it's a clean addition to what we're already building.

---

[84] 🟨
You're adding more than I paid for — is that ok?

---

[85] 🟦
Priority flagging is a small logic addition, not a separate feature — it fits naturally in the router I'm already building. It makes the system more complete and I think you'll thank yourself for it later. No extra charge.

---

[86] 🟨
That's really generous. Thank you.

---

[87] 🟦
Update time: I've built and connected the Gmail trigger in Make. The scenario is watching the support inbox in real time — I sent a test email from a dummy address and it fired immediately. The Make.com Gmail module is using the "Watch Emails" instant trigger, which means it processes emails the moment they arrive rather than checking every 15 minutes like a scheduled poll. That's important for your use case.

---

💡 **Instructor Note:** This is a great first update message. It's specific (Gmail trigger is live, instant vs. scheduled explained), it shows progress without being overwhelming, and it reassures the client that things are moving. Vague updates like "working on it" create anxiety — specific updates build confidence.

---

[88] 🟨
Oh interesting, so it's truly instant? Not like a delay?

---

[89] 🟦
Correct. Gmail has a push notification system that Make taps into — it's called a Gmail instant trigger. As soon as an email hits the inbox, Google pings Make's webhook, which kicks off the scenario immediately. The alternative would be a scheduled trigger that polls every X minutes, but that can create delays of up to 15 minutes. For support tickets, instant is the right call.

---

[90] 🟨
Totally agree. This is great.

---

[91] 🟦
Second update: the router is built with all three branches. I've mapped in all the keywords we agreed on — billing keywords (including "cancel" and "cancellation") on the first filter, tech keywords (including "can't log in" and "access") on the second, and the General fallback is the third path for anything that doesn't match. I also added the priority detection logic — there's a separate filter on each path that checks for your priority keywords and sets a variable accordingly. That variable feeds into both the Airtable log and the forwarded email subject.

---

[92] 🟨
What happens when the priority variable is set? Like walk me through what Sarah would see.

---

[93] 🟦
Sure. So a customer emails in saying "I need a refund immediately, this is urgent." The scenario fires. Billing filter matches ("refund"). Priority filter also matches ("refund" + "urgent"). Sarah gets an email with the subject "[HIGH PRIORITY] Refund request from customer@email.com — please respond today." The Airtable record gets created with Category: Billing, Priority: High, Assigned To: Sarah, Status: Open. The customer gets the acknowledgment reply within seconds. Sarah knows exactly what it is before she even opens it.

---

[94] 🟨
That's really clean. Ok I'm impressed.

---

[95] 🟦
One thing came up while I was building that I want to flag. When I tested the keyword filters against your actual inbox history, I noticed there's a chunk of emails — maybe 15-20% — that don't clearly match billing or tech. Things like "partnership inquiry," "press request," one person asking if you offer custom pricing. These would all fall to General and land with you. That's actually fine and expected — General is the right catch-all. But I wanted you to know it's a meaningful volume, not just the occasional edge case. You might want to add a fourth routing path eventually for sales/partnership inquiries.

---

💡 **Instructor Note:** The freelancer found something the client didn't ask about — and handled it professionally by flagging it without alarm. They're not trying to upsell right now, just being transparent. This is the "unexpected finding" moment. It builds trust because it shows the freelancer is actually paying attention, not just building to spec blindly.

---

[96] 🟨
Huh, I hadn't thought about that. You're right, those do pile up. Can we add a fourth category?

---

[97] 🟦
Absolutely — I'll add a "Sales & Partnerships" path with keywords like "partnership," "press," "media," "pricing inquiry," "custom plan," "enterprise." Any other signals you want that route to catch?

---

[98] 🟨
"Demo request" — we get a lot of those too.

---

[99] 🟦
Added. That path will route to you as well, or would you prefer those go to someone specific? Sometimes sales inquiries are better handled separately from general ops.

---

[100] 🟨
Actually yeah — let's route sales and partnerships to me, and keep the true General catch-all going to me too. I'll sort through both.

---

[101] 🟦
Makes sense. I'll give the two paths different Airtable categories — "Sales/Partnership" vs. "General" — so you can tell them apart in your Airtable view even though they both land in your inbox. That way your reporting stays clean.

---

[102] 🟨
Smart. I wouldn't have thought of that.

---

[103] 🟦
Third update: the Airtable module is connected and creating records correctly. I ran five test scenarios — billing match, tech match, general, sales, and priority — and all five created the right record with the right fields. I also set up the three personal views in Airtable (Sarah, Marcus, and James/General) and added a fourth view for Sales. The auto-reply module is connected and sending from your support inbox. I did a test and the reply landed in the test inbox within about 4 seconds of the original email arriving.

---

[104] 🟨
4 seconds! That's amazing. Customers are going to love that.

---

[105] 🟦
It's one of those things that feels invisible when it works but makes a huge impression. Ok — I'm doing final internal testing now. I'll be ready to do a live test with you tomorrow. I'll walk you through what to do, you send some test emails, and we watch the whole thing happen in real time together. Does that work?

---

## STAGE 5 — TESTING WITH CLIENT (Messages 106–120)

---

[106] 🟦
Ready to test! Here's what I'd like you to do: send four emails to your support inbox from a personal email address (not your work email). For the first, put "I have a billing question about my invoice" in the subject. For the second, "I can't log in to my account." For the third, "Hi, I'm interested in a partnership." For the fourth, put "URGENT: I need a refund right now." Send them one at a time with about 30 seconds between each. I'll be watching the Make.com scenario dashboard live.

---

[107] 🟨
Ok sending now. First one just went out.

---

[108] 🟦
I can see it! The scenario fired, billing filter matched, record created in Airtable under Billing category, forwarded to sarah@ourcompany.com. Auto-reply sent. All in about 3 seconds. Send the next one when you're ready.

---

[109] 🟨
Sent the login one.

---

[110] 🟦
Tech filter matched, Marcus route fired, Airtable logged it. Auto-reply sent. Clean. Go ahead with the partnership one.

---

[111] 🟨
Sent. And now the urgent refund one.

---

[112] 🟦
Partnership went to Sales route, correct. Now watching for the urgent one... there it is. Billing filter matched ("refund"), priority flag triggered ("urgent" + "refund"), Sarah's email went out with "[HIGH PRIORITY]" in the subject, Airtable record shows Priority: High. All four paths working perfectly.

---

💡 **Instructor Note:** Testing with the client in real time is one of the most powerful trust-building moments in a freelance project. The client gets to SEE it work. They're not taking your word for it — they participated in the proof. This massively reduces post-delivery disputes and revision requests.

---

[113] 🟨
This is so cool. I'm watching the Airtable records appear. This is exactly what I wanted.

---

[114] 🟦
Check your support inbox too — you should have four auto-reply emails waiting for you in your personal inbox, addressed to your personal name.

---

[115] 🟨
Yes! They came through. One thing I'm noticing — the "can't log in" email also seems to be routing to the billing path? Like Marcus got it but there's also something going to Sarah?

---

[116] 🟦
Good catch — let me look at that. Ah, I see it. The word "access" in the body of the login email is too broad — it's also triggering one of the billing filter conditions because I included "access" in the billing keywords when you mentioned it earlier. My mistake — "access" should only be in the tech filter. Give me five minutes and I'll tighten that filter.

---

[117] 🟨
No worries! I figured it was something like that.

---

[118] 🟦
Fixed. I removed "access" from the billing keyword list and re-ran the test email. Now the login email routes only to Marcus, no overlap. Can you send that second test email one more time so we can confirm?

---

[119] 🟨
Sent. Yep — only Marcus this time. And it's in Airtable under Tech. That's perfect.

---

[120] 🟦
Excellent. We're fully confirmed across all four paths. Billing, Tech, Sales, General, and priority flagging all working correctly. I'll put together the formal delivery now. Give me an hour or so to write the documentation and wrap everything up cleanly.

---

## STAGE 6 — FORMAL DELIVERY (Messages 121–130)

---

[121] 🟦
Delivery submitted! Here's a summary of everything that was built and tested:

✅ Gmail Instant Trigger — scenario watches your support inbox in real time using Make.com's Gmail Watch Emails module with push notification (not scheduled polling)

✅ Keyword Router — four-path router with text filters: Billing (→ Sarah), Technical Support (→ Marcus), Sales & Partnerships (→ James), General (→ James)

✅ Priority Detection — high-priority flag triggers on keywords: "urgent," "ASAP," "refund," "lawyer" — adds [HIGH PRIORITY] to forwarded subject line and marks Priority field in Airtable as High

✅ Airtable Logging — every incoming email creates a record with: Date Received, Sender Name, Sender Email, Subject, Category, Priority, Assigned To, Status (default: Open)

✅ Airtable Views — four personal views set up (Sarah, Marcus, James/General, Sales) for easy per-team filtering

✅ Auto-Acknowledgment — branded reply sent from your support inbox within seconds of receipt, with dynamic customer name and 1 business day response commitment

✅ Keyword List Documentation — included in handover doc so you know exactly what triggers each route

Everything is live and tested. Please review and mark as complete when you're happy. And don't hesitate to reach out if anything feels off once real emails start flowing through.

---

💡 **Instructor Note:** This is what a professional delivery looks like. It's not "here you go, let me know if it works." It summarizes every deliverable, confirms testing, and gives the client confidence that everything is accounted for. The ✅ format makes it easy to scan. The last line opens the door for feedback without inviting unnecessary revision requests.

---

[122] 🟨
This is incredible. I just accepted the delivery. Honestly this exceeded my expectations — I thought I was getting a basic email sorter and you built something that actually thinks about our workflow.

---

[123] 🟦
That's the goal. A system that fits how you actually work is worth ten times more than one that just technically functions. Really glad it landed well.

---

[124] 🟨
Sarah and Marcus are going to be so relieved. And honestly so am I — this has been stressing me out for months.

---

[125] 🟦
Those are the best results to hear about — when something that was a constant background stressor just... stops being one. That's what good automation should do.

---

[126] 🟨
Do I need to do anything to keep it running? Like is there maintenance?

---

[127] 🟦
Make.com handles the infrastructure — as long as you keep your account active and your Gmail/Airtable connections authorized, it runs without maintenance. The one thing to watch is that Google occasionally prompts you to re-authorize the Gmail connection (usually every few months). When that happens, you'll get an email from Make saying the scenario has an error, and you just click to reconnect. Takes 30 seconds. Other than that, it runs itself.

---

[128] 🟨
That's very manageable. What if I want to add a new keyword later?

---

[129] 🟦
Easy — log into Make, open the scenario, click the router, find the relevant filter, and add the keyword to the existing list. The handover doc I included walks through exactly how to do that with screenshots. If you ever get stuck, you can message me and I'll handle it for a small fee, but honestly once you see the interface it's very intuitive.

---

[130] 🟨
Perfect. I feel like I actually understand how this works now, which is more than I can say for most tech stuff we've paid for. Thank you.

---

## STAGE 7 — UPSELL (Messages 131–145)

---

[131] 🟦
I'm really glad to hear that. One last thing before I sign off — I noticed something while I was in your inbox during testing that I wanted to flag. You have a handful of older emails that are clearly unresolved — tickets from customers who followed up a second time because they never got a response. With the new system, that shouldn't happen going forward, but there's no automatic way right now to catch a ticket that gets logged in Airtable and then just... sits there. What if we added a second automation that checks for tickets that have been Open for more than 48 hours and sends an escalation alert — something like a reminder email to you and the assigned team member?

---

[132] 🟨
Oh man, that's a real problem. We definitely have tickets that fall through the cracks even when people see them. An automatic nudge would help a lot.

---

[133] 🟦
Exactly — it's one thing to route a ticket to the right person, it's another to make sure they actually close it. The escalation scenario would be a separate Make.com scenario that runs on a schedule — let's say every morning at 9am EST. It queries your Airtable base for any records where Status is still "Open" and Date Received is more than 48 hours ago. For each one it finds, it sends a summary email to you and the assigned person with the ticket details and a note that it's been open past the SLA threshold.

---

[134] 🟨
That sounds really useful. How hard is that to build?

---

[135] 🟦
It's a separate but simpler scenario. The complexity is lower than the routing build — it's an Airtable Search Records module, a filter for date + status, and a Gmail Send Email module. No router needed. I'd estimate about a day to build and test. It would be a separate order since it's a new deliverable.

---

[136] 🟨
How much would you charge for that?

---

💡 **Instructor Note:** The upsell is introduced naturally — "I noticed something while I was in there." It addresses a real problem the client already feels (tickets falling through the cracks), not an invented need. This is the right way to upsell: solve an adjacent problem you genuinely spotted, and explain the value clearly before mentioning price.

---

[137] 🟦
For this one I'd say $75. It's a smaller scope — one scenario, two modules, testing, and a short handover note. I can have it done in two days.

---

[138] 🟨
$75 feels very fair for what you described. Can you send a custom offer?

---

[139] 🟦
Sending it now. Just to confirm what's included: Airtable scheduled query for open tickets past 48 hours, escalation email to assigned team member + you with ticket details, delivered in 2 days with 1 revision.

---

[140] 🟨
Accepted! Let's do it.

---

[141] 🟦
Great. This one moves fast since I'm already familiar with your Airtable structure. I'll be back with an update tomorrow.

---

[142] 🟦
Update: escalation scenario is built. It runs every morning at 9am EST via Make's scheduled trigger. I tested it by temporarily changing a test record's date to 3 days ago — the scenario found it, flagged it, and sent the escalation email to both you and the assigned team member with the ticket subject, sender email, category, and how many hours it's been open. Clean and readable.

---

[143] 🟨
Wow, fast! I just got the test escalation email. Subject says "Escalation Alert: Ticket open 72+ hours." That's exactly what I needed to see.

---

[144] 🟦
Delivery submitted for the escalation scenario. Everything is connected and tested. Your Airtable base now has two automations running against it — the inbound router that creates records, and the daily escalation check that flags anything going stale. Between the two, nothing should fall through unnoticed.

---

[145] 🟨
Delivery accepted! You've basically transformed how our support works in less than a week. I couldn't be happier.

---

## STAGE 8 — REVIEW & CLOSE (Messages 146–150)

---

[146] 🟦
That's really great to hear. It's been a pleasure working through this with you — you asked good questions throughout and gave clear feedback, which made everything go smoothly on my end. I hope Sarah and Marcus find their new inboxes a lot more manageable.

---

[147] 🟨
They already do! Marcus just texted me saying he opened his email and there was a ticket already tagged with his name and category. He had no idea it was coming. Sarah said the same thing — she actually thanked me for "finally fixing it." Ha.

---

[148] 🟦
That's the best possible outcome. If you ever need to expand the system — more categories, a Slack integration, escalation tiers, anything — you know where to find me. And if you have a moment to leave a review on the order, it genuinely helps. No pressure, but honest feedback from a real project like this means a lot.

---

[149] 🟨
⭐⭐⭐⭐⭐ — Public Review:

I came to this gig not really knowing what I needed — just that our support emails were chaos. Emails going to the wrong people, customers waiting days without a response, and our team playing inbox roulette. Within a week, all of that is solved.

The freelancer built a complete support ticket routing system using Make.com connected to our Gmail inbox and Airtable. Emails now get automatically categorized — billing goes to Sarah, technical issues go to Marcus, sales inquiries go to me — based on keyword filters that actually match how our customers write. Customers get an auto-acknowledgment reply within seconds of emailing in, which has already generated positive comments from clients who said they never heard back from us that fast.

Beyond the core routing, the freelancer added priority detection so anything marked urgent or containing "refund" gets a special flag and a high-priority subject line in the forwarded email. The Airtable log is clean and has personal views already set up for each team member. And after delivery, they noticed our old tickets were going unresolved and suggested an escalation alert system — now we get a daily email if any ticket has been open for more than 48 hours. I didn't ask for that — they spotted it and offered it, and it's already caught two tickets that would have slipped through.

Communication throughout was excellent. No jargon without explanation, realistic timeline, showed up with updates without me having to ask. Highly recommend for anyone who wants their email workflow to actually work.

---

💡 **Instructor Note:** This is what a great review looks like. It's specific — it names the tools (Make.com, Gmail, Airtable), describes the actual problem that was solved, calls out specific features (priority detection, escalation alerts, personal Airtable views), and mentions the proactive upsell as a positive. Clients write reviews like this when the freelancer communicated well throughout and the outcome exceeded expectations. You can't fake this kind of review — you earn it.

---

[150] 🟦
⭐ — Public Freelancer Response:

Thank you so much for this — it genuinely made my day to read. James came in with a clear pain point and was a fantastic collaborator throughout. He gave precise feedback on the keyword lists, trusted the process during testing, and asked exactly the right questions at every stage. The priority flag and escalation scenario came out of paying attention to what was actually in the inbox, and I'm really glad those pieces added value beyond the original scope. Hearing that Sarah and Marcus noticed a difference immediately is exactly why I do this work. Looking forward to supporting the team as the system grows — especially with that product launch coming up!

---

*End of conversation. 150 messages. All 8 stages complete.*

---

## Summary of What Was Built

**Primary Scenario (Make.com):**
- Gmail Watch Emails instant trigger on support inbox
- Router with 4 branches: Billing, Technical, Sales/Partnerships, General
- Priority detection filter overlaid on all paths
- Gmail Send Email module for team routing notifications
- Gmail Send Email module for customer auto-acknowledgment
- Airtable Create Record module for ticket logging

**Secondary Scenario (Make.com):**
- Scheduled trigger (daily, 9am EST)
- Airtable Search Records module for open tickets >48 hours old
- Gmail Send Email module for escalation alerts

**Airtable Base:**
- Table: Support Tickets
- Fields: Ticket ID, Date Received, Sender Name, Sender Email, Subject, Category, Priority, Assigned To, Status
- Views: Sarah, Marcus, James/General, Sales

**Total Project Value:** $225 ($150 routing build + $75 escalation scenario)
