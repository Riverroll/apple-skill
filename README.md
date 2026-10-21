# apple-skill

A Claude Code skill that teaches Apple's design system — the measured type
scale, em-based vertical rhythm, motion curves, layout contracts and editorial
copy voice used on apple.com.

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
  SKILL.md                     the five rules that carry most of the effect, plus core tokens
  references/typography.md     the scale, the 20px family switch, the tracking table
  references/layout.md         rhythm, the content column, the tile contract, art direction
  references/motion.md         curves, reveals, staggering, scroll-linked video
  references/components.md     hero, feature grid, comparison table, gallery, local nav
  references/voice.md          how Apple writes headlines — read before writing copy
  assets/apple-base.css        drop-in tokens and primitives
  assets/type-scale.json       all 106 measured typography classes
```

## Scope

This teaches the *system* — proportion, rhythm, restraint, motion — so your own
brand and assets come out looking considered. It deliberately ships none of
Apple's content: no fonts, photography, product renders, icons or wordmarks.
Swap `--accent` and the type stack for your own and the result stays premium
without imitating Apple's identity.

Apple, iPhone, Mac, iPad, macOS and SF Pro are trademarks of Apple Inc. This
project is not affiliated with or endorsed by Apple.

## Licence

MIT, for the skill's own text and CSS.

## Example

`example/index.html` is a small page built only from the tokens in
`assets/apple-base.css` — hero, feature grid, dark section, staggered reveal.
Open it to see the system working, and as a shape to copy.
