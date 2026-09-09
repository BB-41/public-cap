#!/usr/bin/env python3
"""Paint 1200×630 share cards from the gold-circle PC mark and shipped ranges.

Survey cells that are phrases stay phrases. No invented ranking bars.
Does not touch data/ or leftover math.

Run: python3 scripts/write-og-images.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MARK = ROOT / "public" / "logo-pc.png"
OUT_DIR = ROOT / "public"

INK = (16, 14, 11, 255)
INK2 = (26, 23, 18, 255)
PAPER = (239, 228, 204, 255)
PAPER_DIM = (207, 195, 168, 255)
GOLD = (212, 162, 74, 255)
BLOOD = (196, 59, 34, 255)
MUTED = (154, 141, 116, 255)
RULE = (138, 125, 98, 255)

W, H = 1200, 630


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def load_fonts() -> dict[str, ImageFont.FreeTypeFont]:
    regular = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
    bold = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    if not Path(regular).exists():
        regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    if not Path(bold).exists():
        bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return {
        "kicker": font(regular, 22),
        "title": font(bold, 54),
        "sub": font(regular, 26),
        "row": font(regular, 28),
        "row_strong": font(bold, 28),
        "fine": font(regular, 20),
        "tick": font(regular, 20),
    }


def paste_mark(card: Image.Image, dest: tuple[int, int], size: int) -> None:
    mark = Image.open(MARK).convert("RGBA")
    mark = mark.resize((size, size), Image.Resampling.LANCZOS)
    card.paste(mark, dest, mark)


def paint_frame(draw: ImageDraw.ImageDraw, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    draw.rectangle((0, 0, W, 10), fill=BLOOD)
    draw.text((248, 48), "PUBLIC CAP", font=fonts["kicker"], fill=GOLD)


def write_default(fonts: dict[str, ImageFont.FreeTypeFont]) -> Path:
    card = Image.new("RGBA", (W, H), INK)
    draw = ImageDraw.Draw(card)
    paint_frame(draw, fonts)
    paste_mark(card, (56, 72), 156)
    draw.text((248, 86), "Public Cap", font=fonts["title"], fill=PAPER)
    draw.text(
        (248, 164),
        "Capacity vs House cap vs booked NIL",
        font=fonts["sub"],
        fill=PAPER_DIM,
    )
    draw.line((248, 220, W - 56, 220), fill=RULE, width=2)
    for i, line in enumerate(
        (
            "Two ceilings on every Power 4 program, then booked NIL.",
            "Collective 990 payout stays a separate cited lane.",
            "Pending stays empty. We do not invent House or NIL dollars.",
        )
    ):
        draw.text((248, 252 + i * 40), line, font=fonts["row"], fill=PAPER)
    draw.text((56, H - 52), "thepubliccap.com", font=fonts["fine"], fill=MUTED)
    path = OUT_DIR / "og-default.png"
    card.convert("RGB").save(path, "PNG", optimize=True)
    return path


def write_reported_nil(fonts: dict[str, ImageFont.FreeTypeFont]) -> Path:
    """Honest labels only: LSU published range, Texas survey words, SI SEC band."""
    card = Image.new("RGBA", (W, H), INK)
    draw = ImageDraw.Draw(card)
    paint_frame(draw, fonts)
    paste_mark(card, (56, 56), 148)
    draw.text((232, 78), "Reported NIL by school", font=fonts["title"], fill=PAPER)
    draw.text(
        (232, 150),
        "Power 4 football roster stack  ·  one $0–$50M scale",
        font=fonts["sub"],
        fill=PAPER_DIM,
    )

    track_y = 230
    track_x0, track_x1 = 56, W - 56
    draw.rectangle((track_x0, track_y, track_x1, track_y + 10), fill=INK2)
    draw.rectangle((track_x0, track_y, track_x1, track_y + 10), outline=GOLD, width=1)
    draw.text((track_x0, track_y + 22), "$0", font=fonts["tick"], fill=MUTED)
    tw = draw.textlength("$50M", font=fonts["tick"])
    draw.text((track_x1 - tw, track_y + 22), "$50M", font=fonts["tick"], fill=MUTED)
    draw.text(
        (track_x0 + 220, track_y + 22),
        "same scale for all 68  ·  not a ranked chart",
        font=fonts["tick"],
        fill=MUTED,
    )

    # Phrase cells stay phrases. The SEC band is the labeled modeled conference median.
    rows = (
        ("LSU", "$40–50M", "survey range"),
        ("Texas", "above $40M", "survey words"),
        ("SI SEC median", "$25–33M", "labeled modeled"),
    )
    y = 300
    for name, label, lane in rows:
        draw.rectangle((56, y, W - 56, y + 64), fill=INK2)
        draw.text((76, y + 16), name, font=fonts["row_strong"], fill=PAPER)
        draw.text((520, y + 16), label, font=fonts["row"], fill=GOLD)
        lane_w = draw.textlength(lane, font=fonts["fine"])
        draw.text((W - 76 - lane_w, y + 20), lane, font=fonts["fine"], fill=MUTED)
        y += 74

    draw.text(
        (56, H - 52),
        "Booked NIL and House spent stay separate  ·  not leftover  ·  thepubliccap.com/reported-nil",
        font=fonts["fine"],
        fill=MUTED,
    )
    path = OUT_DIR / "og-reported-nil.png"
    card.convert("RGB").save(path, "PNG", optimize=True)
    return path


def main() -> None:
    if not MARK.exists():
        raise SystemExit(f"missing mark: {MARK}")
    fonts = load_fonts()
    for path in (write_default(fonts), write_reported_nil(fonts)):
        print(f"{path.name}  {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
