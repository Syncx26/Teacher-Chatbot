"""Generate JPEG mockups of the Mastermind editorial design."""
from PIL import Image, ImageDraw, ImageFont

# Phone dimensions (portrait, iPhone-ish aspect ratio)
W, H = 1170, 2532
R = 80  # corner radius

# Font paths
SERIF       = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIF_ITAL  = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
SERIF_BOLD  = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS        = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_BOLD   = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
MONO        = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"
MONO_BOLD   = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


# ================== THEMES ==================
LIGHT = {
    "name": "Editorial Ink",
    "bg":          "#F7F4EE",
    "bg_card":     "#FFFFFF",
    "bg_elev":     "#EFEAE0",
    "ink":         "#0C0A08",
    "ink_soft":    "#3F362C",
    "ink_mute":    "#7D6E5C",
    "hairline":    "#D9CEB8",
    "accent":      "#1E3A5F",
    "accent_soft": "#E8E2D4",
    "mark":        "#BC5B2E",
    "on_accent":   "#FFFFFF",
}

DARK = {
    "name": "Nordic Slate",
    "bg":          "#0B1116",
    "bg_card":     "#131B23",
    "bg_elev":     "#1A242E",
    "ink":         "#F3EFE6",
    "ink_soft":    "#C9C0AE",
    "ink_mute":    "#7D8A97",
    "hairline":    "#2A3742",
    "accent":      "#8AA9D1",
    "accent_soft": "#1B2836",
    "mark":        "#D99670",
    "on_accent":   "#0B1116",
}


def new_canvas(theme):
    img = Image.new("RGB", (W, H), theme["bg"])
    return img, ImageDraw.Draw(img)


def draw_wrapped(draw, text, pos, fnt, fill, max_width, line_spacing=1.15):
    """Word-wrap text. Returns the y-position after the last line."""
    x, y = pos
    words = text.split()
    line = ""
    line_h = int(fnt.size * line_spacing)
    for w in words:
        test = (line + " " + w).strip()
        if draw.textlength(test, font=fnt) <= max_width:
            line = test
        else:
            draw.text((x, y), line, font=fnt, fill=fill)
            y += line_h
            line = w
    if line:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def draw_status_bar(draw, theme):
    ink = theme["ink"]
    draw.text((80, 60), "1:31", font=font(SANS_BOLD, 42), fill=ink)
    draw.text((W-260, 60), "●●●● 42%", font=font(SANS_BOLD, 36), fill=ink)


def draw_topbar(draw, theme, title_small):
    # Logo mark in italic serif
    draw.text((80, 180), "Mastermind.", font=font(SERIF_ITAL, 68), fill=theme["ink"])
    # Small uppercase label
    tw = draw.textlength(title_small, font=font(MONO_BOLD, 28))
    draw.text((W-80-tw, 200), title_small, font=font(MONO_BOLD, 28), fill=theme["ink_mute"])


def draw_bottom_nav(draw, theme, active="Today"):
    nav_top = H - 260
    # Top border
    draw.line([(0, nav_top), (W, nav_top)], fill=theme["hairline"], width=2)
    # Bg
    draw.rectangle([(0, nav_top), (W, H)], fill=theme["bg_card"])
    items = ["Today", "Explore", "Progress", "Settings"]
    col_w = W // len(items)
    for i, item in enumerate(items):
        color = theme["accent"] if item == active else theme["ink_mute"]
        x_center = col_w * i + col_w // 2
        # Dot icon
        r = 10
        draw.ellipse([(x_center-r, nav_top+56-r),(x_center+r, nav_top+56+r)], outline=color, width=3)
        tw = draw.textlength(item.upper(), font=font(MONO_BOLD, 24))
        draw.text((x_center - tw//2, nav_top+108), item.upper(), font=font(MONO_BOLD, 24), fill=color)


# ============================================
# Screen 1 — Onboarding
# ============================================
def screen_onboarding(theme, filename):
    img, d = new_canvas(theme)
    draw_status_bar(d, theme)
    draw_topbar(d, theme, "START")

    # Headline
    y = 420
    # "What do you want to "
    d.text((80, y), "What do you want", font=font(SERIF, 140), fill=theme["ink"])
    y += 150
    d.text((80, y), "to ", font=font(SERIF, 140), fill=theme["ink"])
    master_x = 80 + d.textlength("to ", font=font(SERIF, 140))
    d.text((master_x, y), "master", font=font(SERIF_ITAL, 140), fill=theme["accent"])
    d.text((master_x + d.textlength("master", font=font(SERIF_ITAL, 140)), y),
           "?", font=font(SERIF, 140), fill=theme["ink"])
    y += 210

    # Lede
    y = draw_wrapped(d,
        "Type any topic. Your tutor designs a path from curiosity to competence.",
        (80, y), font(SANS, 44), theme["ink_soft"], max_width=W-160, line_spacing=1.4)
    y += 80

    # TOPIC label
    d.text((80, y), "TOPIC", font=font(MONO_BOLD, 28), fill=theme["ink_mute"])
    y += 55
    # Input (placeholder)
    d.text((80, y), "Behavioural economics…",
           font=font(SERIF_ITAL, 56), fill=theme["ink_mute"])
    y += 90
    # Underline
    d.line([(80, y), (W-80, y)], fill=theme["hairline"], width=2)
    y += 80

    # Three-column row
    col_labels = ["DURATION", "WEEKDAYS", "WEEKENDS"]
    col_values = ["4 weeks", "20 min", "Off"]
    col_w = (W - 160 - 60) // 3
    for i, (label, value) in enumerate(zip(col_labels, col_values)):
        x = 80 + i * (col_w + 30)
        d.text((x, y), label, font=font(MONO_BOLD, 24), fill=theme["ink_mute"])
        d.text((x, y+50), value, font=font(SERIF, 52), fill=theme["ink"])
        d.line([(x, y+120), (x+col_w, y+120)], fill=theme["hairline"], width=2)
    y += 200

    # CTA — big full-width button
    cta_top = H - 440
    d.rounded_rectangle([(80, cta_top), (W-80, cta_top+160)],
                        radius=28, fill=theme["accent"])
    d.text((120, cta_top+48), "Design my path",
           font=font(SANS_BOLD, 52), fill=theme["on_accent"])
    d.text((W-200, cta_top+48), "→",
           font=font(SANS_BOLD, 64), fill=theme["on_accent"])

    # Caption at very bottom
    cap = f"{theme['name'].upper()} · ONBOARDING"
    tw = d.textlength(cap, font=font(MONO_BOLD, 24))
    d.text(((W-tw)//2, H-80), cap, font=font(MONO_BOLD, 24), fill=theme["ink_mute"])

    img.save(filename, "JPEG", quality=95)
    print(f"  → {filename}")


# ============================================
# Screen 2 — Concept Card
# ============================================
def screen_concept(theme, filename):
    img, d = new_canvas(theme)
    draw_status_bar(d, theme)

    # Custom top bar for in-lesson screen
    d.text((80, 180), "Day 3.", font=font(SERIF_ITAL, 68), fill=theme["ink"])
    tw = d.textlength("WEEK 1 OF 4", font=font(MONO_BOLD, 28))
    d.text((W-80-tw, 200), "WEEK 1 OF 4", font=font(MONO_BOLD, 28), fill=theme["ink_mute"])

    # Progress bar
    py = 310
    seg_w = (W - 160 - 40) // 5
    for i in range(5):
        x = 80 + i * (seg_w + 10)
        c = theme["accent"] if i < 2 else theme["hairline"]
        d.rounded_rectangle([(x, py), (x+seg_w, py+6)], radius=3, fill=c)

    # Ghost card behind
    card_top = 400
    card_bot = H - 380
    ghost_inset = 30
    d.rounded_rectangle([(80+ghost_inset, card_top+40), (W-80-ghost_inset, card_top+40+100)],
                        radius=34, fill=theme["bg_elev"])

    # Main card
    d.rounded_rectangle([(80, card_top), (W-80, card_bot)],
                        radius=44, fill=theme["bg_card"],
                        outline=theme["hairline"], width=2)

    cx = 150
    y = card_top + 70
    # Tag
    d.text((cx, y), "CONCEPT · 02 OF 05", font=font(MONO_BOLD, 28),
           fill=theme["mark"])
    y += 90

    # Headline — mixed regular + italic
    d.text((cx, y), "The map is", font=font(SERIF, 96), fill=theme["ink"])
    y += 110
    d.text((cx, y), "not ", font=font(SERIF_ITAL, 96), fill=theme["accent"])
    nw = d.textlength("not ", font=font(SERIF_ITAL, 96))
    d.text((cx+nw, y), "the territory.", font=font(SERIF, 96), fill=theme["ink"])
    y += 140

    # Body paragraph
    y = draw_wrapped(d,
        "Every model you carry is a useful simplification — not the world itself. Confusing the two is the quiet origin of most bad decisions.",
        (cx, y), font(SANS, 40), theme["ink_soft"], max_width=W-300, line_spacing=1.5)
    y += 50

    # Pull quote with orange left bar
    d.rectangle([(cx, y), (cx+4, y+200)], fill=theme["mark"])
    y = draw_wrapped(d,
        "\"A map is not the territory it represents, but, if correct, it has a similar structure to the territory.\"",
        (cx+30, y+10), font(SERIF_ITAL, 42), theme["ink"], max_width=W-360, line_spacing=1.35)
    y += 60

    # Term box at bottom of card
    term_top = card_bot - 260
    d.rounded_rectangle([(cx, term_top), (W-150, term_top+180)],
                        radius=24, fill=theme["accent_soft"])
    d.text((cx+30, term_top+30), "General Semantics",
           font=font(SERIF, 48), fill=theme["ink"])
    draw_wrapped(d,
        "Alfred Korzybski's discipline arguing that reality always exceeds our description of it.",
        (cx+30, term_top+90), font(SANS, 30), theme["ink_soft"],
        max_width=W-310, line_spacing=1.4)

    # Hint at bottom under card
    hint = "SWIPE ↑ TO CONTINUE"
    tw = d.textlength(hint, font=font(MONO_BOLD, 24))
    d.text(((W-tw)//2, card_bot+40), hint, font=font(MONO_BOLD, 24),
           fill=theme["ink_mute"])

    draw_bottom_nav(d, theme, active="Today")

    img.save(filename, "JPEG", quality=95)
    print(f"  → {filename}")


# ============================================
# Screen 3 — Checkpoint
# ============================================
def screen_checkpoint(theme, filename):
    img, d = new_canvas(theme)
    draw_status_bar(d, theme)

    d.text((80, 180), "Checkpoint.", font=font(SERIF_ITAL, 68), fill=theme["ink"])
    tw = d.textlength("WEEK 1 · FINAL", font=font(MONO_BOLD, 28))
    d.text((W-80-tw, 200), "WEEK 1 · FINAL", font=font(MONO_BOLD, 28), fill=theme["ink_mute"])

    # Card
    card_top = 360
    card_bot = H - 220
    d.rounded_rectangle([(80, card_top), (W-80, card_bot)],
                        radius=44, fill=theme["bg_card"],
                        outline=theme["hairline"], width=2)

    cx = 150
    y = card_top + 70
    # Locked pill
    pill_w = 460
    pill_h = 66
    d.rounded_rectangle([(cx, y), (cx+pill_w, y+pill_h)],
                        radius=33, fill=theme["bg_elev"])
    # Dot
    d.ellipse([(cx+24, y+26), (cx+42, y+44)], fill=theme["mark"])
    d.text((cx+60, y+18), "LOCKED · MASTERY REQUIRED",
           font=font(MONO_BOLD, 24), fill=theme["ink_soft"])
    y += 130

    # Question
    y = draw_wrapped(d,
        "Describe one decision where mistaking the map for the territory cost you something real.",
        (cx, y), font(SERIF, 74), theme["ink"], max_width=W-310, line_spacing=1.2)
    y += 70

    # Answer box
    ans_top = y
    ans_bot = card_bot - 220
    d.rounded_rectangle([(cx, ans_top), (W-150, ans_bot)],
                        radius=24, fill=theme["bg_elev"])
    d.text((cx+30, ans_top+30), "Write freely. Specifics beat abstractions…",
           font=font(SERIF_ITAL, 38), fill=theme["ink_mute"])

    # Submit CTA
    cta_top = card_bot - 170
    d.rounded_rectangle([(cx, cta_top), (W-150, cta_top+120)],
                        radius=24, fill=theme["accent"])
    d.text((cx+40, cta_top+36), "Submit for review",
           font=font(SANS_BOLD, 42), fill=theme["on_accent"])
    d.text((W-210, cta_top+32), "→",
           font=font(SANS_BOLD, 56), fill=theme["on_accent"])

    cap = f"{theme['name'].upper()} · CHECKPOINT"
    tw = d.textlength(cap, font=font(MONO_BOLD, 24))
    d.text(((W-tw)//2, H-100), cap, font=font(MONO_BOLD, 24), fill=theme["ink_mute"])

    img.save(filename, "JPEG", quality=95)
    print(f"  → {filename}")


# ============================================
# Screen 4 — Explore
# ============================================
def screen_explore(theme, filename):
    img, d = new_canvas(theme)
    draw_status_bar(d, theme)

    d.text((80, 180), "Explore.", font=font(SERIF_ITAL, 68), fill=theme["ink"])
    tw = d.textlength("04 · REAL STORY", font=font(MONO_BOLD, 28))
    d.text((W-80-tw, 200), "04 · REAL STORY", font=font(MONO_BOLD, 28), fill=theme["ink_mute"])

    # Card
    card_top = 330
    card_bot = H - 380
    # Ghost
    d.rounded_rectangle([(110, card_top+40), (W-110, card_top+140)],
                        radius=34, fill=theme["bg_elev"])
    d.rounded_rectangle([(80, card_top), (W-80, card_bot)],
                        radius=44, fill=theme["bg_card"],
                        outline=theme["hairline"], width=2)

    cx = 150
    y = card_top + 80

    d.text((cx, y), "REAL STORY · 1962", font=font(MONO_BOLD, 30),
           fill=theme["mark"])
    y += 80

    # Big headline
    d.text((cx, y), "The CIA's", font=font(SERIF, 100), fill=theme["ink"])
    y += 120
    d.text((cx, y), "$18,000 Cat.", font=font(SERIF, 100), fill=theme["ink"])
    y += 170

    # Paragraphs
    y = draw_wrapped(d,
        "In 1962, the CIA implanted a microphone in a cat and trained it to eavesdrop on Soviet diplomats. On its first mission, the cat walked out of the van, across a Washington DC street, and was immediately run over by a taxi.",
        (cx, y), font(SANS, 40), theme["ink"], max_width=W-310, line_spacing=1.55)
    y += 40
    y = draw_wrapped(d,
        "The declassified memo reads, simply: \"The equipment performed flawlessly.\"",
        (cx, y), font(SANS, 40), theme["ink"], max_width=W-310, line_spacing=1.55)
    y += 60
    # Byline
    d.text((cx, y), "— CIA Family Jewels, declassified 2001",
           font=font(SERIF_ITAL, 32), fill=theme["ink_mute"])

    # Swipe hints row
    hints_y = card_bot + 40
    d.text((cx, hints_y), "← SKIP", font=font(MONO_BOLD, 24), fill=theme["ink_mute"])
    next_txt = "NEXT ↑"
    tw = d.textlength(next_txt, font=font(MONO_BOLD, 24))
    d.text((W-cx-tw, hints_y), next_txt, font=font(MONO_BOLD, 24), fill=theme["ink_mute"])

    cap = f"{theme['name'].upper()} · EXPLORE FEED"
    tw = d.textlength(cap, font=font(MONO_BOLD, 24))
    d.text(((W-tw)//2, H-100), cap, font=font(MONO_BOLD, 24), fill=theme["ink_mute"])

    img.save(filename, "JPEG", quality=95)
    print(f"  → {filename}")


# ============================================
OUT = "/home/user/Teacher-Chatbot/mastermind-mockup"
import os
os.makedirs(OUT, exist_ok=True)

print("Generating Editorial Ink (light):")
screen_onboarding(LIGHT, f"{OUT}/01-light-onboarding.jpg")
screen_concept   (LIGHT, f"{OUT}/02-light-concept.jpg")
screen_checkpoint(LIGHT, f"{OUT}/03-light-checkpoint.jpg")
screen_explore   (LIGHT, f"{OUT}/04-light-explore.jpg")
print("Generating Nordic Slate (dark):")
screen_onboarding(DARK,  f"{OUT}/05-dark-onboarding.jpg")
screen_concept   (DARK,  f"{OUT}/06-dark-concept.jpg")
screen_checkpoint(DARK,  f"{OUT}/07-dark-checkpoint.jpg")
screen_explore   (DARK,  f"{OUT}/08-dark-explore.jpg")
print("Done.")
