# Layout

Geometry and rhythm here transfer to any design. The *layout concept* — centered
symmetry, alternating light surfaces — is Apple's own editorial choice. On a
site that already has a concept, take the numbers and the relationships and
leave the concept alone.

## The content column

```css
.section-content {
  width: 100%;
  max-width: 1068px;   /* desktop */
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
@media (max-width: 1068px) { .section-content { max-width: 734px; } }
```

Centered, not left-aligned — on *Apple's* pages. Its marketing pages are
symmetrical by default and reserve left alignment for dense text (specs, legal,
support). This is a concept choice, not a rule: a site built around asymmetry
keeps its asymmetry.

The transferable part is that the content max-widths and the breakpoints are the
same numbers — 734 and 1068 — so the column locks to the viewport step instead
of drifting between them. If the design already has a content width, keep it and
make the breakpoint match it.

Side gutter is 22px on phone. Never let content touch the edge.

## Vertical rhythm

This is the part that makes the difference between "clean" and "Apple". Margins
are expressed in `em`, so they scale with the type they follow:

```css
--stacked-margin:          0.4em;  /* default between stacked elements */
--headline-plus-headline:  0.4em;  /* eyebrow -> headline: tight, one unit */
--headline-plus-first:     0.8em;  /* headline -> first body element: two units */
--paragraph-plus-element:  0.8em;  /* paragraph -> button / list / media */
--paragraph-plus-headline: 1.6em;  /* paragraph -> next headline: four units */
```

One rhythm, four multiples: 0.4 / 0.8 / 1.6. The jump to `1.6em` before a new
headline is what creates Apple's sense of separate thoughts without a divider
line. Apple's pages use almost no rules or borders between sections — the
spacing does that work.

Because these are `em`, a 64px headline followed by `0.8em` produces ~51px of
space, while a 17px paragraph followed by `0.8em` produces ~14px. The ratio is
constant; the pixels are not. Do not convert these to px.

## Section padding

Sections pad top and bottom from a shared ladder. The values that appear most
often, in order: **80, 100, 60, 40, 48, 92, 72, 64, 115, 140**.

Use one value for a whole page's default rhythm (80px or 100px on desktop) and
step down on phone — typically to 60px. Hero sections take the large end (115,
140); dense sections take 40–48.

## Alternating surfaces

Apple separates sections by changing the background, not by drawing a line:

```
surface  →  surface-alt  →  surface  →  inverse  →  surface
#fff        #f5f5f7         #fff        #000         #fff
```

What transfers is the *size of the step*: `#f5f5f7` against `#fff` is barely
off-white — around 1.1:1 — so it reads as a surface change rather than a
coloured panel. Build the same near-neighbour relationship out of the colours
the design already has; on a dark site that is `#14110e → #1b1714`, not a grey.

The inverse section is used once or twice per page for emphasis, usually the
most visual moment, and its supporting copy drops to the muted ink step rather
than full-contrast text.

## The tile contract

Apple's homepage tiles use a strict structure where the image sits as a
*sibling* of the content, not inside it, so it can bleed to the tile edge while
text stays in the padded column:

```html
<div class="tile-wrapper">
  <div class="tile-content">        <!-- headline, copy, CTAs -->
    <h2 class="t-headline">…</h2>
    <p class="t-intro">…</p>
    <div class="tile-ctas">…</div>
  </div>
  <div class="tile-image-wrapper">  <!-- sibling, absolutely positioned -->
    <picture>…</picture>
  </div>
</div>
```

```css
.tile-wrapper      { position: relative; overflow: hidden; }
.tile-image-wrapper{ position: absolute; bottom: 0; width: 100%; height: var(--tile-media-height); }
.tile-image-wrapper img,
.tile-image-wrapper video {
  position: absolute; inset-inline-start: 50%; transform: translateX(-50%);
  bottom: 0; width: auto; height: 100%; max-width: none;
}
/* content-first variant flips the media to the top */
.content-bottom + .tile-image-wrapper { top: 0; bottom: auto; }
```

The image is sized by **height** and centered horizontally with `width: auto`,
so it crops at the sides on narrow viewports instead of letterboxing. That is
why Apple's product shots always stay the same visual size while the tile
changes width.

## Art-directed images

Apple does not serve one image at several widths. It serves *different crops*
selected by both width and height:

```html
<picture>
  <source media="(min-width: 1069px)" srcset="hero-large.jpg 1x, hero-large_2x.jpg 2x">
  <source media="(min-width: 735px)"  srcset="hero-medium.jpg 1x, hero-medium_2x.jpg 2x">
  <source media="(max-width: 734px)"  srcset="hero-small.jpg 1x, hero-small_2x.jpg 2x">
  <img src="hero-medium.jpg" alt="…">
</picture>
```

The small crop is not the large one scaled down — it is recomposed, usually
tighter on the subject. Always ship `1x` and `2x`. Always give the `<img>` a
real `src` so it renders if no `<source>` matches.

## Radii

- `980px` — buttons. A pill, from a deliberately absurd radius.
- `28px` — large cards and tiles.
- `12px` — small tiles, inputs, badges.

Pick one card radius per page and hold it.
