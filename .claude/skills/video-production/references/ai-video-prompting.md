# Prompting text-to-video and image-to-video models

These rules apply across Veo, Sora, Runway, Kling, Luma, Pika, Hailuo and similar
models. Clip length limits, resolutions, audio support and prompt length change
often. Check the provider's current docs before promising specifics, and never claim
a clip was generated unless a model was actually called.

## One prompt = one shot

Models are best at a single continuous shot of about 4–10 s. Write one prompt per
row of the shot list, then cut the clips together with `render.py`. Don't ask one
prompt for "a video that shows A, then B, then C".

## Prompt formula

```
[Shot type + lens] of [subject with 2–3 concrete visual details] [doing one clear action]
in [setting], [time of day / lighting], [camera movement], [style / film look], [mood].
Audio (if the model supports it): [ambience], [SFX], [dialogue in quotes].
```

Example:
> Medium close-up, 50mm, of a tired woman in her 30s with a grey hoodie and messy bun
> glancing at a buzzing phone on a kitchen counter, late night, cool blue light from the
> phone with warm tungsten spill from behind, slow push-in, shallow depth of field,
> naturalistic 35mm film look, quiet tension. Audio: fridge hum, phone vibrating on
> wood.

## Vocabulary that models follow

- **Shot size:** extreme wide, wide, full, medium, medium close-up, close-up, extreme close-up, over-the-shoulder, POV, top-down/overhead, low angle, high angle, Dutch angle
- **Camera movement (pick one):** static/locked-off, slow push-in, pull-out, pan left/right, tilt up/down, tracking shot following, orbit/arc around, crane up, handheld, drone flyover, dolly zoom
- **Lens and focus:** 24mm wide, 35mm, 50mm, 85mm portrait, macro, shallow depth of field, rack focus from X to Y
- **Lighting:** golden hour, blue hour, overcast soft light, hard noon sun, neon, practical lamps, rim light, volumetric haze, high-key, low-key
- **Look:** photorealistic, cinematic 35mm film grain, documentary, commercial product shot, 3D render, claymation, anime, watercolor
- **Pacing:** slow motion, real-time, timelapse

## Rules that prevent most bad generations

1. **One subject and one action.** Multiple simultaneous actions cause morphing and limb errors.
2. **Describe what is visible, not story.** "She's worried about her business" fails. "She frowns at an unpaid invoice on a laptop" works.
3. **Keep the motion simple and physical.** Complex hand work, text on screens, fast spinning and crowds are weak spots. Frame those away or plan an insert shot.
4. **Don't rely on in-video text.** Generated lettering is often garbled. Add titles and captions in `render.py` instead.
5. **Match the aspect ratio up front.** Generate 9:16 for vertical rather than cropping 16:9, so the subject stays centered.
6. **Repeat the identity block.** For a recurring character or product, reuse the exact same descriptive sentence in every prompt (age, hair, clothing, colors). Better still, use image-to-video with the same reference image or the model's character/reference feature.
7. **Lock the style.** Append the same style suffix to every prompt in a project, for example: `cinematic 35mm, soft contrast, teal-and-amber grade`.
8. **Negative prompts**, where supported: `text, watermark, logo, extra fingers, distorted face, morphing, jitter, low quality`.
9. **Product shots:** start from the real product photo (image-to-video) with a slow orbit or push-in and minimal motion. Text-to-video invents product details.
10. **Generate 2–4 variations per shot** and pick the best. Budget for re-rolls.

## Image-to-video

- The first frame is the image you supply. Make it the composition you want, at the target aspect ratio.
- Describe only the **motion and camera** in the prompt. The image already defines the look. "Slow push-in, steam rising from the cup, background bokeh shimmering" is enough.
- Some models also accept a last frame, which helps with controlled transitions.

## Native audio

Some current models (for example Veo 3 and Sora 2) generate synchronized audio. Put
dialogue in quotes and keep each line short (under about 8 words per shot).
`render.py` drops clip audio and uses the spec's VO and music. If you need the
generated audio, mux it in with the recipes in `ffmpeg-recipes.md`.

## Prompt sheet deliverable

When the user generates the clips themselves, deliver this table plus a
`spec.json` whose `video` paths already match the filenames:

| Shot | File name | Dur | Model mode | Prompt | Negative | Notes / reference image |
|---|---|---|---|---|---|---|
| 1 | `shot01_hook.mp4` | 3s | text→video 9:16 | ... | ... | ... |

## Reviewing generated clips

Reject and re-roll a clip that shows:
- morphing faces or hands
- objects popping in or out
- garbled text
- a sudden style shift
- a camera move that doesn't match the prompt
- a first or last second that drifts

Trim bad heads and tails with the scene `start` field and a shorter `duration`
rather than keeping them.
