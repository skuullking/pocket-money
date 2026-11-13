"""Assemble les images de showcase.spec.js en docs/screenshots/realtime.gif.

Usage : python e2e/showcase/make_gif.py  (Pillow requis : pip install pillow)
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FRAMES = ROOT / "e2e" / "test-results" / "showcase-frames"
OUT = ROOT / "docs" / "screenshots" / "realtime.gif"

GAP, BAND, SCALE = 16, 44, 0.8
BG, INK = (34, 28, 77), (255, 255, 255)
FRAME_MS = 160


def font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def compose(index, label_font):
    left = Image.open(FRAMES / f"{index}-child.png").convert("RGB")
    right = Image.open(FRAMES / f"{index}-parent.png").convert("RGB")
    w, h = left.size
    canvas = Image.new("RGB", (w * 2 + GAP * 3, h + BAND + GAP), BG)
    draw = ImageDraw.Draw(canvas)
    for x, image, label in ((GAP, left, "Léa, 11 ans (enfant)"), (w + GAP * 2, right, "Camille (parent)")):
        draw.text((x + w / 2, BAND / 2 + 4), label, fill=INK, font=label_font, anchor="mm")
        canvas.paste(image, (x, BAND))
    size = (round(canvas.width * SCALE), round(canvas.height * SCALE))
    return canvas.resize(size, Image.LANCZOS)


def main():
    frames = json.loads((FRAMES / "frames.json").read_text())
    label_font = font(20)
    images, durations = [], []
    for frame in frames:
        images.append(compose(frame["index"], label_font))
        durations.append(FRAME_MS * frame["hold"])
    # Une palette commune garde les couleurs stables d'une image à l'autre.
    palette = images[0].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    quantized = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in images]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    quantized[0].save(OUT, save_all=True, append_images=quantized[1:], duration=durations, loop=0, optimize=True)
    print(f"{OUT} : {len(images)} images, {OUT.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
