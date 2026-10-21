---
name: apple-design
description: Build interfaces with Apple's design system — the measured type scale, em-based vertical rhythm, motion curves, section/tile layout contracts, art-directed imagery and editorial copy voice used on apple.com. Use whenever work involves a marketing page, product page, landing page, hero section, feature grid, pricing or comparison table, or any request that asks for something to look "like Apple", "premium", "clean", "high-end" or "Apple-quality" — and when writing headline or feature copy for such a page.
---

# Apple design system

Every number here was extracted from apple.com's own shipped stylesheets, not
estimated. When a value is specified below, use it exactly — the system reads as
Apple's because the proportions are exact, not approximately right.

## The five rules that carry most of the effect

1. **Type switches family at 20px.** Below 20px use the Text face, 20px and up
   use the Display face. Apple ships SF Pro Text and SF Pro Display; with other
   families, use the text/caption optical size below 20px and the display one
   above.
2. **Tracking goes negative as type grows.** Body 17px is `-0.022em`. Headline
   64px is `-0.009em`. Small *display* sizes go positive: 21px intro is
   `+0.011em`. Never ship `letter-spacing: normal` on a headline.
3. **Vertical rhythm is in `em`, not `px`,** so it scales with the type it sits
   under. See the stacked-margin tokens in `references/layout.md`.
4. **Content is centered in a 1068px column** on desktop, 734px on tablet. These
   are also the breakpoints — the content width and the viewport step share
   numbers on purpose.
5. **Headlines are short declarative fragments ending in a full stop.** Median
   length on apple.com is *three words*. "Semua jenis kekuatan." See
   `references/voice.md` before writing any copy.

## Core tokens

```css
:root {
  /* surface + ink */
  --ink:            #1d1d1f;   /* primary text on light */
  --ink-secondary:  #6e6e73;   /* supporting copy on light */
  --ink-muted:      #86868b;   /* captions, footnotes, text on dark */
  --surface:        #fff;
  --surface-alt:    #f5f5f7;   /* the grey Apple alternates sections with */
  --accent:         #0071e3;   /* primary action */
  --accent-hover:   #0076df;
  --accent-active:  #006edb;
  --link:           #06c;

  /* vertical rhythm — relative to the font size of the element above */
  --stacked-margin:            0.4em;  /* default gap between stacked elements */
  --headline-plus-headline:    0.4em;  /* eyebrow -> headline */
  --headline-plus-first:       0.8em;  /* headline -> first body element */
  --paragraph-plus-element:    0.8em;  /* paragraph -> button, list, media */
  --paragraph-plus-headline:   1.6em;  /* paragraph -> next headline (the big one) */

  --radius-pill:  980px;  /* buttons */
  --radius-card:  28px;   /* large cards */
  --radius-tile:  12px;   /* small tiles, inputs */
}
```

Dark sections are pure `#000`, not a dark grey, with `--ink-muted` for
supporting copy.

## Breakpoints

Three bands, and they are *exclusive* — write them as a closed middle, never as
overlapping min-widths:

```css
@media (max-width: 734px)                         { /* phone  */ }
@media (min-width: 735px) and (max-width: 1068px) { /* tablet */ }
@media (min-width: 1069px)                        { /* desktop */ }
```

A fourth band at `min-width: 1441px` exists for oversized art direction only.
Do not invent breakpoints between these.

## Buttons

```css
.button {
  font: 400 17px/1.1764805882 var(--font-text);
  letter-spacing: -0.022em;
  padding: 12px 22px;
  min-width: 70px;
  border-radius: 980px;        /* a pill, not a rounded rectangle */
  background: var(--accent);
  color: #fff;
}
.button:hover  { background: var(--accent-hover); }
.button:active { background: var(--accent-active); }
```

The secondary action is the same pill with a transparent fill, a 1px
`--accent` border and `--accent` text. Apple pairs exactly two: one filled, one
outlined, side by side, never three.

## Motion

```css
--ease-standard: cubic-bezier(0.4, 0, 0.6, 1);   /* most transitions */
--ease-out-soft: cubic-bezier(0, 0, 0.5, 1);     /* entrances, reveals */
--ease-out-sharp: cubic-bezier(0, 0, 0.2, 1);    /* short UI state changes */
--ease-overshoot: cubic-bezier(0.3, 2, 0.5, 1);  /* playful pop; use sparingly */
--ease-dramatic: cubic-bezier(0.53, -0.01, 0.17, 1); /* long scroll-linked moves */
```

Durations, in order of how often they appear: `250ms` (default), `100ms` (hover
feedback), `400ms` (section reveals), `160ms`, `200ms`, `850ms` (large
scroll-linked moves). Hover states are always the fastest thing on the page.

Always honour reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
```

Full details: `references/motion.md`.

## What to read next

Load the reference file for the part you are building — do not read them all:

- `references/typography.md` — the full scale, the 20px family switch, the
  tracking table, and `assets/type-scale.json` with all 106 measured classes.
- `references/layout.md` — section rhythm, the content column, the tile
  contract, and how Apple alternates light/grey/dark.
- `references/motion.md` — scroll-linked media, staggered reveals, the
  enhanced-state pattern, and what breaks when JS is absent.
- `references/components.md` — hero, feature grid, comparison table, gallery,
  sticky local nav.
- `references/voice.md` — read before writing any headline, subhead or feature
  name. This is the part people most often get wrong.

## Using this with your own brand

The structure is what makes it read as Apple-grade: the proportions, rhythm,
restraint and motion. Swap `--accent`, the type family and the imagery for your
own and the result stays premium without imitating Apple's identity. Do not ship
Apple's fonts, photography, product renders, icons or wordmarks — this skill
teaches the system, and deliberately carries none of Apple's content.
