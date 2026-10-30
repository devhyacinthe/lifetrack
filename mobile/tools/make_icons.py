"""
Génère les icônes de LifeTracker dans le dossier donné (motif original : barres montantes
pour les finances, pouls devenant une flèche pour le sport).

Usage (depuis mobile/) : uv run --with pillow python tools/make_icons.py assets/images
Option --preview : écrit aussi icon-preview.png (aperçu, à ne pas commiter).
"""

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(sys.argv[1])
SS = 4  # suréchantillonnage pour l'anticrénelage
BRAND_TOP = (31, 125, 102)
BRAND_BOTTOM = (14, 76, 62)
BRAND = "#1B6E5A"
MINT = (166, 242, 217)
WHITE = (255, 255, 255)

PULSE = [(0.20, 0.58), (0.33, 0.58), (0.39, 0.45), (0.46, 0.69), (0.53, 0.50), (0.60, 0.56), (0.75, 0.34)]
BARS = [(0.27, 0.62), (0.415, 0.53), (0.56, 0.43)]  # (x gauche, haut) ; bas commun à 0.75
BAR_W, BAR_BOTTOM = 0.105, 0.75


def transform(p, size, scale):
    x, y = p
    return ((0.5 + (x - 0.5) * scale) * size, (0.5 + (y - 0.5) * scale) * size)


def draw_glyph(img, scale, bar_color, line_color):
    size = img.width
    d = ImageDraw.Draw(img)
    r = 0.02 * scale * size
    for x, top in BARS:
        x0, y0 = transform((x, top), size, scale)
        x1, y1 = transform((x + BAR_W, BAR_BOTTOM), size, scale)
        d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=bar_color)

    width = int(0.05 * scale * size)
    pts = [transform(p, size, scale) for p in PULSE]

    # Pointe de flèche dans l'axe du dernier segment ; le trait s'arrête à sa base.
    (ax, ay), tip = pts[-2], pts[-1]
    angle = math.atan2(tip[1] - ay, tip[0] - ax)
    length = 0.13 * scale * size
    spread = math.radians(30)
    left = (tip[0] - length * math.cos(angle - spread), tip[1] - length * math.sin(angle - spread))
    right = (tip[0] - length * math.cos(angle + spread), tip[1] - length * math.sin(angle + spread))
    base = (tip[0] - 0.8 * length * math.cos(angle), tip[1] - 0.8 * length * math.sin(angle))
    d.line(pts[:-1] + [base], fill=line_color, width=width, joint="curve")
    x, y = pts[0]  # extrémité arrondie au départ
    d.ellipse([x - width / 2, y - width / 2, x + width / 2, y + width / 2], fill=line_color)
    d.polygon([tip, left, right], fill=line_color)


def gradient(size):
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        color = tuple(int(a + (b - a) * t) for a, b in zip(BRAND_TOP, BRAND_BOTTOM))
        d.line([(0, y), (size, y)], fill=color + (255,))
    return img


def render(size, background, scale, bar_color, line_color):
    big = size * SS
    img = gradient(big) if background else Image.new("RGBA", (big, big), (0, 0, 0, 0))
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw_glyph(layer, scale, bar_color, line_color)
    img = Image.alpha_composite(img, layer)
    return img.resize((size, size), Image.LANCZOS)


bars = MINT + (170,)
render(1024, True, 1.1, bars, WHITE + (255,)).convert("RGB").save(OUT / "icon.png")
# Android adaptatif : le système recadre ; le motif reste dans la zone sûre (66 % centraux).
render(1024, False, 0.84, bars, WHITE + (255,)).save(OUT / "android-icon-foreground.png")
render(1024, False, 0.84, WHITE + (150,), WHITE + (255,)).save(OUT / "android-icon-monochrome.png")
render(1024, False, 1.0, bars, WHITE + (255,)).save(OUT / "splash-icon.png")
render(48, True, 1.15, bars, WHITE + (255,)).convert("RGB").save(OUT / "favicon.png")
# Aperçu de contrôle (non utilisé par l'application) : icône adaptative masquée en cercle.
preview = render(512, True, 0.84, bars, WHITE + (255,))
mask = Image.new("L", (512, 512), 0)
ImageDraw.Draw(mask).ellipse([0, 0, 511, 511], fill=255)
circle = Image.new("RGBA", (512, 512), (255, 255, 255, 0))
circle.paste(preview, mask=mask)
sheet = Image.new("RGBA", (1100, 560), (240, 240, 240, 255))
sheet.paste(render(512, True, 1.1, bars, WHITE + (255,)), (24, 24))
sheet.paste(circle, (564, 24), circle)
sheet.save(OUT / "icon-preview.png") if "--preview" in sys.argv else None
print("ok", BRAND)
