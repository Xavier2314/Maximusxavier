#!/usr/bin/env python3
"""Render a finished MP4 from a JSON scene spec using only ffmpeg/ffprobe.

Usage:
    python3 render.py spec.json [--dry-run] [--keep-temp]

See ../templates/spec.example.json and ../SKILL.md for the spec format.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

PRESETS = {
    "vertical": (1080, 1920),
    "landscape": (1920, 1080),
    "square": (1080, 1080),
    "portrait": (1080, 1350),
}

DEFAULT_STYLE = {
    "font": "DejaVu Sans",
    "text_color": "#FFFFFF",
    "outline_color": "#000000",
    "accent": "#FFD400",
    "caption_size": None,  # filled per preset
    "title_size": None,
    "caption_words": None,
    "uppercase_captions": False,
}

LOUDNESS = {"I": -14.0, "TP": -1.5, "LRA": 11.0}


def die(msg):
    sys.exit(f"render.py: error: {msg}")


def run(cmd, cwd=None, capture=False):
    try:
        res = subprocess.run(cmd, cwd=cwd, check=True, text=True,
                             stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                             stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        tail = "\n".join(e.stderr.strip().splitlines()[-25:])
        die(f"command failed: {' '.join(cmd)}\n{tail}")
    return res


def probe_duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", path], capture=True).stdout.strip()
    try:
        return float(out)
    except ValueError:
        die(f"could not read duration of {path}")



def hex_to_ass(color, alpha=0):
    c = color.lstrip("#")
    if len(c) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", c):
        die(f"bad color {color!r}, use #RRGGBB")
    r, g, b = c[0:2], c[2:4], c[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def ass_time(t):
    t = max(0.0, t)
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def ass_escape(text):
    return (text.replace("\\", "\\\\").replace("{", "(").replace("}", ")")
            .replace("\n", "\\N"))


def resolve_font(font):
    """Return (family_name, fontsdir or None)."""
    if font.lower().endswith((".ttf", ".otf", ".ttc")):
        if not os.path.isfile(font):
            die(f"font file not found: {font}")
        fam = run(["fc-query", "-f", "%{family[0]}", font], capture=True).stdout.strip()
        return fam or "Sans", os.path.dirname(os.path.abspath(font))
    return font, None


def chunk_words(text, n):
    words = text.split()
    return [words[i:i + n] for i in range(0, len(words), n)]


def build_ass(spec, W, H, windows, style, family):
    vertical = H > W
    cap_size = style["caption_size"] or (84 if vertical else 72)
    title_size = style["title_size"] or (112 if vertical else 104)
    cap_margin_v = int(H * (0.26 if vertical else 0.08))
    margin_l = int(W * 0.08)
    margin_r = int(W * (0.14 if vertical else 0.08))
    white = hex_to_ass(style["text_color"])
    outline = hex_to_ass(style["outline_color"])
    accent = hex_to_ass(style["accent"])
    n_words = style["caption_words"] or (3 if vertical else 5)

    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {W}",
        f"PlayResY: {H}",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
        "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
        "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Caption,{family},{cap_size},{white},{white},{outline},&H80000000,-1,0,0,0,"
        f"100,100,0,0,1,{max(4, cap_size // 12)},2,2,{margin_l},{margin_r},{cap_margin_v},1",
        f"Style: Title,{family},{title_size},{white},{white},{outline},&H80000000,-1,0,0,0,"
        f"100,100,0,0,1,{max(5, title_size // 12)},3,5,{margin_l},{margin_r},0,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    count = 0
    for i, (scene, (start, end)) in enumerate(zip(spec["scenes"], windows)):
        if scene.get("title"):
            txt = ass_escape(scene["title"])
            fade_in = 0 if i == 0 else 180  # frame 0 is the thumbnail: show the hook text
            lines.append(f"Dialogue: 1,{ass_time(start)},{ass_time(end)},Title,,0,0,0,,"
                         f"{{\\fad({fade_in},180)}}{txt}")
            count += 1
        cap = scene.get("caption")
        if not cap:
            continue
        if style["uppercase_captions"]:
            cap = cap.upper()
        if scene.get("caption_mode") == "full":
            lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Caption,,0,0,0,,"
                         f"{ass_escape(cap)}")
            count += 1
            continue
        chunks = chunk_words(cap, n_words)
        weights = [sum(len(w) + 2 for w in c) for c in chunks]
        total_w = sum(weights)
        t = start
        for chunk, cw in zip(chunks, weights):
            c_end = t + (end - start) * cw / total_w
            ww = [len(w) + 2 for w in chunk]
            wt = t
            for j, w in enumerate(chunk):
                w_end = wt + (c_end - t) * ww[j] / cw
                parts = []
                for k, word in enumerate(chunk):
                    word = ass_escape(word)
                    parts.append(f"{{\\c{accent}}}{word}{{\\c{white}}}" if k == j else word)
                pop = "{\\fscx112\\fscy112\\t(0,90,\\fscx100\\fscy100)}" if j == 0 else ""
                lines.append(f"Dialogue: 0,{ass_time(wt)},{ass_time(w_end)},Caption,,0,0,0,,"
                             f"{pop}{' '.join(parts)}")
                count += 1
                wt = w_end
            t = c_end
    return "\n".join(lines) + "\n", count


def zoompan_expr(motion, frames, amount):
    p = f"((1-cos(PI*on/{max(frames - 1, 1)}))/2)"  # eased 0->1
    center_x, center_y = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if motion == "zoom_in":
        return f"1+{amount}*{p}", center_x, center_y
    if motion == "zoom_out":
        return f"{1 + amount}-{amount}*{p}", center_x, center_y
    if motion == "pan_right":
        return f"{1 + amount}", f"(iw-iw/zoom)*{p}", center_y
    if motion == "pan_left":
        return f"{1 + amount}", f"(iw-iw/zoom)*(1-{p})", center_y
    if motion == "pan_up":
        return f"{1 + amount}", center_x, f"(ih-ih/zoom)*(1-{p})"
    if motion == "pan_down":
        return f"{1 + amount}", center_x, f"(ih-ih/zoom)*{p}"
    return "1", "0", "0"


def scene_cmd(scene, idx, W, H, fps, dur, base_dir, out, default_bg):
    frames = max(1, round(dur * fps))
    enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
           "-r", str(fps), "-frames:v", str(frames), "-an", out]
    keys = [k for k in ("image", "video", "color") if k in scene]
    if len(keys) > 1:
        die(f"scene {idx}: use only one of image/video/color")
    kind = keys[0] if keys else "color"
    if kind == "color":
        color = scene.get("color", default_bg)
        return ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                "-i", f"color=c={color}:s={W}x{H}:r={fps}:d={dur:.3f}",
                "-vf", "setsar=1,format=yuv420p"] + enc
    src = os.path.join(base_dir, scene[kind])
    if not os.path.isfile(src):
        die(f"scene {idx}: file not found: {src}")
    if kind == "image":
        motion = scene.get("motion", "zoom_in")
        amount = float(scene.get("motion_amount", 0.12))
        z, x, y = zoompan_expr(motion, frames, amount)
        sw, sh = W * 2, H * 2  # oversample so zoompan's integer crop doesn't jitter
        vf = (f"scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},setsar=1,"
              f"zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={W}x{H}:fps={fps},"
              f"setsar=1,format=yuv420p")
        return ["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", vf] + enc
    start = float(scene.get("start", 0))
    speed = float(scene.get("speed", 1.0))
    vf = (f"setpts=PTS/{speed},scale={W}:{H}:force_original_aspect_ratio=increase,"
          f"crop={W}:{H},setsar=1,fps={fps},format=yuv420p")
    return ["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1", "-ss", f"{start:.3f}",
            "-i", src, "-vf", vf] + enc


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec")
    ap.add_argument("--dry-run", action="store_true", help="print the plan, render nothing")
    ap.add_argument("--keep-temp", action="store_true", help="keep intermediate files")
    args = ap.parse_args()

    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            die(f"{tool} not found on PATH")

    spec_path = os.path.abspath(args.spec)
    base_dir = os.path.dirname(spec_path)
    with open(spec_path) as f:
        spec = json.load(f)

    if not spec.get("scenes"):
        die("spec has no scenes")
    preset = spec.get("preset", "vertical")
    if "size" in spec:
        W, H = (int(v) for v in spec["size"].lower().split("x"))
    elif preset in PRESETS:
        W, H = PRESETS[preset]
    else:
        die(f"unknown preset {preset!r}; choose {', '.join(PRESETS)} or set size: WxH")
    if W % 2 or H % 2:
        die("width and height must be even")
    fps = int(spec.get("fps", 30))
    style = {**DEFAULT_STYLE, **spec.get("style", {})}
    family, fontsdir = resolve_font(style["font"])
    trans = spec.get("transition", {"type": "fade", "duration": 0.35})
    td = float(trans.get("duration", 0))
    ttype = trans.get("type", "fade")
    output = os.path.join(base_dir, spec.get("output", "output.mp4"))

    vo = os.path.join(base_dir, spec["voiceover"]) if spec.get("voiceover") else None
    music = os.path.join(base_dir, spec["music"]) if spec.get("music") else None
    for p in (vo, music):
        if p and not os.path.isfile(p):
            die(f"audio file not found: {p}")

    durs = [float(s.get("duration", 3)) for s in spec["scenes"]]
    n = len(durs)
    if spec.get("fit_to_voiceover") and vo:
        target = probe_duration(vo) + float(spec.get("tail", 0.8))
        factor = (target + (n - 1) * td) / sum(durs)
        durs = [d * factor for d in durs]
    if td and min(durs) <= td * 1.5:
        die(f"every scene must be longer than 1.5x the transition ({td}s)")
    total = sum(durs) - (n - 1) * td

    # Visible window of each scene on the final timeline (for captions).
    windows, t = [], 0.0
    for i, d in enumerate(durs):
        s = t + (td / 2 if i > 0 else 0)
        e = t + d - (td / 2 if i < n - 1 else 0)
        windows.append((s, e))
        t += d - td
    ass_text, n_events = build_ass(spec, W, H, windows, style, family)

    warnings = []
    if vo:
        vo_d = probe_duration(vo)
        if vo_d > total:
            warnings.append(f"voiceover ({vo_d:.1f}s) is longer than the video ({total:.1f}s) and "
                            "will be cut; set fit_to_voiceover: true or lengthen scenes")
    if durs[0] > 3 and H > W:
        warnings.append("first scene is over 3s on a vertical video; consider a faster hook")

    print(f"Plan: {W}x{H} @ {fps}fps, {n} scenes, transition={ttype if td else 'cut'} {td}s, "
          f"total {total:.2f}s")
    for i, (sc, d, (s, e)) in enumerate(zip(spec["scenes"], durs, windows)):
        src = sc.get("image") or sc.get("video") or sc.get("color", "bg")
        print(f"  {i + 1:>2}. {s:6.2f}-{e:6.2f}s  {d:5.2f}s  {src}"
              f"{'  title' if sc.get('title') else ''}{'  caption' if sc.get('caption') else ''}")
    print(f"  audio: vo={'yes' if vo else 'no'} music={'yes' if music else 'no'}, "
          f"normalize to {LOUDNESS['I']} LUFS; caption events: {n_events}")
    for w in warnings:
        print(f"WARN: {w}")
    if args.dry_run:
        return

    work = tempfile.mkdtemp(prefix=".render_", dir=os.path.dirname(output) or ".")
    try:
        bg = spec.get("background", "#111111")
        clips = []
        for i, (sc, d) in enumerate(zip(spec["scenes"], durs)):
            out = os.path.join(work, f"scene_{i:03d}.mp4")
            print(f"render scene {i + 1}/{n}", flush=True)
            run(scene_cmd(sc, i + 1, W, H, fps, d, base_dir, out, bg))
            clips.append(out)

        # ---- audio: mix, then two-pass loudness normalisation ----
        mix = os.path.join(work, "mix.wav")
        a_in, a_f = [], []
        if vo:
            a_in += ["-i", vo]
        if music:
            a_in += ["-stream_loop", "-1", "-i", music]
        mv = float(spec.get("music_volume", 0.12))
        fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
        if vo and music:
            a_f.append(f"[0:a]{fmt},asplit=2[vo][sc];[1:a]{fmt},volume={mv}[m];"
                       "[m][sc]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=350[md];"
                       "[vo][md]amix=inputs=2:duration=longest:normalize=0[a0]")
        elif vo:
            a_f.append(f"[0:a]{fmt}[a0]")
        elif music:
            a_f.append(f"[0:a]{fmt},volume={mv}[a0]")
        if a_in:
            fade = min(1.0, total / 4)
            graph = ";".join(a_f) + (f";[a0]apad,atrim=0:{total:.3f},"
                                     f"afade=t=out:st={total - fade:.3f}:d={fade:.3f}[a]")
            run(["ffmpeg", "-y", "-v", "error"] + a_in +
                ["-filter_complex", graph, "-map", "[a]", "-t", f"{total:.3f}", "-c:a", "pcm_s16le", mix])
            ln = f"loudnorm=I={LOUDNESS['I']}:TP={LOUDNESS['TP']}:LRA={LOUDNESS['LRA']}"
            res = subprocess.run(["ffmpeg", "-v", "info", "-i", mix, "-af", ln + ":print_format=json",
                                  "-f", "null", "-"], text=True, capture_output=True)
            m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", res.stderr)
            if m:
                st = json.loads(m.group(0))
                if float(st["input_i"]) > -70:  # skip on silence
                    ln += (f":measured_I={st['input_i']}:measured_TP={st['input_tp']}"
                           f":measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}"
                           f":offset={st['target_offset']}:linear=true")
            audio_args = ["-i", mix]
            audio_filter = f"[{n}:a]{ln},aresample=48000[aout]"
        else:
            audio_args = ["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            audio_filter = f"[{n}:a]anull[aout]"

        # ---- video: transitions + captions ----
        with open(os.path.join(work, "captions.ass"), "w", encoding="utf-8") as f:
            f.write(ass_text)
        parts = []
        if n == 1:
            last = "[0:v]"
        elif td:
            prev, offset = "[0:v]", 0.0
            for i in range(1, n):
                offset += durs[i - 1] - td
                lab = f"[x{i}]"
                parts.append(f"{prev}[{i}:v]xfade=transition={ttype}:duration={td}:offset={offset:.3f}{lab}")
                prev = lab
            last = prev
        else:
            parts.append("".join(f"[{i}:v]" for i in range(n)) + f"concat=n={n}:v=1:a=0[cat]")
            last = "[cat]"
        sub = "subtitles=captions.ass" + (f":fontsdir='{fontsdir}'" if fontsdir else "")
        parts.append(f"{last}{sub},format=yuv420p[vout]")
        parts.append(audio_filter)
        inputs = []
        for c in clips:
            inputs += ["-i", c]
        print("final encode", flush=True)
        run(["ffmpeg", "-y", "-v", "error"] + inputs + audio_args +
            ["-filter_complex", ";".join(parts), "-map", "[vout]", "-map", "[aout]",
             "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-profile:v", "high",
             "-pix_fmt", "yuv420p", "-r", str(fps), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
             "-t", f"{total:.3f}", "-movflags", "+faststart", output], cwd=work)
    finally:
        if args.keep_temp:
            print(f"kept temp files in {work}")
        else:
            shutil.rmtree(work, ignore_errors=True)
    print(f"done: {output} ({probe_duration(output):.2f}s)")
    print("next: run qa.py on it and look at the contact sheet")


if __name__ == "__main__":
    main()
