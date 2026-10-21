# Components

## Hero

Full-bleed section, centered content, headline → subhead → two CTAs → media.

```html
<section class="section section-hero theme-dark">
  <div class="section-content">
    <h1 class="t-headline-elevated">iPhone&nbsp;18&nbsp;Pro</h1>
    <p class="t-intro">Jauh lebih Pro.</p>
    <div class="cta-row">
      <a class="button" href="#">Selengkapnya</a>
      <a class="button button--secondary" href="#">Beli</a>
    </div>
  </div>
  <div class="tile-image-wrapper"><picture>…</picture></div>
</section>
```

The hero takes the top of the padding ladder (115–140px). On a dark hero the
supporting copy is `--ink-muted` (`#86868b`), not white — white on black for
body text is harsh and Apple avoids it.

## Feature grid

Equal cards, one radius, no borders — separation comes from the gap and the
card's own surface against the section background.

```css
.feature-grid { display: grid; gap: 20px; grid-template-columns: repeat(3, 1fr); }
@media (max-width: 1068px) { .feature-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 734px)  { .feature-grid { grid-template-columns: 1fr; } }

.feature-card {
  border-radius: 28px;
  background: var(--surface);
  overflow: hidden;
  display: flex; flex-direction: column;
}
```

Card media keeps a fixed ratio so a row stays even regardless of copy length:

```css
.card-media { position: relative; aspect-ratio: 3 / 2; }
.card-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
```

Card copy is a label (24px) plus body (17px), never a 40px headline — the
section owns the big type, the cards do not compete with it.

## Comparison table

Columns are products, rows are attributes. The product cell carries image,
name, chip line, then price. Row labels are left-aligned; values are centered
under each product.

- Keep the product header **sticky** on scroll so the reader keeps context:
  `position: sticky; top: var(--localnav-height);`
- Spec values use `--ink`; the attribute label uses `--ink-secondary`.
- A column the user selected gets a subtle `--surface-alt` fill, not a border.
- Phone layout: drop to two columns with a picker above, rather than scrolling
  a wide table sideways.

## Gallery / tab panels

A tab strip plus panels where **only the active panel occupies layout**:

```css
.tab-panel { position: absolute; opacity: 0; visibility: hidden; }
.tab-panel--active { position: relative; opacity: 1; visibility: visible; }
```

Two traps, both of which produce the same broken page:

1. `visibility` is **inherited**. If any descendant sets
   `visibility: visible`, it leaks back out of a hidden panel and every panel
   paints on top of every other. Never force visibility on descendants.
2. The active panel must be `position: relative` — if every panel is absolute,
   the container collapses to zero height and the whole gallery disappears.

## Sticky local nav

A product-level bar below the global nav: product name on the left, section
links and a buy button on the right.

```css
.localnav {
  position: sticky; top: 0; z-index: 9997;
  height: 52px;
  background: rgba(255,255,255,0.72);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
```

The translucent blur is the signature. The active section link gets a 2px
underline in `--ink`, not a background fill.

## Dynamic pricing and live data

Apple injects prices client-side from a commerce API. If you copy this pattern,
render a **static fallback price in the markup** and let the script replace it.
A price element that is empty until a fetch resolves shows a blank cell on
every slow connection and on every failure.
