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
skills/apple-design/
  SKILL.md                     what to change and what to leave alone, token roles, the four rules
  references/typography.md     the scale, the 20px family switch, the tracking table
  references/layout.md         rhythm, the content column, the tile contract, art direction
  references/motion.md         curves, reveals, staggering, sticky parallax, scroll-linked video
  references/components.md     hero, feature grid, comparison table, gallery, local nav
  references/voice.md          how Apple writes headlines — read before writing copy
  assets/apple-base.css        tokens and primitives for a NEW page (placeholder palette — replace it)
  assets/type-scale.json       all 106 measured typography classes
```

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
```

99 checks: the type scale, the tracking table, button geometry, the em rhythm
ladder, the content column at each breakpoint, that type is re-picked rather
than scaled on phone, that scroll-linked sections use sticky plus a spacer and
collapse to plain blocks without JS, that no text is lost with JS disabled, and
that motion stops under `prefers-reduced-motion`.

The palette is checked as **relationships** — three separated ink steps, an alt
surface that is a near neighbour of the base, AA/AAA contrast on each role —
never as specific colours. A check that asserted `#0071e3` would force every
page built with this skill into being a clone, so one check asserts the
opposite: that the accent is *not* Apple's.
