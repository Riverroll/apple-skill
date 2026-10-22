# Restraint

The part of Apple's system that is easiest to measure and hardest to keep.

Rhythm and tracking are what a page *feels* like. Restraint is what it *looks*
like. On an existing site that is already roughly spaced, fixing rhythm first
produces a change the owner cannot see — and they will tell you so. Count these
first, fix what is over the limit, and the page changes visibly in one pass.

Run `node tools/audit.mjs <url>` to get these counts off a live page.

## The counts

| What | Apple | Alarm at |
|---|---|---|
| Accent hues | **1** | 3+ |
| Text colours | 3 steps (+ an inverse pair, + a link) | 8+ |
| Corner radii | 3 (pill / card / tile) | 4+ |
| Section paddings | 1 default, 1 phone step, heroes at the large end | 4+ |
| Transition durations | 3 (100 / 250 / 400ms) | 5+ |
| Font weights | 2 (400, 600) | 3+ |
| Tracking per size | exactly 1 | 2 |

None of these is about taste. They are all countable, and every one of them is
something a reader notices before they read a word.

## One accent

Apple uses a single action colour. Everything else is ink on a surface. The
colour means *this is the thing you can do* — and it only means that because
nothing else on the page is competing for it.

The common failure, especially in a portfolio or dashboard: a colour per
category. Emerald cards, cyan cards, violet cards, pink tags, a gradient on the
headline, another gradient on the numbers. Each decision was reasonable alone.
Together they tell the reader nothing, because colour no longer encodes
anything — it is just texture.

**Mapping a rainbow back down, without losing the site's identity:**

1. Pick the hue that already reads as "action" on this page — the one on the
   primary button, or the brand hue. That becomes `--accent`.
2. Everything that was coloured *for decoration* becomes an ink step:
   borders → `--ink` at ~10% alpha, metadata → `--ink-muted`.
3. Everything that was coloured *to carry meaning* keeps colour only if the
   meaning survives being stated in words. Status (live / archived / error)
   is meaning. "This is the third card" is not.
4. Keep exactly one highlight: the current item, the active filter, the role
   someone holds right now. One thing on a page gets the accent.

The site stays itself. A dark starfield portfolio is still a dark starfield
portfolio with one accent — it just stops looking like a sticker album.

## Three ink steps

```
--ink            primary text, headlines, the thing being read
--ink-secondary  supporting copy, descriptions, intro paragraphs
--ink-muted      captions, metadata, timestamps, footnotes
```

Plus an inverse pair for the one dark (or light) section, and a link colour.
That is the whole set.

What goes wrong in practice: opacity gets used as a dial. `white/80`,
`white/70`, `white/60`, `white/50`, `white/40`, `white/35`, `white/30` — seven
steps where there should be three, each one a judgement nobody made
deliberately. The reader cannot see a hierarchy with seven levels; they only
see that the page is slightly washed out.

Pick three alphas, name them as tokens, and refuse the fourth.

## One radius per role

```
--radius-pill  980px   buttons, chips, tags, filter pills
--radius-card  28px    cards, tiles, large panels
--radius-tile  12px    inputs, small badges, thumbnails
```

Mixed radii read as unfinished faster than any other geometry mistake, because
the eye compares corners that sit side by side. A page with `rounded-md`
buttons next to `rounded-lg` cards next to `rounded-xl` panels next to
`rounded-full` chips has four decisions where Apple has three, and none of them
agree.

Pick one card radius for the page and hold it.

An illustration is a shape, not UI geometry — a 90px/40px capsule drawn in CSS
is artwork. Mark those `data-decorative` so a radius audit skips them, and so
the next person knows the corner was a drawing decision, not a system one.

## Two weights

400 and 600. 500 appears only in local nav links. There is no 300 and no 700 —
the single exception in the measured set is the 56px headline step, which is
the only 700 Apple ships.

If a headline needs more presence it gets **bigger**, not heavier. This is the
rule people break first and notice last.

## Decoration stays out of the copy

Floating particles, orbs, asteroids, confetti, mascots — whatever the site's
signature layer is, it keeps its own territory. The moment a decorative element
crosses the text column, the page reads as amateur regardless of how good the
type is, because the reader's eye has to separate foreground from noise.

Give the copy column a dead zone: the decoration renders outside it, or behind
it at an opacity low enough that it is texture rather than an object. Apple's
own backgrounds are gradients and product photography, never objects that
overlap a headline.

## What restraint is not

It is not minimalism, and it is not removing the site's personality. Apple's
pages have enormous photography, video that plays on scroll, and sections that
pin for three screen-heights. The restraint is in the *vocabulary*: one accent,
three inks, three radii, two weights — and then anything within that vocabulary
can be as loud as it wants.
