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
