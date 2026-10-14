# ffmpeg recipes (all tested with ffmpeg 6.x)

Use these for anything `render.py` doesn't cover. Always finish with
`-pix_fmt yuv420p -movflags +faststart` for web/phone delivery, then run `qa.py`.

## Cut and trim
```bash
# Frame-accurate trim from 1s to 4s (re-encodes)
ffmpeg -ss 1 -to 4 -i in.mp4 -c:v libx264 -crf 18 -c:a aac trim.mp4
# Fast lossless remux (cuts snap to keyframes)
ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4
```

## Reframe 16:9 → 9:16
```bash
# Center crop (subject must be centered)
ffmpeg -i in.mp4 -vf "scale=-2:1920,crop=1080:1920:(iw-1080)/2:0" -c:a copy out.mp4
# Blurred-fill background (keeps the full frame visible, which suits screen recordings)
ffmpeg -i in.mp4 -vf "split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p" -c:a copy out.mp4
```
To follow an off-center subject, change the crop `x` offset, for example `crop=1080:1920:400:0`.

## Speed
```bash
# 1.5x video and audio (atempo accepts 0.5–2.0; chain filters for more)
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" -map "[v]" -map "[a]" out.mp4
```

## Overlays
```bash
# Picture-in-picture, bottom right
ffmpeg -i main.mp4 -i cam.mp4 -filter_complex "[1:v]scale=480:-2[pip];[0:v][pip]overlay=W-w-40:H-h-40" -c:a copy out.mp4
# Logo watermark, top right, 80% opacity
ffmpeg -i in.mp4 -i logo.png -filter_complex "[1:v]scale=160:-2,format=rgba,colorchannelmixer=aa=0.8[lg];[0:v][lg]overlay=W-w-32:32" -c:a copy out.mp4
```

## Subtitles from an SRT file (from Whisper or similar)
```bash
ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontName=DejaVu Sans,Fontsize=18,Bold=1,Outline=2,MarginV=40'" -c:a copy out.mp4
```
To get an SRT, transcribe a 16 kHz mono extract with whatever STT the user has:
`ffmpeg -i in.mp4 -vn -ac 1 -ar 16000 audio.wav`.

## Audio
```bash
# Replace the audio track
ffmpeg -i in.mp4 -i vo.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest out.mp4
# Add background music under the existing audio
ffmpeg -i in.mp4 -i music.mp3 -filter_complex "[1:a]volume=0.15,apad[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac out.mp4
# Trim leading silence from a VO
ffmpeg -i vo.wav -af "silenceremove=start_periods=1:start_threshold=-45dB" vo_trim.wav
# Loudness normalize (single pass; render.py does an accurate two-pass version)
ffmpeg -i in.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k out.mp4
```

## Look
```bash
# Light punch: contrast, saturation, sharpen
ffmpeg -i in.mp4 -vf "eq=contrast=1.08:saturation=1.15,unsharp=5:5:0.6" -c:a copy out.mp4
```

## Export variants
```bash
# Small 720p share copy
ffmpeg -i in.mp4 -vf "scale=-2:720" -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart small.mp4
# Thumbnail frame at 1.5s
ffmpeg -ss 1.5 -i in.mp4 -frames:v 1 -q:v 2 thumb.jpg
# High-quality GIF preview (3s)
ffmpeg -i in.mp4 -t 3 -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif
```

## Delivery targets

| Platform | Size | FPS | Notes |
|---|---|---|---|
| TikTok / Reels / Shorts | 1080×1920 | 30 | H.264 High, ~8–12 Mb/s, AAC 48 kHz |
| YouTube | 1920×1080 or 3840×2160 | match source | CRF 18 is fine; YouTube re-encodes |
| Instagram / LinkedIn feed | 1080×1350 (4:5) or 1080×1080 | 30 | 4:5 takes the most feed space |
| X / Twitter | 1920×1080 or 1080×1350 | 30 | keep under 512 MB |
