#!/usr/bin/env python3
"""Paint 1200×630 share cards from the gold-circle PC mark and shipped ranges.

Survey cells that are phrases stay phrases. No invented ranking bars.
Does not touch data/ or leftover math.

The source mark is a gold PC ring on a landscape navy plate (or a cleaned
square crop of that ring). We heal the stray red dash at 12 o'clock, crop a
square around the ring, punch a circular alpha, and flatten the noisy navy
fill to the card ink so the mark sits on the card — not in a clipped square
tile. Resize keeps the circle circular.

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
SITE_MARK_PX = 276  # 3× the 92px mast well


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


def _is_red_dash(pixel: tuple[int, ...]) -> bool:
    r, g, b = pixel[0], pixel[1], pixel[2]
    return r > 160 and g < 40 and b < 40


def _is_gold_ring(pixel: tuple[int, ...]) -> bool:
    r, g, b, a = pixel[0], pixel[1], pixel[2], pixel[3] if len(pixel) > 3 else 255
    if a < 16:
        return False
    return r > 140 and g > 90 and b < 140 and r > b + 30


def _is_navy_fill(pixel: tuple[int, ...]) -> bool:
    r, g, b, a = pixel[0], pixel[1], pixel[2], pixel[3] if len(pixel) > 3 else 255
    if a < 16:
        return False
    return r < 40 and g < 40 and b < 55


def heal_red_dash(im: Image.Image) -> Image.Image:
    """Replace the 12-o'clock red tick with left/right ring or field neighbors."""
    im = im.copy()
    px = im.load()
    w, h = im.size
    red: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if _is_red_dash(px[x, y]):
                red.append((x, y))
    if not red:
        return im
    red_set = set(red)
    for x, y in red:
        left = right = None
        for dx in range(1, 32):
            if left is None and x - dx >= 0 and (x - dx, y) not in red_set:
                left = px[x - dx, y]
            if right is None and x + dx < w and (x + dx, y) not in red_set:
                right = px[x + dx, y]
            if left is not None and right is not None:
                break
        if left is not None and right is not None:
            px[x, y] = tuple((a + b) // 2 for a, b in zip(left, right))
        elif left is not None:
            px[x, y] = left
        elif right is not None:
            px[x, y] = right
    return im


def _gold_ring_box(im: Image.Image) -> tuple[float, float, float]:
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if _is_gold_ring(px[x, y]):
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    if maxx < 0:
        # Already a tight transparent crop — use opaque bounds.
        minx, miny, maxx, maxy = w, h, -1, -1
        for y in range(h):
            for x in range(w):
                if px[x, y][3] > 16:
                    if x < minx:
                        minx = x
                    if y < miny:
                        miny = y
                    if x > maxx:
                        maxx = x
                    if y > maxy:
                        maxy = y
    if maxx < 0:
        return w / 2, h / 2, min(w, h) / 2
    return (minx + maxx) / 2, (miny + maxy) / 2, max(maxx - minx, maxy - miny) / 2


def circular_mark(im: Image.Image) -> Image.Image:
    """Square crop centered on the gold ring, circular alpha, ink field."""
    im = heal_red_dash(im.convert("RGBA"))
    cx, cy, rad = _gold_ring_box(im)
    pad = max(6, int(round(rad * 0.024)))
    side = int(round(rad * 2 + pad * 2))
    left = int(round(cx - side / 2))
    top = int(round(cy - side / 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    src_w, src_h = im.size
    crop_left = max(0, left)
    crop_top = max(0, top)
    crop_right = min(src_w, left + side)
    crop_bottom = min(src_h, top + side)
    region = im.crop((crop_left, crop_top, crop_right, crop_bottom))
    canvas.paste(region, (crop_left - left, crop_top - top))

    ccx = side / 2 - 0.5
    ccy = side / 2 - 0.5
    outer = rad + 3
    px = canvas.load()
    for y in range(side):
        for x in range(side):
            d = ((x - ccx) ** 2 + (y - ccy) ** 2) ** 0.5
            r, g, b, a = px[x, y]
            if _is_navy_fill((r, g, b, a)):
                r, g, b = INK[0], INK[1], INK[2]
            if d >= outer + 1.5:
                px[x, y] = (r, g, b, 0)
            elif d > outer - 1.5:
                t = max(0.0, min(1.0, (outer + 1.5 - d) / 3.0))
                px[x, y] = (r, g, b, int(a * t))
            else:
                px[x, y] = (r, g, b, a)
    return canvas


def prepare_mark(source: Image.Image | None = None) -> Image.Image:
    if source is None:
        source = Image.open(MARK)
    return circular_mark(source)


def write_site_mark(mark: Image.Image) -> Path:
    """Ship a square circular mark for the 92px mast (3×)."""
    out = mark.resize((SITE_MARK_PX, SITE_MARK_PX), Image.Resampling.LANCZOS)
    out.save(MARK, "PNG", optimize=True)
    return MARK


def paste_mark(card: Image.Image, dest: tuple[int, int], size: int, mark: Image.Image) -> None:
    # Contain into a square well. Source is already a centered circle.
    tile = mark.resize((size, size), Image.Resampling.LANCZOS)
    card.paste(tile, dest, tile)


def paint_frame(draw: ImageDraw.ImageDraw, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    draw.rectangle((0, 0, W, 10), fill=BLOOD)
    draw.text((248, 48), "PUBLIC CAP", font=fonts["kicker"], fill=GOLD)


def write_default(fonts: dict[str, ImageFont.FreeTypeFont], mark: Image.Image) -> Path:
    card = Image.new("RGBA", (W, H), INK)
    draw = ImageDraw.Draw(card)
    paint_frame(draw, fonts)
    paste_mark(card, (56, 72), 156, mark)
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


def write_reported_nil(fonts: dict[str, ImageFont.FreeTypeFont], mark: Image.Image) -> Path:
    """Honest labels only: LSU published range, Texas survey words, SI SEC band."""
    card = Image.new("RGBA", (W, H), INK)
    draw = ImageDraw.Draw(card)
    paint_frame(draw, fonts)
    paste_mark(card, (56, 56), 148, mark)
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
    mark = prepare_mark()
    write_site_mark(mark)
    for path in (MARK, write_default(fonts, mark), write_reported_nil(fonts, mark)):
        print(f"{path.name}  {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
