# Payments and money flow for a SaaS that runs Facebook/Instagram ads (Nigeria and Africa, as of Oct 2026)

Research limitations (read first): WebFetch and curl were blocked by the egress proxy for all external hosts (grey.co, techpoint.africa, developers.facebook.com, help.plai.io returned DNS/403 errors). All findings below come from WebSearch result summaries only, not full-page reads. I could not reach any Meta Business Help Center page, Meta Platform/Commercial Terms, Paystack/Flutterwave/Stripe terms, or AdCreative.ai/Madgicx/Hootsuite/Predis/Pencil/Smartly docs. Many sources are vendor blogs that sell virtual cards. Treat everything as secondary and verify primary sources before building. Items flagged [UNVERIFIED] or [DATED].

## 1. Meta billing mechanics and taxes (Nigeria and Africa)

### Takeaway
The standard model is that the advertiser's own ad account is billed by Meta (card-based, threshold/postpaid-style), with VAT added for Nigeria, Kenya, Ghana (and likely others). I could not retrieve Meta's own pages on thresholds, prepaid vs postpaid, or currency rules, so those items are mostly unconfirmed.

### Cited Findings
- Setup path for adding a payment method is business.facebook.com, Billing, Payment settings — [Spendfigo](https://spendfigo.com/blog/how-to-run-meta-ads-from-nigeria) (vendor blog)
- Billing threshold starts based on the country and currency of the ad account and the payment method used — [AdAdvisor](https://adadvisor.ai/blog/how-to-set-up-meta-ad-account) and related third-party guides (search summary of savemyleads/adadvisor results)
- Account spending limit is a lifetime-style cap across campaigns, separate from campaign budgets; when reached, delivery stops until raised or reset — [AdvertiseMint](https://www.advertisemint.com/?p=1430), [Plai help](https://help.plai.io/set-facebook-account-spend-limit)
- Ad-account currency: sources conflict. One says currency and timezone are fixed at creation, so a new ad account is needed ([AdAdvisor](https://adadvisor.ai/blog/how-to-set-up-meta-ad-account)); another says it can be changed (once per 60 days, no current balance) but pauses ads and resets threshold ([Evertry](https://evertry.co/blog/change-currency-in-facebook-ads/)); a third says only once and billing history resets ([SaveMyLeads](https://www.savemyleads.com/blog/other/how-to-change-the-currency-in-facebook-ads)). Treat as unresolved.
- Nigeria VAT: Meta charges 7.5% VAT on ads for advertisers with business country Nigeria from 1 Jan 2022, business or personal; also applies to Instagram; VAT ID can be added to receipts (11 or 12 digit format) — [21st Century Chronicle](https://21stcenturychronicle.com/nigerians-to-pay-7-5-vat-on-facebook-ads-from-jan-1), [TheCable](https://www.thecable.ng/?p=637748) [DATED: 2021-22 reporting; current rate not rechecked]
- Kenya: 16% VAT on Meta ads from 1 Nov 2022; Kenya also has a 1.5% digital service tax — [TechCabal](https://techcabal.com/2022/11/03/techcabal-daily-kenyans-pay-facebook-ads/), [Tech-ish](https://tech-ish.com/2022/11/02/facebook-meta-16-vat-tax/) [DATED]
- Ghana: 15% VAT plus 2.5% NHIL, 2.5% GETFund, 1% COVID levy from Aug 2023 — [Liquid Design Ghana summary](https://element.liquiddesign.co.uk/ghana/237964-more-taxes-facebook-start-charging-ghanaians-15-vat-ads) [DATED; Ghana changed its levy structure in 2025, not verified here]
- Uganda: Google Ads 18% VAT from Sept 2024; proposed 5% levy on non-resident digital services income; Meta-specific Uganda treatment not found — [Citizen Digital](https://citizen.digital/article/uganda-targets-facebook-google-and-netflix-with-new-digital-services-tax)
- South Africa: foreign e-services suppliers generally charge 15% VAT; no Meta-specific announcement found — [WatsSpace](https://watsspace.com/blog/vat-on-facebook-ads-all-you-need-to-know/) (secondary blog)

### Inferences
- Taxes are added by Meta on top of the ad spend shown in the ad account, so any in-app budget the SaaS shows users should be labeled "before tax" (about 7.5% extra in Nigeria, 16% Kenya, about 20%+ Ghana).
- If the platform were the payer to Meta, the platform (not the user) would receive the VAT invoice, and the user could not reclaim input VAT with their own VAT ID. This is a concrete drawback of the reseller model.

### Gaps
- Meta official pages on prepaid vs postpaid, automatic payment threshold amounts, new-account spend limits, and "disabled for payment" states were not retrievable. Whether Nigeria accounts are prepaid-only or threshold-billed is unconfirmed.
- Current (2026) tax rates for all five countries.

## 2. Why Nigerian advertisers have payment problems, and what works

### Takeaway
Declines come mainly from Nigerian banks restricting international use of naira cards; the usual workaround is a USD-denominated virtual or domiciliary card. Bank limits have been loosening in 2026, but this is bank-by-bank and variable. Nearly all sources are vendor-interested.

### Cited Findings
- Meta processes payments through an international gateway even when billing in naira; many Nigerian banks have international transactions disabled by default on naira cards, with caps reported of about $20-50/month in some cases — [Grey](https://grey.co/blog/pay-for-facebook-ads-in-nigeria), [Spendfigo](https://spendfigo.com/blog/why-my-nigerian-visa-card-keeps-getting-declined-on-meta-ads-and-what-actually-f), [Evertry](https://evertry.co/blog/the-virtual-card-for-facebook-advertising/) (all sell cards; search-summary level)
- Methods listed by Nigerian guides: domiciliary account cards, foreign-issued cards, virtual dollar cards, naira cards for small budgets — [Techpoint partner page](https://techpoint.africa/partner-pages/how-to-easily-pay-for-meta-tiktok-google-ad-payments-in-nigeria/) (a sponsored/partner page, so commercial)
- 2026 bank limit reports: GTBank quarterly international limit on naira cards raised (reported as $20,000 in one article and $40,000 in another; conflicting), Zenith up to $50,000/yr, FirstBank $10,000/quarter, UBA $2,000 and GTBank/FCMB/Ecobank $1,000 in an earlier report — [IT Edge News](https://www.itedgenews.africa/gtbank-sets-20000-quarterly-spending-limit-on-naira-debit-cards-as-nigerian-lenders-ramp-up-international-payments/), [InvestData](https://investdata.com.ng/fx-liquidity-nigerian-banks-lure-customers-higher-spending-limits/), [Aboki Forex](https://abokiforex.app/show-news/firstbank-zenith-bank-gtb-raise-dollar-limits-on-naira-cards-leadership)
- Baseline CBN rule: 2015 circular capped naira cards abroad at $50,000/person/year, $300/day cash; no replacement found — [BusinessDay](https://businessday.ng/exclusives/article/fg-to-limit-debit-card-spending-abroad-to-support-naira/) [DATED]
- Virtual card fee examples: a $0.35 fee plus 2% FX spread, or 1% conversion fee (vendor-specific) — Spendfigo link above
- A new card can pass the verification charge and still fail on a later billing cycle — Spendfigo link above
- Failed or unpaid charges can restrict the ad account ("unsettled"); grace roughly 24-48h per one guide; payment-related disablements can be hard to reverse (a Shopify forum user reported Meta would not re-enable the payments account) — [Adnova](https://www.adnova.ai/blogs/facebook-ad-account-disabled), [Shopify Community](https://community.shopify.com/t/why-is-my-facebook-advertising-account-repeatedly-getting-disabled/97225)
- Other restriction triggers: login from another country, new devices, rapid budget increases — Adnova link above

### Inferences
- A SaaS that takes users' money in naira and funds a platform-owned USD card avoids the user's card problem, but concentrates risk (see section 3).
- Onboarding UX should detect/guide "payment method" setup in Meta's own flow and show failure states, since many users will hit declines.

### Gaps
- I did not verify which of Chipper, Grey, Wise, Payoneer, Verve, Kuda, Fincra, Union54 etc. actually work with Meta in 2026; only vendor claims. Verve not covered.
- No independent (non-vendor) data on approval/restriction rates for brand-new Nigerian ad accounts. Nairaland, Reddit, Meta Community threads not reached.

## 3. Platform fee models, reselling and agency rules

### Takeaway
Meta's developer docs describe a partner model where the partner pays Meta for ads created on clients' behalf and keeps its own billing relationship with the client. Whether markup/resale is allowed, and what eligibility Meta requires (credit lines, partner status), could not be confirmed. A subscription/management fee on top of user-paid spend is the lower-risk pattern.

### Cited Findings
- Meta "Onboard Clients at Scale" doc (last updated Feb 2023): partners can create ad accounts for clients via API, manage campaigns and pay Meta for ads created on clients' behalf; partner maintains a billing relationship with the client; 2-tier child Business Manager setup — [Meta developers](https://developers.facebook.com/documentation/business-sdk/common-scenarios/onboard-at-scale) (seen via search summary only)
- Third-party tools implement percentage-of-spend rebilling with prepaid balances and auto-recharge (e.g., Plai) — [Plai help](https://help.plai.io/charge-clients-percentage-ad-spend-rebilling) (not read in full; unclear whether Plai uses Meta credit lines)
- Agency practitioners warn that agency-held ad accounts leave the agency liable for unpaid bills and cash-flow risk, and recommend clients pay Meta directly or separate ad accounts per client — [AdManage](https://admanage.ai/blog/how-to-run-facebook-ads-for-clients), [Sprout Social community](https://community.sproutsocial.com/coffee-talk-42/billing-clients-for-social-ads-1145) (opinion, not Meta policy)
- Money-handling regulation context: Dec 2023 NIBSS directive told banks to stop outward transfers to non-deposit entities like switches, because licenses do not permit holding customer funds; Flutterwave said it was not affected — [BusinessDay](https://businessday.ng/news/article/banks-ordered-to-cut-off-flutterwave-remita-others-from-transfer-services/), [ThisDay](https://thisdaylive.com/index.php/2023/12/10/nibss-directive-paystack-opay-others-reassure-customers)
- Stripe restricted-business list is general and I found no ad-spend pass-through rule — [Stripe](https://stripe.com/en-gb-ca/legal/restricted-businesses)

### Inferences
- Reseller model (platform collects budget, pays Meta from its own ad account/card) means: platform is the advertiser of record, bears chargeback, fraud, policy-violation and unpaid-bill risk; ads of many users share one account so one bad ad can disable all; likely needs a Nigerian licence analysis (holding customer funds may be a CBN regulated activity; escrow/wallet is a grey area) and its payment processor may treat it as marketplace/pass-through. These are my inferences, not sourced legal conclusions; get Nigerian counsel.
- Fee on top of spend is feasible in two ways: (a) subscription or fixed management fee charged separately by the SaaS while spend goes to Meta; (b) percentage of spend, billed separately (calculated from API spend data), not blended into Meta's invoice.

### Gaps
- Meta Platform Terms/Commercial Terms on reselling, markup, and "authorized reseller"/Meta Business Partner or credit line eligibility, and whether available in Nigeria: not found. No Meta policy on agencies using personal cards of clients.
- Paystack and Flutterwave prohibited/restricted lists regarding advertising pass-through: not found. CBN licensing category for ad-budget collection: not found.

## 4. How established ad tools handle billing

### Takeaway
Tools found price as subscription, often scaled by managed ad spend, with spend paid in the user's Meta account. Only partial evidence; no primary docs read.

### Cited Findings
- Birch (ex-Revealbot) pricing is based on monthly ad spend across connected ad accounts (e.g., Essential $49/mo annual, $99 monthly, up to $10K spend; Pro $99; Enterprise custom); fee is a software fee on spend managed — [Superscale](https://superscale.ai/alternatives/revealbot/pricing), [Revealbot help](https://help.revealbot.com/en/articles/3293152-is-there-a-minimum-ad-spend-to-use-revealbot) (older FAQ, [DATED])
- Madgicx price is tiered by monthly Meta ad spend bracket (<$1K to $30K+), entry near $55/mo (estimates vary, $29 homepage offer), 7-day trial — [Superscale](https://superscale.ai/alternatives/madgicx/pricing), [Toolradar](https://toolradar.com/tools/madgicx/pricing) (third-party)
- Plai offers percentage rebilling with prepaid balance — Plai link above

### Inferences
- Pattern: subscription priced by connected spend, ad spend stays in the user's own Meta billing. Rebilling exists but as an agency feature.

### Gaps
- AdCreative.ai, Smartly.io, Hootsuite Ads, Predis, Pencil, Meta Advantage+/Boost docs: not retrieved. Whether Madgicx/Birch state "spend billed by Meta" in their own FAQ: not confirmed.

## 5. Local rails for the SaaS's own subscription/fees

### Takeaway
Not researched adequately; only regulatory context found.

### Cited Findings
- NIBSS directive context in section 3 (switches/PSPs not permitted to hold funds) — BusinessDay and ThisDay links above.

### Inferences
- Paystack and Flutterwave are the conventional NGN acquirers for subscriptions (my background knowledge, unverified here); Stripe for non-Nigerian cards via a foreign entity or Stripe Atlas-style setup (the Nigeria merchant availability is unconfirmed). Charging only the SaaS fee through these keeps funds in "revenue" not "customer money held", which avoids the pass-through issue.

### Gaps
- Stripe availability for Nigerian businesses in 2026, Paystack/Flutterwave fee schedules, recurring-billing/card tokenization limits, Ghana/Kenya/SA/Uganda coverage (M-Pesa, MoMo): not verified.

## 6. Recommendation (my synthesis, partly unverified)

- v1: Each user connects their own Facebook account and Business/ad account via OAuth; user adds their own payment method inside Meta; Meta bills user directly (plus VAT). SaaS charges its own subscription (NGN via Paystack/Flutterwave, USD elsewhere), optionally tiered by managed spend like Madgicx/Birch. Add in-app guidance for Nigerian payment-method setup (USD virtual/domiciliary card), preflight checks of ad account status/funding source, spend-limit awareness, and a "payment failed" alert flow. No platform handling of ad budget.
- v2 options: (a) percentage-of-spend management fee billed separately; (b) prepaid wallet/rebilling only after legal review (CBN licensing, Meta terms/partner eligibility, processor approval), with per-client ad accounts, prepayment (never post-pay), caps, and fraud controls; consider partnering with a licensed payment provider/agency that already holds Meta credit lines.
- Verify before building: Meta's current Terms on reselling; Meta Business Help Center on payment methods in Nigeria; current VAT rates; Paystack/Flutterwave/Stripe terms.
