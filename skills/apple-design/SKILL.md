---
name: apple-design
description: Apply Apple's craft — spacing ladder, em-based vertical rhythm, measured type scale, easing curves, parallax and scroll-linked motion — to a design, without changing its identity. Use whenever work involves a marketing page, product page, landing page, hero, feature grid or comparison table; when tightening the spacing, rhythm, typography or motion of an existing site; or when a request asks for something to feel "premium", "considered", "high-end" or "like Apple". Also use before writing headline or feature copy for such a page.
---

# Apple's design craft

Every number here was measured from apple.com's own shipped stylesheets.

## Read this first: this is a system, not a skin

Apple's pages feel considered because of **proportion, rhythm, restraint and
motion** — not because they are white and centered. Those are transferable.
Apple's palette, layout concept and identity are not.

When applying this to a design that already exists:

| Change | Leave alone |
|---|---|
| Spacing ladder and section padding | Colour palette and brand identity |
| Vertical rhythm between elements | Dark / light / themed direction |
| Type scale, tracking, weight discipline | Typeface choice, if one is set |
| Easing curves and durations | The site's layout concept and structure |
| Parallax and scroll-linked technique | Signature effects that make it *theirs* |
| Image art direction and crops | Imagery and subject matter |

**Never replace a site's visual identity with Apple's.** If a page is dark, it
stays dark. If it has a starfield, a gradient, a mascot or an unusual grid, that
survives and gets *better spacing and motion*. A portfolio that looks like
apple.com has lost the thing that made it worth building.

The failure mode to avoid: copying `--accent: #0071e3`, a white background and a
centered 1068px column into every project, so everything built with this skill
looks the same. The tokens below are **roles with measured relationships**. Map
them onto the colours the design already has.

## Read this second: a correct page can still be dead

Everything below describes what to **remove**. Nothing in it says what has to
be **there**, and that gap is where pages built from this skill go wrong.

Measured on eight apple.com product pages, sampling what is actually under a
64-point grid at every screenful of scroll:

| What a visitor sees | apple.com |
|---|---|
| photograph or video | **38%** |
| flat surface colour | 51% |
| text | 12% |

Three times as much picture as text. The same measurement on this skill's own
showcase page — which scores 100/100 on the audit — is **0% picture, 88% flat,
every screen empty**. Perfect tokens, nothing to look at. That page is the
failure this section exists to prevent.

So, before any of the numbers below:

- **Every screen that is not a deliberate rest needs a subject.** One per
  screen, big, cropped so it bleeds off two edges.
- **No more than one screenful in four without an image.** Apple's own rate is
  22%, and those are the rests — specs, footnotes, footer.
- **Scale contrast of ×6.** Largest type over body size; apple.com's median is
  ×6.7. Under ×4.5 everything is talking at the same volume.
- **The page has to change pace.** Loud, quiet, loud, quiet. A page of
  identical sections at identical weight is the actual mechanism behind "this
  looks AI-made" — not the colours, the monotony.
- **If no images were provided, go and find them.** That is part of building
  the page, not a blocker to hand back. `references/imagery.md` has verified
  sources, the licence rules and the crop rules.
- **Something on the page has to move, and it is not the text.** Counted in the
  shipped markup: a flagship product page carries **6 to 14 `<video>` elements**
  against 110–204 `<picture>` — roughly one short clip per two or three
  sections, each about 260 KB. Category and index pages carry **none**. So the
  rule is not "add video", it is: a product page with zero moving pictures is
  missing a third of the vocabulary, while a category page is right to have
  none. A clip is three seconds, silent, and plays once as you arrive —
  `references/media.md`.

Read `references/composition.md` before writing any marketing page,
`references/imagery.md` before deciding a page has to ship without pictures,
and `references/media.md` before adding any video or image transition.

## First decide which product this is

The numbers below are measured from a **marketing page**: read once, three
words per headline, 100px between sections. A **tool** — an ERP, an admin
panel, a dashboard, anything someone operates for eight hours — shares the
craft and almost none of the numbers.

| | Marketing page | Dense tool |
|---|---|---|
| Body | 17px | 14px |
| Largest type | 64–96px | 28px |
| Section padding | 80–100px | 16–24px gutter |
| Default transition | 250ms | 150ms |
| Scroll-linked motion | the signature | delete it |

If the thing has a data grid in it, **read `references/erp.md` before this
file's numbers**, and run the audit with `--mode erp`. Applying the marketing
ladder to a purchase-order screen turns twenty-four visible rows into six, and
the people who use it all day will be right to hate it.

## Token roles

```css
:root {
  /* Roles, not colours. Keep the design's own hues; what matters is that
     there are three distinct ink steps and two surfaces. */
  --ink:           /* primary text */
  --ink-secondary: /* supporting copy — clearly lighter, still readable */
  --ink-muted:     /* captions, footnotes, metadata */
  --surface:       /* base background */
  --surface-alt:   /* the near-neighbour you alternate sections with */
  --accent:        /* one action colour; the site's own */
  --on-accent:     /* text on an accent fill — dark if the accent is light */

  /* Vertical rhythm — relative to the font size of the element above.
     These ARE fixed: the ladder is the system. */
  --stacked-margin:          0.4em;
  --headline-plus-headline:  0.4em;  /* eyebrow -> headline */
  --headline-plus-first:     0.8em;  /* headline -> first body element */
  --paragraph-plus-element:  0.8em;  /* paragraph -> button, list, media */
  --paragraph-plus-headline: 1.6em;  /* paragraph -> next headline */

  --radius-pill: 980px;  /* buttons */
  --radius-card: 28px;   /* large cards */
  --radius-tile: 12px;   /* small tiles, inputs */
}
```

For reference, Apple's own values are `#1d1d1f` / `#6e6e73` / `#86868b` on
`#fff` / `#f5f5f7` with `#0071e3`. Use them **only** when starting from nothing
and the design has no palette of its own. The relationship to copy: the alt
surface is a *near* neighbour of the base (barely a step), while the three ink
levels are clearly separated. On dark, Apple inverts to `#000` base with
`#f5f5f7` ink and `#86868b` for supporting copy — note the base is pure black,
not a dark grey.

## The five rules that carry most of the effect

1. **One accent, three ink steps, three radii, two weights.** This is the one
   that shows. Count what a page actually uses before changing anything —
   `node tools/audit.mjs <url>` does the counting. A page with six accent hues
   and eight text colours does not have a spacing problem, and fixing its
   spacing will look to its owner like nothing happened. See
   `references/restraint.md`.
2. **Type switches family at 20px.** Below 20px use the Text optical size, 20px
   and up use Display. With a family that has no optical sizes, carry the effect
   through tracking instead.
3. **Tracking is a function of size and crosses zero at 40px.** Body 17px is
   `-0.022em`; 21px intro is `+0.011em`; 64px headline is `-0.009em`. Pick a
   value from the table in `references/typography.md` for every size — one flat
   tracking across a page is the commonest way this gets faked badly.
4. **Vertical rhythm is in `em`, not `px`,** so spacing scales with the type it
   follows. This is the single highest-leverage change on an existing site.
5. **Headlines are short declarative fragments ending in a full stop.** Median
   on apple.com is *three words*. See `references/voice.md` before writing copy.

## Breakpoints

Three bands, written as a closed middle, never overlapping min-widths. If the
project uses a framework with its own scale — Tailwind switches at 768px, not
735px — replace it rather than working around it: `references/stacks.md`.

```css
@media (max-width: 734px)                         { /* phone  */ }
@media (min-width: 735px) and (max-width: 1068px) { /* tablet */ }
@media (min-width: 1069px)                        { /* desktop */ }
```

Apple's content column is 1068px, then 734px — the column and the viewport step
share numbers on purpose. If the design already has a content width, keep it and
borrow the *relationship*: let the column and the breakpoint be the same number.

## Section padding

Top and bottom come from a shared ladder. Most frequent, in order:
**80, 100, 60, 40, 48, 92, 72, 64, 115, 140**.

Pick one default for the page (80 or 100 on desktop), step down to ~60 on phone,
give heroes the large end, and dense sections 40–48. Hold the choice — varying
section padding ad hoc is what makes a page feel loose.

## Motion

```css
--ease-standard:  cubic-bezier(0.4, 0, 0.6, 1);       /* most transitions */
--ease-out-soft:  cubic-bezier(0, 0, 0.5, 1);         /* entrances, reveals */
--ease-out-sharp: cubic-bezier(0, 0, 0.2, 1);         /* small state changes */
--ease-overshoot: cubic-bezier(0.3, 2, 0.5, 1);       /* pop; sparingly */
--ease-dramatic:  cubic-bezier(0.53, -0.01, 0.17, 1); /* long scroll-linked moves */
```

Durations by frequency: `250ms` default, `100ms` hover, `400ms` section reveal,
`160ms`/`200ms` small moves, `850ms` large scroll-linked moves. Hover feedback is
always the fastest thing on the page.

A reveal of *content* is slower than that and staggers at **150ms** per item —
0.9s opacity over a 0.7s 30px rise, the shipped tokens. Moving pictures and the
transitions between stills are a technique of their own, with their own measured
numbers: `references/media.md`. The short version is that a clip is three
seconds, silent, re-cropped per breakpoint, has a photograph underneath it, and
is never scrubbed.

### Parallax is CSS, not a scroll handler

Apple pins a section with `position: sticky` and buys the scroll distance with a
sibling spacer. Nothing runs per scroll event:

```css
.section-hero { --scroll-duration: 250vh; }
html.enhance-xp .sticky-container { min-height: var(--scroll-duration); }
html.enhance-xp .sticky-content   { position: sticky; top: 0; min-height: 100vh; }
/* a layer that drifts at 35% of page speed */
html.enhance-xp .sticky-content--slow { margin-top: calc(var(--scroll-duration) * -0.65); }
```

The `enhance-xp` class is the part people skip. JS adds it only after
`prefers-reduced-motion`, `position: sticky` support and a viewport-height range
all pass; without it the section is an ordinary stacked block. Copy the gate
along with the sticky rules — `references/motion.md` has Apple's exact
condition. This technique is aesthetic-neutral: it works on any palette, which
is why it is one of the first things worth borrowing.

Honour reduced motion, always:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
```

## Applying this to a site that already exists

**Audit before you touch anything.** `node tools/audit.mjs <url>` reads computed
styles out of a real browser — any stack, no instrumentation — and ranks what is
countably wrong. Work its list top-down. Its first two findings are what someone
notices; everything below them is what they feel.

The default order, when the audit is clean or unavailable:

0. **Composition.** Is there a subject on every screen, big enough and cropped
   hard enough to be the point of it? If the answer is no, nothing below will
   fix the page. `references/composition.md`, then `references/imagery.md` to
   source what is missing. This step is first because it is the only one that
   can make a page people want to look at.
1. **Restraint.** Collapse to one accent, three ink steps, three radii, two
   weights. `references/restraint.md`. This is almost always the visible fix,
   and it is *not* a palette change — the hues stay, they just stop competing.
2. **Type scale.** Put headlines on the measured ladder: 48px section headline,
   64px hero, re-picked (not scaled) on phone, each with its own tracking.
   A headline that goes 36px → 48px at weight 600 is the second thing anyone
   notices.
3. **Rhythm.** Replace ad-hoc `px` margins between stacked elements with the
   `em` ladder.
4. **Section padding.** Collapse the page onto one value from the ladder.
5. **Motion.** Swap easing curves and durations for the measured ones. Keep the
   effects the site already has — just retime them.
6. **Parallax and scroll.** See `references/motion.md`; sticky sequences and
   layer speeds are technique, and work on any aesthetic.
7. **Copy.** Shorten headlines to the voice rules.

Leave the palette's *hues* alone. Restraint is about how many of them are doing
work at once, not about replacing them.

A warning from doing this wrong: starting at step 3 on a site that is already
roughly spaced produces a diff full of real improvements and a page that looks
identical. The owner will say nothing changed, and they will be right to.

## What to read next

Load only the reference you need:

- `references/restraint.md` — the counts: one accent, three inks, three radii,
  two weights, and how to map a rainbow back down without losing an identity.
- `references/typography.md` — the scale, the 20px family switch, the tracking
  table, the seven-step headline ladder, and `assets/type-scale.json` with all
  106 measured classes.
- `references/layout.md` — rhythm, content column, the tile contract, art
  direction, alternating surfaces.
- `references/motion.md` — curves ranked by measured frequency, parallax
  layers, staggered reveals, and what must stay readable when JS does not run.
- `references/media.md` — **read before any video or image transition.** The
  measured source ladder (six files, three crops, two densities), the
  four-layer stack with the still underneath, the download and play windows,
  the ffmpeg recipes and byte budgets, why these clips must not be scrubbed,
  the asymmetric crossfade and clip-path open, and where footage comes from.
- `references/components.md` — hero, feature grid, comparison table, gallery,
  sticky local nav.
- `references/voice.md` — read before writing any headline, subhead or button.
- `references/dark.md` — read before applying any of this to a site that is
  dark all the way through. Four of the system's colour habits invert and one
  of them (alpha ink under an opacity reveal) breaks silently.
- `references/composition.md` — **read before building any marketing page.**
  What has to be in it: the measured media-to-text ratio, the subject
  hierarchy, cropping, sequence and pace, and the countable tells of a
  generated page.
- `references/imagery.md` — where real images come from when the project
  provides none: verified sources, licences and attribution, art direction per
  breakpoint, the performance contract, and the honesty rules.
- `references/micro.md` — where components sit, and how they move: the
  measured `dotnav`, `paddlenav` and `tabnav` token blocks, the carousel dot
  that tapers instead of paginating, the autoplay dot that becomes a progress
  track, and the six rules behind all of it.
- `references/erp.md` — **read first if this is a tool, not a page.** The dense
  type ladder, the one row-height token, the table and form contracts, the
  shell layout, the semantic colour set that is the one exemption to one
  accent, and what motion is for when the user is not a visitor.
- `references/stacks.md` — how the tokens, breakpoints and type ladder are
  expressed in Tailwind, CSS modules and CSS-in-JS, plus the migration order
  that keeps a page shippable at every commit. Tailwind's default breakpoints
  are *not* these breakpoints.

`tools/audit.mjs` runs against any live URL and changes nothing. Pass
`--mode erp` for a tool and it scores against `references/erp.md` instead —
alignment, sticky headers, tabular numerals, row-height tokens, hit targets and
focus rings, with the marketing padding, headline and parallax checks switched
off. Without the flag it detects a dense screen and says so rather than giving
a page of advice that would make the tool worse.

On a marketing page it also samples what a
visitor actually sees at every screenful of scroll and reports it against
apple.com's own 38 / 12 / 51 split, so "it feels empty" becomes a number
instead of an argument.

It measures at
1440 / 900 / 500px, so it also catches headlines that were scaled on phone
rather than re-picked. Save a baseline before you start and diff against it
after:

```sh
node tools/audit.mjs <url> --json before.json
# ...do the work...
node tools/audit.mjs <url> --baseline before.json
```

The delta is how you show someone what the pass did. Without it, a page whose
rhythm improved looks unchanged, and the only honest answer to "did anything
change?" is a shrug.

`example/soul/flop.html` and `alive.html` are the composition pair: nine tells
and 0% picture against zero findings and 48% picture. The copy differs between
them on purpose — a page whose headlines are "Elevate Your Morning Ritual" has
a content problem, and composition is the one pass that is allowed to fix it.

`example/erp/before.html` and `after.html` are the same purchase-order screen,
21 findings down to none, with every word of its data intact — the dense
equivalent of the pair below.

`example/fix-me/before.html` and `after.html` are the same page with these
rules applied to the second one — same markup, same copy, same identity, five
audit findings down to none. Read the diff before doing this to someone else's
site; it is the shortest possible demonstration that restraint is a change of
vocabulary, not of design.

`assets/apple-base.css` is a starting point for a **new** page with no design of
its own. Do not drop it onto an existing site — take the rhythm and motion
sections from it and leave the palette behind.

Never ship Apple's fonts, photography, product renders, icons or wordmarks. This
skill teaches the system and deliberately carries none of Apple's content.
