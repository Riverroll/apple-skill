# Typography

Apple's scale is not a ratio applied to a base size. It is a hand-tuned set of
pairs, where line-height and tracking are chosen per size. The measured values
for all 106 classes are in `../assets/type-scale.json`; the ones you will
actually reach for are below.

## The 20px family switch

| size | family | why |
|---|---|---|
| ≤ 19px | SF Pro **Text** | optical size cut for reading at small sizes |
| ≥ 20px | SF Pro **Display** | tighter apertures, designed for headlines |

This is not cosmetic. `typography-caption-elevated` ships as Display 21px on
desktop and *switches to Text 17px* below 735px — the family changes with the
breakpoint because the size crosses 20px. Mirror that behaviour whenever a
responsive step crosses the threshold.

With a non-Apple family, use its text/caption optical size below 20px and its
display optical size above. If it has no optical sizes, reduce tracking on large
sizes instead (see below) — that recovers most of the effect.

## Tracking table

Tracking is a function of size, and it crosses zero around 20px:

| size | tracking | note |
|---|---|---|
| 12px | `-0.01em` | caption |
| 14px | `-0.016em` | reduced body |
| 17px | `-0.022em` | body — the tightest in the system |
| 19px | `+0.012em` | nav links |
| 21px | `+0.011em` | intro / lead paragraph |
| 24px | `+0.009em` | label |
| 32px | `+0.004em` | large eyebrow |
| 40px | `0em` | section headline |
| 64px | `-0.009em` | hero headline |

The shape: tightest at body size, loosening through the small display sizes,
then tightening again as display sizes get large. Setting one flat tracking
value across a page is the single most common way this system is faked badly.

## The sizes you need

```css
/* hero headline */
.t-headline-elevated { font: 600 64px/1.0625 var(--font-display); letter-spacing: -0.009em; }
/* section headline */
.t-headline          { font: 600 40px/1.1    var(--font-display); letter-spacing: 0em; }
/* eyebrow above a headline */
.t-eyebrow-super     { font: 600 32px/1.125  var(--font-display); letter-spacing: .004em; }
/* lead paragraph under a headline */
.t-intro             { font: 400 21px/1.381002381 var(--font-display); letter-spacing: .011em; }
/* label / card title */
.t-label             { font: 600 24px/1.1666666667 var(--font-display); letter-spacing: .009em; }
/* body */
.t-body              { font: 400 17px/1.4705882353 var(--font-text); letter-spacing: -0.022em; }
/* dense body */
.t-body-reduced      { font: 400 14px/1.4285914286 var(--font-text); letter-spacing: -0.016em; }
/* caption, footnote, legal */
.t-caption           { font: 400 12px/1.3333733333 var(--font-text); letter-spacing: -0.01em; }
```

Those line-heights are unrounded on purpose — they are the shipped values.
`1.4705882353` is `25/17`. Keep the precision; rounding to `1.47` shifts a long
paragraph by a visible amount.

## Weights

Apple uses **400** and **600**, and almost nothing else on marketing pages.
500 appears only in local nav links. There is no 300 and no 700 — if a headline
needs more presence, it gets bigger, not heavier.

## Responsive behaviour

66 of the 106 classes change at a breakpoint. The pattern is consistent: a size
drops one or two steps on phone and the tracking is re-picked for the new size
from the table above. It never just scales.

```css
.t-headline-elevated { font-size: 64px; letter-spacing: -0.009em; }
@media (max-width: 734px) {
  .t-headline-elevated { font-size: 40px; letter-spacing: 0em; }  /* re-picked, not scaled */
}
```

## Non-breaking spaces

Apple binds product names with `&nbsp;` so they never wrap mid-name:
`iPhone&nbsp;18&nbsp;Pro`, `MacBook&nbsp;Air`, `macOS&nbsp;27`. Do the same for
any multi-word product name, version number, or a trailing short word that would
otherwise leave a one-word orphan line.
