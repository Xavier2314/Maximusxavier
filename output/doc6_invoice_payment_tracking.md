# Fiverr Chat Conversation Script
## Topic: Invoice and Payment Tracking Automation
### QuickBooks → Gmail Reminders + Google Sheets Dashboard via Make.com

---

## STAGE 1 — FIRST CONTACT (Messages 1–35)

---

**[1]**
🟨 Hi! I saw your gig about automation and accounting integrations. I run a small consulting firm and honestly I'm losing sleep over unpaid invoices. We have clients who just… forget to pay. Or maybe I'm the one forgetting to follow up. It's gotten to the point where I don't even know which invoices are overdue until something bad happens. Is this something you can help with?

---

**[2]**
🟦 Hey! Yes, this is exactly the kind of thing I work on. Losing track of invoices is more common than people think — and it's almost always a workflow problem, not a people problem. You're probably not bad at follow-up, you just don't have a system that catches things automatically.

Before I give you any details, can I ask — are you using any accounting software right now? Something like QuickBooks, FreshBooks, or Wave?

---

💡 **Instructor Note:** Notice how the freelancer opens by validating the client's pain point before asking a question. This builds rapport immediately. The first question is specific and practical — it reveals what platform they're on, which determines everything about the solution. Never open with "Sure, I can do that, here are my prices."

---

**[3]**
🟨 Yes, we use QuickBooks Online. We've been on it for about two years. I love it for the accounting side but the reminder stuff is pretty basic. Like I can set it to send one reminder but that's about it. And half the time I forget to turn that feature on when I create the invoice.

---

**[4]**
🟦 Got it — QuickBooks Online is great to work with, it has a solid API. So the native reminders are pretty limited, you're right. What I usually build is a Make.com scenario that checks QuickBooks daily for any overdue invoices, then fires off personalized reminder emails through Gmail — and logs everything to a Google Sheet so you have a running dashboard.

Do you currently use Gmail for your business email, or is it something else like Outlook?

---

**[5]**
🟨 Yes, Gmail. We're on Google Workspace actually. And a Google Sheet dashboard sounds perfect — I've been trying to keep one manually but it falls apart after a week. What's Make.com? Is that something I'd need to pay for?

---

**[6]**
🟦 Make.com is an automation platform — it connects apps together and runs workflows on a schedule. Think of it like a behind-the-scenes assistant that checks your QuickBooks every morning, figures out who's overdue, emails them, and updates your spreadsheet automatically. You never have to touch it.

For pricing — Make has a free plan that includes 1,000 operations per month. Depending on how many invoices you're tracking, you might stay on the free plan or need their Core plan which is around $9/month. I'll give you a clear picture once I understand your volume better.

---

**[7]**
🟨 Okay that sounds reasonable. How many invoices are we talking about — like does it matter? We probably have 20 to 30 active invoices at any given time, some of them go past due every month. Maybe 8 to 10 overdue ones on average?

---

**[8]**
🟦 That's a very manageable volume. With 8-10 overdue invoices being checked daily, you'd be well within the free Make.com tier. Operations add up quickly on larger accounts, but for your size this should stay lean.

One more thing I want to understand — when you say clients forget to pay, is that mostly first-time late payments, or do some clients go 30, 60, even 90 days overdue? That changes how I'd design the reminder schedule.

---

**[9]**
🟨 Honestly both. Some just forget once and pay right away when they get a nudge. Others are chronic — I have one client who's been 45 days overdue for three months. At some point I stopped chasing them but I probably shouldn't have.

---

**[10]**
🟦 That's really useful context. So you'd probably want tiered reminders — something like a gentle nudge at 7 days, a more direct reminder at 14 days, and a firm "please contact us" message at 30 days. Each email would be different in tone so it doesn't feel like spam.

Is there anyone else on your team who handles collections or billing, or is this all you?

---

**[11]**
🟨 It's basically me and my office manager. She helps but she doesn't always know which invoices are overdue unless I tell her. That's part of the problem too — there's no central place we both look at.

---

**[12]**
🟦 That's exactly what the Google Sheet dashboard solves. It becomes your shared source of truth — both of you can see every overdue invoice, how many days it's been, what reminder stage it's at, and whether payment has come in. No more guessing or stepping on each other.

Let me put together a rough scope for you. Do you want me to send a custom offer, or would you like to know more about how it works first?

---

**[13]**
🟨 I'd like to know a bit more first. Like how does this actually work — does it pull data from QuickBooks every day on its own? I don't want to have to log in somewhere and press a button every morning.

---

**[14]**
🟦 Completely hands-off once it's live. Make.com has a scheduled trigger — I set it to run every day at a time you pick, say 8am. When it fires, it pulls overdue invoices directly from QuickBooks via the API, checks each one against your rules (7, 14, 30 days past due), sends the right email through Gmail, and writes the update to your Google Sheet. You don't do anything.

The only time it needs your attention is if a payment comes in late and QuickBooks updates — the scenario picks that up too and marks the invoice as cleared in the sheet.

---

**[15]**
🟨 Wait, so if a client pays, it automatically marks it as paid in my Google Sheet? I don't have to go update it manually?

---

**[16]**
🟦 Exactly. The scenario checks QuickBooks for the invoice status. Once QuickBooks shows it as paid, the next daily run picks that up and updates the row in your sheet — changes the status, adds the payment date, and stops future reminders for that invoice. You never touch the sheet manually for status updates.

---

**[17]**
🟨 That's honestly what I need most. I've been manually updating a spreadsheet and it's a nightmare. How long does something like this take to build?

---

**[18]**
🟦 For this scope — QuickBooks connection, three-tier reminders, Gmail integration, and the Google Sheet dashboard — I'd estimate 3 to 4 business days. That includes setup, testing with real data, and a short walkthrough so you know what you're looking at.

I also leave a testing window where we run it together and confirm everything fires correctly before I hand it off.

---

**[19]**
🟨 Okay and what about price? I want to be upfront — I don't have a huge budget. I've been burned before by people who quoted low and then said "oh that's extra." I just want to know what I'm actually getting.

---

**[20]**
🟦 I totally get it, and I appreciate you being upfront. Here's how I work — everything we've discussed is included in a single flat price. No "oh that module costs extra," no surprise add-ons. The only thing that could add cost is if you asked for something fundamentally different mid-project, and even then I'd tell you before doing it.

For this project, I'd put a custom offer together at $275. That covers the full build, testing, and documentation so you know how it works.

---

💡 **Instructor Note:** The client raised a price objection rooted in past bad experience. Notice the freelancer didn't get defensive or drop the price immediately. They addressed the real fear (hidden costs) and gave a clear flat-rate number with scope. Responding to the emotional concern first, then the price, is far more effective than just saying "here's my price."

---

**[21]**
🟨 $275 for all of that? That seems pretty reasonable actually. But I have a question — I've had a bad experience on Fiverr before where a freelancer disappeared after I paid. How does Fiverr protect me?

---

**[22]**
🟦 Totally fair question. Fiverr holds your payment in escrow — it doesn't release to me until you click "Accept Delivery." If I disappear or don't deliver, you can open a dispute and Fiverr's resolution team gets involved. You're not just handing money to a stranger.

I also do milestone-style communication so you're never in the dark. You'll hear from me every day or two with an update, and I'll tag you when I need something from you.

---

**[23]**
🟨 Good to know. So I'd need to give you access to my QuickBooks and Gmail? I'm a little nervous about that. Is there a way to do it safely?

---

**[24]**
🟦 Yes, and this is important. You never share passwords with me. Make.com uses OAuth connections — you authorize each app through their official login page, the same way you'd connect an app on your phone. The connection lives in your Make.com account, which you own. You can revoke my access to your Make.com account any time after the project.

I'd also recommend creating a Make.com account before we start so everything sits under your email from day one.

---

**[25]**
🟨 Oh okay so it's not like I'm giving you my QuickBooks password. That makes sense. What about the Gmail — same thing?

---

**[26]**
🟦 Same thing exactly. Gmail connects through Google's OAuth. Make.com asks you to approve what it can do — in this case, "send emails on your behalf." You approve it in your own Google account, and that connection sits in your Make.com workspace. No passwords shared at any point.

---

**[27]**
🟨 Alright. And what if something breaks after you deliver? Like two months from now the reminders stop working — what happens then?

---

**[28]**
🟦 Great question to ask upfront. I include a 14-day revision window after delivery — if anything isn't working as described, I fix it at no charge. After that, most issues that come up are usually something on the platform side like a QuickBooks API change, which is rare but does happen.

I also write documentation so your office manager can understand what the scenario does and catch if something stops running. And honestly, I'm easy to reach if something comes up — a quick message goes a long way.

---

**[29]**
🟨 Okay I'm pretty convinced. Can I see the custom offer before I accept? I just want to make sure it matches what we talked about.

---

**[30]**
🟦 Absolutely. Let me put it together now and send it through Fiverr's offer system. It'll list exactly what's included so there's no ambiguity. Give me a few minutes.

---

**[31]**
🟦 Okay, custom offer sent. Here's what's included: the Make.com scenario with daily scheduled trigger pulling overdue invoices from QuickBooks Online, three-tier Gmail reminder emails at 7, 14, and 30 days overdue, automatic status updates in a Google Sheet dashboard, and brief setup documentation. Timeline is 4 business days, price is $275, and revision period is 14 days after delivery. Take a look and let me know if you have any questions before accepting.

---

💡 **Instructor Note:** When sending a custom offer, the freelancer recaps the full scope in plain language in the chat message alongside the offer. This gives the client one more chance to catch anything missing and prevents "I thought that was included" disputes later. Never just send the offer with no explanation.

---

**[32]**
🟨 I see it. Looks good. One more thing — the email reminders, can they be personalized? Like with the client's name and the invoice amount? I don't want it to feel like a mass email.

---

**[33]**
🟦 Yes, the emails will pull the client's name, invoice number, amount due, and due date directly from QuickBooks and slot them into the email template. So it'll read like you wrote it personally — "Hi Sarah, just a reminder that invoice #1042 for $1,800 was due on April 3rd." Not a generic blast.

---

**[34]**
🟨 Perfect. Okay I'm going to accept the offer now. Looking forward to working with you!

---

**[35]**
🟦 Excellent! Really glad we connected. Once the order is confirmed, I'll send you a short onboarding message with exactly what I need from you to get started. Nothing complicated — just a few access steps and we're off. Talk soon!

---

## STAGE 2 — ORDER PLACED & ONBOARDING (Messages 36–50)

---

**[36]**
🟨 Order placed! Exciting. What do I do first?

---

**[37]**
🟦 Welcome aboard! Here's what I need from you to get started. First, create a free Make.com account at make.com using your business email if you haven't already. That's where the scenario will live and you'll have full ownership of it.

Once that's done, let me know and I'll walk you through the next step — connecting QuickBooks. We'll do these one at a time so it doesn't get overwhelming.

---

💡 **Instructor Note:** Onboarding should be sequential, not a list of 10 things at once. The freelancer asks for one thing at a time. This reduces the chance the client gets confused, misses a step, or ghosts because they felt overwhelmed. "One at a time" is a pro move.

---

**[38]**
🟨 Done! I signed up at make.com. Email is the same one I use for Gmail and Google Workspace. Do I need to do anything else there or just create the account?

---

**[39]**
🟦 Just creating the account is enough for now. Next step is connecting QuickBooks Online. In your Make.com account, go to Connections in the left sidebar, click "Add connection," search for QuickBooks Online, and follow the OAuth prompt — it'll take you to Intuit's login page where you authorize Make.com. You don't enter your password anywhere in Make.

Let me know once that connection shows as active and we'll move to Gmail.

---

**[40]**
🟨 Okay I tried it and it took me to an Intuit login. I logged in and it said "QuickBooks Online is now connected." Is that right?

---

**[41]**
🟦 That's exactly right. You should see the connection listed in your Connections tab with a green indicator. Now let's do Gmail — same process. Go back to Connections, add a new one, search Gmail, and authorize through Google. Make sure you use the Gmail account that will be sending the reminders, since that's the address your clients will see.

---

**[42]**
🟨 Done. Gmail is connected too. This is easier than I thought. What's next?

---

**[43]**
🟦 Perfect, you're two for three. Last one is Google Sheets — also in Connections, same process, authorize through Google. This one will be the account that has access to your Google Drive where the dashboard sheet will live. Usually the same Google account works for both Gmail and Sheets, so it might even be pre-authorized.

---

**[44]**
🟨 Yep, Google Sheets connected. It said my Google account was already authorized so it was fast. Now what?

---

**[45]**
🟦 All three connections are live — that's everything I need. I'm going to go into your Make.com workspace now and start building. I'll share a view-only link to the scenario draft once the structure is in place so you can see what I'm building in real time if you're curious.

Expect my first update within 24 hours with a status on where things stand.

---

**[46]**
🟨 Sounds great. One thing I want to ask — will you be messing with my actual QuickBooks data? Like will any invoices get changed or deleted while you're building this?

---

**[47]**
🟦 No — not at all. The scenario only reads from QuickBooks, it doesn't write back to it. QuickBooks stays exactly as it is. The only places the scenario writes data are Gmail (sending emails) and Google Sheets (logging invoice info). Your QuickBooks data is read-only from Make's perspective.

---

**[48]**
🟨 That's a relief. And the emails — while you're building and testing, will it actually send emails to my real clients?

---

**[49]**
🟦 Great question. During testing I run the scenario in "test mode" which processes data but doesn't actually send emails or update the sheet unless I tell it to. Once I'm confident it's working, I'll run one real test with a dummy invoice I'll ask you to create — so we can confirm the email lands correctly before it goes to any real client.

---

**[50]**
🟨 Oh good. I was worried about that. Okay I'll let you get to work. Thanks for explaining everything!

---

## STAGE 3 — DIAGNOSIS / PLANNING (Messages 51–80)

---

**[51]**
🟦 Hey, good morning! I've had a chance to explore your QuickBooks account and Make.com workspace. A few things I want to share with you before I start building, because they'll affect how I design the scenario.

First, your QuickBooks is set up cleanly — your invoice terms are properly defined (Net 30 and Net 15 mixed) and the due dates are populated correctly, which is great. Some accounts have messy data here and the automation has to compensate.

---

💡 **Instructor Note:** This is the "first findings" moment. The freelancer starts with a positive observation before raising any complexity. This reassures the client that the project is on track. Notice there are no bullet points — the freelancer talks like a person, not a report.

---

**[52]**
🟨 Oh good! I wasn't sure if our QuickBooks setup was correct. We kind of set it up ourselves without any help. What's the second thing?

---

**[53]**
🟦 The second thing is something I noticed that you didn't mention — you have 6 invoices that are marked as "sent" in QuickBooks but are actually over 60 days old. Those would fall into the most urgent tier immediately when the scenario goes live, and your clients would get a "30-day overdue" email on the very first run.

That might be fine, or you might want to handle those manually first and have the automation only take over going forward. Your call — just wanted to flag it.

---

**[54]**
🟨 Oh wow, I didn't even realize there were that many 60-day ones. I think you're right — I should probably call those clients personally before they get an automated email. Can you set it up to ignore invoices older than 60 days for now?

---

**[55]**
🟦 Absolutely. I'll add a filter to the scenario that only processes invoices that became overdue within the last 60 days. The older ones won't be touched by the automation until you're ready. And if you want to loop them in later, I can remove that filter or adjust the threshold — easy change.

---

**[56]**
🟨 Perfect. That's exactly what I need. So walk me through what the system is actually going to do, step by step. I want to understand it before you build it.

---

**[57]**
🟦 Sure, I'll walk you through it in plain terms. Every morning at 8am, Make.com wakes up and runs the scenario. The first thing it does is connect to QuickBooks and ask for all open invoices where the due date has passed. That's the trigger — a scheduled clock combined with a QuickBooks search module.

---

**[58]**
🟦 Once it has that list, it passes each invoice through what's called a Router in Make. Think of the Router as a traffic director — it looks at how many days overdue each invoice is and sends it down the right path. 7 to 13 days overdue goes one way, 14 to 29 days goes another, and 30 or more days goes a third path.

---

**[59]**
🟨 Okay, I'm following. So it's like sorting mail into three piles. Then what?

---

**[60]**
🟦 Exactly like that. At the end of each path, there's a Gmail module that sends the email — each path has its own email template with its own tone. The 7-day one is friendly and casual, the 14-day one is a bit more direct, and the 30-day one is firm and asks them to contact you if there's an issue. Each email pulls the client name, invoice number, amount, and due date directly from the QuickBooks data.

---

**[61]**
🟨 And what stops it from emailing the same client every day? Like if someone is 14 days overdue, does it send them an email every morning until they pay?

---

**[62]**
🟦 Great question — this is where Make's Data Store comes in. I create a small internal database inside Make that records when each invoice received a reminder and which tier it got. Before the Gmail module fires, there's a filter that checks "has this invoice already received a reminder at this tier?" If yes, it skips it. If no, it sends the email and logs the record.

So each invoice gets a maximum of three emails total — one at each tier — and never the same email twice.

---

💡 **Instructor Note:** The client asked a really smart question that many people overlook. The freelancer answered it with a specific Make.com concept (Data Store) and explained it without jargon overload. This is how you demonstrate expertise — by having a real answer ready for the smart questions.

---

**[63]**
🟨 That's smart. I was literally about to ask that. Okay what about the Google Sheet — when does that get updated?

---

**[64]**
🟦 The Google Sheet update happens at the end of every path, after the email goes out. The Sheets module logs the invoice number, client name, amount due, due date, how many days overdue, which reminder tier was sent, and the date the reminder was sent. If an invoice is already in the sheet from a previous run, it updates the existing row rather than adding a duplicate — I use the invoice number as the unique key for that lookup.

---

**[65]**
🟨 So I'll be able to open the sheet any time and see the current state of all overdue invoices?

---

**[66]**
🟦 Exactly. And I'll set up a second tab that shows a summary — total overdue amount, number of invoices at each tier, and a simple chart if you want one. Think of it as your invoice health dashboard. You and your office manager can both have it open and it's always current as of the last morning run.

---

**[67]**
🟨 I want the chart. Definitely. Can you make it show the total overdue amount over time so I can see if we're getting better or worse at collections?

---

**[68]**
🟦 Yes, I can include a date-stamped log of the total overdue balance each day the scenario runs. Over time that gives you a trend line. It won't be super fancy — Google Sheets charts are pretty basic — but it'll clearly show whether the number is trending down, which is what you want to see.

---

**[69]**
🟨 That works. I don't need fancy, I just need useful. This all sounds really good. How long to build all of this?

---

**[70]**
🟦 Given everything we've discussed — including the Data Store logic, the three-tier router, the dashboard with the trend chart, and the 60-day filter — I'd say we're looking at 3 to 4 days to build and test. I'll aim for 3 and give myself the extra day as buffer if something unexpected comes up with the API connections.

---

**[71]**
🟨 That's fine with me. Can I ask — what happens if Make.com goes down one morning? Does the scenario just skip that day?

---

**[72]**
🟦 Make has pretty strong uptime, but yes — if the scheduled run is missed for any reason, it just waits until the next scheduled time. It doesn't try to retroactively process yesterday's run. That's actually fine for this use case because missing one day of reminders isn't a big deal — the invoice will still be overdue the next morning and get caught then.

If you wanted a more resilient setup you could add error handlers that notify you via email if a run fails, but for most small businesses this isn't necessary.

---

**[73]**
🟨 Let's skip the error handler for now. Keep it simple. What do you need from me before you start building?

---

**[74]**
🟦 Almost nothing — I have what I need from the connections you set up. One thing I'll need is for you to share the Google Sheet with me, or give me the name of the folder in your Google Drive where you'd like the dashboard sheet created. I'll build it from scratch so there's nothing for you to set up there.

---

**[75]**
🟨 I'll create a folder called "Automation Dashboard" in my Google Drive and share it with your email. What email should I use?

---

**[76]**
🟦 Share it with the email address linked to the Make.com connection — that's the Google account that will have write access through the OAuth we set up. You don't need to share it with my personal email since Make handles the access directly. Just make sure the Google Sheets connection in Make has access to that folder's Drive.

If you want me to see the sheet too during setup, you can share it with my Fiverr-linked email which I'll send you separately.

---

**[77]**
🟨 Oh that makes sense. I'll share the folder with your email too so you can see what's happening. Done — I just shared it.

---

**[78]**
🟦 Got the share notification, thank you! Alright, I have everything I need. I'm going to start building today. I'll send you an update tomorrow morning once the main structure is in place.

---

**[79]**
🟨 Perfect. I feel good about this — you've explained it really clearly. Way better than I expected, to be honest.

---

**[80]**
🟦 Really glad to hear that. My goal is always for the client to understand what's being built, not just trust that it works. Speak soon!

---

## STAGE 4 — WORK IN PROGRESS (Messages 81–105)

---

**[81]**
🟦 Morning update! The main scenario structure is built — the scheduled trigger, the QuickBooks module pulling overdue invoices, the Router with three paths, and all three Gmail templates are connected and mapped. The data mapping is done too, so client name, invoice number, amount, and due date all pull correctly from the QuickBooks bundle.

I'm working on the Data Store logic today to handle the "don't send the same reminder twice" piece. That's the trickiest part and I want to get it right.

---

💡 **Instructor Note:** A good progress update is specific. The freelancer doesn't say "going well!" — they name exactly what was built, what's next, and what's the tricky part. This level of transparency builds client confidence and keeps communication lines open without overwhelming them with technical detail.

---

**[82]**
🟨 That sounds great! The Gmail templates — did you write those from scratch? Can I see them?

---

**[83]**
🟦 Yes, I wrote all three from scratch. They're friendly but professional. I can share them as a Google Doc for your review — that's actually a good idea because you might want to adjust the tone to match how you normally talk to clients. Give me 30 minutes and I'll have them in a doc for you.

---

**[84]**
🟨 Oh yes please, I'd like to review them. Some of my clients I have a more casual relationship with and some are very corporate. Is there a way to handle that?

---

**[85]**
🟦 In the current setup, all clients get the same templates. To have client-specific tones, you'd need to tag clients in QuickBooks or the sheet with a "communication style" flag, which adds complexity. For now I'd suggest we go with a middle-ground tone — professional but warm — and if you want to do client-specific templates down the line, that's a possible future enhancement.

---

**[86]**
🟨 Fair enough. Middle-ground works for now. What about the Google Sheet — is that built yet?

---

**[87]**
🟦 The sheet is set up in the folder you shared. I have two tabs — "Overdue Invoices" and "Dashboard Summary." The headers are in place and the mapping is done so the Sheets module will write to the right columns. I'll share the link with you now so you can see it.

---

**[88]**
🟨 Got it, I can see the sheet! The headers look right. "Invoice Number," "Client Name," "Amount Due," "Due Date," "Days Overdue," "Reminder Tier," "Last Reminder Sent" — that's exactly what I needed. Love it.

---

**[89]**
🟦 Glad it looks right. Update — I hit something while connecting the Data Store logic that I want to be upfront about. The QuickBooks Online API has rate limits, meaning it only allows a certain number of requests per minute. For most accounts this isn't an issue, but I noticed your QuickBooks account has quite a few historical invoices going back several years, and the initial query was pulling a larger dataset than expected.

---

💡 **Instructor Note:** This is the "unexpected finding" moment. The freelancer encountered a real limitation (QuickBooks API rate limits) and is communicating it proactively before it becomes a problem. Notice they don't panic or make the client feel bad — they just explain it professionally and immediately move to the solution.

---

**[90]**
🟨 Oh no. Is that going to be a big problem? Does this mean it won't work?

---

**[91]**
🟦 Not at all — it just means I need to add a filter at the query level so we only pull invoices that are open and past their due date, rather than pulling everything and filtering afterward. That's actually better practice anyway because it reduces the number of operations used per run. I've already applied the fix — just wanted to be transparent that I ran into it and handled it.

---

**[92]**
🟨 Oh okay, that's a relief. You had me worried for a second. Thank you for telling me though — I appreciate that you didn't just quietly fix it.

---

**[93]**
🟦 Always. I'd rather tell you about a bump and how I solved it than have you find out later. Anyway, the Data Store logic is working now. I ran a test with some sample invoice data and the deduplication is working correctly — same invoice, same tier, won't send a second email. Tested it three times to be sure.

---

**[94]**
🟨 That's the part I was most worried about — clients getting spammed. Good to hear it's solid.

---

**[95]**
🟦 Totally understood. I also want to suggest something based on what I'm seeing in the scenario — and this is something we didn't talk about originally, so no extra charge for the suggestion. For the 30-day reminder, I'd recommend adding a CC to your own Gmail address so that when the "firm" email goes out, you get a copy automatically. That way you know exactly when a serious reminder landed and can follow up personally if needed.

---

**[96]**
🟨 That's a great idea. Yes, please add that. It's small but it matters — I want to know when the "we need to talk" emails go out.

---

**[97]**
🟦 Done. The 30-day reminder path now sends a copy to your Gmail. I'll also put a note about it in the documentation so your office manager knows why you get those emails.

---

**[98]**
🟨 Perfect. How close are we to done?

---

**[99]**
🟦 Very close. The scenario is fully built, all three reminder tiers work, the Data Store deduplication is solid, and the Google Sheet is updating correctly in test runs. What's left is building the Dashboard Summary tab with the trend chart, doing a full end-to-end test with a real invoice, and writing the documentation.

I should be ready for client testing by tomorrow afternoon.

---

**[100]**
🟨 Faster than expected! Can I ask a dumb question — where does Make.com actually run? Like is it on my computer? Do I need to leave something open?

---

**[101]**
🟦 Not a dumb question at all — this confuses a lot of people. Make.com runs entirely in the cloud on their servers. Your computer doesn't need to be on, your browser doesn't need to be open, nothing. The scenario runs on Make's infrastructure at the scheduled time regardless of what you're doing. You could be on vacation and it would still fire at 8am.

---

**[102]**
🟨 Oh that's actually really important. I travel sometimes and I was worried I'd need to be at my desk for it to work. That's a huge relief.

---

**[103]**
🟦 Yep, fully cloud-based. The only time you'd need to log in to Make is if you wanted to change something — adjust an email template, change the schedule, that kind of thing. Day-to-day it runs itself.

---

**[104]**
🟨 Amazing. Okay I'll wait for your message tomorrow. Thanks for the updates — I feel really in the loop.

---

**[105]**
🟦 That's the goal. Talk tomorrow!

---

## STAGE 5 — TESTING WITH CLIENT (Messages 106–120)

---

**[106]**
🟦 We're ready for testing! Before I walk you through it, here's what I need you to do: in QuickBooks Online, create a test invoice for a fake client — you can name them "Test Client LLC" — and set the amount to $1 and the due date to 10 days ago. That puts it in the 7-day tier. Let me know when it's saved and I'll trigger a manual run of the scenario so we can watch it together.

---

**[107]**
🟨 Done! Created the invoice — Test Client LLC, $1, due date is 10 days ago. It shows as "Overdue" in QuickBooks.

---

💡 **Instructor Note:** Testing with the client in real time — rather than just saying "I tested it, it works" — is one of the most trust-building things a freelancer can do. The client sees it work with their own eyes, which eliminates doubt. It also catches small issues before delivery, which is far less stressful than catching them after.

---

**[108]**
🟦 Perfect. I'm triggering the scenario manually now — go ahead and watch your Gmail inbox and the Google Sheet simultaneously. The run should take about 30 seconds.

---

**[109]**
🟨 Okay I have both open. Watching...

---

**[110]**
🟨 Oh! I got an email. Subject is "Friendly Reminder: Invoice #1089 Due — $1.00." Opening it now.

---

**[111]**
🟦 Great, tell me what you see in the email body. I want to make sure the data pulled correctly.

---

**[112]**
🟨 It says "Hi Test Client LLC" — wait, should it say the contact person's name? I don't have a contact name on that test invoice. But I do have contact names on all my real invoices.

---

**[113]**
🟦 Good catch. The module is pulling the company name because no individual contact was mapped. On your real invoices, do you have a primary contact listed in QuickBooks for each client?

---

**[114]**
🟨 Yes, I always add a first name for the billing contact. But this test invoice I just threw together didn't have one.

---

**[115]**
🟦 That's all it is then — the test invoice is missing the contact field. On real invoices it'll pull the first name correctly. You can add "John" to the test invoice contact and I can re-run if you want to confirm, or you can trust that the mapping is correct since the field is populated in your real ones.

---

**[116]**
🟨 I'll trust it. Let me check the Google Sheet now. Oh nice — there's a row! Invoice number 1089, Test Client LLC, $1.00, due date, 10 days overdue, Tier 1 reminder, today's date. That all looks correct!

---

**[117]**
🟦 Excellent! Now check the email date format — I want to make sure the due date is displaying the way you'd expect.

---

**[118]**
🟨 The due date shows as "05/07/2026" — is that the right format? Actually wait, I'd prefer it to say "May 7, 2026" — the numbers-only format looks a bit cold to me.

---

**[119]**
🟦 Totally fair feedback. I'm updating the date formatter in the email template right now — it's a small change in the module mapping. Give me two minutes.

---

**[120]**
🟦 Done! I re-ran the scenario with a fresh test invoice and the date now shows as "May 7, 2026" format. Check your inbox — you should see a new test email.

🟨 Got it. "May 7, 2026" — yes, that's exactly right. Much better. I think we're good! Everything looks exactly like I hoped.

---

## STAGE 6 — FORMAL DELIVERY (Messages 121–130)

---

**[121]**
🟦 Excellent work testing together. I'm submitting the formal delivery now. Here's a summary of everything that was built and delivered:

✅ Make.com scenario with daily scheduled trigger (8am) pulling overdue invoices from QuickBooks Online
✅ Three-tier Gmail reminder system — Tier 1 at 7 days (friendly), Tier 2 at 14 days (direct), Tier 3 at 30 days (firm, with CC to your inbox)
✅ Data Store deduplication logic — no client receives the same reminder tier twice
✅ 60-day filter so pre-existing aged invoices are excluded from the first run
✅ Google Sheet "Overdue Invoices" tab — auto-populated with invoice details, tier, and reminder date after each run
✅ Google Sheet "Dashboard Summary" tab — total overdue balance, invoice count by tier, trend chart
✅ Date format updated to written format (e.g., "May 7, 2026") in all email templates
✅ Documentation Google Doc covering how the scenario works, how to adjust the schedule, and what the Data Store does

You have 14 days to request any revisions covered under the original scope. Please click "Accept Delivery" when you're ready!

---

💡 **Instructor Note:** A professional delivery message uses checkmarks to make completeness visible at a glance. The client can match what was delivered against what was promised. This is not the place for casual language — it's a formal handoff. Also note the explicit reminder about the revision window and what action the client should take next.

---

**[122]**
🟨 This is so good. I just accepted the delivery. Honestly this exceeded what I was expecting — the dashboard is especially great, I didn't even realize how useful the trend chart would be until I saw it.

---

**[123]**
🟦 That's wonderful to hear! The trend chart is one of those things that doesn't seem important until you actually see your overdue balance going down week over week — then it becomes something you check every Monday morning.

---

**[124]**
🟨 Ha, yes exactly. My office manager already loves the sheet. She opened it this morning and sent me a screenshot going "is this magic?" So I'd say it's a hit.

---

**[125]**
🟦 That's the best kind of feedback! If she has any questions about the sheet or anything looks confusing, just send me a message — happy to clarify.

---

**[126]**
🟨 Will do. I also shared the documentation with her. It's really clearly written — she said she actually understands what the scenario is doing, which is impressive because she's not very technical.

---

**[127]**
🟦 That's exactly what the documentation is for. I always write it for the least technical person who might need to reference it. If a tech-savvy person reads it and thinks it's too simple, that's fine — but if a non-technical person can't understand it, I've failed.

---

**[128]**
🟨 Good philosophy. Okay — I think we're all set. Thank you so much. This has been the best experience I've had on Fiverr, no exaggeration.

---

**[129]**
🟦 That genuinely means a lot to hear. It was a pleasure working with you — your questions were smart, you gave great feedback during testing, and you were super organized with the connections and folder sharing. Made my job a lot easier.

---

**[130]**
🟨 Well, I learned from a good teacher apparently! I'll leave you a review shortly.

---

## STAGE 7 — UPSELL (Messages 131–145)

---

**[131]**
🟦 Before you go — there's one thing I noticed while I was inside your QuickBooks setup that I want to mention. You have several large invoices — some in the $5,000 to $10,000 range — and right now when those get paid, there's no automatic notification. You'd find out when you happen to check QuickBooks or your bank.

I built a quick concept in my head for a "large payment received" alert — basically whenever QuickBooks marks a high-value invoice as paid, you get an instant Slack or Gmail notification saying "Invoice #XXXX for $8,500 from Acme Corp has been paid." Would something like that be useful to you?

---

💡 **Instructor Note:** This is the upsell moment — and notice how the freelancer frames it. "I noticed something while I was in there" signals that this is a genuine observation, not a sales pitch. The suggestion is directly connected to the work just completed and solves a real adjacent problem. Never pitch something unrelated immediately after delivery — it feels transactional. This feels like a continuation of the service.

---

**[132]**
🟨 Oh wow — yes, actually. I had no idea that was even possible. Right now I find out about large payments because my bookkeeper calls me. An instant notification would be so much better. Do you use Slack for that?

---

**[133]**
🟦 I can do either Slack or Gmail, whichever you prefer. Slack is great if you're already using it — it'd show up in a dedicated channel. Gmail works if you don't use Slack, because you can filter it into its own label in your inbox. Which do you use more throughout the day?

---

**[134]**
🟨 We do use Slack, actually. The team is small but we're all on it. A dedicated channel for "payments received" sounds great — is that complicated to set up?

---

**[135]**
🟦 Not at all — it's a separate Make.com scenario from the invoice reminder one. It monitors QuickBooks for invoices that change status to "Paid" and have an amount above a threshold you set — say $2,000. When one triggers, it posts to a Slack channel with the client name, invoice number, and amount. Clean and simple.

---

**[136]**
🟨 That's exactly what I'd want. How much would that be?

---

💡 **Instructor Note:** The client asked "how much?" — the most natural question after a good upsell pitch. Notice the freelancer doesn't hesitate or apologize for having a price. The price should feel reasonable relative to the value just demonstrated by the first project.

---

**[137]**
🟦 For this one — since it's a simpler scenario and you're already a client — I'd do it for $95. It's about a day's work including the Slack connection, the QuickBooks payment trigger, the amount filter, and testing. No documentation needed since you already understand how the scenarios work.

---

**[138]**
🟨 $95, that's totally reasonable. Yes, let's do it. Do I need to do anything for the Slack connection?

---

**[139]**
🟦 Same process as before — go to your Make.com Connections, add a Slack connection, and authorize through your Slack workspace login. While you do that, tell me what you want the threshold amount to be and what you'd like the Slack channel called.

---

**[140]**
🟨 Slack is connected. Let's call the channel #payments-received and set the threshold at $1,500 — any invoice over that amount I want to know about immediately.

---

**[141]**
🟦 Perfect. I'll have the second scenario live for testing within 24 hours. I'll send the custom offer through Fiverr now — same deal as before, everything included at a flat price.

---

**[142]**
🟨 Offer accepted! Thanks for thinking of this — I genuinely would not have thought to ask for it myself.

---

**[143]**
🟦 That's part of the job — I want to spot the adjacent problems, not just solve the one in front of me. Okay, working on it now. Quick update: the scenario is built and tested. The Slack module is posting correctly to #payments-received. I just triggered a test by manually marking a $2,000 test invoice as paid in QuickBooks, and within 10 seconds the Slack channel showed the message. Submitting delivery now.

✅ Make.com scenario monitoring QuickBooks for payments marked as "Paid"
✅ Amount filter set to $1,500 threshold
✅ Slack notification posting to #payments-received with client name, invoice number, and amount
✅ Tested successfully with a real QuickBooks status change

---

**[144]**
🟨 Just checked Slack — the test notification is there. "Payment Received: Invoice #TEST01 — $2,000.00 from Test Client LLC." That's exactly right. Accepting delivery!

---

**[145]**
🟦 Fantastic! Both automations are now live. Your overdue invoice reminders run every morning at 8am, and your payment alerts fire instantly when a qualifying invoice is paid. You've got solid coverage on both ends of the invoice lifecycle now.

---

## STAGE 8 — REVIEW & CLOSE (Messages 146–150)

---

**[146]**
🟨 I'm about to write your review and I genuinely don't know where to start. This has been such a different experience from what I expected on Fiverr. You were patient, you explained things clearly, you caught stuff I didn't even ask about — I feel like I got way more than I paid for.

---

**[147]**
🟦 That's incredibly kind of you to say. It was genuinely a pleasure. You were a great client to work with — responsive, thoughtful, and you gave clear feedback during testing which made the whole project go smoothly. Reviews on Fiverr really do make a big difference for freelancers like me, so I appreciate you taking the time.

---

**[148]**
🟨 Of course. I'll write something honest. And hey — I have a friend who runs a small agency and has the exact same invoice problem. Can I refer them to you?

---

🟦 Absolutely, please do! Tell them to send me a message explaining their setup and what they're trying to solve — I'll ask the right questions from there. And if they mention you referred them I'll make sure they get a good first-project experience.

---

**[149]**
🟨 ⭐⭐⭐⭐⭐ **(Public Review — Client)**

I came to this gig in a pretty desperate state — I was losing track of unpaid invoices in QuickBooks and had no system in place. What I got back was far beyond what I expected.

The freelancer built a complete automation using Make.com that checks my QuickBooks Online every morning for overdue invoices, sends personalized Gmail reminders at three different stages (7, 14, and 30 days overdue), and automatically updates a Google Sheets dashboard with the current status of every overdue invoice. The Google Sheet even has a trend chart showing my total overdue balance over time — which I now check every Monday without being asked.

What really impressed me was how proactive and transparent the communication was throughout. They flagged a QuickBooks API rate limit issue before it became a problem and solved it without drama. They spotted 6 invoices that were 60+ days overdue that I didn't even know about. And after the main project was done, they noticed I had no system for knowing when large invoices got paid — and built a Slack notification for that too, which my whole team now loves.

The email templates are personalized with the client's name, invoice number, and amount — nothing looks automated to the recipient. Testing was done together in real time which gave me total confidence before going live.

If you run a small business and you're losing money because invoices fall through the cracks, this is exactly the kind of automation you need. Professional, communicative, and genuinely invested in solving your actual problem. Will absolutely hire again.

---

💡 **Instructor Note:** A great review is specific, not generic. It names the tools used (QuickBooks, Make.com, Gmail, Google Sheets, Slack), describes what was built, calls out standout moments (catching the 60-day invoices, proactive communication about the API issue), and explains the real-world impact. Reviews like this rank higher in Fiverr's algorithm and convert better than vague praise. As a freelancer, you can nudge clients toward specificity by thanking them for "any specific details about what we built" rather than just asking for "a review."

---

**[150]**
🟦 **(Public Response — Freelancer)**

Thank you so much for this incredibly thoughtful review — it genuinely made my week. Working with you was a highlight project for me. You asked exactly the right questions at every stage, gave clear and honest feedback during testing (the date format catch was a great one!), and were wonderfully organized from the very first access setup.

I'm especially glad the dashboard is getting daily use — that trend chart showing your overdue balance going down is the whole point, and it sounds like it's already doing its job. And I'm thrilled the Slack payment alerts have landed well with your team. Knowing the moment a big invoice gets paid is something every small business owner deserves.

Your friend is welcome anytime — QuickBooks and Google Workspace integrations are work I genuinely enjoy and I'll make sure they're well taken care of. Wishing you and your team continued success, and fewer late invoices every week!

---

*End of Conversation — 150 Messages*

---

## Appendix: Key Make.com Concepts Used in This Script

| Term | What It Does in This Project |
|---|---|
| Scenario | The full automation workflow — the invoice reminder system |
| Scheduled Trigger | Fires the scenario every morning at 8am |
| QuickBooks Online Module | Pulls overdue invoice data via the QuickBooks API |
| Router | Splits invoices into three paths based on days overdue |
| Filter | Checks conditions before passing data to the next module |
| Gmail Module | Sends the personalized reminder email |
| Google Sheets Module | Writes or updates the invoice row in the dashboard |
| Data Store | Internal Make database that tracks which invoices already received which reminder tier |
| Bundle | A single invoice record passing through the scenario |
| Operations | Each module action counts as one operation toward Make's monthly limit |
| OAuth Connection | Secure app authorization without sharing passwords |
