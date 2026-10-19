# Meta (Facebook/Instagram) ad policy and Nigeria/Africa legal compliance for an AI ad-builder (as of 19 Oct 2026)

IMPORTANT METHOD NOTE: WebFetch could not reach any host in this environment (DNS errors for transparency.meta.com, facebook.com and others). All findings below come from WebSearch result summaries, which quote or paraphrase the Meta pages. Nothing was read in full from the primary page. Quoted fragments are as returned by search; verify wording on the live Meta pages before hard-coding rules. Nothing here is legal advice; items marked [COUNSEL] need a Nigerian/regional lawyer.

## 1. Meta Advertising Standards that matter (personal attributes, health/weight loss, supplements, claims, income/MLM)

### Takeaway
Meta bans ads that assert or imply knowledge of the viewer's health, finances or other attributes. It restricts weight-loss ads (18+ only, no before/after, no body-shaming) and bans "unsafe supplements" (a named non-exhaustive list). Income and MLM ads must fully describe the business model and may not promise quick money. A compliant-by-design generator should avoid second-person condition targeting, outcome promises, transformation imagery and earnings claims altogether.

### Cited Findings
- Personal attributes: ads "must not contain content that asserts or implies personal attributes", including direct or indirect assertions; physical or mental health (including medical conditions) is a covered attribute; ads cannot imply knowledge of a user's medical information. Broad references and passing references are allowed. — [Meta: Privacy violations and personal attributes](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/) (as summarized by search)
- Rationale: assumptions about people "could be perceived as intrusive, unsettling or inaccurate"; Meta says to focus on product benefits. — same source
- Practitioner reading: "you/your" is a problem when it implies you know the audience has the attribute; "Do you have diabetes?" is cited as a violation example. — [Jon Loomer](https://www.jonloomer.com/can-we-use-the-words-you-and-your-in-facebook-ads-copy/) (third-party commentary, not Meta text)
- Health and wellness: ads for dietary, health or weight-loss products/services must be targeted to people 18+; Meta prohibits "distasteful messaging that could make people feel negatively about the way they look, exploit insecurities to conform to certain beauty standards, reinforce negative or unhealthy body images, or feature body-shaming"; before-and-after / side-by-side transformation visuals are restricted for weight loss (exception noted for fitness classes); close-ups pinching body fat are banned. — [Meta: Health and wellness](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness) (as summarized by search)
- Secondary claim (unverified against Meta): before/after may be allowed for some general cosmetic procedures but banned for weight loss and wrinkle treatments. — [aimerce.ai summary](https://www.aimerce.ai/blogs/what-metas-health-wellness-ad-policy-actually-allows)
- Unsafe supplements: "include but are not limited to: anabolic steroids, chitosan, comfrey, dehydroepiandrosterone, ephedra and human growth hormones"; policy also prohibits sale/use of illicit/recreational drugs and other unsafe substances, including prescription drugs. — [Meta: Unsafe supplements](https://transparency.meta.com/policies/ad-standards/dangerous-content/unsafe-supplements)
- Income/business opportunity: "Misleading business models. Ads promoting income opportunities must fully describe the associated product or business model, and must not promote business models offering quick compensation for little investment, including multi-level marketing opportunities." Also bans "Unrealistic enticement claims... Claims that a person can become rich quickly" and requiring an initial payment or financial account info for employment consideration (an initial application fee is allowed). — [Meta: Unrealistic outcomes](https://transparency.meta.com/policies/ad-standards/deceptive-content/unrealistic-outcomes) (quotes via search summary)
- Reviewers evaluate primary text, headline, image, landing page and lead form together; bank-balance/profit screenshots and "make money fast" framing are commonly flagged. — [Enrich Labs 2026 guide](https://www.enrichlabs.ai/blog/meta-ads-policy-guide-2026) (third-party)
- Claim that Meta blocks MLM product catalogs on Commerce, and that resellers of MLM-brand products get flagged: — [GoDataFeed](https://www.godatafeed.com/disapproval/meta-mlm) (third-party; not confirmed in Meta docs)
- Enforcement pressure on weight-loss ads: in Dec 2025 a bipartisan coalition of 35 US state attorneys general wrote to Meta saying its health-ad policies are not sufficiently enforced, citing AI-generated before/after GLP-1 ads. — [PA Attorney General](https://www.attorneygeneral.gov/?p=32582). Implication: expect tightening.

### Inferences
- Not retrieved verbatim (do not assume wording): Meta's rules on testimonials, sensational content, scarcity/countdown claims, "cure/treat" medical claims, and use of Meta/brand names. Practitioners and Meta's general misleading-claims page treat guaranteed cures/treatments, fake urgency and implying Meta endorsement as violations; treat as conservative defaults, verify.
- Suggested "never say" list (rule design, not Meta text):
  - Cure/treat/prevent/reverse any disease: cures diabetes, hypertension, cancer, HIV, fibroids, infertility, ulcers, arthritis; "doctor-approved"; "clinically proven" without evidence.
  - Condition-addressing second person: "Are you struggling with belly fat/low sperm count/diabetes?"; "Your hormones are out of balance"; "Tired of your fat arms?"
  - Guaranteed/quantified results: "lose 10kg in 7 days", "guaranteed", "100% results", "no side effects".
  - Body shaming: "ugly belly", "disgusting fat", "nobody will love you".
  - Before/after images, tape-measure/pinching, scale photos.
  - Income: "earn N500k weekly", "be your own boss, quit your job", "passive income", "financial freedom", "get rich", "no work needed", screenshots of earnings/bank alerts/cars/houses, "join my team", recruitment-led copy.
  - Fake scarcity: unauthentic countdowns, "only 3 left" unless true.
  - "Facebook/Instagram/Meta-approved", Meta logos.
  - Named unsafe ingredients: ephedra, chitosan, comfrey, DHEA, anabolic steroids, HGH.
- Suggested safe alternatives: "Supports a balanced diet and healthy lifestyle" (not "cures..."); "Made with moringa and ginger. See ingredients and directions on the label"; "Part of a healthy routine, results vary"; "Looking for a daily wellness option? Learn more" (no attribute assertion); for MLM, advertise the product (not income), disclose the product-selling model plainly if business is mentioned, no earnings figures; "Individual results vary. Not a substitute for medical advice."

### Gaps
- Could not read any Meta page directly; exact current text for testimonials, sensational content, scarcity, brand-name use, and "cure/treat" claims not captured.
- Whether Meta's 2026 wording changed from the above is unverified. Meta policy page dates not captured.
- Whether a distributor posting MLM product ads (not recruitment) triggers the "business opportunity" rule is unclear; practitioners say MLM product ads are generally allowed if no income claims, unverified.

## 2. Special ad categories, verification, Business Verification

### Takeaway
Product ads for supplements/wellness are not in a special ad category. Categories are housing, employment, financial products/services (formerly credit) and social issues/elections/politics. A seller advertising a "business opportunity" or recruitment could be misread as employment; the app should block job-style recruiting copy or force category declaration.

### Cited Findings
- Categories: housing, employment, financial products and services, social issues/elections/politics. Declaring one of the first three limits targeting (age, gender, location detail, some audiences); political/social-issue ads need identity checks and disclaimers. — [Jon Loomer special ad categories](https://www.jonloomer.com/special-ad-categories-meta-ads/); [PPC Land](https://ppc.land/special-ad-category/)
- Some sources say the targeting restrictions apply in the US, Canada and parts of Europe; no source found on Africa. — [Save My Leads](https://savemyleads.com/blog/other/meta-special-ads-category)

### Inferences
- Pre-publish check: if copy mentions hiring, "join our team", jobs, loans, credit, investment/forex/crypto, rent/property, or elections/political issues, stop and require a human decision. Income-opportunity recruiting for MLM is the main way a wellness seller could drift into employment/financial territory.

### Gaps
- Not found: Business Verification effects on ad spending limits and exact Nigeria-specific verification steps; list of African countries where social-issue authorization is required (Meta has run authorization in some African countries around elections, unverified here); authorization process details.

## 3. Enforcement reality

### Takeaway
Meta's review is mostly automated and re-review can occur at any time; rejected ads can lead to restrictions on the account/assets. No authoritative number for "rejected ads before restriction" was found. Treat any rejection as a signal and stop auto-retrying.

### Cited Findings
- Meta's standards say a rejected ad can lead to restrictions on the business account or its assets; restricted assets can't advertise; ads can be re-reviewed and rejected at any time; lower-quality ads can lose performance. — [Meta Advertising Standards intro](https://transparency.meta.com/policies/ad-standards/)
- Practitioner escalation ladder: ad rejection, spending limit, restricted access, disabled account; causes: policy violations (misleading claims, before/after, restricted products), payment problems, unusual login/spend activity, negative feedback. One blog says a single strike rarely disables an account. Check Account Quality, fix, appeal. — [Stackmatix](https://www.stackmatix.com/blog/facebook-ad-account-disabled); [Benly](https://benly.ai/learn/meta-ads/ad-account-restricted-fix) (third-party)
- Appeal window "180 days" claimed by one blog; unverified. — [Grow With Sakib](https://growwithsakib.com/meta-ads-account-disabled/)
- Nigerian account-recovery vendors exist selling handbooks; claims unverified. — [Selar listing](https://selar.com/metaaccountsolutions)

### Inferences
- Likely risk signals for this product (inference, no source): many near-identical ads from one account in minutes; many new ad accounts connected via one app/IP; new account + immediate high-risk health/income creative; rapid edit-resubmit after rejection; new payment method with high spend. Safeguards: one ad at a time with rate limit (e.g. a few per day on new accounts), mandatory human approval, draft mode by default, varied genuine creative, no auto-resubmit of rejected ads, surface Account Quality status in-app, warn users to protect personal profile (ads run from admin profile).
- Because Page/ad account/profile are linked, tell users a violation can affect personal profile; recommend a Business portfolio, Page with a real business identity, 2FA.

### Gaps
- No Meta statement on rejection thresholds; no verified data on Nigerian new-account ban causes; Business Verification limits not found; appeals process details only third-party.

## 4. Platform Terms / Developer Policies for apps that manage ads

### Takeaway
Marketing API apps are bound by Meta Platform Terms and Developer Policies, including data-deletion callbacks, privacy policy and limited data use. Primary text not retrieved.

### Cited Findings
- Data deletion callback: URL in App Dashboard; Meta sends a signed request; developer returns confirmation code and status URL. — [PPC Land](https://ppc.land/meta-enhances-developer-platform-with-new-user-data-deletion-requirements/)
- Summary: delete a user's data within 90 days after deletion request or permission removal; restrictions on selling data/data brokers; Meta may audit and terminate. — [ConductAtlas Meta Platform Policy](https://conductatlas.com/platform/meta/meta-platform-policy/90-day-platform-data-deletion-obligation/) (secondary)
- Example Marketing API app policy: uses ads_read and ads_management, subject to Platform Terms and Developer Policies. — [Freestar](https://freestar.com/meta-app-privacy-data-retention-policy/)

### Inferences
- Needs: App Review with ads_management/business_management permissions, possibly Advanced Access and Business Verification of the app owner (typical, verify); privacy policy and ToS stating the AI drafts content and the seller is responsible; user consent screen; deletion flow; token storage security. Liability: Meta's advertising terms hold the advertiser (account owner) responsible; the app's own ToS should allocate responsibility and disclaim, but the app could still face Meta enforcement and consumer-law exposure for facilitating [COUNSEL].

### Gaps
- Official Platform Terms, Developer Policies and bulk/automation restrictions not retrieved; app review requirements not verified.

## 5. AI-generated content rules

### Takeaway
Meta labels AI content ("AI info"); disclosure is required for photorealistic synthetic media in political/social-issue ads, and reportedly applies more broadly for AI-generated realistic people. Official 2026 wording not confirmed.

### Cited Findings
- Social-issue/election/political advertisers must disclose when photorealistic image/video or realistic audio was digitally created or altered. — [Social Media Today](https://www.socialmediatoday.com/news/metas-new-disclosure-requirements-digitally-altered-ad-content/704266/)
- Meta labels ads with significant edits via its generative tools, shown near "Sponsored" or in the three-dot menu. — [CO/AI](https://getcoai.com/news/meta-enhances-transparency-with-new-labeling-requirements-for-ai-generated-ads) (dated rollout)
- Vendor claim: disclosure generally needed for photorealistic synthetic media or AI humans; C2PA metadata auto-detection. — [Cinerads](https://www.cinerads.com/blog/ai-ad-disclosure-requirements) (commercial)

### Inferences
- Rules: never generate AI "customers", fake testimonials, fake doctors/before-after, fake screenshots; use only real seller product photos; label/avoid synthetic people; keep C2PA metadata intact.

### Gaps
- Advantage+ creative generative-AI terms not found; official AI-label page not retrieved.

## 6. Nigeria and Africa law

### Takeaway
Nigeria is the heaviest: NAFDAC requires product registration and (reported) advert approval for drugs/herbals; ARCON vetting is asserted but its Meta suit ended without a judgment; data protection now under NDPA 2023 and GAID 2025. Treat NAFDAC number display and pre-approval as hard gates for health claims.

### Cited Findings
- NAFDAC Drug and Related Products Advertisement Regulations 2019: no one may advertise a drug or related product unless registered; ads need Agency pre-clearance/approval; herbal medicine ads also need registration and approval. — [PolicyVault](https://policyvault.africa/policy/national-agency-for-food-and-drug-product-administration-and-control-nafdac-drug-and-related-products-advertisement-regulations-2019/)
- Food/supplements go through registration; labels should show NAFDAC registration number. — [Freyr](https://www.freyrsolutions.com/blog/navigating-food-and-dietary-supplement-regulations-in-nigeria) (consultancy)
- Advert permit only after product approval; registration is not ad approval (older BusinessDay report, date uncertain). — [BusinessDay](https://clone.businessday.ng/?p=59262)
- ARCON sued Meta in Oct 2022 for N30bn over unvetted ads; struck out around July 2024 after ARCON discontinued; ARCON set social-media vetting fees N7,500 to N100,000 (May 2023). — [Techpoint](https://techpoint.africa/2024/07/22/court-dismisses-arcons-lawsuit-meta/)
- FCCPC fined Meta $220m over data practices (Meta disputed/appealing; current status unverified). — Techpoint (same cluster)
- NDPA 2023 and GAID 2025 (issued 20 Mar 2025; reported operational 19 Sep 2025) replaced the NDPR; major-importance controllers register with NDPC; compliance audits; extraterritorial reach for targeting Nigerian data subjects. — [Mondaq](https://www.mondaq.com/nigeria/privacy-protection/1627428/key-regulatory-updates-under-the-2025-general-application-and-implementation-directive-gaid-issued-by-the-nigeria-data-protection-commission-ndpc); [LawPavilion](https://blog.lawpavilion.com/ndp-act-2023-gaid-2025-a-comprehensive-guide-to-nigerias-new-data-protection-landscape)
- Ghana FDA: food advertisements need prior vetting (2016 guidelines); disease-treatment ads for drugs/herbals need approval; June 2025 FDA stressed registered products are not automatically approved for advertising. — [Georgetown Global Food Laws](https://globalfoodlaws.georgetown.edu/documents/guidelines-for-the-advertisement-of-foods-ghana/); [GhanaWeb](https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Registered-products-not-a-guarantee-for-advertisement-FDA-1986423)
- South Africa: supplement health claims commonly made and regulation weak; SAHPRA regulates health claims; ASA dispute with supplement makers in 2015. — [News24](https://www.news24.com/life/supplement-makers-take-advertising-authority-to-court-20151103)

### Inferences
- Gates: require seller to enter NAFDAC reg. number for each product (and, for drugs/herbals/health-claim ads, advert approval number); block disease claims regardless; collect leads only with consent notice and privacy link; keep lead data out of the app beyond need. Pre-approval (reported): NAFDAC drugs/herbals, Ghana FDA food/drug ads, ARCON (contested enforcement). Guidance/self-regulation: ASA SA. All [COUNSEL].

### Gaps
- Not found: FCCPC/FCCPA rules on misleading ads and MLM/pyramid schemes in Nigeria (search returned only FTC/Pakistan/UK); NAFDAC food-supplement ad pre-approval current practice; Kenya (Consumer Protection Act, Pharmacy and Poisons Board, KEBS) rules; South Africa CPA/POPIA direct marketing and ASA code details; NDPA direct-marketing consent articles (one LinkedIn claim, unverified).

## 7. Practical output: automated pre-publish checklist (design proposal; inferences)

1. Block-list scan (regex plus LLM classifier) for disease/cure/treat/prevent terms; guaranteed or quantified results; ingredients in Meta's unsafe list.
2. Second-person condition detector ("are you / do you / your [condition/body part/debt]").
3. Income-claim detector: currency amounts with earn/income/weekly/monthly, "passive income", "quit your job", recruiting language; auto-fail.
4. Image checks: no before/after or split images, body close-ups, pinching, scales, earnings screenshots, Meta logos, AI-generated people (flag if unavoidable); text-in-image OCR through same filters.
5. Landing-page check: fetch URL, run the same text scan, require business/contact details, disclaimers, no hidden claims; ad and page must match.
6. Targeting check: age 18+ for health/weight-loss (App should set 21+/25+ for caution per own policy); no sensitive-attribute targeting.
7. Regulatory gate: NAFDAC number captured; advert approval number for drugs/herbals; country-specific rules.
8. Fake urgency/scarcity detector; testimonial check (only verifiable, consented real customers, no results claims).
9. Near-duplicate and velocity limiter per ad account; draft-first; explicit human approve per ad; no auto-resubmit after rejection; pause on any disapproval or Account Quality warning.
10. User warnings: you are responsible; one violation can restrict your profile/Page/ad account; compliance tool reduces but does not eliminate risk.

### Gaps
- Not validated against live Meta review behaviour; test with real accounts before relying.
