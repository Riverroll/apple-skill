# Motion

## Curves

```css
--ease-standard:  cubic-bezier(0.4, 0, 0.6, 1);      /* default transition */
--ease-out-soft:  cubic-bezier(0, 0, 0.5, 1);        /* entrances, reveals */
--ease-out-sharp: cubic-bezier(0, 0, 0.2, 1);        /* small UI state changes */
--ease-overshoot: cubic-bezier(0.3, 2, 0.5, 1);      /* pop; sparingly */
--ease-dramatic:  cubic-bezier(0.53, -0.01, 0.17, 1);/* long scroll-linked moves */
--ease-in-out:    cubic-bezier(0.42, 0, 0.58, 1);    /* symmetric loops */
--ease-product:   cubic-bezier(0.42, 0, 0.1, 1);     /* 2026 product pages */
```

Measured by occurrence across 739 stylesheets in the mirror: `--ease-standard`
is **38%** of every `cubic-bezier` on the site and `--ease-out-sharp` is **19%**
— between them, more than half of all motion. `--ease-product` does not appear
in that ranking at all, yet it is the most-used curve on the 2026 product pages
specifically: a long slow-out that only reads well over 400ms or more. Use it
for section-scale moves, not for UI.

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
.stagger-item { transition-delay: calc(var(--i) * 150ms); }
```

```js
group.querySelectorAll(".stagger-item").forEach((el, i) => el.style.setProperty("--i", i));
```

**150ms per step** for a reveal of content — that is the shipped value, identical
on all seven 2026 product pages that use the component, alongside a 0.9s opacity
and a 0.7s 30px rise. At 60ms a six-item row reads as one block flashing in; at
150ms you see the items dealt out one at a time.

60–80ms is the right step for a *small UI list* — menu items, a dropdown, chips —
where the whole sequence has to finish inside a single interaction.

Beyond about six items the total delay becomes noticeable either way — cap the
multiplier: `calc(min(var(--i), 6) * 150ms)`. Full tokens in
`references/media.md`.

## Video — read `references/media.md`

The signature effect is **not** a scroll-scrubbed video. Measured across the
2026 product pages, Apple's unit of motion is a 3-second silent clip,
single-GOP, re-cropped per breakpoint, that starts playing one viewport before
it is on screen and is never paused on exit. Scrubbing a clip like that with
`currentTime` is what makes hand-built versions stutter, because a
single-keyframe file decodes from frame 0 on every seek.

`references/media.md` has the whole thing: the measured source ladder, the
four-layer stack with the still underneath, the load and play windows, the
ffmpeg recipes, the reduced-motion path, and the four image-transition
techniques. **Read it before putting any video or image transition on a page.**

Scrubbing remains a real technique for "the product rotates as I scroll", and
it needs its own encode (`-g 15` at 30fps, ~4× the bytes) plus one
`currentTime` write per `requestAnimationFrame`. It is the expensive option;
reach for the pinned section below first.

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

### Four ways a sticky section silently does nothing

Every one of these produces no error and no visible effect, which is why they
cost hours:

1. **An ancestor clips the scroll.** `position: sticky` is inert inside any
   ancestor with `overflow: hidden | auto | scroll | clip` on the scroll axis.
   Decorative blur layers are the usual culprit — a section wraps itself in
   `overflow: hidden` to contain its own glow, and kills every sticky inside it.
   Put the clipping on the decorative layer, not the section.
   `tools/audit.mjs` reports these by name.
2. **The pinned element has no travel.** A sticky element only moves relative to
   its *parent box*. If it is the tallest thing in its row — a photo beside a
   shorter column of text — the parent is exactly as tall as the photo and there
   is nothing to travel through. Either give the parent a spacer, or pin the
   short column and let the long one scroll.
3. **It overlaps what follows.** A sticky element keeps its slot in flow, so
   once that slot scrolls away it visually sits on top of its later siblings.
   A sticky card above other cards in the same column will cover them. Pin the
   whole column, or give the pinned thing a container of its own.
4. **It is taller than the viewport.** Then `top` cannot be honoured in any
   useful way and the element's top edge disappears under whatever is fixed at
   the top of the page. Give it `top: var(--sticky-top)` equal to the global nav
   height, and check that its own content still fits in `100vh` minus that.

Measure rather than guess: `getBoundingClientRect().top` on the pinned element
at several scroll positions tells you exactly where the pin engages and
releases.

```
scrollY 6000 -> top 1023   not yet
scrollY 6600 -> top   64   pinned
scrollY 7200 -> top  -35   released
```

Pinned travel equals `container height - element height`, so a `200vh`
container around a `100vh` element pins for exactly one viewport of scrolling.

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

### Where the copy sits in a pinned section

`.sticky-content` is a **column** flex container. The axis that moves its copy
up and down is therefore `justify-content`, not `align-items` — writing
`align-items: flex-end` there reads like "put it at the bottom" and does
nothing of the sort, leaving the block in the vertical middle.

```css
html.enhance-xp .section-pinned .sticky-content {
  justify-content: flex-end;              /* NOT align-items */
  padding: 0 var(--gutter) 10vh;
}
```

It matters more than a layout nit, because the bottom is where the scrim on a
full-bleed photograph is strongest. Copy stranded in the middle of the frame
sits on the brightest part of the picture with nothing behind it, and the
contrast checks cannot see it — the backdrop is an image. See
`references/composition.md`, "text on a picture is not text on a surface".

## Scroll windows, and how to write them without the framework

Apple's scroll system takes every window as an expression over element edges
rather than a threshold per component:

```
start: "a0t - 100vh"     end: "a1b + 50vh"     anchors: [".hero", "#gallery"]
```

- `t` `b` `h` — the target's own top, bottom, height.
- `a0t` `a0b` `a0h` — anchor 0's top, bottom, height; `a1…` the second anchor.
- units `vh` `%` `px`, arithmetic `+ − *`, and `var(--token)` inline.
- `breakpointMask: "S"` restricts a window to small screens, and
  `disabledWhen: ["reduced-motion"]` removes it.

The shipped defaults, measured: media downloads over `t - 200vh → b + 100vh`,
plays over `t - 100vh → b`, a gallery takes keyboard focus over
`t - 100vh → b + 100%`, and a title image crossfades over
`a0t - 80vh → a0t - 42vh` — 38vh of scroll for one fade.

What is worth copying is the habit: **a window is stated against named edges,
so no component invents a magic pixel value.** Two anchors and an offset in
`vh` express "while the hero is leaving and the gallery has not arrived" with
nothing to retune when the sections change height.

`IntersectionObserver` cannot express that — one element, one root, no
arithmetic. Two anchor edges and a progress value take about fifteen lines:

```js
// progress 0 → 1 between two edges, written to a custom property.
// One rAF per frame regardless of how many windows are registered.
const windows = [];
const edge = (el, which) => {
  const r = el.getBoundingClientRect();
  return which === "t" ? r.top : which === "b" ? r.bottom : r.height;
};
export function scrollWindow({ target, from, to, prop = "--progress" }) {
  windows.push({ target, from, to, prop });
}
let queued = false;
addEventListener("scroll", () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    for (const w of windows) {
      const a = edge(w.from[0], w.from[1]) + (w.from[2] ?? 0) * innerHeight;
      const b = edge(w.to[0], w.to[1]) + (w.to[2] ?? 0) * innerHeight;
      const p = (0 - a) / (b - a || 1);               // 0 when a is at the top edge
      w.target.style.setProperty(w.prop, Math.min(1, Math.max(0, p)).toFixed(3));
    }
  });
}, { passive: true });
```

```js
// "open while the panel is arriving": from one viewport below its own top, to
// 40% up the screen. The third number is in viewports, so it reads the way the
// expression language does: [element, edge, offset-in-vh].
scrollWindow({ target: panel, from: [panel, "t", -1], to: [panel, "t", -0.4], prop: "--open" });
```

`example/motion/` runs exactly this code, so the snippet is the shipped one
rather than an illustration of it.

The CSS then consumes one scalar and the JS never touches a style other than
that property — which is the real reason Apple's version does not jitter.
Register nothing when `prefers-reduced-motion` matches, and set the scalar to
its finished value in CSS instead, exactly as the clip-path open does in
`references/media.md`.

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
