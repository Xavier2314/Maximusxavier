# Meta Marketing API: technical and approval path for a third-party ad-builder SaaS (as of Oct 2026)

Method note: direct fetches of developers.facebook.com / developers.meta.com were blocked by the sandbox egress proxy (403 / ENOTFOUND). All findings below come from WebSearch result summaries that quote or paraphrase Meta pages plus third-party write-ups. Meta primary pages are linked where the search surfaced them, but I could not open them to confirm wording. Treat everything as "needs confirmation in the App Dashboard / live docs" unless marked otherwise. Date of research: 2026-10-19.

## 1. Is it allowed, which API objects/endpoints, and what is the current API version?

### Takeaway
Yes: third-party apps create campaigns/ad sets/creatives/ads in users' ad accounts through the Marketing API, with the objects flowing campaign -> ad set -> creative -> ad. Current version is Graph/Marketing API v26.0 (released 2026-07-29); v25.0 shipped 2026-02-18. Legacy Advantage+ Shopping/App campaign (ASC/AAC) creation is closed, so a builder must use the unified Advantage+ structure.

### Cited Findings
- v26.0 released July 29, 2026; availability end date TBD. v25.0 introduced Feb 18, 2026; v24.0 (Oct 8, 2025) listed as expiring Oct 6, 2026; v23.0 expiring June 9, 2026 (versions page last updated May 21, 2026, so dates may have shifted) — [Graph API v26.0 changelog](https://developers.facebook.com/docs/graph-api/changelog/version26.0/), [v26 blog](https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/), [versions page](https://developers.facebook.com/docs/graph-api/changelog/versions)
- v25.0 blog (Feb 18, 2026) announced it — [Introducing Graph API v25 / Marketing API v25](https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25)
- Standard build order per Meta's click-to-WhatsApp guide: create campaign, then ad set, then ad creative, then ad. Campaign is `POST /act_<AD_ACCOUNT_ID>/campaigns` with `objective=OUTCOME_ENGAGEMENT` and `special_ad_categories=[]`; verify with `GET /<AD_CAMPAIGN_ID>` — [Click to WhatsApp](https://developers.facebook.com/docs/marketing-api/ad-creative/messaging-ads/click-to-whatsapp)
- Creatives: `POST` to the ad account `/adcreatives` with a name and `object_story_spec`; CTA buttons live in `link_data`; lead ads need `privacy_url`; if `object_story_spec`/`object_story_id` is given, `asset_feed_spec` is ignored; `image_hash` is read from `link_data` — [Call ads / creative docs](https://developers.facebook.com/documentation/ads-commerce/marketing-api/call-ads), [pipeboard meta-ads-mcp source (third party)](https://glama.ai/mcp/servers/@pipeboard-co/meta-ads-mcp/blob/97207a468e8c77417d1cf995349d5ef399c3e52b/meta_ads_mcp/core/ads.py)
- ASC/AAC: new legacy creation blocked from v24.0 (Oct 8, 2025); create/update blocked on v25.0 (Feb 18, 2026) and on all versions after 90 days (~May 19, 2026). Replacement: use Advantage+ audience, Advantage+ campaign budget and Advantage+ placements; `smart_promotion_type=AUTOMATED_SHOPPING_ADS` is replaced; `existing_customer_budget_percentage` deprecated in v25.0 (use two ad sets, new vs existing customers) — [Advantage+ Shopping Campaigns doc](https://developers.facebook.com/documentation/ads-commerce/marketing-api/advantage-shopping-campaigns), [ppc.land: legacy APIs deprecated](https://ppc.land/meta-deprecates-legacy-campaign-apis-for-advantage-structure/), [ppc.land: unified structure](https://ppc.land/meta-launches-unified-api-structure-for-advantage-campaigns/)
- Read-only `advantage_state_info` field reports ADVANTAGE_PLUS_SALES / _APP / _LEADS / DISABLED — single secondary source, unconfirmed — [ppc.land](https://ppc.land/meta-deprecates-legacy-campaign-apis-for-advantage-structure/)

### Inferences
- A builder should target v25/v26, set objective + Advantage+ audience/budget/placements explicitly, and read `advantage_state_info` to confirm the campaign qualified as Advantage+ sales/leads.
- Pin an explicit version in all calls and schedule a version-bump each ~6 months; v24 sunset (Oct 6, 2026) has just passed.

### Gaps
- Exact current endpoint reference pages for `adimages`, `advideos`, `customaudiences`, `targetingsearch`, `delivery_estimate` were not retrieved. From general knowledge (NOT verified this session): `POST /act_{id}/adimages` (bytes -> image hash), `POST /act_{id}/advideos`, `POST /act_{id}/customaudiences`, `GET /act_{id}/targetingsearch` and `/search?type=adinterest`, `GET /act_{id}/delivery_estimate`, `GET /act_{id}/reachestimate`, `POST /act_{id}/adsets`, `POST /act_{id}/ads`. Confirm each against the live reference.
- v26.0 reportedly removed three delivery-forecasting fields with no successor (see section 6) so `delivery_estimate` usage must be re-checked.

## 2. Login, tokens, permissions

### Takeaway
Meta positions Facebook Login for Business (config_id-driven, permissions set in the app's use case/configuration rather than runtime `scope`) as the preferred auth for Tech Providers/business apps. System-user tokens can be non-expiring or 60-day expiring; standard user long-lived tokens last ~60 days.

### Cited Findings
- Facebook Login for Business is described as the preferred authentication/authorization solution for Tech Providers and business app developers who need business clients' assets; system-user (Business Integration System User) tokens are tied to the client's business portfolio and limited to the assets the client designated in the login flow; clients can revoke by removing the app under Business Manager Connected Apps — [Facebook Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business), [Business Login Authentication](https://developers.facebook.com/docs/facebook-business-extension/fbe/get-started/business-login)
- System-user tokens: non-expiring ones never expire; expiring ones last 60 days from generation/refresh and must be refreshed within 60 days. Doc examples request scopes `ads_management`, `pages_read_engagement`, `pages_show_list`. System user and token owner must belong to same business — [Install Apps, Generate, Refresh, Revoke Tokens](https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens/)
- Long-lived user tokens ~60 days; Page tokens derived from them have no expiry but die on password change or loss of Page role (third-party) — [upload-post guide](https://www.upload-post.com/facebook-graph-api/), [bundle.social](https://bundle.social/blog/facebook-page-access-token)
- Developer repos show the Login for Business pattern: invoke login with `config_id` instead of `scope`; a System User configuration yields a never-expiring token and the `fb_exchange_token` exchange does not apply — GitHub PRs, not spec: [mr3826 PR #131](https://github.com/mr3826/easymoderator-monorepo/pull/131), [goingreal1 PR #101](https://github.com/goingreal1/meta-automation-ads/pull/101)
- Permission definitions: `ads_read` covers reporting for ad accounts you own or were granted access to; `ads_management` for creating/managing — [Permissions Reference](https://developers.facebook.com/docs/permissions)
- Advanced Access is granted per permission after App Review and Business Verification; Standard Access works only for assets of people with a role on the app — [unified.to](https://unified.to/blog/how_to_get_your_meta_ads_api_key), [overads.io](https://overads.io/blog/read-only-ad-access)

### Inferences
- For a SaaS where each user owns their ad account, the realistic permission set is `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`, plus `pages_manage_ads` (and `pages_manage_posts` / `instagram_basic` / `instagram_content_publish` only if you publish organic or need IG identity). Each needs Advanced Access for non-role users. Request only what you demo.
- Store tokens encrypted in Supabase; plan for token invalidation (password change, role removal, app removal) with a "reconnect" flow.

### Gaps
- Which permissions Meta currently exposes inside a Login for Business configuration for ads, and whether customer-owned (not developer-owned) ad accounts work with Business-Integration System User tokens without being a Tech Provider: not confirmed. Docs said the system-user token flow is "Tech Providers only" per the search summary.
- `catalog_management` need and access level: not researched (only relevant for catalog/product ads).

## 3. App Review, Business Verification, Tech Provider, tiers and rate limits

### Takeaway
Serving other people's ad accounts requires Advanced Access (App Review + Business Verification). Meta renamed the access tiers in May 2026 (Standard -> Limited, Advanced -> Full) and relaxed the tier-upgrade thresholds. Tech Provider status is tied to requesting advanced permissions; Access Verification is reportedly being dropped.

### Cited Findings
- May 4, 2026: "Ads Management Standard Access" renamed "Marketing API Access Tier"; tiers renamed Standard->Limited, Advanced->Full; threshold lowered from 1,500 to 500 Marketing API calls in 15 days; error rate must be below 15%, measured over the last 500 calls (previously <10% over 30 days and 1,500 calls in 30 days). Existing levels carry over; no code changes — [Meta blog: updates to Ads Management Standard Access](https://developers.meta.com/blog/updates-to-ads-management-standard-access-feature/), [Marketing API authorization](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization)
- New Marketing API apps get Limited tier by default; Full requires App Review. Full tier allows an unlimited number of ad accounts and lower rate limiting — [Rate limiting doc (updated May 5, 2026)](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/rate-limiting), [Ads Management Standard Access feature page](https://developers.secure.facebook.com/docs/features-reference/ads-management-standard-access/)
- Rate limits: Business Use Case (BUC) limits apply per ad account per use case; `X-Business-Use-Case` header; read call ~1 point, write ~3 points; development-tier max score 60 with 300 s decay; ad-account throttling = error 613, subcode 1487742. Older third-party formula: standard tier 100,000 + 40 x active ads per hour per ad account; development 300 + 40 x active ads — [Rate limiting](https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/rate-limiting), [rollout.com](https://rollout.com/integration-guides/facebook/api-essentials) (formula is secondary, pre-rename)
- Business Verification is reported as mandatory for Advanced Access to `ads_management`, taking "a few business days" (unified.to) to "2-5 business days" (360dialog) but sometimes weeks — [unified.to](https://unified.to/blog/how_to_get_your_meta_ads_api_key), [360dialog](https://docs.360dialog.com/partner/get-started/tech-provider-program/become-a-meta-tech-provider), [singhamandeep.com](https://singhamandeep.com/facebook-ads-api-permission-app-review/)
- Screencast: must show full login flow and user granting permission; ads demo should show metrics (impressions, spend, clicks) in the product — [Permissions Reference](https://developers.facebook.com/docs/permissions)
- Rejection experiences: submissions with all scopes bundled rejected twice; reviewer needed live data in the dashboard; an already-connected test account makes a useless demo; one tool got `ads_read` and `business_management` approved in July 2026 but `ads_management` declined (anecdotes, marketing-biased) — [singhamandeep.com case study](https://singhamandeep.com/ads_read-permission-approved/), [overads.io](https://overads.io/blog/read-only-ad-access)
- Tech Provider: apps default to Direct Integrator; classified Tech Provider if developer upgrades or app requests advanced permissions. Reports (about a week before research) that Meta is removing Access Verification from Tech Provider onboarding; Business Verification and App Review remain — [Social Samosa](https://www.socialsamosa.com/news-2/meta-removes-access-verification-tech-provider-app-onboarding-12667685), [Adgully](https://www.adgully.com/post/22175/meta-eliminates-access-verification-from-tech-provider-app-onboarding-process), [Meta Tech Providers docs](https://developers.secure.facebook.com/docs/development/release/tech-providers/)

### Inferences
- Standard/Limited Access with `ads_management` works for ad accounts of people with roles on your app (developers/testers) and your own business's accounts; real Nigerian sellers require Advanced Access, hence Business Verification of YOUR company plus App Review with screencasts. Tech Provider status follows from requesting advanced permissions; Marketing Partner (MMP) status is a separate, optional program and does not look required.
- Realistic plan: use your own business's ad account + test users to hit 500 calls/<15% error to reach Full tier in parallel with review.

### Gaps
- Exact App Review steps UI, data deletion callback and privacy policy requirement text, review turnaround time: not confirmed from Meta pages (standard requirements from general knowledge: privacy policy URL, data deletion callback or instructions URL, app icon, category, test instructions/credentials; unverified here).
- Whether Marketing Partner (MMP) program is needed or open to new applicants: not researched.
- Whether a Nigeria-registered company can complete Business Verification and typical documents: not found.

## 4. Delivery side: objectives, Advantage+, messaging, special categories, account prerequisites

### Takeaway
Objectives are OUTCOME_* types; click-to-WhatsApp supports OUTCOME_ENGAGEMENT, LEADS, SALES, TRAFFIC. Special-category (housing/employment/credit) campaigns carry new targeting rules. Payment in Nigeria is a practical blocker for users.

### Cited Findings
- Click-to-WhatsApp supported objectives: OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_TRAFFIC; call prompts require OUTCOME_ENGAGEMENT; a Facebook Page must be linked to the messaging destination (WhatsApp Business number, Messenger or Instagram). Website-to-message ad sets use `destination_type` WEBSITE or UNDEFINED — [Click to WhatsApp](https://developers.facebook.com/docs/marketing-api/ad-creative/messaging-ads/click-to-whatsapp), [Website ads click-to-message](https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/messaging-ads/website-ads-click-to-message)
- Advantage+ sales/app/leads are expressed via Advantage+ audience + budget + placements (see section 1).
- Nigerian payments: Meta processes ad payments via international gateways even with Naira billing; CBN/bank caps on international naira card spend (reports of $20-$50/month or zero); workarounds are domiciliary USD cards, virtual dollar cards, bank transfer; payment failure can trigger account restriction (vendor blogs, commercial interest) — [Grey](https://grey.co/blog/pay-for-facebook-ads-in-nigeria), [Techpoint Africa](https://techpoint.africa/partner-pages/how-to-easily-pay-for-meta-tiktok-google-ad-payments-in-nigeria/)

### Inferences
- UI-only or user-side steps (from general knowledge, unverified here): creating the Page, ad account, adding a payment method, accepting terms (e.g. non-discrimination, custom audience terms), linking Instagram/WhatsApp assets, and any ad-account business verification prompts. Build an onboarding checklist that detects missing prerequisites via API reads before publishing.
- For Nigerian sellers, WhatsApp/Messenger objectives are probably the highest-fit campaign types; pixel-based sales requires a working funnel domain.

### Gaps
- Exact ad set `promoted_object` and `destination_type` values for click-to-WhatsApp (e.g. `destination_type=WHATSAPP`, `promoted_object.page_id`, `whatsapp_phone_number`) were not confirmed; check the guide.
- Special ad categories: current country-specific list and Africa-specific restrictions not retrieved beyond the v26 HEC-F change.
- Which assets can be created via API vs UI (ad account creation, payment method) not confirmed from Meta docs.

## 5. Tracking: Pixel, CAPI, AEM

### Takeaway
Dataset (pixel) + Conversions API with browser/server deduplication is the supported setup; Aggregated Event Measurement status in 2026 was not confirmed.

### Cited Findings
- Dedup uses `event_name` + `event_id`; Meta keeps the first event when matches arrive within 48 hours; browser event favored if both arrive within ~5 minutes — [Server event parameters](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event), [relevantaudience guide](https://www.relevantaudience.com/facebook-ads/meta-pixel-and-conversions-api-guide/)
- When a pixel becomes a dataset the dataset ID equals the pixel ID; server events post to the dataset-ID endpoint; `event_time` can be up to 7 days old and one stale event fails the whole batch (third party) — [theadspend.com](https://theadspend.com/blog/meta-ads-conversion-tracking), [adsuploader](https://adsuploader.com/blog/meta-conversions-api)
- Meta publishes no Event Match Quality threshold; score targets in blogs are not Meta benchmarks — [datanostro](https://datanostro.com/en/blog/tracking/meta-conversions-api-complete-guide/) (sources disagree: one blog suggests 7/10)

### Inferences
- In Next.js: fire `fbq('track', 'Lead', {}, {eventID})` client-side and `POST /{dataset_id}/events` from a Route Handler with the same `event_id`, hashed `em`/`ph`, `fbp`/`fbc`, `client_user_agent`, `event_source_url`, `action_source=website`.

### Gaps
- Aggregated Event Measurement: no 2026 sources found (domain verification, 8-event limit status unverified).
- Creating a pixel/dataset by API (`POST /act_{id}/adspixels`) and the permission/access it needs for customer accounts: not confirmed. Using the user's token vs system user for CAPI also not confirmed.
- Tracking with custom funnel domains under user's business: domain verification requirement not confirmed.

## 6. 2025-2026 changes that affect third-party ad builders

### Takeaway
Major items: legacy ASC/AAC shutdown, tier renames/threshold changes, and v26.0 breaking changes (HEC-F Advantage+ audience flag, stripped placements, removed forecasting fields).

### Cited Findings
- v26.0: for HEC-F (housing, employment, financial) ad sets with relaxable targeting in non-broad setups, `targeting_automation.advantage_audience` must be explicitly 1 or 0 or ad set creation fails with `ADS_TARGETING__REQUIRE_EXPLICIT_ADVANTAGE_AUDIENCE_FLAG`; saved and lookalike audiences are the audience types removed for HEC-F — [ppc.land v26](https://ppc.land/meta-blocks-47-commerce-endpoints-as-graph-api-v26-0-lands-today/), [unalsoft](https://unalsoft.com/blog/2026-07-31-meta-graph-api-v26/en/), [v26 changelog](https://developers.facebook.com/docs/graph-api/changelog/version26.0/)
- v26.0: `story` value silently removed from `messenger_positions`; Instagram Explore Feed placement removed; Ads in WhatsApp Status capabilities expanded; three delivery-forecasting fields removed with no successor (secondary) — [unalsoft](https://unalsoft.com/blog/2026-07-31-meta-graph-api-v26/en/), [admakeai Aug 2026](https://admakeai.com/blog/meta-ads-updates-august-2026)
- Commerce Order Management: 47 endpoints blocked on v26.0+, removed from all versions Oct 27, 2026 (date and scope differ across secondary sources) — [ppc.land](https://ppc.land/meta-blocks-47-commerce-endpoints-as-graph-api-v26-0-lands-today/), [relevantaudience](https://www.relevantaudience.com/meta/meta-graph-api-v26-commerce-endpoints/)
- One secondary source claims remaining legacy campaigns pause around Sept 2026 in v26; unconfirmed — [ualedger](https://ualedger.com/blog/posts/follow-up-meta-advantage-plus-rollout)

### Inferences
- Avoid lookalike/saved audiences and detailed targeting on any special-ad-category campaign; surface a category question in the AI flow and default `special_ad_categories=[]` only after the user confirms.

### Gaps
- Full v25.0 and v26.0 changelogs not read directly; list may be incomplete. Other possible 2025 changes (Advantage+ creative defaults, detailed targeting expansion, v22-v24 deprecations) were not researched.
- Whether there are explicit Africa/Nigeria-specific API restrictions: none found.
