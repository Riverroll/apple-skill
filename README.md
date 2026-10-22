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
skills/apple-design/
  SKILL.md                     what to change and what to leave alone, token roles, the four rules
  references/restraint.md      one accent, three inks, three radii, two weights
  references/typography.md     the scale, the 20px family switch, the tracking table
  references/layout.md         rhythm, the content column, the tile contract, art direction
  references/motion.md         curves, reveals, staggering, sticky parallax, scroll-linked video
  references/components.md     hero, feature grid, comparison table, gallery, local nav
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

It also reports: text colours and radius/padding/duration scatter, display
sizes shipping `letter-spacing: normal`, headlines **scaled** on phone instead
of re-picked (and large ones that never step down at all), text below WCAG AA
against the background it actually sits on, sticky elements that cannot stick
because an ancestor clips scrolling, and headline length against Apple's
median of three words.

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

This teaches the *system* — proportion, rhythm, restraint, motion — so your own
brand and assets come out looking considered. It deliberately ships none of
Apple's content: no fonts, photography, product renders, icons or wordmarks,
and no part of it asks you to adopt Apple's colours.

Apple, iPhone, Mac, iPad, macOS and SF Pro are trademarks of Apple Inc. This
project is not affiliated with or endorsed by Apple.

## Licence

MIT, for the skill's own text and CSS.

## Example

`example/index.html` is a small page built on `assets/apple-base.css` — hero,
feature grid, a sticky parallax section, an inverse section, staggered reveal.
Its palette is deliberately **not** Apple's: warm, dark, its own identity, while
every proportion, tracking value and curve is Apple's. That is the point of the
skill in one file.

## Testing

The suite asserts a page built with the skill against Apple's own shipped
values — computed styles in a real browser, compared to `assets/type-scale.json`:

```sh
node test/structure.mjs                 # the skill loads, refs resolve, no Apple assets
node test/conformance.mjs <url>         # computed styles vs the measured values
node test/restraint.mjs                 # the before/after pair, self-contained
```

105 checks: the restraint counts (one accent hue, at most seven text colours,
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
