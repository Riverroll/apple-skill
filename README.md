# apple-skill

A Claude Code skill that teaches Apple's design system — the measured type
scale, em-based vertical rhythm, motion curves, scroll-linked technique, layout
contracts and editorial copy voice used on apple.com.

**It is a system, not a skin.** Applied to a design that already exists, it
changes spacing, rhythm, type discipline and motion, and leaves the palette,
the identity and the layout concept alone. A dark site stays dark. The skill
leads with token *roles* and measured relationships rather than Apple's hex
values, and the test suite enforces that: it asserts contrast ladders and
separation between ink steps, never a brand colour — and fails a page that
copied Apple's accent instead of mapping its own.

Once installed, Claude applies it automatically whenever you ask for a
marketing page, product page, landing page, hero, feature grid or comparison
table, or whenever you ask for something to look "like Apple", "premium" or
"high-end" — you don't have to invoke it by name.

## Where the numbers come from

Every value is extracted from apple.com's own shipped stylesheets, not
estimated: 106 typography classes with their per-breakpoint overrides, the
SpaceKit spacing tokens, the easing curves ranked by how often each is used,
the breakpoint set, and the colour palette ranked by frequency across the
product pages. The copy rules come from measuring 338 headlines — median length
three words, 42% ending in a full stop.

## Install

As a plugin:

```
/plugin marketplace add Riverroll/apple-skill
/plugin install apple-skill
```

Or drop the skill straight in:

```sh
git clone git@github.com:Riverroll/apple-skill.git
cp -r apple-skill/skills/apple-design ~/.claude/skills/
```

## What's inside

```
tools/audit.mjs                audit any live URL — see below
tools/make-clip.sh             build one clip's six-file ladder and its stills
tools/render-clip.mjs          render a clip from a scene you wrote — no footage needed
skills/apple-design/
  SKILL.md                     what to change and what to leave alone, token roles, the four rules
  references/restraint.md      one accent, three inks, three radii, two weights
  references/dark.md           what inverts on a dark site, and what breaks silently
  references/stacks.md         Tailwind / CSS modules / CSS-in-JS, and the migration order
  references/typography.md     the scale, the 20px family switch, the tracking table
  references/layout.md         rhythm, the content column, the tile contract, art direction
  references/motion.md         curves ranked by frequency, reveals, staggering, sticky parallax
  references/media.md          video and image transitions — the source ladder, the still underneath, ffmpeg
  references/composition.md    what has to be IN the page: media-to-text ratio, subject hierarchy, pace
  references/imagery.md        where real pictures come from: sources, licences, crops per breakpoint
  references/components.md     hero, feature grid, comparison table, gallery, local nav
  references/micro.md          dotnav, paddlenav, tabnav — the measured token blocks
  references/erp.md            read first for a tool: dense type ladder, table and form contracts
  references/voice.md          how Apple writes headlines — read before writing copy
  assets/apple-base.css        tokens and primitives for a NEW page (placeholder palette — replace it)
  assets/type-scale.json       all 106 measured typography classes
```

## Audit an existing page

```sh
node tools/audit.mjs https://example.com
node tools/audit.mjs https://example.com --json before.json
node tools/audit.mjs https://example.com --baseline before.json
```

Reads computed styles out of a real headless browser at **1440 / 900 / 500px**
— any stack, no instrumentation, changes nothing — and ranks what is countably
wrong, naming the elements:

```
  1. 6 accent hues in use
     150° ×29  180° ×98  210° ×56  240° ×5  270° ×98  330° ×23
       · 150°  div.space-y-10 > div.relative.pl-8 > div.absolute.left-0
       · 270°  div.space-y-4 > div.p-4.rounded-xl > p.text-violet-400/70
     -> Apple ships one. Pick the hue that already means 'action' on this page
        and map the rest to ink steps.
```

It also reports: sections that are all the same height (a long page with no
rest in it is the main reason a correct page still reads as generated), text
colours and radius/padding/duration scatter, display sizes shipping
`letter-spacing: normal`, headlines **scaled** on phone instead
of re-picked (and large ones that never step down at all), text below WCAG AA
against the background it actually sits on, text sitting under an ancestor
stuck below full opacity (which multiplies every ink step inside it), sticky
elements that cannot stick because an ancestor clips scrolling, and headline
length against Apple's median of three words.

Three of its findings come from measuring the page in a second state rather
than reading one: it sets `prefers-reduced-motion` and names the clip slots
that were full without the preference and blank with it, reports the share of
the screen that is a **gradient** (real Apple pages measure 0–4%; a page at
100% has no subject, only a backdrop), and flags clips painted wider than the
file they came from, and elements marked `hidden` that still have a layout box
— on screen for the eye, gone from the accessibility tree.

It walks the page before measuring, so scroll-triggered reveals have run and
are not counted as hidden content.

`--json` writes the raw measurements; `--baseline` prints the delta against an
earlier run:

```
  change since baseline

     accent hues                        6 ↓ 1
     text colours                      33 ↓ 7
     corner radii                       5 ↓ 3
```

That second form answers the question every one of these passes runs into —
"did anything actually change?" — with a number instead of an opinion.

Run it **before** you change anything. Rhythm and tracking are what a page
feels like; the counts above are what it looks like. Fixing rhythm on a site
that is already roughly spaced produces a diff full of real improvements and a
page its owner says looks identical — and they are right.

## The worked example

`example/fix-me/before.html` and `example/fix-me/after.html` are the **same
page** — same markup, same copy, same dark identity, same teal — with the
restraint rules applied to the second one. Open both:

```
before   6 accent hues · 15 text colours · 5 display sizes tracked normal
         · 4 section paddings · a headline frozen at every width
after    nothing countable is off
```

Nothing was redesigned. The colour per card carried no meaning, so it became
one card treatment; nine opacity steps became three ink steps; every display
size got its tracking from the table; the padding collapsed onto one ladder.
`node test/restraint.mjs` asserts all of that, and asserts that the copy is
byte-identical between the two — a "fix" that rewrites the content is not a
fix, it is a different site.

## Scope

## A correct page can still be dead

Restraint says what to take away. Nothing in it says what has to be there, so a
page can score 100/100 and be a blank canvas with good margins. Measured on
eight apple.com product pages, sampling what sits under a 64-point grid at
every screenful of scroll:

| What a visitor sees | apple.com | this repo's own showcase page |
|---|---|---|
| photograph or video | **38%** | **0%** |
| flat surface colour | 51% | 88% |
| text | 12% | 8% |

`references/composition.md` carries the ratios, the subject hierarchy, how hard
to crop, how a long page changes pace, and the countable tells of a generated
page — gradient type, glass cards, emoji icons, three equal cards forever, the
"elevate / seamless / unleash" vocabulary. `references/imagery.md` is how to
source real images when the project provides none, with verified APIs, licence
and attribution rules, per-breakpoint art direction and the honesty rules.

The audit measures all of it, so "it feels empty" stops being an argument:

```
  what a visitor sees: 0% picture · 4% text · 92% flat colour  (apple.com: 38 / 12 / 51)

  1. only 0% of what a visitor sees is a picture
  2. 2 of 5 screenful(s) contain no image at all
  3. the largest type is only x3.76 the body size
```

`example/soul/` is the worked pair: nine tells and 0% picture, against zero
findings and 48% picture.

## Components, and how they move

`references/micro.md` is read straight out of apple.com's `--sk-dotnav-*`,
`--sk-paddlenav-*` and `--tabnav-*` token blocks: the 8px dot inside a 24px
target, the resting alpha of 0.42, hover at 120ms linear against a slide change
at 320ms ease-in-out, the overflow that tapers dots to 0.75 then 0.5 instead of
paginating, the 40ms stagger between neighbours, the autoplay dot that morphs
into a 32px progress track, and the one selector most hand-built carousels miss
— `:focus-visible` on paddles that are hidden until hover.

## Moving pictures

A third of what a visitor sees on an apple.com product page is a photograph or
a video, and the video half is narrower than people assume. Measured off the
shipped assets: **a three-second silent clip, 30fps, one keyframe for the whole
file, art-directed into three crops at two densities** — a 0.88 portrait for
phones, a 1.62 for tablets, a 2.06 at 1260px for desktop. 260 KB on a 1&times;
desktop screen. A flagship page carries 6 to 14 of them; a category page
carries none.

Two things follow that most hand-built versions get wrong. A single-keyframe
file **cannot be scrubbed** — writing `currentTime` on it decodes from frame 0
every time, which is the stutter. And the clip is never alone: a `<picture>` of
frame 0 sits in the same grid cell underneath it, so a slow connection, a
blocked request or `prefers-reduced-motion` lands on a photograph. With the
preference set Apple does not slow the clip down, it never fetches it.

Under `prefers-reduced-motion` — or with JS off — the fallback is not frame 0.
A clip whose point is its end state has a frame 0 that shows nothing having
happened, so the stack carries **both** ladders and swaps which one is in the
layout. The hidden `<picture>` keeps `loading="lazy"` and is never fetched.

`references/media.md` has the loader's measured windows (download at
`top − 200vh`, play at `top − 100vh`, never paused on exit), the ffmpeg
recipes, the byte budgets, and the four image-transition techniques with their
shipped numbers — including the asymmetric crossfade, which is out in 300ms and
in over 600ms after a 250ms hold, because symmetric timing produces a muddy
double exposure at the midpoint.

```sh
tools/make-clip.sh master.mov out/     # or a photograph: it gets a 1.11x push
node tools/render-clip.mjs scene.html out/   # no footage at all: render one
```

### When there is no footage

Most pages that need a clip do not have one, and that is why they ship as
pages of stills. `tools/render-clip.mjs` takes the other route: a *scene* is an
HTML file exposing one function, `setFrame(t)`, with `t` running 0 → 1. The
tool drives a headless browser through 90 values of it, captures each paint,
and encodes the three crops at two densities. Nothing animates by itself — no
`@keyframes`, no `transition`, no `requestAnimationFrame` — so the file a slow
machine produces is byte-identical to the file a fast one produces, and the
clip can be re-rendered from source instead of re-shot.

The scene is rendered **at each crop's own aspect**, so the portrait version is
a portrait composition rather than the desktop one letterboxed. And because it
is a real browser, the scene is the same CSS the product is built in.

`example/scenes/` holds the three used on the showcase page: a tilt reading
drawing itself, a station network reporting in, an alert settling into a list.
They cost 18–50 KB at 1&times; against 260 KB for the photographic clips, which
is what the bits-per-pixel table in `references/media.md` predicts.

`example/motion/` demonstrates all of it; `example/motion/flat.html` is the
same content with every mistake in it, and the audit's six media findings fire
on that one and stay silent on the other.

## Tools are not pages

An ERP, an admin panel or a dashboard shares the craft and almost none of the
numbers. `references/erp.md` carries the dense set — the 12/14/17px ladder that
was already in Apple's measured classes, one `--row-h` token the whole geometry
comes off, the table and form contracts, the semantic colour set that is the
one exemption to one accent, and why scroll-linked motion has no place in a
data grid.

```sh
node tools/audit.mjs http://localhost:3000/purchase-orders --mode erp
```

In that mode the audit stops asking for an 80px padding ladder and starts
flagging it, and adds the checks that decide whether a grid is readable:
alignment by data type, a sticky header, a pinned identity column,
`tabular-nums`, one row height, 28px hit targets, a focus ring, truncation with
something behind it. `example/erp/` is the worked pair — the same purchase-order
screen, 21 findings down to none, every word of its data intact.

This teaches the *system* — proportion, rhythm, restraint, motion — so your own
brand and assets come out looking considered. It deliberately ships none of
Apple's content: no fonts, photography, product renders, icons or wordmarks,
and no part of it asks you to adopt Apple's colours.

Apple, iPhone, Mac, iPad, macOS and SF Pro are trademarks of Apple Inc. This
project is not affiliated with or endorsed by Apple.

## Licence

MIT, for the skill's own text and CSS.

## Example

`example/index.html` is a **marketing page** for an invented product — Ridge, a
ground-deformation network — built on `assets/apple-base.css`. Its palette is
deliberately **not** Apple's: warm, dark, its own identity, while every
proportion, tracking value and curve is Apple's.

It is also the worked answer to the complaint that correct tokens cannot fix:
*"every section is fine and the page still feels like nothing."* The page is
**one morning, in order** — 05:30 nothing is happening, 06:41 the ground
tilts, 06:42 four phones ring, 07:00 the vent opens, then the payoff, then the
explanation — and the time carries through in the same place, in the same
type, every step. Shuffle the sections and it breaks, which is the test.

The three interface clips are rendered from `example/scenes/` rather than
filmed, and each one draws **over the page's own photograph** rather than on a
flat dark panel. That is the other half of the fix: a page that alternates
bright documentary photography with black dashboards reads as two pages
interleaved. `references/composition.md` has both rules.

The photographs are public domain USGS and NPS frames; the product, its
numbers and the morning itself are fiction, and the page says so above the
credits.

## Testing

The suite asserts a page built with the skill against Apple's own shipped
values — computed styles in a real browser, compared to `assets/type-scale.json`:

```sh
node test/structure.mjs                 # the skill loads, refs resolve, scenes and tools hold their contract
node test/conformance.mjs <url>         # computed styles vs the measured values
node test/restraint.mjs                 # the before/after pair, self-contained
node test/erp.mjs                       # the dense-tool pair, self-contained
node test/composition.mjs               # the soul pair, self-contained
node test/media.mjs                     # the clip ladder, the stack, the fallbacks
node test/gallery.mjs                   # the carousel: paddles, dots, keyboard
```

357 checks across the seven. `test/media.mjs` is the widest of them: it reads
the six clip files off disk (moov before mdat, no audio track, inside the byte
budget, three crops at three aspect ratios), then drives a real browser through
the markup as parsed, the source the loader picks at 1440px, at 2&times; and at
420px, playback, the drop-to-still path with the file deliberately failing,
reduced motion, and scripting off.

The rest cover: the restraint counts (one accent hue, at most seven text colours,
three radii, weights 400/600), the type scale, the tracking table, button geometry, the em rhythm
ladder, the content column at each breakpoint, that type is re-picked rather
than scaled on phone, that scroll-linked sections use sticky plus a spacer and
collapse to plain blocks without JS, that no text is lost with JS disabled, and
that motion stops under `prefers-reduced-motion`.

The palette is checked as **relationships** — three separated ink steps, an alt
surface that is a near neighbour of the base, AA/AAA contrast on each role —
never as specific colours. A check that asserted `#0071e3` would force every
page built with this skill into being a clone, so one check asserts the
opposite: that the accent is *not* Apple's.
