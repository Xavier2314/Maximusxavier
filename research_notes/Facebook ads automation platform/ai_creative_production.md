# AI creative production for an "Ad Studio" (images + videos), state as of Oct 2026

Method note: research done 2026-10-19 via web search only; direct page fetches failed (no DNS to vendor sites), so most prices come from third-party aggregators/blogs that cite vendor pages, dated Jun-Sep 2026. Everything below must be re-verified on official pricing pages before pricing credits. Where I found nothing, it is listed under Gaps rather than guessed.

## Image: product-photo-to-ad options, APIs, price, text rendering, fidelity, licensing; deterministic templating; hybrid

### Takeaway
Generative image APIs cost roughly $0.01-$0.20 per image (Gemini image ~$0.039, GPT Image 1.5 $0.013-$0.20 by quality, FLUX Kontext $0.04-$0.08, Ideogram $0.03-$0.10, Photoroom Plus $0.10), so image cost is small next to video. The sound v1 design is hybrid: cut the real product out and keep its pixels, generate only the scene/background with AI, and render all text/layout deterministically (Satori/HTML/Sharp) so wording is exact and the label is untouched.

### Cited Findings
- Gemini 2.5 Flash Image ("Nano Banana"): $0.039/image standard, $0.0195 batch; input tokens $0.30/M (benchlm citing Google page, 2026-09-11; myarchitectai Aug 2026). Aggregators differ; one outlier of $0.0025 looks wrong — [BenchLM](https://benchlm.ai/md/media-pricing/nano-banana.md), [MyArchitectAI](https://www.myarchitectai.com/blog/nano-banana-api-pricing), [LMMarketCap outlier](https://lmmarketcap.com/zh/pricing-page/model/nano-banana-gemini-2-5-flash-image)
- Successor "Nano Banana 2" (Gemini 3.1 Flash Image): priced by resolution, $0.045 at 0.5K up to $0.151 at 4K — [BenchLM](https://benchlm.ai/md/media-pricing/nano-banana.md)
- OpenAI gpt-image-1.5 at 1024x1536 (portrait): $0.013 low / $0.05 medium / $0.20 high; 1024x1024: $0.009 / $0.034 / $0.133; token rates $8 in / $32 out per 1M — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-1.5). A "gpt-image-2" doc exists on a reseller site, so a newer OpenAI model may exist (unverified) — [apiyi](https://docs.apiyi.com/en/api-capabilities/gpt-image-2/historical-versions)
- BFL: FLUX.1 Kontext pro $0.04/image, max $0.08/image; FLUX.2 billed per megapixel, editing $0.045/MP (pro), $0.10/MP (flex), $0.07/MP (max) for first MP, reference images billed separately (BFL help page, June 2026 via CostBench) — [BFL help](https://help.bfl.ai/articles/7424166364-wip-welcome-to-the-forest), [CostBench](https://www.costbench.com/software/ai-media-apis/black-forest-labs/). Gateway prices vary (Kontext Max $0.042 on fal vs $0.08 on Replicate per one aggregator) — [PricePerToken](https://pricepertoken.com/image/model/black-forest-labs-flux-kontext-max)
- Ideogram hosted API: ~$0.03 Turbo / $0.06 Default / $0.10 Quality per image; strongest at in-image text/logos/dense layouts per reviews; open weights are non-commercial, so use hosted API — [Puter](https://developer.puter.com/tutorials/ideogram-api-pricing/), [Wireflow](https://www.wireflow.ai/blog/ideogram-api-pricing), [Gradually](https://www.gradually.ai/en/ai-image-model-comparison/recraft-v4-1-utility-vs-ideogram-4/)
- Recraft: V4 $0.04 raster, V4.1 $0.035 raster, V4.1 Pro $0.212, vector $0.08-$0.30; arena tie with Ideogram 4.0 at 1,217 Elo — [Recraft price change](https://usagepricing.com/blueprint/activity/recraft-2026-06-30-price-change), [Gradually](https://www.gradually.ai/en/ai-image-model-comparison/recraft-v4-1-utility-vs-ideogram-4/)
- Photoroom API (aggregator figures; official page not reached): Basic (background removal/resize/color bg) $0.02/image, plans from $20/mo; Plus (AI backgrounds, AI shadows, relight, object removal) $0.10/image, plans from $100/mo, one call = $0.10 regardless of edit options; trial 10 Basic + 1,000 sandbox calls; enterprise minimums conflict (100k vs 200k images) — [Photoroom blog](https://www.photoroom.com/blog/remove-bg-api-cost-leonardo-ai-vs-photoroom), [Fitgap](https://us.fitgap.com/products/photoroom-api)
- Practical guidance from one source: use Flux when output is only a photo, Ideogram when words must be inside the image — [Recraft blog roundup](https://www.recraft.ai/blog/best-ai-image-generation-api) (vendor-authored; low weight)
- Satori/@vercel/og, Sharp, Playwright: no sources retrieved this session (see Gaps); descriptions below are from general engineering knowledge, not cited.

### Inferences
- Per-asset image cost to platform: background-only scene via Photoroom Plus ~$0.10, or Gemini/GPT-medium/FLUX ~$0.04-$0.08, plus ~$0.00x for Satori/Sharp compositing (compute only). Budget 3-4 candidate generations per delivered asset (retries/rejections) so ~$0.15-$0.40 per final ad image set incl. 3 aspect ratios (generate scene once at 4:5 or with outpaint margin, crop/re-layout per ratio with templates).
- Fidelity ranking logic: cutout-and-composite (Photoroom Plus, or rembg/Bria/remove.bg cutout + generated background) preserves labels exactly; whole-image regeneration (Gemini/GPT/Kontext edit) can subtly alter text/labels, so use only with a human-visible preview and fallback to composite.
- Hybrid: (1) cutout real product; (2) Claude writes headline/CTA/offer from seller details; (3) AI generates background/lifestyle scene around cutout or Photoroom Plus relight+shadow; (4) Satori or HTML+Playwright renders layout with brand fonts and exact price/text for 1:1, 4:5, 9:16 with Meta safe zones (keep key content out of the top/bottom ~14% of 9:16 — unverified, check Meta spec); (5) Sharp for resize/compress and C2PA-preserving export; store in Supabase Storage.
- Satori runs on Vercel serverless (fast, no browser) but supports a CSS subset; Playwright needs a heavier runtime (worker) — general knowledge, verify.

### Gaps
- Official pricing/rate-limit/licensing text for Google, OpenAI, BFL, Stability, Ideogram, Recraft, Bria, remove.bg, Claid not retrieved. No Bria or Claid price found at all. No sourced statement of commercial-use/output-ownership terms per provider (generally paid API outputs are usable commercially, but must be confirmed per ToS; also whether Google/OpenAI embed SynthID/C2PA that triggers Meta's "AI info" label).
- No Artificial Analysis image-arena ranking retrieved.
- Satori/@vercel/og/Sharp/Playwright docs and limits (font, CSS subset, bundle size, timeout) not retrieved.
- Rate limits for all image APIs not found.

## Video: generation APIs, avatars/UGC tools, gateways, deterministic templating, serverless architecture

### Takeaway
Generated image-to-video is priced per second from ~$0.05 to ~$0.40+ (Veo 3.1 Lite/Fast/Standard $0.05-$0.40 at 720-1080p; Runway $0.05-$0.12 per second; Kling 2.5 Turbo Pro $0.07/s on fal; Seedance ~ $0.05/s with audio), so a 15-30 s fully generated ad costs ~$1-$12 before retries, versus roughly $0.01-$0.10 for a deterministic Remotion/FFmpeg render. Avatar tools are the expensive tier (HeyGen Avatar IV/V ~ $10-$20 per minute on API by one analysis).

### Cited Findings
- Veo 3.1 on Gemini API (billed per second; no free tier): Standard $0.40/s at 720p/1080p, $0.60/s 4K; Fast $0.10 / $0.12 / $0.30 per s (720p/1080p/4K); Lite $0.05 (720p) / $0.08 (1080p). Data as of 2026-09-11 from aggregator — [BenchLM Veo](https://benchlm.ai/md/media-pricing/veo.md). Newer "Gemini Omni" video prices in one article are explicitly projected, not confirmed — [Techsy](https://techsy.io/es/blog/gemini-omni-precios-api)
- fal.ai: Kling 2.5 Turbo Pro $0.07/s; Kling 3.0 listed $0.224/s no audio, $0.336/s with audio on one fal page and "from $0.112/s" on another (conflict); Seedance 720p 5 s with audio ~$0.26 (~$0.05/s); Wan 2.5 $0.05/s up to Veo 3 $0.40/s — [fal video generators](https://fal.ai/learn/tools/ai-video-generators), [fal image-to-video](https://fal.ai/learn/tools/ai-image-to-video-generators), [CostBench fal](https://www.costbench.com/software/ai-media-apis/fal-ai/)
- Seedance 2.5 announced 2026-07-31; BytePlus API still "coming soon" in early August, gateway availability unconfirmed — [AIReiter comparison](https://aireiter.com/blog/seedance-2-5-vs-kling-3-0-video-comparison)
- Runway API: Gen-4 Turbo 5 credits/s, Gen-4.5 12 credits/s at $0.01/credit => $0.05/s and $0.12/s ($0.25 / $0.60 per 5 s clip); API credits separate from web plans; extra for ProRes/HDR — [Creatify blog on Runway (competitor-authored)](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay). Another comparison claims Runway has "no API" via credit packs, which contradicts the above — [devtk](https://devtk.ai/en/blog/ai-video-generation-pricing-2026/)
- HeyGen API: Pro $99 for 100 credits ($0.99/credit), Scale $330 for 660 credits ($0.50/credit); ~3 credits/min Avatar III, ~20 credits/min Avatar IV/V (derived ~ $1.5-$3 and $10-$20 per minute) — [HeyGen API page](https://www.heygen.com/api), [Creatify blog](https://creatify.ai/blog/heygen-pricing-(2026)-plans-and-what-you-ll-actually-pay)
- Creatify: no public API price found; web plans Starter $33/mo (100 credits ≈ 20 videos), Pro $49/mo (200 credits ≈ 40 videos), billed per 15 s of output — [ToolQuestor](https://toolquestor.com/vs/creatify-vs-heygen), [Novoads](https://novoads.ai/blog/heygen-vs-creatify)
- Remotion Lambda compute (official docs, us-east-1, 2048 MB): HelloWorld ~$0.001; 1 min video w/ remote source ~$0.021; 10 min 720p ~$0.162; 10 s 4K ~$0.017; S3 egress/storage and CloudWatch extra; resolution and embedded videos raise cost — [Remotion cost example](https://remotion.dev/docs/lambda/cost-example)
- Remotion license (third-party, unverified): free for individuals/companies under 4 people; Automators tier $0.01/render with $100/mo minimum; Creators $25/seat/mo — [Spotsaas](https://www.spotsaas.com/blog/remotion-review)
- Hosted template-render APIs: Shotstack ~1 credit per output minute, from $39/mo for 200 credits, PAYG $10/25 credits, down to ~$0.07/min at volume; Creatomate $41 tier ≈144 min 720p (~$0.28/min) falling to ~$0.06/min — [Wireflow Shotstack](https://www.wireflow.ai/blog/shotstack-pricing), [Shotstack credits](https://help.shotstack.io/en/articles/16345929-understanding-shotstack-credit-consumption), [Creatomate](https://creatomate.com/blog/the-best-video-generation-apis). Vendor-authored; conflicting dates.
- Product fidelity failure mode: warping of shape/texture/branding mid-motion, logo flicker, label blur, colour shift; fine print/nutrition labels unlikely preserved; mitigations: clean backgrounds, restrict AI to lighting/background/style, composite real logo/label in post, QA first/middle/last frame — [Dreamina](https://dreamina.capcut.com/ai-video/ai-video-ecommerce), [Nemovideo](https://www.nemovideo.com/blog/ai-video-generator/video-to-video-ai-generator-ad-variants), [Rewarx](https://www.rewarx.com/blogs/why-ai-video-fails-product-accuracy) (vendor blogs; its "60% fail" stat is unsourced, do not use)

### Inferences
- Cost per 15 s ad: AI-generated (3 x 5 s clips at Veo Fast $0.12/s ≈ $1.80; Kling 2.5 Turbo ≈ $1.05; Runway Turbo ≈ $0.75), x ~2-3 for retries => ~$1.5-$5; 30 s ~double. Veo Standard 15 s ≈ $6 before retries. Deterministic Remotion 15-30 s: Lambda compute likely well under $0.10 (docs show $0.02/min simple), plus voiceover and storage.
- Recommended video v1: deterministic Remotion (or FFmpeg) templates over real photos with Ken Burns/parallax, kinetic captions, hook text, price/CTA end card, music, voiceover. Use at most one short (3-5 s) AI image-to-video "hero shot" clip per video in v2, with label re-composited, behind a QA/preview step.
- Architecture on Vercel: API route creates a `render_jobs` row in Supabase, enqueues (Supabase queue/pgmq, Inngest, or Vercel Queues/Workflow — verify) and returns immediately; worker calls provider (fal/Replicate webhooks for async video) or Remotion Lambda `renderMediaOnLambda` with webhook; output to Supabase Storage; Realtime/polling updates UI. Vercel functions are unsuitable for long FFmpeg/Chromium renders; Remotion Lambda (AWS) or a small container worker (Fly/Railway/Cloud Run) is. Lambda renders typically finish in tens of seconds to a few minutes (general knowledge; not sourced).
- Avatar/UGC talking heads (HeyGen/Creatify/Arcads/Captions/Synthesia/D-ID) cost ~$1-$20/min; build-vs-buy: buy (API) only as optional v3 premium, or skip due to policy risk (see policy section).

### Gaps
- Official pricing/limits/durations/resolutions for Kling, Luma, Pika, Hailuo/MiniMax, Sora API availability, Synthesia, Arcads, Captions, D-ID not retrieved. Sora API status unknown to me.
- Artificial Analysis video arena rankings not retrieved.
- Replicate/Together prices not retrieved.
- No measured Remotion Lambda render times for a 15-30 s vertical ad; no Vercel-specific limits retrieved.
- FFmpeg Ken Burns, auto-captioning pipelines, and phone-clip editing specifics (trim, reframe to 9:16, hook text) are described only as design intent; no source consulted.

## Voice and script: ElevenLabs (Nigerian English, Pidgin, Yoruba, Igbo, Hausa, Swahili), music, captions

### Takeaway
ElevenLabs lists Hausa and Swahili on Eleven v3 (74 languages) and Igbo appears on the v4 list (90+ languages); I could not confirm Yoruba or Nigerian Pidgin on any model, and found no evidence of a Nigerian-accent voice in the library. API TTS is about $0.05-$0.10 per 1,000 characters, so a 30 s script (~450-600 chars) costs roughly $0.03-$0.06.

### Cited Findings
- Eleven v3 supports 74 languages, including Hausa and Swahili; Yoruba not seen in the list; page now labels Eleven v4 as latest, language list on a separate page not retrieved — [ElevenLabs help center](https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support)
- Eleven v4: "90+ languages"; a language list on the v4 announcement shows Igbo, Hausa, Swahili; Yoruba and Nigerian Pidgin absent from retrieved excerpts — [ElevenLabs v4 blog](https://elevenlabs.io/blog/create-realistic-transatlantic-accent-text-to-speech), [TBreak](https://tbreak.com/elevenlabs-v4-90-languages-expressive-voice-model/)
- A Retell AI thread reports Swahili not available in that integration, i.e. availability can differ by platform — [Retell community](https://community.retellai.com/t/elevenlabs-v3-in-swahili/999)
- API rates (third-party, "verified July 2026"): Flash v2.5 $0.05 per 1k chars; Multilingual v2 and v3 $0.10 per 1k chars; v3 effectively 5,000 chars/request; Flash 40,000 — [AIReiter v3 guide](https://aireiter.com/blog/elevenlabs-eleven-v3-api-guide), [ApiFrame](https://apiframe.ai/guides/elevenlabs-api-guide). A reseller lists half those prices (unreliable).
- This session's ElevenLabs MCP connector exposes `creative_list_voices`, `creative_design_voice` and `creative_transcribe_audio` (tool descriptions), so Nigerian-accent voices could be tested directly there; I did not run them.

### Inferences
- For Nigerian-accented English, test voice design/library with accent prompts and judge by Nigerian listeners; for Pidgin, write the script in Pidgin orthography and test an English or Hausa/Igbo-capable multilingual voice, expecting an imperfect result — unverified. Offer Yoruba as "captions + text only" until verified.
- Auto-captions: Whisper-style transcription (ElevenLabs Scribe via the connector, or Whisper) — price not retrieved; Whisper quality on Yoruba/Igbo/Pidgin is weaker than English (general knowledge, unsourced); always let seller edit captions.
- Claude writes scripts (hook, benefit, proof from seller-supplied facts only, CTA) at negligible token cost.

### Gaps
- Official v4 language page not retrieved; Yoruba and Nigerian Pidgin unconfirmed; no Nigerian-accent voice evidence; no voice quality assessment by native speakers.
- Music licensing: no source retrieved (candidates to evaluate: royalty-free libraries with API, ElevenLabs music, Epidemic/Artlist-type licenses; Meta Sound Collection cannot be used outside Meta tools — all unverified).
- Whisper/Scribe pricing not retrieved.

## Where AI video fails and the honest workflow (including seller phone clips)

### Takeaway
Failures cluster on product shape, logos/label text, hands and small print; sources agree the workable approach keeps the real product pixels, uses AI only for background/lighting/motion, and composites exact text afterwards.

### Cited Findings
- See Video section: warping, logo flicker, label blur, colour shift, fine-print loss; mitigations of compositing logos in post, clean inputs, QA frames — [Dreamina](https://dreamina.capcut.com/ai-video/ai-video-ecommerce), [Nemovideo](https://www.nemovideo.com/blog/ai-video-generator/video-to-video-ai-generator-ad-variants)
- Hands/text-in-video failures: no authoritative source retrieved (see Gaps).

### Inferences
- Pipeline that works: real photos (cutouts) + Ken Burns/parallax + AI-generated or stock backgrounds + captions + TTS voiceover + licensed music + CTA card; seller phone clips as the "proof" footage.
- Phone clip editing (design, unsourced): upload to Supabase Storage via signed/resumable upload; worker uses FFmpeg to probe, auto-trim (silence/scene detection), reframe to 9:16 (center or subject-tracked crop, blurred-background fill for horizontal), transcribe, burn in kinetic captions, add hook text overlay (Claude-written), duck music under speech, loudness-normalize, export H.264/AAC 1080x1920 <= Meta limits (check). Same engine can be Remotion with `<OffthreadVideo>` for overlays.

### Gaps
- No independent benchmark on hands/text failure rates; no source on Meta file limits/safe zones; no source for FFmpeg commands (standard tools, not researched).

## Policy and ethics for synthetic media in ads

### Takeaway
Meta's approach is disclosure and context: it auto-applies an "AI info" label when its own generative tools or C2PA/IPTC metadata indicate AI use; the stricter mandatory-disclosure rules documented in sources are for political/social-issue ads. Safe seller product: no fake people giving testimonials, no AI-implied results, no impersonation of real persons.

### Cited Findings
- Meta auto-labels ads using its generative features (Background Generation, Image Generation, Add Animation) and detects third-party AI via metadata such as C2PA; label shows under "About this ad" — [Social Media Today](https://socialmediatoday.com/news/meta-adds-updated-disclosure-tags-for-ai-generated-ads/824658), [ContentGrip](https://www.contentgrip.com/meta-ai-ad-labels/)
- Label described as transparency, not penalty; sources conflict on whether non-disclosure leads to rejection, unverified against Meta's Business Help Center — [TechWyse](https://www.techwyse.com/news/industry-news/google-meta-ai-ad-disclosure-labels), [Cinerads](https://www.cinerads.com/blog/ai-ugc-facebook-ad-policy)
- Political/social-issue ads must disclose photorealistic depiction of a real person saying/doing something they did not, or a realistic person who does not exist (Meta, 2023, via press) — [NBC News](https://www.nbcnews.com/tech/tech-news/meta-require-political-advertisers-disclose-use-ai-rcna124109)
- Risk framing: photorealistic AI people used for impersonation, fake celebrity endorsements, misleading health/finance promotions; test is whether audiences would be misled — [Cinerads](https://www.cinerads.com/blog/ai-ugc-facebook-ad-policy) (vendor blog)
- One source claims automated AI-detection labelling from 1 June 2026; unconfirmed elsewhere — [TechWyse](https://www.techwyse.com/news/industry-news/google-meta-ai-ad-disclosure-labels)

### Inferences
- Product rules for v1: generate no synthetic humans making claims; no AI "customers" or before/after; testimonials only from real, seller-supplied reviews with source recorded; block health/finance/income claims templates; keep generated-asset metadata (C2PA) intact and let the ads publisher set Meta's AI-disclosure toggle where available; log provenance per asset (model, prompt, source photo); require seller confirmation that they own photos/clips/music; add a "this image is illustrative" option when scenes are AI-generated and product is real.
- Also consider local rules (Nigeria's FCCPC/ARCON advertising codes) — not researched.

### Gaps
- Meta's actual Advertising Standards text on misleading claims and AI disclosure was not read (only secondary sources). No FTC/ARCON/FCCPC sources retrieved. No info on how Meta handles AI avatars/UGC specifically.

## Recommended phased plan, cost, time, build vs buy

### Takeaway
Build the orchestration and templates in-house; buy commodity AI (background generation, TTS, transcription) through APIs/gateways. Phase 1 ships images and template videos with near-zero marginal cost; Phase 2 adds a gated AI hero clip and seller-clip editing.

### Cited Findings
- (Costs below rest on the cited figures in the sections above.)

### Inferences (all estimates, mark as unverified until re-priced)
- V1 image (target time ~10-40 s): cutout + AI background (Photoroom Plus $0.10 or Gemini ~$0.04-0.08) + Satori/Sharp layouts for 3 ratios; platform cost ~$0.10-$0.40 per ad set incl. retries. Claude copy cost negligible.
- V1 video template (15-30 s, render ~1-3 min async): Remotion Lambda or FFmpeg worker (~$0.02-0.10) + ElevenLabs Flash/v2.5 voiceover (~$0.03-$0.06) + captions (small) + licensed music (flat license) => ~$0.10-$0.30 per video. Remotion license free if team <4, else check per-render fee.
- V2: add one 4-5 s AI hero clip (Kling 2.5 Turbo ~$0.35, Veo Fast ~$0.60, Runway Turbo ~$0.25-0.30; x2-3 for retries => ~$0.6-$1.8) with label re-composited; seller-clip editor (FFmpeg: ~$0.05-0.15 compute). Per-video all-in ~$1-$3.
- V3 optional: avatar/UGC via HeyGen/Creatify API (~$1.5-$20/min) only with strict policy guardrails; or skip.
- Credit pricing: set credits so image set ~ 3-5x cost and template video ~ 5-10x cost; AI-hero video priced higher; re-price when provider prices change (they moved multiple times in 2026 per sources).
- Build vs buy: buy hosted template APIs (Shotstack/Creatomate ~$0.06-$0.28/min) only if you want zero ops; at 15-30 s videos Remotion Lambda is likely cheaper and fully controllable but needs AWS ops.
- Use a gateway (fal.ai/Replicate) for model swap flexibility; abstract providers behind one interface because model names and prices churn.

### Gaps
- No actual render-time or quality benchmarks measured; all costs are derived estimates; no competitor product (Pencil, Icon, Predis, AdCreative.ai, Arcads) documentation retrieved, so "what the market ships" is not covered.
