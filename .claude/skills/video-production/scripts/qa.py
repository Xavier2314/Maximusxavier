#!/usr/bin/env python3
"""Quality-check a rendered video and write a frame contact sheet.

Usage:
    python3 qa.py video.mp4 [--preset vertical|landscape|square|portrait] [--frames 12]

Prints PASS/WARN/FAIL lines and exits 1 if anything FAILs.
Writes <video>_contact.png next to the video. Open it and look at it.
"""
import argparse
import json
import os
import re
import subprocess
import sys

PRESETS = {
    "vertical": (1080, 1920),
    "landscape": (1920, 1080),
    "square": (1080, 1080),
    "portrait": (1080, 1350),
}
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

results = []


def report(level, msg):
    results.append(level)
    print(f"{level:4}  {msg}")


def ffprobe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format",
                          "-show_streams", path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def is_faststart(path):
    """True if the moov atom comes before mdat."""
    with open(path, "rb") as f:
        while True:
            hdr = f.read(8)
            if len(hdr) < 8:
                return False
            size = int.from_bytes(hdr[:4], "big")
            kind = hdr[4:8]
            if kind == b"moov":
                return True
            if kind == b"mdat":
                return False
            if size == 1:
                size = int.from_bytes(f.read(8), "big")
                f.seek(size - 16, 1)
            elif size == 0:
                return False
            else:
                f.seek(size - 8, 1)


def ffmpeg_log(args):
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats"] + args + ["-f", "null", "-"],
                          capture_output=True, text=True).stderr


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--preset", choices=PRESETS)
    ap.add_argument("--frames", type=int, default=12, help="frames on the contact sheet")
    args = ap.parse_args()
    path = args.video
    if not os.path.isfile(path):
        sys.exit(f"qa.py: not found: {path}")

    info = ffprobe(path)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    dur = float(info["format"].get("duration", 0))
    if not v:
        report("FAIL", "no video stream")
        sys.exit(1)

    W, H = int(v["width"]), int(v["height"])
    num, den = (int(x) for x in v.get("avg_frame_rate", "0/1").split("/"))
    fps = num / den if den else 0
    print(f"file: {path}  {W}x{H}  {fps:.2f}fps  {dur:.2f}s  "
          f"{int(info['format'].get('bit_rate', 0)) // 1000} kb/s")

    if args.preset:
        want = PRESETS[args.preset]
        report("PASS" if (W, H) == want else "FAIL", f"resolution {W}x{H} (want {want[0]}x{want[1]})")
    else:
        report("PASS", f"resolution {W}x{H}")
    report("PASS" if v["codec_name"] == "h264" else "WARN", f"video codec {v['codec_name']}")
    report("PASS" if v.get("pix_fmt") == "yuv420p" else "FAIL",
           f"pix_fmt {v.get('pix_fmt')} (yuv420p needed for phones/browsers)")
    report("PASS" if 23.9 <= fps <= 60.1 else "WARN", f"frame rate {fps:.2f}")
    report("PASS" if is_faststart(path) else "WARN",
           "faststart (moov before mdat)" if is_faststart(path) else
           "not faststart; re-mux with -movflags +faststart for web playback")

    if not a:
        report("WARN", "no audio stream (some platforms penalise or reject silent uploads)")
    else:
        report("PASS" if a["codec_name"] == "aac" else "WARN", f"audio codec {a['codec_name']}")
        log = ffmpeg_log(["-i", path, "-map", "0:a:0", "-af", "ebur128=peak=true"])
        summary = log[log.rfind("Summary:"):]
        mi = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
        mp = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
        lufs = float(mi.group(1)) if mi and mi.group(1) != "-inf" else None
        peak = float(mp.group(1)) if mp and mp.group(1) != "-inf" else None
        if lufs is None or lufs < -60:
            report("WARN", "audio track is silent")
        else:
            report("PASS" if abs(lufs + 14) <= 1.5 else "WARN",
                   f"integrated loudness {lufs:.1f} LUFS (target -14 +/-1.5)")
            if peak is not None:
                report("PASS" if peak <= -1.0 else "FAIL", f"true peak {peak:.1f} dBTP (max -1.0)")

    log = ffmpeg_log(["-i", path, "-map", "0:v:0",
                      "-vf", "blackdetect=d=0.4:pix_th=0.10,freezedetect=n=-60dB:d=4"])
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", log)
    for s, e in blacks:
        lvl = "WARN"
        note = " (dead opening: first frame is the thumbnail)" if float(s) < 0.1 else ""
        report(lvl, f"black frames {float(s):.2f}-{float(e):.2f}s{note}")
    freezes = re.findall(r"freeze_start: ([\d.]+)", log)
    for s in freezes:
        report("WARN", f"no motion for 4s+ starting at {float(s):.2f}s; add motion or cut sooner")
    if not blacks and not freezes:
        report("PASS", "no black or frozen stretches")

    # contact sheet
    cols = 4 if W >= H else 6
    rows = max(1, -(-args.frames // cols))
    count = cols * rows
    tw = 480 if W >= H else 270
    sheet = os.path.splitext(path)[0] + "_contact.png"
    font = next((f for f in FONT_CANDIDATES if os.path.isfile(f)), None)
    stamp = (f",drawtext=fontfile='{font}':text='%{{pts\\:hms}}':x=8:y=8:fontsize=22:"
             "fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6") if font else ""
    step = max(dur / count, 0.04)
    vf = (f"fps=1/{step:.4f}:start_time=0.05,scale={tw}:-2{stamp},"
          f"tile={cols}x{rows}:padding=6:margin=6:color=0x202020")
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-vf", vf, "-frames:v", "1",
                        "-update", "1", sheet], capture_output=True, text=True)
    if r.returncode == 0:
        print(f"contact sheet: {sheet}  (open it: check text clipping, UI safe zones, crops, first frame)")
    else:
        report("WARN", "could not build contact sheet: " + r.stderr.strip().splitlines()[-1])

    fails = results.count("FAIL")
    warns = results.count("WARN")
    print(f"\n{fails} FAIL, {warns} WARN")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
