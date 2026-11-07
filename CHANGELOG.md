# Changelog

All notable changes to DesignShop are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.12] — 2026-11-07

Typography got the upgrade the thumbnail workflow needed: a real font library,
nine Persian-first text styles, and the ability to use your own font files.

### Added
- **Font library panel** (new **Fonts** tab in the right dock). 38 bundled
  families — 21 Latin, 17 Persian-capable — each previewed in its own letters,
  with search, script/role filters, a live editable preview line, a
  recently-used row and one-tap apply to the selected text layer.
- **Import your own fonts** (`.ttf`, `.otf`, `.woff`, `.woff2`, `.ttc`);
  drag-and-drop or file picker. Imported families are registered with the
  FontFace API, saved to local storage, survive a restart, appear in every font
  list, and can be removed again. Limits: 12 MB per file, 60 fonts.
- **Nine Persian-first text styles** — نئون، پاپ، گرادیان، طلایی، خوش‌نویسی،
  استیکر، رترو، خبری، مدرن — wired only to families that actually shape فارسی.
- **24 new font families**: Notable, Staatliches, Bangers, Righteous,
  League Spartan, Abril Fatface, Caveat, Pacifico, Rubik, Estedad, Lalezar,
  Jomhuria, Changa, Noto Kufi/Naskh/Sans Arabic, Amiri, Cairo, Tajawal, Almarai,
  Kufam, Lateef, Harmattan, Scheherazade New, Markazi Text.
- Script filter chips on the style grid, a searchable font picker in the Text
  tab, and an **FA** badge wherever a family supports Persian.

### Fixed
- **A raw dictionary key could appear in a toast.** The toast renderer only
  translated messages starting with `toast.`, `studio.` or `adj.`, so any new
  feature showed `font.importedMany` instead of a sentence. It now asks the
  dictionary and falls back to the raw string only when the key is unknown.
- **Dark text styles were unreadable in the style grid.** The light-backdrop
  rule never fired for dark gradient fills, the selected tile turned white and
  hid its own caption, and the caption had no dark-on-light variant.

### Changed
- Fonts, styles and the importer live in `src/lib/fonts.js` as the single
  source of truth; `presets.js` re-exports it so existing imports keep working.
- `npm test` now guards the library: every family must be imported by
  `main.jsx`, ids stay unique, every text style points at a real font, and no
  Persian style may use a Latin-only family.

## [1.0.10] — 2026-11-07

The Rust/Tauri bundles finally ship in every release. Five consecutive CI runs
failed on the same error (`proc macro panicked … generate_context!`); it turned
out to be two separate config faults plus an icon format rule, and the failure
was invisible because the log was unreachable.

### Fixed
- **Tauri build aborting with a proc-macro panic.** `bundle.appimage` is not a
  valid Tauri v2 key (targets live in `bundle.targets`), and the smaller PNG
  icons were palette-coloured, which Tauri rejects ("icon … is not RGBA").
  Every icon is now 8-bit RGBA and `bundle.targets` is
  `["deb", "rpm", "appimage", "nsis"]`, so releases now include
  `DesignShop-<ver>-tauri-linux-x64.deb / .rpm / .AppImage`.
- **Silent CI failures.** `continue-on-error` and `set +e` were hiding cargo's
  exit code. Jobs now use `set -o pipefail` and inspect step outcomes, and Rust
  failures are published as check-run annotations and a job summary, so the
  real compiler message is always visible.
- **Release asset list was cluttered** with `rust-build.log`, `rust-test.log`,
  `bundle-info.log` and the raw unstripped `DesignShop` binary. Those stay in
  run artifacts now.
- `npm run check` verifies PNG colour type, so a non-RGBA icon can never reach
  CI again.

---

## [1.0.0] — 2026-11-06

First public release. Two desktop shells (Electron + Rust/Tauri) share one
React + Canvas 2D editor; every build ships an `.exe` installer, a portable
`.exe`, `.deb`, `.rpm`, `.AppImage`, a portable `tar.gz` and an Arch bundle.

### Added

**Editor**
- Infinite-size canvas stage with zoom/pan, fit-to-window, rulers, grid,
  rule-of-thirds guides, snapping and a live zoom HUD.
- Layer stack: add, rename, reorder, duplicate, merge down, flatten, lock,
  hide, opacity and 16 blend modes.
- 19 tools: move, marquee, lasso, magic wand, crop, brush, highlighter, eraser,
  eyedropper, text, rectangle, ellipse, line, arrow, star, heart, polygon,
  frame, sticker, hand and zoom.
- Non-destructive text layers with 13 bundled fonts (Anton, Archivo Black,
  Bebas Neue, Oswald, Poppins, Montserrat, Inter, Space Grotesk,
  Playfair Display, Lobster, Permanent Marker, Orbitron, **Vazirmatn** for فارسی).
- 18 one-click thumbnail text styles — neon, bold pop, gradient, outline,
  3D shadow, comic, chrome, sticker, marker, white glow, red alert, gold,
  holo, retro 80s, clean, meme, glass, fire.
- Layer effects: drop shadow, outer glow, stroke, rounded corners.
- 22 adjustments (brightness, contrast, saturation, vibrance, hue, warmth,
  tint, exposure, highlights, shadows, B&W, sepia, invert, blur, sharpen,
  grain, pixelate, posterize, vignette, duotone, threshold + auto enhance)
  with 14 one-click looks.
- 96 emoji stickers, 12 add-ons (arrows, badges, bursts, frames, speech
  bubbles, progress bars, highlight circles) and 13 background presets.
- 70-step undo history with a clickable history panel.

**Thumbnail Studio**
- 14 platform sizes (YouTube, Shorts, Instagram post/portrait/story,
  Facebook post/cover, X/Twitter post/header, LinkedIn, Pinterest, Telegram,
  Twitch banner, print).
- 10 one-click kits: background + headline style + accents in a single click,
  with the headline auto-fitted to the canvas.
- Export all social sizes in one action.
- Portable `.dshop` project files and 30-second autosave.

**Assistant**
- Offline chat assistant (`Ctrl/⌘ K`) that turns plain English **and** فارسی
  requests into real actions ("make a neon YouTube thumbnail",
  "سیاه و سفید کن", "export png").

**Interface**
- Fully bilingual UI — English (default) and فارسی with true RTL layout,
  699 mirrored translation keys.
- Dark, Light and Midnight themes plus an accent-colour picker.
- Guided first-run tour, keyboard-shortcut sheet, toasts and empty states.

**Platform**
- Electron shell → NSIS installer, portable `.exe`, portable `.zip`,
  `.AppImage`, `.deb`, `.rpm`, `tar.gz`.
- Rust/Tauri v2 shell → smaller native `deb`/`rpm`/`AppImage` bundles that
  reuse the same web build, with file IO, autosave and clipboard in Rust.
- Arch/Manjaro bundle (`PKGBUILD` + payload) for `makepkg -si`.
- GitHub Actions CI (tests, i18n/asset/source checks) and a release workflow
  that publishes every artifact on each push.

### Fixed during development
- Layer effects were clipped by a fixed 12 px padding — outline dilation,
  shadows and glows are now padded from their real extents.
- Canvas preview was visibly soft: the stage now composes at the true on-screen
  device resolution and is positioned on integer pixels.
- The stage overlay inherited the dialog `backdrop-filter`, blurring the
  artwork underneath; the overlay class was renamed.
- Kit accents were drawn on top of the headline; accents now sit behind the
  text.
- Text style tiles now preview with the real canvas renderer instead of a CSS
  approximation, so what you see is what you get.

[1.0.0]: https://github.com/Manixpcshot/DesignShop/releases/tag/v1.0.0
