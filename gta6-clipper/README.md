# GTA 6 Shorts clipper

Takes a stream clip or VOD link and makes a ready-to-upload YouTube Short:
1080x1920, word-by-word captions with the spoken word highlighted, a hook title
at the top, a credit line, swear words masked in the captions, and audio
levelled to -14 LUFS.

## Setup (once)
    pip install -r requirements.txt      # needs ffmpeg installed too
    # Optional: put Montserrat-Black.ttf (free on Google Fonts) in ./fonts/ for the classic Shorts look

## One clip
    python clipper.py "https://www.twitch.tv/videos/XXXX" --start 1:02:10 --end 1:02:55 \
        --hook "TIM LOST IT AT THIS GTA 6 AD" --credit "twitch.tv/timthetatman" --layout split \
        --facecam 0.75,0.05,0.23,0.3

## Many clips
    python clipper.py --batch clips.csv --out out

Layouts:
- `blur`: whole stream frame centred over a blurred copy. Safe default and keeps the facecam.
- `split`: facecam on top, gameplay below. `--facecam x,y,w,h` is the cam box as fractions of
  the frame (0.75,0.05,0.23,0.3 = top-right corner). This is the best layout for reaction clips.
- `full`: centre crop of the gameplay, filling the screen.

Each clip also writes `name.ass` (captions you can edit, then re-render) and `name.words.json`.
To fix a wrong word: edit the json and re-run with `--words-json out/name.words.json`.
Use `--model medium` (or `large-v3` on a GPU) if the captions mishear things.
