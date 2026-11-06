# DesignShop — User Guide

A friendly guide to DesignShop in **English** and **فارسی**.
You do not need any design experience: every toolbar item is labelled, every
panel explains itself, and the assistant can do things for you in plain words.

---

## 1. Install

| Your system | Use this file | Command |
| --- | --- | --- |
| Windows (installer) | `DesignShop-<ver>-windows-x64.exe` | double-click, pick a folder |
| Windows (no install) | `DesignShop-<ver>-windows-portable-x64.exe` | just double-click and run |
| Ubuntu / Debian / Mint | `DesignShop-<ver>-linux-x64.deb` | `sudo apt install ./DesignShop-*.deb` |
| Fedora / openSUSE / RHEL | `DesignShop-<ver>-linux-x64.rpm` | `sudo dnf install ./DesignShop-*.rpm` |
| Any Linux | `DesignShop-<ver>-linux-x64.AppImage` | `chmod +x DesignShop-*.AppImage && ./DesignShop-*.AppImage` |
| Portable Linux | `DesignShop-<ver>-linux-x64.tar.gz` | unpack, run `./designshop` |
| **Arch / Manjaro** | `DesignShop-<ver>-arch.tar.gz` | `tar xf … && cd designshop-bin && makepkg -si` |

DesignShop works fully offline. No account, no upload, no telemetry.

---

## 2. Your first thumbnail (60 seconds)

1. **Pick a size.** On the start screen choose a platform
   (YouTube `1280×720`, Instagram post `1080×1080`, Shorts/Story `1080×1920`, …)
   or type your own width and height.
2. **Pick a look.** In the **Thumbnail** panel click one of the *One-click kits* —
   Neon dark, Bold yellow, Gaming purple, Vlog warm, Podcast studio, Sale, …
   Background, headline style and accents are applied together.
3. **Type your words.** Double-click the headline on the canvas (or press `T`)
   and write your title. It stays editable forever.
4. **Make it yours.** Try another text style in the **Text** panel, nudge the
   accent with the arrow keys, change colour or add a glow in the same panel.
5. **Export.** Press `Ctrl/⌘ ⇧ E` for the export dialog, or
   `Ctrl/⌘ ⇧ S` to quickly save a PNG. Use **Export all social sizes** to get
   every platform size at once.

---

## 3. The workspace

```
┌──────────────────────────── top bar: File Edit Image Layer Filter View Help ┐
│ tools │              options bar for the active tool                     │
│ side  │                                                                │ panels:
│ rail  │                      canvas stage                                │ Thumbnail
│       │                                                                │ Text
│       │                                                                │ Adjust
│       │                                                                │ Layers
│       │                                                                │ History
└──────────────────────────────────────────────────────────────────────────┘
```

- **Tool rail (left)** — every tool has a one-letter shortcut shown on hover.
- **Options bar** — settings for the current tool (brush size, text align,
  crop ratio, …).
- **Canvas** — scroll to zoom, `Space` + drag to pan, drag the corners to
  scale, the top handle to rotate.
- **Panels (right)** — switch with the tabs; each panel scrolls.

### Tools

| Key | Tool | What it does |
| --- | --- | --- |
| `V` | Move | drag layers, arrow keys nudge (`Shift` = 10 px) |
| `M` | Marquee | rectangular selection |
| `L` | Lasso | freehand selection |
| `W` | Magic wand | select by colour similarity |
| `C` | Crop | trim the canvas |
| `B` | Brush | paint; `[` `]` change size |
| `E` | Eraser | erase; inverts to erasing a selection when one exists |
| `T` | Text | click the canvas to add a headline |
| `U` | Shapes | rectangle, ellipse, line, arrow, star, heart, polygon, frame |
| `Y` | Sticker | emoji stickers |
| `H` | Hand | pan |
| `Z` | Zoom | click to zoom in, `Alt`-click to zoom out |

Right-click anywhere picks the colour under the cursor (eyedropper).

---

## 4. Text that looks like a designer made it

The **Text** panel has two tabs:

- **Thumbnail styles** — 18 ready looks (neon, comic, chrome, gold, fire, holo,
  retro 80s, sticker, meme, glass…). Click a tile and the selected text changes
  instantly. Use the ⇄ button in the panel header to preview the style with a
  different sample word (`WOW`, `SALE`, `NEW`, `EP.1`).
- **Text** — the fine controls: font, size, weight, colour, gradient,
  alignment, letter spacing, line height, curve, plus the layer effects
  (shadow, glow, stroke, corner radius).

Tips:

- Keep headlines **short** (2–4 words). The kits auto-fit the size to the
  canvas, so long titles stay inside the frame.
- Add an accent from the **Thumbnail → Add-ons** row for contrast:
  highlight circle, arrow, badge or starburst. Accents are placed behind the
  headline so nothing covers your words.
- Persian text works out of the box: switch the language to فارسی and the
  **Vazirmatn** font plus right-to-left layout are used automatically.

---

## 5. Photos and adjustments

1. Drag an image onto the canvas, or use **Image → Place image**.
2. Open the **Adjust** panel. Start with **Auto enhance**, then fine-tune with
   the sliders. Every change is previewed live and undoable.
3. One-click looks (Punch, Cinematic, Vivid, Warm, Cold, Mono, Noir, Retro,
   Dream, Pixel art, Duotone, Pop art, Cyber…) apply a whole recipe at once.

All adjustments are non-destructive while you edit: the original file on disk
is never modified.

---

## 6. The assistant (`Ctrl/⌘ K`)

Type or click a suggestion. Examples that work in English and فارسی:

| You say | It does |
| --- | --- |
| `make a neon youtube thumbnail` | new 1280×720 doc + neon kit |
| `سیاه و سفید کن` | black & white adjustment |
| `add a red arrow` | adds an arrow accent |
| `bigger text` / `متن را بزرگ‌تر کن` | scales the headline |
| `export png` | opens the PNG export flow |

If it does not understand something it says so instead of guessing.

---

## 7. Saving and exporting

- **Save design** (`Ctrl/⌘ S`) writes a `.dshop` project — every layer stays
  editable, and the app autosaves every 30 seconds.
- **Export** (`Ctrl/⌘ ⇧ E`) opens the export dialog: PNG, JPG or WEBP, scale
  from 0.25× to 4×, optional transparent background, copy to clipboard.
- **Export all social sizes** renders your design at every platform size in one
  go and saves them together.

---

## 8. Keyboard shortcuts

Press `Ctrl/⌘ /` at any time for the full sheet. The essentials:

| Keys | Action |
| --- | --- |
| `Ctrl/⌘ Z` / `Ctrl/⌘ ⇧ Z` | undo / redo |
| `Ctrl/⌘ C` / `Ctrl/⌘ V` | copy / paste layer |
| `Ctrl/⌘ J` | duplicate layer |
| `Ctrl/⌘ E` | merge down |
| `Ctrl/⌘ A` / `Esc` | select all / deselect |
| `Delete` | delete or erase selection |
| `Ctrl/⌘ 0` / `Ctrl/⌘ 1` | fit on screen / 100% |
| `Ctrl/⌘ +` / `Ctrl/⌘ −` | zoom in / out |
| `Space` + drag | pan |
| `[` / `]` | brush size |
| `Ctrl/⌘ N` / `Ctrl/⌘ O` | new design / open |
| `F11` | full screen |

On macOS the app uses `⌘` wherever `Ctrl` is shown.

---

## 9. Language, theme and comfort

- **View → Language** switches English ⇄ فارسی instantly, including RTL layout.
- **View → Theme** offers Dark, Light and Midnight.
- **View → Accent** recolours the UI.
- All text is rendered with high-contrast colours in both themes.

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| AppImage will not start | `chmod +x` the file, or run with `--no-sandbox` on older distros |
| Missing `libfuse` on AppImage | install `fuse2`, or run `./DesignShop-*.AppImage --appimage-extract-and-run` |
| Blurry canvas | press `Ctrl/⌘ 1` for 100 %; the stage is pixel-accurate at 100 % |
| Font looks different | let the page finish loading once — fonts are bundled and cached |
| Lost a change | open the **History** panel and click any earlier step (70 steps) |

---

## 11. Privacy

DesignShop never sends anything over the network. Projects, images and exports
stay on your disk. No account, no analytics, no ads.

---

<div dir="rtl">

## راهنمای فارسی

**DesignShop** یک ویرایشگر گرافیک ساده و در عین حال حرفه‌ای برای ساخت
تصویر بندانگشتی (تامبنیل) و پست شبکه‌های اجتماعی است. زبان اصلی انگلیسی و
زبان دوم فارسی است.

### نصب

| سیستم | فایل |
| --- | --- |
| ویندوز (نصب‌شدنی) | `DesignShop-<ver>-windows-x64.exe` |
| ویندوز (قابل حمل) | `DesignShop-<ver>-windows-portable-x64.exe` |
| اوبونتو / دبیان | `sudo apt install ./DesignShop-<ver>-linux-x64.deb` |
| فدورا / openSUSE | `sudo dnf install ./DesignShop-<ver>-linux-x64.rpm` |
| هر لینوکس | `chmod +x DesignShop-*.AppImage` و بعد اجرا |
| **آرچ / مانجارو** | `tar xf DesignShop-<ver>-arch.tar.gz` و سپس `makepkg -si` |

### ساخت اولین تامبنیل

۱. اندازه را انتخاب کنید (یوتیوب `۱۲۸۰×۷۲۰`، اینستاگرام `۱۰۸۰×۱۰۸۰`،
   استوری `۱۰۸۰×۱۹۲۰` و …).
۲. در پنل **تامبنیل** یکی از کیت‌های آماده را بزنید — پس‌زمینه، سبک عنوان و
   تزئینات با هم اعمال می‌شوند.
۳. روی عنوان دوبار کلیک کنید و متن خود را بنویسید. متن همیشه قابل ویرایش است.
۴. در پنل **متن** یکی از ۱۸ سبک آماده (نئون، کمیک، طلایی، آتش، کروم و …) را
   امتحان کنید.
۵. با `Ctrl+Shift+E` خروجی بگیرید یا با «خروجی همه اندازه‌ها» همه سایزها را
   یک‌جا ذخیره کنید.

### میان‌برهای مهم

| کلید | کار |
| --- | --- |
| `V M L W C B E T U Y H Z` | ابزارها |
| `Ctrl+Z` / `Ctrl+Shift+Z` | واگرد / ازنو |
| `Ctrl+S` | ذخیره پروژه |
| `Ctrl+Shift+E` | پنجره خروجی |
| `Ctrl+0` / `Ctrl+1` | نمایش کامل / ۱۰۰٪ |
| `Space` + درگ | جابه‌جایی بوم |
| `Ctrl+K` | دستیار طراحی |

### دستیار طراحی

با `Ctrl+K` می‌توانید خواسته‌تان را فارسی بنویسید؛ مثلاً
«یک تامبنیل نئون یوتیوب بساز»، «سیاه و سفید کن»، «یک فلش قرمز اضافه کن»،
«خروجی پی‌ان‌جی بگیر». دستیار آفلاین کار می‌کند و چیزی به اینترنت نمی‌فرستد.

### حریم خصوصی

هیچ داده‌ای ارسال نمی‌شود. همه فایل‌ها روی رایانه شما می‌مانند.

</div>
