# Scripting, pacing and captions

## Hook formulas (first 1–2 s, spoken and on screen at the same time)

| Pattern | Example |
|---|---|
| Call out the pain | "Still answering client calls at midnight?" |
| Surprising number | "This agent booked 41 calls while I slept." |
| Contrarian | "Stop hiring a receptionist." |
| Show the result first | Open on the finished dashboard, then "Here's how I built it." |
| Direct address of the niche | "If you run a dental clinic, watch this." |
| Open loop | "The third step is the one everyone skips." |

Pair the hook line with motion in frame 1: a zoom, a cut, or a hand entering the
frame. A static first frame loses the scroll. Never open on a logo, "Hi guys", or a
black frame.

## Structures

**Short-form (20–45 s): Hook → Problem → Payoff/Demo → Proof → CTA**
```
0–2s   hook (text + motion)
2–8s   problem, made specific
8–30s  3 beats of payoff or demo, each with one visual
30–38s proof: number, testimonial, before/after
38–45s CTA on screen ≥ 2 s
```

**Ad (15 s):** hook (0–3), benefit (3–9), proof or offer (9–12), CTA plus brand (12–15).

**Explainer (60–120 s):** hook → why it matters → 3–5 steps (one per section, with a
title card for each) → recap → CTA. Re-hook every 20–30 s with a question or a reveal.

**Product promo:** problem → product reveal → 3 features as benefits ("so you can…")
→ social proof → offer → CTA.

## Pacing

- Voiceover runs at about 150 wpm (2.5 words/s). Count words before you set scene durations, or use `fit_to_voiceover`.
- Short-form: change visuals every 1.5–3 s. Explainers: every 3–6 s. Talking-head footage: punch in or cut roughly every 5 s.
- Cut on the action or the beat. Put the cut slightly before the VO line it illustrates, not after.
- Silence longer than 0.4 s in a VO reads as dead air. Trim it.

## On-screen text and captions

- At most ~7 words per title card and ≤ 2 caption lines. Burned-in captions use 3–4 word chunks on vertical and 5–7 on landscape.
- Reading time is about 0.3 s per word, with a minimum of 1 s on screen.
- Captions need high contrast: white text with a thick black outline, or a solid box. Highlight the key word with one accent color, used sparingly.
- **Safe zones on 9:16:** keep important content out of the top ~10% (status and title), the bottom ~20% (caption, audio and username) and the right ~12% (like/comment rail). `render.py` already places captions at 26% from the bottom.
- 16:9 YouTube: keep text inside the central 90%. The bottom-right corner is covered by end-screen elements in the last 20 s.
- Use one font family and two weights at most. Keep sizes consistent from scene to scene.

## Script template

```
TITLE:
GOAL (viewer does/believes):
PLATFORM / ASPECT / LENGTH:

| # | dur | visual | on-screen text | VO | source |
|---|-----|--------|----------------|----|--------|
| 1 | 2.0 | ...    | HOOK LINE      | ...| AI / stock / code / asset |
```

## Audio

- Voice is the priority. Music goes ~15–20 dB under it (`music_volume` 0.08–0.15 plus ducking).
- Pick music by energy: upbeat for promos, minimal or ambient for explainers. Use licensed or royalty-free tracks only, and ask the user for their source.
- Deliver at −14 LUFS integrated with true peak ≤ −1 dBTP. This works for YouTube, TikTok, Instagram and most web players.
- If a TTS provider is available (ElevenLabs, OpenAI TTS, Google, Azure), generate the VO from the script, then time the scenes to it.
