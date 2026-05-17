# Fiverr Chat Conversation Script
## Topic: Broken Zap Migration — Zapier to Make.com (Google Sheets Orders Automation)

---

---

## STAGE 1 — FIRST CONTACT (Messages 1–35)

---

**[1]**
🟨 Hi, I saw your gig about Make.com automations. I'm having a problem with mine and I think I need help. We moved from Zapier to Make.com last week and something broke. Our orders aren't showing up in our Google Sheet anymore.

---

**[2]**
🟦 Hey! Thanks for reaching out — you're in the right place. Migrations from Zapier to Make.com are tricky and this kind of issue is actually really common. Just so I can understand the situation better, what type of orders are we talking about? Like, is this coming from a store (Shopify, WooCommerce), a form, or somewhere else?

---

💡 **Instructor Note — Message [2]:** Notice the freelancer doesn't jump straight to "here's what's wrong" or dump a list of 10 questions. They asked ONE focused question that shows they already understand the space (they know migrations are common, they know there are different order sources). This immediately signals expertise without bragging.

---

**[3]**
🟨 It's Shopify. When someone places an order, it's supposed to go into a Google Sheet we use to track fulfillment. It was working perfectly in Zapier for like two years. We moved to Make because our Zapier bill was getting crazy, and now nothing's going into the sheet.

---

**[4]**
🟦 Got it, that makes total sense — Shopify to Google Sheets is a super common flow and it should absolutely work in Make. When you say nothing's going in, are you seeing any errors inside Make.com when you look at the scenario history? Or does it just look like the scenario isn't running at all?

---

**[5]**
🟨 Honestly I'm not even sure how to check that. I know Zapier had a task history but I don't know where to find that in Make.

---

**[6]**
🟦 No worries at all — Make calls it the "Scenario History" and it's in the left sidebar when you open the scenario. It'll show you every time the scenario ran, whether it succeeded or failed, and if it failed, where it stopped. Can you take a quick look and tell me if you see any red error icons or if the runs are just showing up as blank/skipped?

---

**[7]**
🟨 Ok I found it. There are some runs listed but they all have a little warning icon, not a red one. And when I click on one it shows the Shopify module completed but then... it looks like the Google Sheets module didn't do anything. Like it ran but nothing happened.

---

**[8]**
🟦 That's actually a really useful clue — the Shopify trigger is firing fine, so the connection there is good. The issue is in how the data is being passed to the Google Sheets module. This sounds like it could be a data mapping problem or a module connection issue. Two quick questions: did you build this scenario yourself by recreating the Zap, or did you use some kind of import/conversion tool?

---

**[9]**
🟨 I tried to recreate it myself by following the Zapier setup but doing it in Make. I thought it would be pretty much the same. Maybe I did something wrong?

---

**[10]**
🟦 That's probably exactly it — Make and Zapier handle data structure differently, especially with Shopify. In Zapier, field names come pre-labeled. In Make, you're mapping from a raw data bundle, so if the fields aren't matched correctly, the Sheet row either comes in blank or the module quietly fails. Nothing wrong with you — it's just genuinely not obvious until you know what to look for.

---

**[11]**
🟨 Ah ok. So can you fix it? What would that involve exactly?

---

**[12]**
🟦 Yeah, definitely. I'd go into your scenario, check exactly where the mapping broke down, fix the connections between the Shopify trigger and the Sheets module, run some test operations to confirm data is flowing correctly, and then make sure the scenario is set to run on a proper trigger so it doesn't miss orders. Shouldn't be a big job once I can see what's going on inside.

---

**[13]**
🟨 Ok that sounds good. How much would something like that cost?

---

**[14]**
🟦 For a single-scenario fix like this — diagnosis, repair, and testing — I'd say somewhere in the $75–$100 range depending on what I find inside. If it's just the mapping issue you described, it'll be on the lower end. If there are additional broken connections or the scenario needs to be restructured a bit, it might be slightly more. I'll know more once I look. Happy to send a custom offer once we nail down scope.

---

💡 **Instructor Note — Message [14]:** The freelancer gave a range, not a fixed quote, because they haven't seen the work yet. This is honest AND smart — it protects them from underquoting, and it shows the client they're not just picking a number out of thin air. Giving a "it depends on what I find" answer signals professionalism.

---

**[15]**
🟨 That seems fair. I've never actually hired someone on Fiverr before though — how does it work? Like how do I know I'm not just going to pay and then get nothing?

---

**[16]**
🟦 Totally fair question. Fiverr uses an escrow system — when you place an order, your money goes to Fiverr, not to me. It only gets released to me after you review the delivery and mark it as complete. If I don't deliver, you can request a revision or even a refund through Fiverr's resolution center. So you're protected the whole time.

---

**[17]**
🟨 Oh nice, I didn't know that. And what if you fix it but it breaks again later?

---

**[18]**
🟦 Good question. The fix I make will be stable — I'll build it correctly so it doesn't just stop working randomly. That said, if Shopify or Google updates their API and something changes on their end, that's outside anyone's control. But for anything that's a direct result of my work, I do revisions. If something I built isn't working right after delivery, reach out and I'll sort it.

---

**[19]**
🟨 Ok cool. Do you have any examples of similar work you've done?

---

**[20]**
🟦 Yeah — I've done probably 30+ Make.com scenarios involving Shopify and Google Sheets specifically. A lot of them are exactly this kind of migration-gone-wrong situation. Most of the time it comes down to mapping errors or a trigger that's set to polling instead of instant webhook — both of which I can spot and fix pretty quickly. If you check my gig reviews there are a few that mention Shopify and Make specifically.

---

**[21]**
🟨 I looked at your reviews, they look good. Ok what's the process — what do you need from me to get started?

---

**[22]**
🟦 Once you place the order I'll need access to your Make.com account — either you add me as a team member or we do a quick screen share. I'll also need to know which Google Sheet it's supposed to write to and what columns you're tracking. Nothing sensitive like passwords — Make handles permissions through their own connection system. Pretty straightforward to set up.

---

**[23]**
🟨 Wait — you'd have access to my Make account? Is that safe? I have other automations in there.

---

**[24]**
🟦 Completely valid concern. Make has a Team Member permission system — you can invite me with limited access, and I only work inside the specific scenario we're fixing. I won't touch anything else. And honestly, if you're more comfortable, we can do it via screen share instead — you stay in control the whole time, I just talk you through what to change. Either way works for me.

---

**[25]**
🟨 The screen share might be better actually. How long would that take?

---

**[26]**
🟦 For a fix like this, probably 30–45 minutes on the call. I'd review the scenario, explain what I'm seeing, make the changes, and we'd test it together before hanging up. You'd be able to see exactly what I'm doing the whole time.

---

**[27]**
🟨 Ok yeah that works for me. What timezone are you in?

---

**[28]**
🟦 I'm in EST. I'm usually available for calls Monday through Friday between 10am and 6pm, and I can sometimes do early evenings too. Once the order is placed we can coordinate a time that works for both of us — I'll message you right away to get something scheduled.

---

**[29]**
🟨 Sounds good. And just to confirm — this would just be the one scenario, right? The Shopify to Google Sheets one?

---

**[30]**
🟦 Exactly, yes. That's what the offer will cover. If while I'm in there I notice something else that's off — like if another scenario has the same mapping issue — I'll flag it for you, but I won't touch it without asking. You stay in control of scope.

---

**[31]**
🟨 Perfect. Can you send me the custom offer?

---

**[32]**
🟦 Absolutely, sending it now. I'm putting it at $85 — that covers the full diagnosis, the fix, and testing together on a screen share. If the issue turns out to be more involved than expected I'll let you know before doing any extra work. You should see the offer pop up in a moment.

---

💡 **Instructor Note — Message [32]:** The freelancer sent a custom offer rather than asking the client to find a gig package. This is the right move — it's personalized, it reinforces the agreed scope, and it speeds things up. The price is in the range they already discussed, so there's no surprise.

---

**[33]**
🟨 Got it. $85 looks right. Ok, one more thing — how many revisions does this include?

---

**[34]**
🟦 I included two revisions in the offer. Honestly for a fix like this I'd expect to get it right the first time, but if something isn't working the way you want after delivery, just tell me and I'll adjust it. I'm not going to make you fight for revisions over something I built.

---

**[35]**
🟨 Ok that's fair. I'm going to accept the offer now. Thanks for explaining everything!

---

🟦 Great, thanks for ordering! I'll send you a message right after confirmation to get the screen share scheduled. Talk soon.

---

---

## STAGE 2 — ORDER PLACED & ONBOARDING (Messages 36–50)

---

**[36]**
🟦 Order confirmed — thanks again! Let's get this sorted out for you. Before we jump on a call, it helps if I have a bit of context first so we're not spending time on basics. Can you tell me: what's the name of the scenario in Make.com (or roughly what it's called), and which sheet tab in Google Sheets should the orders be landing in?

---

**[37]**
🟨 The scenario is called "Shopify Order to Sheet" — I named it when I built it. And the sheet is called "Order Tracker" and the tab is "Incoming Orders."

---

**[38]**
🟦 Perfect, very helpful. And just so I have the full picture before the call — what columns are you tracking in that sheet? Things like order number, customer name, product, total, etc.? Just roughly is fine, I don't need exact headers right now.

---

**[39]**
🟨 Yeah it's: order number, customer name, email, product name, quantity, total price, and shipping address. That's it.

---

**[40]**
🟦 Got it, that's a clean setup. Those are all standard Shopify fields so they should map without issue once we fix the connection. One more thing — is the scenario currently turned ON in Make.com, or did you pause it when things broke?

---

**[41]**
🟨 It's still on. I was afraid to turn it off in case I messed something else up.

---

**[42]**
🟦 Good instinct leaving it on. The scenario running (even incorrectly) means there's a history of attempts I can look at on the call, which helps a lot. I'm going to suggest we schedule the screen share for early this week — does Tuesday or Wednesday morning work for you?

---

**[43]**
🟨 Wednesday morning works! Like 10am EST?

---

**[44]**
🟦 Wednesday at 10am EST is perfect. I'll send you a Google Meet link the morning of. In the meantime, if you want to do one thing ahead of the call: go into Make.com, open the scenario, and click on one of the failed runs in the Scenario History. Screenshot the output panel on the right side — that's where it shows what data the Shopify trigger actually returned. Having that before we start will save us a few minutes.

---

**[45]**
🟨 Oh good idea. Should I send it to you here?

---

**[46]**
🟦 Yes, just drop it right here in the chat. Don't worry if it looks confusing — that's what I'm here for. Even a partial screenshot helps.

---

💡 **Instructor Note — Message [46]:** This is smart onboarding — the freelancer is gathering useful diagnostic info before the call without making the client feel overwhelmed. They gave ONE clear, simple task. Compare this to asking for 10 things at once. The client feels capable and the freelancer shows up prepared.

---

**[47]**
🟨 Ok I took a screenshot. Honestly it's a wall of data, I can barely read it. Sending now. [screenshot attached]

---

**[48]**
🟦 Got it, thank you! I can already see a few things in there that are useful. The Shopify trigger returned data correctly — I can see order fields in the bundle. The issue is definitely in how it's handed off to the Sheets module. I'll confirm everything on the call but this gives me a head start. We're in good shape for Wednesday.

---

**[49]**
🟨 Great. Is there anything else I should prepare?

---

**[50]**
🟦 Nope, you're all set. Just have Make.com open in your browser when we connect and we'll go from there. See you Wednesday at 10!

---

---

## STAGE 3 — DIAGNOSIS / PLANNING (Messages 51–80)

---

**[51]**
🟦 Morning! Meet link: [meet.google.com/abc-xyz-123] — see you in a few. Give me one minute to pull up the scenario history before we dive in.

---

**[52]**
🟨 Ready when you are! I've got Make.com open.

---

**[53]**
🟦 Ok so I'm looking at your scenario now. I can see what happened — the Shopify module is working perfectly, it's catching the order trigger and pulling in all the right data. But the Google Sheets module has a problem. The column fields are completely empty. Like, the mappings are there but they're pointing to nothing.

---

**[54]**
🟨 What does that mean exactly? Why would they be pointing to nothing?

---

**[55]**
🟦 So when you rebuilt the Zap in Make, you set up the Google Sheets module and mapped the fields — like "put order number in column A." But in Make, those mappings point to specific data paths from the trigger. When you first set it up, those paths were probably referencing a test run. Then when real Shopify orders came in, the data came in a slightly different structure, and the mappings lost track of where to find the values. So the module ran, but wrote empty rows — or nothing at all.

---

**[56]**
🟨 Oh. So it's not that it stopped working — it was never really working?

---

**[57]**
🟦 Exactly. And this is super common in migrations because Zapier shows you labeled fields like "Order Number" in plain text. Make shows you the raw data path, like `1.line_items[].sku` — so when people rebuild manually, they often map to a field that looks right but isn't actually the one that populates on real orders. It's easy to miss.

---

**[58]**
🟨 That makes sense. And the other issue you mentioned — the missing module connection?

---

**[59]**
🟦 Right, so there's a second thing I noticed. Your Google Sheets module doesn't have an active Connection. In Make, every module that talks to an outside app needs a Connection — that's basically the OAuth authorization that lets Make write to your Sheet. It looks like the connection was set up but it's showing as inactive. That means even if the mapping was perfect, it couldn't actually write to the Sheet because it doesn't have permission.

---

**[60]**
🟨 How did that happen? I thought I connected it when I set it up.

---

**[61]**
🟦 What probably happened is the connection was authorized during initial setup but then it expired or got revoked — sometimes Google does that if there's been no successful activity for a while, or if permissions were changed on the Google account. It's not your fault, it just happens. The fix is about two minutes — we re-authorize the connection right in the module settings and it's good.

---

**[62]**
🟨 Ok. So there are two things to fix — the mapping and the connection?

---

**[63]**
🟦 Yep, exactly those two things. Once both are fixed, we run a test order through and make sure a row lands in your sheet correctly. Then I'll also check that the scenario trigger is set correctly — I want to confirm it's using a webhook (instant trigger) rather than a scheduled poll, because that's what makes it respond to orders immediately instead of checking every 15 minutes.

---

**[64]**
🟨 There's a difference between those? I just thought it ran automatically.

---

**[65]**
🟦 Yeah, it's one of the bigger gotchas. A scheduled trigger means Make checks Shopify every X minutes and pulls new orders — so there can be a delay. A webhook means Shopify pushes the order to Make the second it happens — instant. For order tracking, you definitely want the webhook. I'll check which one you have set up.

---

**[66]**
🟨 And if it's the scheduled one, can you switch it?

---

**[67]**
🟦 Yep, totally fixable. The Shopify module in Make supports instant triggers natively — I'd just swap the module out and reconnect everything. Takes maybe 10 minutes. I'll include that in the scope at no extra charge since it's part of getting the scenario working properly.

---

**[68]**
🟨 That's great, thank you. So what's the plan from here?

---

**[69]**
🟦 Here's what I'm going to do: first, re-authorize the Google Sheets connection. Then remap all seven fields in the Sheets module to the correct data paths from the Shopify trigger. Then I'll check the trigger type and switch it to instant if needed. After that, we'll do a live test — you place a test order in Shopify and we watch the row land in the sheet together. The whole thing should take about 30–40 minutes from here.

---

💡 **Instructor Note — Message [69]:** This is a clear, jargon-free plan delivered in plain language. The freelancer described what they're doing AND why each step matters, and ended with what the client will see at the end (the row landing in the sheet). This is how you get client buy-in before you start touching their stuff.

---

**[70]**
🟨 That sounds perfect. Can you start now?

---

**[71]**
🟦 Starting right now. Keep Make.com open on your end so you can see the changes as I walk you through them.

---

**[72]**
🟨 Ok I can see you're in the scenario. This is kind of cool to watch actually.

---

**[73]**
🟦 Ha, good! I'm in the Google Sheets module now. See how all these mapping fields are empty or showing that little orange "unmapped" icon? That's the problem. I'm going to start remapping each field one by one from the Shopify data bundle on the left.

---

**[74]**
🟨 I can see what you're doing. Why does the order number look different in Make than it did in Zapier?

---

**[75]**
🟦 In Zapier, it displayed as "Order Number" — a friendly label. In Make, you're seeing the raw field path: `order_number` from the Shopify bundle. Same data, just shown differently. Make is more transparent about where data is actually coming from, which is great once you know what you're looking at.

---

**[76]**
🟨 Ok that actually makes sense now. So you're just connecting the right pieces together.

---

**[77]**
🟦 Exactly. Think of it like a spreadsheet formula — Zapier wrote the formula for you, Make lets you write it yourself but you have to know which cells to reference. I'm referencing the right cells now.

---

**[78]**
🟨 Got it. How's it going?

---

**[79]**
🟦 Mapping's about 80% done. I'm on the shipping address fields now — Shopify actually breaks address into multiple fields (street, city, zip, country) so I'm combining them into one clean string for your sheet column. Almost there.

---

**[80]**
🟨 Oh I didn't even think about that. Good catch.

---

---

## STAGE 4 — WORK IN PROGRESS (Messages 81–105)

---

**[81]**
🟦 Mapping is fully done. Now I'm going into the connection settings to re-authorize Google Sheets. This will open a Google sign-in window — you might see a browser pop-up on your end asking you to approve access. Let me know when you see it.

---

💡 **Instructor Note — Message [81]:** The freelancer is narrating every move, which keeps the client calm and engaged. During screen-share work, clients can feel anxious about "what is this person doing in my account?" — narration eliminates that anxiety. This is especially important for authorization steps that open external windows.

---

**[82]**
🟨 I see a Google pop-up! Should I click allow?

---

**[83]**
🟦 Yes, click Allow — that's just Google confirming that Make.com has permission to write to your Sheets. It's the same kind of permission you'd give any app that integrates with Google. Once you click it, the connection will go green on my end.

---

**[84]**
🟨 Done! Did it work?

---

**[85]**
🟦 Yes! The connection is showing as active now — there's a green checkmark next to it. That's the second issue resolved. Now let me check the trigger type before we test.

---

**[86]**
🟨 Ok, I'll wait.

---

**[87]**
🟦 So I checked the trigger — it's set to scheduled polling right now, every 15 minutes. I'm going to swap it to the instant Shopify webhook. This means the scenario will respond to new orders in real time instead of checking every quarter hour. Just so you know, when I do this I'll need to re-run the scenario initialization to register the webhook with Shopify. It'll look like the scenario is being rebuilt for a moment.

---

**[88]**
🟨 Ok, go for it. Should I be worried about anything?

---

**[89]**
🟦 Nope. The scenario will be offline for about 60 seconds max while I make the switch. No orders will be missed — Shopify queues them and the webhook will catch up. You're good.

---

**[90]**
🟨 Perfect. And this was all included in the original price, right?

---

**[91]**
🟦 Yes, all of this is covered. The trigger fix is part of getting the scenario working properly — I'm not going to charge you extra for something that's fundamental to how it should have been set up.

---

**[92]**
🟨 Great, thank you. I appreciate that.

---

**[93]**
🟦 Ok, trigger swap is done. The webhook is registered. Now here's something I noticed while I was in here that you didn't ask me about — your scenario has no error handler set up. That means if Make ever hits a problem (like Google Sheets rate limits or a temporary API blip), the scenario just fails silently and you'd never know. You wouldn't find out until you noticed orders missing again.

---

**[94]**
🟨 Oh wow. So that could have been causing some of the missed orders even before the migration?

---

**[95]**
🟦 It's possible, yeah. In Zapier you get email alerts when tasks fail — Make doesn't do that by default unless you add an error handler. I can add a basic one that sends you an email if the scenario ever fails. It's a small thing but it's the kind of thing that saves you a headache later. Want me to add it?

---

💡 **Instructor Note — Message [95]:** This is the right way to bring up something the client didn't ask for. The freelancer found it naturally during the work, explained WHY it matters, connected it to something the client already experienced (missing orders), and then ASKED before doing it. They didn't just add it and charge more. Trust is built in these small moments.

---

**[96]**
🟨 Yes please! That sounds like something I definitely should have. Is that a big thing to add?

---

**[97]**
🟦 Nope, it's a simple error handler module connected to the end of the scenario — takes about 5 minutes. I'll hook it up to send an email to whatever address you want if the scenario hits an error. What email should it notify?

---

**[98]**
🟨 Use my main one — [redacted]@gmail.com

---

**[99]**
🟦 Got it, adding that now. And while I'm setting this up, I noticed something else worth mentioning — this is more of a "nice to know" than an urgent fix. Your scenario is currently set to process one order at a time (sequential bundles). That's fine for your volume right now. If you ever have a flash sale and get hit with 50 orders at once, you might want to look at how Make handles bundle concurrency. Not a problem today, just something to keep in the back of your mind.

---

**[100]**
🟨 Good to know. For now we're a pretty small shop so probably not an issue.

---

**[101]**
🟦 Exactly, don't worry about it for now. Ok — error handler is added and linked to your Gmail. I also set it up so the error email includes the specific error message and which module failed, so if something ever does go wrong you'll know exactly where to look.

---

**[102]**
🟨 That's really thorough, thank you.

---

**[103]**
🟦 Happy to do it right. Alright, I think we're ready to test. The scenario is saved, the connection is active, the mappings are correct, and the error handler is live. Let's run a real test order through Shopify and watch it land in your sheet.

---

**[104]**
🟨 I'm excited. How do we do this — do I have to place a real order?

---

**[105]**
🟦 Shopify has a built-in test order feature — you can place a fake order with a test payment method. No actual charge, no real fulfillment, but it runs through the whole order flow exactly like a real purchase. Go to your Shopify admin, click Orders, then Create Order — I'll guide you through it.

---

---

## STAGE 5 — TESTING WITH CLIENT (Messages 106–120)

---

**[106]**
🟦 Before you place the test order, switch over to your Google Sheet and leave it open in another tab. You'll want to see the row appear in real time — it's pretty satisfying when it works.

---

💡 **Instructor Note — Message [106]:** Having the client test alongside you — watching the row appear live — is one of the most powerful trust-building moments in freelance work. It transforms "trust me, it works" into "you saw it work yourself." Clients remember this. It also catches any last-minute issues before delivery.

---

**[107]**
🟨 Ok I've got both tabs open. Creating the test order now... it's processing... ok, I clicked Place Order.

---

**[108]**
🟦 Perfect. Now watch the Scenario History in Make — you should see a new run appear within a few seconds.

---

**[109]**
🟨 Oh! There's a new run appearing! It's running right now... it finished. It says completed. Switching to the sheet...

---

**[110]**
🟨 OH IT'S THERE. There's a new row at the bottom! Order number, my test name, the product, everything. This is amazing.

---

**[111]**
🟦 There it is! Let's just confirm all seven columns landed correctly — can you read me what's in the row?

---

**[112]**
🟨 Order number: 1001. Name: Test Customer. Email: test@test.com. Product: Test Product. Quantity: 1. Total: $0.00. And shipping address: 123 Test St, Test City, CA 90210. All there!

---

**[113]**
🟦 Perfect — all seven fields, all mapped correctly. The only thing I want to double-check is the shipping address. You had it as a single column right? Let me look at how it rendered... hmm, I'm seeing it came through without a comma between the city and state. Let me adjust the string format quickly.

---

**[114]**
🟨 Oh yeah, I see that. It says "Test City CA 90210" but it should probably be "Test City, CA 90210."

---

**[115]**
🟦 Exactly. Tiny formatting thing — I just need to adjust how I'm joining the address fields in the mapping. Give me two minutes.

---

**[116]**
🟨 No rush! I'm just staring at the sheet amazed that it's finally working lol.

---

**[117]**
🟦 Ha! Ok, fixed. I updated the address mapping to include the comma between city and state. Want to run one more quick test to confirm?

---

**[118]**
🟨 Yes! Placing another test order now... ok done. Checking the sheet... yes! "Test City, CA 90210" — perfect!

---

**[119]**
🟦 Great, that's exactly right. We're done. The scenario is working, all fields are mapping correctly, the trigger is instant, the connection is stable, and the error handler is live. This is ready to go.

---

**[120]**
🟨 I'm so relieved. This has been driving me crazy for a week. Thank you so much!

---

---

## STAGE 6 — FORMAL DELIVERY (Messages 121–130)

---

**[121]**
🟦 Really glad we got it sorted! I'm going to close out our screen share and submit the formal delivery through Fiverr now. You'll get a notification — just review it and mark the order as complete when you're happy with everything.

---

**[122]**
🟦 [DELIVERY MESSAGE]

Hi! Here's a summary of everything completed for your Shopify → Google Sheets scenario in Make.com:

✅ Diagnosed root cause — identified data mapping error and inactive Google Sheets connection as the two causes of order data not reaching the Sheet

✅ Remapped all 7 data fields (order number, customer name, email, product name, quantity, total price, shipping address) from the Shopify trigger to the correct Make.com data bundle paths

✅ Re-authorized the Google Sheets connection — resolved the inactive OAuth connection preventing writes to the Sheet

✅ Switched scenario trigger from scheduled polling (15-min delay) to instant Shopify webhook — orders now appear in your Sheet in real time

✅ Added error handler module — if the scenario ever fails for any reason, you'll receive an automatic email alert with details of which module failed

✅ Tested live with two Shopify test orders — both rows appeared correctly in the "Incoming Orders" tab with all fields formatted correctly

Your scenario is fully operational. Feel free to reach out if anything comes up. Happy to help anytime!

---

💡 **Instructor Note — Message [122]:** This is what a professional delivery looks like. Each ✅ item corresponds to something specific that was done — not vague claims like "improved your automation." The client can match each item to something they saw happen. This protects the freelancer from disputes AND makes the client feel they got clear value for their money.

---

**[123]**
🟨 This is super thorough, thank you! I'm reviewing it now.

---

**[124]**
🟨 Just marked it as complete. I'm really happy with this. You explained everything so clearly and I actually understand what was wrong now, which is great.

---

**[125]**
🟦 That means a lot, thank you! Understanding your own setup is important — you shouldn't have to be dependent on someone else every time something small changes. If you ever want to learn more about how Make works, feel free to ask. Sometimes I do short walkthroughs too.

---

**[126]**
🟨 Oh that's good to know. Actually — while we were working, you mentioned that other scenarios might have the same issue. Should I be checking those?

---

**[127]**
🟦 Honest answer — yes, it's worth checking. If you rebuilt multiple Zapier flows in Make the same way, there's a real chance some others have the same mapping pattern and the same inactive connection issue. I can take a look at your other scenarios and do a quick audit if you want.

---

**[128]**
🟨 How many other scenarios do I have? I honestly don't know off the top of my head.

---

**[129]**
🟦 When we were on the call I saw 4 active scenarios total in your account. You've got the Shopify-to-Sheets one we just fixed, and three others. I didn't look inside them but from the names they seem to handle things like contact forms and maybe an email notification flow. Want me to do a quick audit of those three?

---

**[130]**
🟨 Yes, definitely. How would that work — same kind of order?

---

---

## STAGE 7 — UPSELL (Messages 131–145)

---

**[131]**
🟦 I noticed while I was inside your Make account that the three other scenarios all look like they were migrated from Zapier around the same time as this one. Given that they were probably built the same way, there's a decent chance at least one of them has a similar mapping issue or an inactive connection. I'd hate for you to have another broken automation and not know it until something important gets missed.

---

💡 **Instructor Note — Message [131]:** This is a textbook good upsell — it's genuine, it's based on something the freelancer actually saw, and it's framed around the client's risk (something important gets missed) not around the freelancer's revenue. The client doesn't feel sold to, they feel looked after.

---

**[132]**
🟨 That would be really helpful. What would you check exactly?

---

**[133]**
🟦 I'd go through each of the three scenarios the same way I did this one — check the module connections to make sure they're active, review the data mappings to make sure fields are pulling from the right places, confirm the triggers are set to instant where they should be, and add error handlers where they're missing. Then I'd give you a report of what I found in each one.

---

**[134]**
🟨 How much would that be?

---

💡 **Instructor Note — Message [134]:** The client asked "how much" very quickly — they're interested. This is the buying signal. The freelancer should name a price confidently without over-explaining or apologizing for it.

---

**[135]**
🟦 For three scenarios — full audit, any fixes needed, error handlers added, and a written summary — I'd say $150. That's $50 per scenario which is less than what this one was since there's no initial diagnosis involved, I already know your setup and what to look for.

---

**[136]**
🟨 That seems reasonable. And if some of them are fine and don't need fixing?

---

**[137]**
🟦 I'll still audit all three and give you the written summary either way. If one of them is totally healthy, you'll know that for sure, which is valuable too. I won't pad the work or invent problems that aren't there.

---

**[138]**
🟨 Ok, I trust you on that. Can you send me the offer?

---

**[139]**
🟦 Sending it now — $150 for the full audit and fix of all three remaining scenarios, with a written findings summary for each one. Should be in your Fiverr inbox in a moment.

---

**[140]**
🟨 Got it! Accepting now. Let's do it.

---

**[141]**
🟦 Great, order confirmed. I'm going to jump into the three scenarios now — I'll work through them and update you when I'm done with each one. I don't think we need another screen share for these unless something unexpected comes up.

---

**[142]**
🟨 Sounds good. Take your time.

---

**[143]**
🟦 Update: I've been through all three. Two of them had the same mapping issue as your Shopify scenario — a contact form flow (Typeform to Sheets) and a Slack notification scenario. Both had inactive connections and partially broken mappings. I fixed both and added error handlers. The third one — which looks like a simple email autoresponder — was actually fine. Connections active, mappings correct. No changes needed there, and I noted that in your summary.

---

**[144]**
🟨 Wow, so two out of three were broken and I had no idea. That's kind of scary honestly.

---

**[145]**
🟦 It happens more than you'd think with migrations. The good news is they're all healthy now. I'm submitting the delivery with the written summary for each scenario — same format as last time so it's easy to read through.

---

---

**[SECOND DELIVERY MESSAGE]**

🟦 Hi! Here's the audit and fix summary for your three remaining Make.com scenarios:

**Scenario 1 — Typeform → Google Sheets (Contact Form Log)**
✅ Found: inactive Google Sheets connection + 4 mismatched field mappings
✅ Fixed: re-authorized connection, remapped all fields from Typeform bundle
✅ Added error handler with email alert
✅ Tested: live Typeform submission now appearing correctly in Sheet

**Scenario 2 — Shopify → Slack (New Order Notification)**
✅ Found: Slack connection showing as inactive, order total field unmapped
✅ Fixed: re-authorized Slack connection, corrected order total mapping
✅ Added error handler with email alert
✅ Tested: test order triggered correct Slack notification with full order details

**Scenario 3 — Order Confirmation Email Autoresponder**
✅ Audited: all connections active, all mappings correct, trigger is instant webhook
✅ No changes required — this scenario was working correctly
✅ No error handler added as one was already in place

All four of your Make.com scenarios are now fully operational with active connections, correct data mappings, instant triggers, and error monitoring. You're in great shape!

---

**[146]**
🟨 This is incredible. Accepted! You've basically rebuilt my whole automation setup and made it better than it ever was. I can't believe how much was broken without me knowing.

---

---

## STAGE 8 — REVIEW & CLOSE (Messages 146–150)

---

**[147]**
🟦 Really glad everything is sorted out. You've got a solid setup now — proper connections, correct mappings, instant triggers on all four scenarios, and error monitoring so you'll know immediately if anything ever goes sideways again. If you ever add new automations or want to expand what you're doing in Make, feel free to come back. Happy to help.

---

**[148]**
🟨 I definitely will. You're the first freelancer I've hired on Fiverr and honestly you made it such a good experience. The way you explained everything without making me feel dumb was really great. I'll be back for sure.

---

**[149]**
🟨 ⭐⭐⭐⭐⭐ [PUBLIC REVIEW]

I came to Alex after migrating from Zapier to Make.com completely broke my Shopify order tracking. My Google Sheet had stopped receiving orders and I had no idea why. From the very first message, Alex asked exactly the right questions and made me feel like the problem was completely solvable. On our screen share, he walked me through exactly what was wrong — there were two separate issues: a data mapping error where the fields weren't connected to the right Shopify data paths, and an inactive Google Sheets OAuth connection that was quietly blocking all writes to the sheet. He fixed both in real time while I watched, switched my trigger from a slow polling setup to an instant webhook, and even added an error handler I hadn't asked for so I'd be notified by email if anything failed in the future. We tested it together and I literally watched the order row appear in my sheet in real time. He also caught that three of my other scenarios had the same migration problems, audited and fixed all of them, and gave me a clear written summary of what he found in each one. Everything is now running better than it ever did in Zapier. Incredibly professional, clear communicator, and genuinely knowledgeable. I'll be hiring Alex again without question.

---

💡 **Instructor Note — Message [149]:** This is what a great review looks like — it mentions specific technical details (data mapping error, inactive OAuth connection, instant webhook, error handler), describes the experience (watching the row appear in real time), references the upsell work naturally, and closes with a clear hiring recommendation. Generic reviews ("great work, highly recommend!") don't help future clients decide. Specific reviews do. The way you earn reviews like this is by doing exactly what Alex did — narrating your work, testing with the client, and delivering clearly.

---

**[150]**
🟦 [PUBLIC FREELANCER RESPONSE]

Thank you so much for this — it genuinely made my day to read. The Zapier-to-Make migration issues you ran into are so common and they can be really frustrating because everything looks like it should be working but the data just silently disappears. I'm glad we caught both the mapping problem and the connection issue, and that switching you to the instant Shopify webhook made such a visible difference. Testing that first order together and watching the row land in the sheet in real time was the best part for me too. I also appreciated how prepared you were — having that scenario history screenshot ready before the call saved us real time. Looking forward to helping you build out more automations when you're ready. Your setup is solid now and you understand how it works, which is exactly where every client should be at the end.

---

*— End of Script —*

---

**Script Summary:**
- Total messages: 150
- Stages covered: All 8
- Instructor notes: 8 total
- Upsell: Messages 131–145 (three-scenario audit, $150 second order)
- Unexpected finding: Messages 93–95 (missing error handler)
- Five-star review: Message 149 (specific, 130+ words)
- Freelancer response: Message 150 (warm, specific, references client's actual actions)
