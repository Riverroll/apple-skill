# Motion

## Curves

```css
--ease-standard:  cubic-bezier(0.4, 0, 0.6, 1);      /* default transition */
--ease-out-soft:  cubic-bezier(0, 0, 0.5, 1);        /* entrances, reveals */
--ease-out-sharp: cubic-bezier(0, 0, 0.2, 1);        /* small UI state changes */
--ease-overshoot: cubic-bezier(0.3, 2, 0.5, 1);      /* pop; sparingly */
--ease-dramatic:  cubic-bezier(0.53, -0.01, 0.17, 1);/* long scroll-linked moves */
--ease-in-out:    cubic-bezier(0.42, 0, 0.58, 1);    /* symmetric loops */
```

`--ease-standard` is symmetric-ish and used for most transitions.
`--ease-out-soft` starts instantly and settles — it is what makes revealed
content feel like it was already there rather than animating in.
`--ease-overshoot` has a control point above 1, so it overshoots and settles;
Apple uses it on small playful elements, never on a section.

## Durations

`250ms` default · `100ms` hover · `400ms` section reveal · `160ms` / `200ms`
small moves · `850ms` large scroll-linked moves.

Hover feedback is always the fastest thing on the page. A hover that takes
250ms feels broken; one that takes 100ms feels instant but not abrupt.

## The reveal pattern

Content starts hidden, gets an "enhanced" class when it enters the viewport,
and transitions. The essential detail is that the *initial* state is applied by
JS, not by CSS — so with JS disabled the content is simply visible:

```css
.reveal--initial { opacity: 0; transform: translateY(30px); }
.reveal--active  { opacity: 1; transform: none;
                   transition: opacity 400ms var(--ease-out-soft),
                               transform 400ms var(--ease-out-soft); }
```

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.replace("reveal--initial", "reveal--active");
    io.unobserve(e.target);
  }
}, { rootMargin: "0px 0px -15% 0px" });

for (const el of document.querySelectorAll("[data-reveal]")) {
  el.classList.add("reveal--initial");   // only once JS is confirmed running
  io.observe(el);
}
```

Reveal **once** and unobserve. Apple never re-hides content you scroll back to.

The `-15%` bottom margin means the element reveals slightly *before* it reaches
the bottom edge, so it has finished animating by the time it is properly in
view. Revealing exactly at the edge is what makes a page feel laggy.

## Staggering

Children of a revealed group animate in sequence by index, via a CSS variable
set on each child:

```css
.stagger-item { transition-delay: calc(var(--i) * 60ms); }
```

```js
group.querySelectorAll(".stagger-item").forEach((el, i) => el.style.setProperty("--i", i));
```

60–80ms per step. Beyond about six items the total delay becomes noticeable —
cap the multiplier: `calc(min(var(--i), 6) * 60ms)`.

## Scroll-linked video

Apple's signature hero effect is a muted inline video whose *currentTime* is
driven by scroll position, so the product animates as you scroll:

```js
const v = document.querySelector("video");
v.muted = true; v.playsInline = true; v.preload = "auto";

let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    if (v.duration) v.currentTime = p * v.duration;
    ticking = false;
  });
}, { passive: true });
```

Requirements that are easy to miss:
- `muted` and `playsInline`, or mobile browsers refuse to render it inline.
- Encode with a **short GOP** (keyframe every ~0.5s). Seeking to an arbitrary
  `currentTime` decodes from the nearest keyframe; a default 250-frame GOP makes
  scrubbing visibly stutter. Apple ships roughly `-g 75` at CRF 30, no audio.
- `-movflags +faststart` so the moov atom is first and the video is seekable
  before it has fully downloaded.
- Always `{ passive: true }` on the scroll listener, and always coalesce into
  `requestAnimationFrame` — one `currentTime` write per frame, never per event.

## Parallax and scroll-linked sections

Apple's parallax is **CSS `position: sticky` plus a spacer**, not a transform
driven by a scroll handler. One element pins to the viewport while a sibling
supplies the scroll distance during which it stays pinned. Nothing moves per
scroll event, so it never jitters and costs nothing on the main thread.

The pattern, as it ships:

```css
.section-hero {
  --scroll-duration: 250vh;          /* how long the pinned state lasts */
}
.section-hero .sticky-container {
  min-height: var(--scroll-duration);
}
.section-hero .sticky-content {
  position: sticky;
  top: 0;
  height: 100vh;
}
```

```html
<section class="section-hero">
  <div class="sticky-container">
    <div class="sticky-content"><!-- pinned while the container scrolls past --></div>
  </div>
</section>
```

`--scroll-duration` is the only knob. Measured values on apple.com:
`250vh` and `320vh` for long product sequences, `200vh` for a two-up compare,
and `300px` for a short hero settle. Phone values are smaller than desktop ones
— step it down in the media query rather than letting a `vh` figure stand.

### Layer speed, without JS

To make pinned content drift *slower* than the page (the parallax read), give it
a negative top margin proportional to the same variable:

```css
.section-hero .sticky-content {
  position: sticky;
  top: 0;
  min-height: 100vh;
  margin-top: calc(var(--scroll-duration) * -0.65);
}
.section-hero .scroll-duration { height: var(--scroll-duration); }
```

The `-0.65` is the speed: the layer travels 35% of the page's scroll distance.
Apple ships exactly `-0.65` on its privacy hero. Lower magnitude = closer to
page speed. Keep every layer on one shared `--scroll-duration` so they stay in
proportion when the value changes.

### The enhancement gate

The non-obvious part: **the whole scroll-linked layout is gated behind a class
on `<html>` that JS adds only after feature tests pass.** Every rule above is
written `html.enhance-xp .section-hero .sticky-content { … }`. Without the
class, the section is an ordinary stacked block — no pin, no spacer height, no
missing content.

Apple's own condition, decompiled from its shipped head script:

```js
const enhance =
  !prefersReducedMotion &&
  !isAndroid && !isLegacyEdge && !isBelowIOS13 &&   // known-janky engines
  CSS.supports("position", "sticky") &&
  CSS.supports("--a", "0") &&
  matchMedia(heightRange).matches;                  // viewport tall enough

if (enhance) document.documentElement.classList.add("enhance-xp");
```

`heightRange` is read out of a CSS custom property, not hard-coded in the
script — so the viewport range that gets the effect lives next to the CSS it
governs:

```css
:root { --enhanced-media-query: "(min-height: 500px) and (max-height: 1500px)"; }
@media (max-width: 734px) {
  :root { --enhanced-media-query: "(min-height: 415px) and (max-height: 850px)"; }
}
```

```js
const heightRange = getComputedStyle(document.documentElement)
  .getPropertyValue("--enhanced-media-query").trim().replace(/^"|"$/g, "");
```

A sticky sequence that needs 250vh of scroll is wrong on a 380px-tall window and
wrong on a 2000px one. Apple simply does not run it there. Copy the gate, not
just the sticky rules — it is what stops the effect from being a liability.

`prefers-reduced-motion` is inside the gate, so reduced motion gets the plain
stacked section rather than a retimed version of the pinned one.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

For scroll-linked video, check `matchMedia("(prefers-reduced-motion: reduce)")`
and show a static poster frame instead of attaching the scroll handler.

## Never animate the page into unusability

Content hidden by JS-driven reveal must be visible if the JS does not run. Set
the initial hidden state *from JS*, as shown above. If you set `opacity: 0` in a
stylesheet and rely on script to undo it, a single script error paints a blank
white page — this is exactly how apple.com itself fails when its analytics
bundle is unavailable.
