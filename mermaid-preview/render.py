"""Render a simple LR flowchart (开始 -> 处理 -> 完成) to PNG, approximating Mermaid's default look."""
from PIL import Image, ImageDraw, ImageFont

S = 2  # supersampling / scale
W, H = 840, 240
BOX_W, BOX_H = 180, 72
GAP = 90
TOP = (H - BOX_H) // 2
FONT_PATH = r"C:\Windows\Fonts\msyh.ttc"

img = Image.new("RGB", (W * S, H * S), "white")
d = ImageDraw.Draw(img)
font = ImageFont.truetype(FONT_PATH, 26 * S)

labels = ["开始", "处理", "完成"]
xs = [40 + i * (BOX_W + GAP) for i in range(3)]

FILL = (236, 242, 255)
EDGE = (86, 122, 191)
TEXT = (32, 41, 58)
ARROW = (90, 100, 120)


def arrow(x1, y1, x2, y2, head=11):
    d.line([(x1, y1), (x2, y2)], fill=ARROW, width=2 * S)
    d.polygon(
        [(x2, y2), (x2 - head * S, y2 - head * S * 0.55), (x2 - head * S, y2 + head * S * 0.55)],
        fill=ARROW,
    )


for i, (x, label) in enumerate(zip(xs, labels)):
    box = [x * S, TOP * S, (x + BOX_W) * S, (TOP + BOX_H) * S]
    d.rounded_rectangle(box, radius=10 * S, fill=FILL, outline=EDGE, width=2 * S)
    tb = d.textbbox((0, 0), label, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    d.text(
        ((x + BOX_W / 2) * S - tw / 2 - tb[0], (TOP + BOX_H / 2) * S - th / 2 - tb[1]),
        label,
        font=font,
        fill=TEXT,
    )
    if i < len(labels) - 1:
        y = (TOP + BOX_H / 2) * S
        arrow((x + BOX_W + 6) * S, y, (xs[i + 1] - 6) * S, y)

img = img.resize((W, H), Image.LANCZOS)
img.save("mermaid-preview/flow.png", "PNG")
print("saved")
