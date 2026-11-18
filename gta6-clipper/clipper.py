#!/usr/bin/env python3
"""
GTA 6 Shorts clipper: stream VOD/clip URL -> 9:16 YouTube Short with burned-in captions.

Pipeline:
  1. yt-dlp downloads only the section you need (Twitch, Kick, YouTube, X, Reddit, ...)
  2. ffmpeg builds a 1080x1920 frame: "blur" (gameplay over a blurred copy) or
     "split" (streamer facecam on top, gameplay below)
  3. faster-whisper transcribes with word-level timestamps
  4. Captions are written as ASS: 3 words at a time, uppercase, thick outline,
     the word being spoken is highlighted
  5. ffmpeg burns captions + an optional hook title and exports an H.264 mp4

Single clip:
  python clipper.py "https://www.twitch.tv/videos/123" --start 1:02:10 --end 1:02:55 \
      --hook "TIM LOST IT AT THIS GTA 6 AD" --credit "twitch.tv/timthetatman"

Batch (one row per clip, see clips.example.csv):
  python clipper.py --batch clips.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1080, 1920

CENSOR = {
    "fuck", "fucking", "fucked", "fucker", "motherfucker", "shit", "shitty", "bitch",
    "bitches", "nigga", "niggas", "nigger", "cunt", "dick", "pussy", "faggot", "retard",
}


# ---------------------------------------------------------------- helpers
def run(cmd: list[str]) -> None:
    print("  $", " ".join(cmd[:6]), "..." if len(cmd) > 6 else "")
    subprocess.run(cmd, check=True)


def to_seconds(t: str | float | None) -> float | None:
    if t is None or t == "":
        return None
    if isinstance(t, (int, float)):
        return float(t)
    parts = [float(p) for p in str(t).split(":")]
    s = 0.0
    for p in parts:
        s = s * 60 + p
    return s


def hms(s: float) -> str:
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{sec:06.3f}"


def ass_time(s: float) -> str:
    s = max(0.0, s)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    cs = int(round((sec - int(sec)) * 100))
    if cs == 100:
        sec, cs = sec + 1, 0
    return f"{int(h)}:{int(m):02d}:{int(sec):02d}.{cs:02d}"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "clip"


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


# ---------------------------------------------------------------- 1. download
def fetch(src: str, start: float | None, end: float | None, work: Path) -> Path:
    """Download (or copy) just the [start, end] window to work/src.mp4, re-based to t=0."""
    out = work / "src.mp4"
    if Path(src).exists():
        cmd = ["ffmpeg", "-y", "-loglevel", "error"]
        if start is not None:
            cmd += ["-ss", str(start)]
        cmd += ["-i", src]
        if end is not None:
            cmd += ["-t", str(end - (start or 0))]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-c:a", "aac", str(out)]
        run(cmd)
        return out

    if not shutil.which("yt-dlp"):
        sys.exit("yt-dlp not found: pip install yt-dlp")
    cmd = [
        "yt-dlp", "-f", "bv*[height<=1080]+ba/b[height<=1080]/b",
        "--merge-output-format", "mp4", "-o", str(work / "raw.%(ext)s"), "--no-playlist",
    ]
    if start is not None or end is not None:
        a = hms(start or 0)
        b = hms(end) if end is not None else "inf"
        cmd += ["--download-sections", f"*{a}-{b}", "--force-keyframes-at-cuts"]
    cmd.append(src)
    run(cmd)
    raw = next(work.glob("raw.*"))
    # normalise to a clean CFR mp4 starting at 0
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-c:v", "libx264", "-preset",
         "veryfast", "-crf", "16", "-r", "30", "-c:a", "aac", "-ar", "48000", str(out)])
    return out


# ---------------------------------------------------------------- 2. transcribe
def load_audio(path: Path):
    """16 kHz mono float32 via ffmpeg (avoids PyAV version problems inside faster-whisper)."""
    import numpy as np
    pcm = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0


def transcribe(path: Path, model_name: str, language: str | None) -> list[dict]:
    from faster_whisper import WhisperModel  # imported lazily so --words-json works without it

    try:
        import torch  # noqa: F401
        device = "cuda" if __import__("torch").cuda.is_available() else "cpu"
    except Exception:
        device = "cpu"
    compute = "float16" if device == "cuda" else "int8"
    print(f"  whisper {model_name} on {device}")
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, _ = model.transcribe(
        load_audio(path), language=language, word_timestamps=True, vad_filter=True,
        condition_on_previous_text=False,
    )
    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"start": w.start, "end": w.end, "word": w.word.strip()})
    return words


# ---------------------------------------------------------------- 3. captions
def clean_word(w: str, censor: bool) -> str:
    w = w.strip()
    core = re.sub(r"[^\w']", "", w).lower()
    if censor and core in CENSOR:
        w = core[0] + "*" * (len(core) - 1)
    w = re.sub(r"[.,!?;:\"]+$", "", w) if not w.endswith("?") else w.rstrip(".,")
    return w.upper()


def group_words(words: list[dict], max_words: int, max_gap: float, max_chars: int) -> list[list[dict]]:
    groups, cur = [], []
    for w in words:
        if not w["word"]:
            continue
        brk = False
        if cur:
            gap = w["start"] - cur[-1]["end"]
            chars = sum(len(x["word"]) + 1 for x in cur) + len(w["word"])
            ends_sentence = cur[-1]["raw"].rstrip().endswith((".", "!", "?"))
            brk = len(cur) >= max_words or gap > max_gap or chars > max_chars or ends_sentence
        if brk:
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    return groups


def build_ass(words: list[dict], duration: float, hook: str, credit: str, censor: bool,
              caption_y: int, font: str, highlight: str) -> str:
    # ASS colours are &HAABBGGRR
    def hex_to_ass(c: str) -> str:
        c = c.lstrip("#")
        return f"&H00{c[4:6]}{c[2:4]}{c[0:2]}".upper()

    hl = hex_to_ass(highlight)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,1,0,1,7,3,5,60,60,0,1
Style: Hook,{font},70,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,3,18,0,8,70,70,170,1
Style: Credit,{font},38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,40,40,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if hook:
        # black box behind white text, whole clip
        ev.append(f"Dialogue: 2,{ass_time(0)},{ass_time(duration)},Hook,,0,0,0,,{{\\3c&H000000&\\4c&H000000&}}{hook.upper()}")
    if credit:
        ev.append(f"Dialogue: 2,{ass_time(0)},{ass_time(duration)},Credit,,0,0,0,,{credit}")

    for w in words:
        w["raw"] = w["word"]
        w["word"] = clean_word(w["word"], censor)
    groups = group_words(words, max_words=3, max_gap=0.6, max_chars=18)
    for gi, g in enumerate(groups):
        g_end_hard = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else duration
        for i, w in enumerate(g):
            start = w["start"]
            end = g[i + 1]["start"] if i + 1 < len(g) else min(g_end_hard, w["end"] + 0.35)
            if end <= start:
                end = start + 0.08
            parts = []
            for j, x in enumerate(g):
                if j == i:
                    parts.append(f"{{\\c{hl}&}}{x['word']}{{\\c&H00FFFFFF&}}")
                else:
                    parts.append(x["word"])
            pop = "{\\fscx108\\fscy108\\t(0,90,\\fscx100\\fscy100)}" if i == 0 else ""
            text = f"{{\\pos({W // 2},{caption_y})}}{pop}" + " ".join(parts)
            ev.append(f"Dialogue: 1,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,{text}")
    return header + "\n".join(ev) + "\n"


# ---------------------------------------------------------------- 4. render
def layout_filter(layout: str, facecam: str | None, zoom: float = 1.0) -> tuple[str, int]:
    """Return (filter_complex producing [v], caption_y)."""
    if layout == "split":
        if not facecam:
            sys.exit("split layout needs --facecam x,y,w,h (fractions of the source frame, e.g. 0.75,0.05,0.23,0.3)")
        fx, fy, fw, fh = [float(v) for v in facecam.split(",")]
        top_h, bot_h = 760, H - 760
        f = (
            f"[0:v]split=2[a][b];"
            f"[a]crop=iw*{fw}:ih*{fh}:iw*{fx}:ih*{fy},scale={W}:{top_h}:force_original_aspect_ratio=increase,"
            f"crop={W}:{top_h},setsar=1[cam];"
            f"[b]scale=-2:{bot_h},crop={W}:{bot_h},setsar=1[game];"
            f"[cam][game]vstack=inputs=2[v]"
        )
        return f, top_h  # captions sit on the seam between cam and gameplay
    if layout == "full":
        # center-crop gameplay to fill 9:16 (good when the action is centred)
        return f"[0:v]scale=-2:{H},crop={W}:{H},setsar=1[v]", int(H * 0.68)
    # default "blur": the 16:9 frame (zoom 1.0 = nothing cut off) over a blurred, darkened fill
    fg_h = int(round(W * 9 / 16 * max(1.0, zoom) / 2)) * 2
    f = (
        f"[0:v]split=2[a][b];"
        f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:4,"
        f"eq=brightness=-0.12,setsar=1[bg];"
        f"[b]scale=-2:{fg_h},crop={W}:{fg_h},setsar=1[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2-40[v]"
    )
    return f, int(H / 2 - 40 + fg_h / 2 + 150)


def render(src: Path, ass: Path, filt: str, out: Path) -> None:
    ass_esc = str(ass).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    fonts = Path(__file__).resolve().parent / "fonts"
    fd = f":fontsdir='{str(fonts).replace(':', chr(92) + ':')}'" if fonts.is_dir() else ""
    filt = filt + f";[v]ass='{ass_esc}'{fd},format=yuv420p[out]"
    run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-filter_complex", filt,
        "-map", "[out]", "-map", "0:a?", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-profile:v", "high", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-movflags", "+faststart", str(out),
    ])


# ---------------------------------------------------------------- main
def make_clip(opts: dict, out_dir: Path) -> Path:
    src_arg = opts["url"]
    start, end = to_seconds(opts.get("start")), to_seconds(opts.get("end"))
    hook = opts.get("hook", "") or ""
    name = opts.get("name") or slug(hook or Path(src_arg).stem)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{name}.mp4"
    print(f"\n== {name}")
    with tempfile.TemporaryDirectory() as td:
        work = Path(td)
        src = fetch(src_arg, start, end, work)
        dur = probe_duration(src)
        if dur > 60.5:
            print(f"  ! clip is {dur:.1f}s; Shorts must be <= 60s to be safe. Trimming to 60s.")
            trimmed = work / "trim.mp4"
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-t", "60", "-c", "copy", str(trimmed)])
            src, dur = trimmed, 60.0
        if opts.get("words_json"):
            words = json.loads(Path(opts["words_json"]).read_text())
        else:
            words = transcribe(src, opts.get("model", "small"), opts.get("language") or None)
        (out_dir / f"{name}.words.json").write_text(json.dumps(words, indent=1))
        filt, cap_y = layout_filter(opts.get("layout") or "blur", opts.get("facecam") or None,
                                   float(opts.get("zoom") or 1.0))
        ass = work / "subs.ass"
        ass.write_text(build_ass(
            words, dur, hook, opts.get("credit", "") or "", censor=not opts.get("no_censor"),
            caption_y=cap_y, font=opts.get("font", "Montserrat Black"),
            highlight=opts.get("highlight", "#FFE600"),
        ), encoding="utf-8")
        shutil.copy(ass, out_dir / f"{name}.ass")
        render(src, ass, filt, out)
    print(f"  -> {out}")
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("url", nargs="?", help="clip/VOD URL or local video file")
    p.add_argument("--start", help="start time, e.g. 1:02:10 or 3730")
    p.add_argument("--end", help="end time")
    p.add_argument("--hook", default="", help="title text shown at the top")
    p.add_argument("--credit", default="", help="credit line at the bottom, e.g. twitch.tv/name")
    p.add_argument("--layout", choices=["blur", "split", "full"], default="blur")
    p.add_argument("--zoom", default="1.0", help="blur layout: 1.0 shows the whole frame; 1.3 crops the sides for a bigger picture")
    p.add_argument("--facecam", help="split layout: facecam box as fractions x,y,w,h")
    p.add_argument("--model", default="small", help="whisper model: base, small, medium, large-v3")
    p.add_argument("--language", default="en")
    p.add_argument("--font", default="Montserrat Black")
    p.add_argument("--highlight", default="#FFE600", help="colour of the word being spoken")
    p.add_argument("--no-censor", action="store_true", help="don't mask swear words in captions")
    p.add_argument("--words-json", help="skip whisper; use this word-timestamp JSON")
    p.add_argument("--name", help="output file name (no extension)")
    p.add_argument("--out", default="out", help="output folder")
    p.add_argument("--batch", help="CSV with columns url,start,end,hook,credit,layout,facecam,zoom,name")
    a = p.parse_args()

    out_dir = Path(a.out)
    base = {k: v for k, v in vars(a).items() if k not in ("batch", "out")}
    if a.batch:
        with open(a.batch, newline="", encoding="utf-8") as fh:
            rows = [r for r in csv.DictReader(fh) if (r.get("url") or "").strip() and not r["url"].startswith("#")]
        ok, bad = 0, 0
        for r in rows:
            opts = dict(base)
            opts.update({k: v for k, v in r.items() if v not in (None, "")})
            try:
                make_clip(opts, out_dir)
                ok += 1
            except Exception as e:  # keep going on a bad row
                bad += 1
                print(f"  !! failed: {e}")
        print(f"\nDone: {ok} ok, {bad} failed -> {out_dir}/")
    else:
        if not a.url:
            p.error("give a URL/file or --batch")
        make_clip(base, out_dir)


if __name__ == "__main__":
    main()
