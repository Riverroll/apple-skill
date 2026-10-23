# Moving pictures

A page where nothing moves reads as a draft. A page where everything moves
reads as a toy. Apple's unit of motion is narrow and specific: **a three-second
clip, silent, art-directed per breakpoint, that plays once as you arrive at
it** — and a photograph underneath it that is good enough to ship alone.

Everything below is measured off apple.com's own shipped assets and scripts,
not inferred. Where this file contradicts older advice about scroll-scrubbing a
video with `currentTime`, this file is right: see **Do not scrub these clips**.

## What ships, exactly

One component, `anim/highlights-display/`, as served:

| file | pixels | aspect | bytes | bitrate |
|---|---|---|---|---|
| `small.mp4` | 420 × 480 | 0.88 — portrait | 97 KB | 261 kbps |
| `small_2x.mp4` | 840 × 960 | 0.88 | 284 KB | 770 kbps |
| `medium.mp4` | 934 × 576 | 1.62 | 232 KB | 629 kbps |
| `medium_2x.mp4` | 1868 × 1152 | 1.62 | 747 KB | 2.0 Mbps |
| `large.mp4` | 1260 × 612 | 2.06 — cinematic | 260 KB | 705 kbps |
| `large_2x.mp4` | 2520 × 1224 | 2.06 | 825 KB | 2.2 Mbps |

Constant across all six, and across every `anim/` directory measured:

- **30 fps**, h264 High profile, `yuv420p`, `moov` atom first (faststart).
- **No audio stream at all** — not a silent track, no track.
- **3.00s**. Across 2026 product pages the range is 1.8s–5.5s; the two outliers
  are editorial pieces at 13.5s and 42s.
- **One keyframe.** The entire clip is a single GOP.
- `large` is **1260px wide** on every page sampled. That is the number to build
  to, not 1920.

The whole component costs 260 KB on a desktop 1× screen. A single hero
photograph often costs more. Short beats clever.

## Art-direct the crop. Never letterbox.

The six files above are not one render at three sizes. The phone gets a
**portrait** 0.88 crop, the tablet a 1.62, the desktop a 2.06. Same three
seconds, recomposed for the slot it lands in.

This single decision is most of the difference between a page that looks made
and a page that looks assembled. A 16:9 clip pillarboxed into a phone slot
reads as amateur no matter how good the footage is, because the subject ends up
small and centred in a letterbox while the layout around it is full-bleed.

Crop so the subject fills the slot at every width, and accept that this means
re-cutting the clip three times.

## The four-layer stack

Apple never ships a bare `<video>`. The media sits in a CSS grid where every
layer occupies the same cell:

```html
<div class="video-element-stack" role="img"
     aria-label="A close-up of the device, closed, opening to landscape to reveal the inner display">
  <video class="positioned-media-element" preload="none" muted playsinline
         data-inline-media
         data-inline-media-basepath="/media/highlights-display/"></video>
  <picture class="positioned-media-element start-frame" data-lazy>
    <source media="(min-width: 780px)" srcset="…/start-large.webp 1x, …/start-large_2x.webp 2x">
    <img src="…/start-small.webp" alt="">
  </picture>
</div>
```

```css
.video-element-stack { display: grid; }
.positioned-media-element { grid-area: 1 / 1; width: 100%; height: 100%; }
```

Those are Apple's own class names, kept here so the markup above matches what
you will find in their page source. `assets/apple-base.css` ships the same
contract under shorter ones — `.media-stack`, `.media-layer`, `.media-still`,
`.media-clip` — along with the crossfade, the open panel and the measured
timing tokens, so a new page gets them without copying from this file.

- `grid-area: 1 / 1` on every layer, not `position: absolute`. The stack keeps
  the intrinsic height of its content, so the tile does not collapse before the
  video loads.
- A hero usually carries a **third layer, the end frame** — the clip's last
  frame — so a clip that unloads after playing does not snap back to frame 0.
  See **The end frame** below.
- The **start-frame is a `<picture>`, not the `poster` attribute.** `poster`
  takes one URL and cannot be art-directed; a `<picture>` gets the same
  per-breakpoint crops as the clip. Frame 0 of the clip, exported as a still.
- **`object-fit: cover` goes on the layer itself, not only inside it.** A
  `<video>` *is* a layer; an `<img>` sits inside a `<picture>` layer. A rule
  written as `.layer img, .layer video` misses the video entirely, and a 2.06
  clip then sits in bars inside a 1.90 slot. The audit checks for this at every
  width.
- **The accessible name lives on the stack**, with `role="img"` and an
  `aria-label` that describes *what happens* in a sentence. The `<video>` and
  the `<img>` are both silent to assistive tech — one name for the whole thing.
  A clip is a picture that moves, so describe it like a picture.

## The source ladder is chosen by media query, not `srcset`

`<video>` has no `srcset`. Apple's loader watches `matchMedia` and writes `src`:

```js
const BREAKPOINTS = { small: 0, medium: 570, large: 780, xlarge: 1280 };
const name = pick(BREAKPOINTS) + (devicePixelRatio > 1 ? "_2x" : "");
video.src = `${basePath}${name}.mp4`;
```

Measured facts about this loader:

- The media breakpoints are **570 / 780 / 1280** — they are *not* the layout
  breakpoints (734 / 1068 / 1440). Media switches earlier than layout does.
- `_2x` is selected on `devicePixelRatio > 1` alone. No network check.
- On a breakpoint change mid-playback it reloads as
  `` `${src}#t=${currentTime}` `` and resumes if it was playing. The `#t=`
  media fragment is what keeps a resize from restarting the clip.
- `src=""` in the markup and `preload="none"`. Nothing is fetched until the
  scroll window opens, so a page with fourteen clips downloads none of them on
  load.

## When it downloads, and when it plays

Two scroll windows, both measured from the shipped defaults:

| window | start | end |
|---|---|---|
| download | `top − 200vh` | `bottom + 100vh` |
| play | `top − 100vh` | `bottom` |

So the file begins downloading two viewports before you can see it, and
playback starts one viewport before. By the time the clip is on screen it is
mid-motion, not starting from frame 0 — which is exactly why Apple's pages feel
alive rather than feeling like a row of players waiting to be triggered.

Behaviour at the edges, as shipped:

- `pauseOnExit` defaults to **false**. A clip that started keeps playing to the
  end even once you have scrolled past it. Pausing on exit is what produces the
  half-finished frames you land on when scrolling back.
- `resetOnExit` defaults to **false**. It ends where it ended.
- `unloadAtEnd` is opt-in per element, used on the hero: free the buffer once
  the clip has played, because that one is the biggest file on the page.
- **Load timeout: 30s default**, and hero elements set it to 3s. On timeout the
  loader destroys the media *and removes the `<video>` element from the DOM*.
  The start-frame is already underneath it, so a slow connection gets a
  photograph — never a spinner, never an empty box.

## Reduced motion means a photograph, not a paused video

```css
html.reduced-motion .video-element-stack { display: none; visibility: hidden; }
html.no-js .video-element-stack          { display: none; visibility: hidden; }
```

With `prefers-reduced-motion: reduce` the play plugin **returns before
registering anything**. The clip is never fetched and never plays; the stack is
removed from the layout and a still is loaded in its place. Same for `no-js`.

Apple also uses a CSS custom property as the switch for *which* still gets
fetched, read back by the lazy-loader:

```css
.inline-media-container:not(.fallback) .start-frame        { --load-static-image: true; }
html.reduced-motion .inline-media-container .fallback-frame { --load-static-image: true; }
```

CSS decides, JS obeys. The value of the pattern is that the decision lives with
the media queries that already know the viewport, not in a second copy of the
breakpoint logic in script.

## The whole thing without the framework

```js
const MEDIA_BP = { small: 0, medium: 570, large: 780, xlarge: 1280 };
const still = matchMedia("(prefers-reduced-motion: reduce)");

function pick() {
  let name = "small";
  for (const [k, v] of Object.entries(MEDIA_BP)) if (innerWidth >= v) name = k;
  return name + (devicePixelRatio > 1 ? "_2x" : "");
}

for (const v of document.querySelectorAll("video[data-basepath]")) {
  if (still.matches) { v.closest(".video-element-stack").hidden = true; continue; }
  const stack = v.closest(".video-element-stack");

  // download one-and-a-half viewports early, play half a viewport early
  const load = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    v.src = `${v.dataset.basepath}${pick()}.mp4`;
    const bail = setTimeout(() => { v.remove(); }, 3000);   // slow net: keep the still
    v.addEventListener("loadeddata", () => clearTimeout(bail), { once: true });
    load.disconnect();
  }, { rootMargin: "150% 0px" });

  const play = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) v.play().catch(() => {});          // never pause on exit
  }, { rootMargin: "50% 0px" });

  load.observe(stack); play.observe(stack);
}
```

Thirty lines, no dependency, and it reproduces the shipped behaviour that
matters: lazy, breakpoint-aware, plays early, keeps playing, degrades to a
photograph. `rootMargin` in percent is the honest approximation of `− 200vh`.

## Do not scrub these clips

A clip with one keyframe cannot be seeked. Writing `video.currentTime` on it
forces a decode from frame 0 every time, which is why hand-rolled
"scroll-scrubbed video" stutters and heats the laptop.

Apple's product clips are **play-once on approach**, not scrubbed. Scrubbing is
a different technique with a different encode:

- scrub-encoded video needs a keyframe every ~0.5s (`-g 15` at 30fps), which
  costs roughly 3–5× the bytes of the same clip at one GOP;
- one `currentTime` write per `requestAnimationFrame`, never per scroll event;
- and it is still the heaviest thing on the page.

Reach for the pinned-section technique in `motion.md` first. If the effect is
"the product rotates as I scroll", that is a scrub and it needs the dense
encode. If the effect is "something happened when I got here", it is a clip,
and a clip is a tenth of the work.

## Encoding

Three crops, two densities each. From one master (ProRes, PNG sequence, or any
high-bitrate source):

```sh
# large — 1260×612, the number apple.com ships
ffmpeg -i master.mov -an -vf "fps=30,crop=ih*2.06:ih,scale=1260:612:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 25 -g 300 \
  -movflags +faststart large.mp4

# large_2x — exactly double, same crop
ffmpeg -i master.mov -an -vf "fps=30,crop=ih*2.06:ih,scale=2520:1224:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -g 300 \
  -movflags +faststart large_2x.mp4

# medium — 934×576 at 1.62, a different crop of the same action
ffmpeg -i master.mov -an -vf "fps=30,crop=ih*1.62:ih,scale=934:576:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 25 -g 300 \
  -movflags +faststart medium.mp4

# small — 420×480, portrait. Re-frame on the subject, do not pillarbox.
ffmpeg -i master.mov -an -vf "fps=30,crop=ih*0.875:ih,scale=420:480:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 26 -g 300 \
  -movflags +faststart small.mp4

# the start frame, one per crop — this is what ships if anything goes wrong
ffmpeg -i large.mp4 -frames:v 1 -q:v 2 start-large.webp
```

- `-an` drops audio entirely, which is what the measured files have.
- `-g 300` on a 90-frame clip gives the single GOP Apple ships. Raise it to
  `-g 15` only for a clip you intend to scrub.
- `-crf 23…26` lands in the measured 0.26–2.2 Mbps band at these sizes. Check
  the result: a `large.mp4` over ~600 KB for three seconds means the footage
  has noise or film grain that h264 is spending its budget on.
- `-movflags +faststart` or the file is not playable until fully downloaded.

Budget: **under 400 KB per 1× clip, under 1 MB at 2×.** A page carrying ten
clips at those sizes is lighter than one unoptimised hero photograph.

## The still is the LCP element, so it gets the priority

The clip is lazy by design, which means **the photograph underneath it is what
the browser paints first and what Largest Contentful Paint measures.** Treat it
as the page's most important image, and the clip as something that arrives
afterwards.

What the hero actually ships, measured:

| | pixels | bytes |
|---|---|---|
| `start_small.jpg` | 740 × 570 | 66 KB |
| `start_small_2x.jpg` | 1480 × 1140 | 147 KB |
| `start_medium.jpg` / `start_large.jpg` | 966 × 640 | 92 / 95 KB |
| `start_medium_2x.jpg` | 1932 × 1280 | 194 KB |

- The still's dimensions **match the clip's exactly** — it is frame 0 at the
  same size, not a separately art-directed photograph. The hero clip on that
  page is 966 × 640; so is its still.
- Three `<source>` entries, two actual renders: `medium` and `large` are the
  same file. Ship a render per *distinct* size, not per breakpoint name.
- They are **JPEG with a `1x, 2x` srcset**, not WebP. Use WebP or AVIF if your
  floor allows it — the point is the ladder, not the codec.
- **The stills switch on the layout breakpoints (`max-width: 734px`), while
  the clip switches on the media breakpoints (570 / 780 / 1280).** Two
  different ladders in the same component, because a `<picture>` can use the
  layout's own query and a `<video>` cannot use `srcset` at all.

Priority, as shipped on a product page carrying 197 `<picture>` elements:

```html
<img src="hero/start-small.jpg" alt="" fetchpriority="high">
```

- **Exactly three images get `fetchpriority="high"`**: the hero start frame,
  the hero end frame, and the hero still. Everything else takes the default.
  More than a handful of high-priority images is the same as none.
- There is **no `<link rel="preload">` anywhere in the head** — not one, on any
  page measured. A `fetchpriority` attribute on the element that is already in
  the markup does the same job without a second URL to keep in sync.
- There is **no `loading="lazy"` either**, because their own scroll windows
  already hold everything back. Without such a system, use the native
  attributes: `loading="lazy" decoding="async"` on everything below the fold,
  and neither on the hero.
- The value must be exactly `high`. Apple's own shipped markup carries
  `fetchpriority="high,"` with a trailing comma, which is invalid and silently
  falls back to `auto` — a reminder to check what the attribute actually
  parses as rather than that it is present.

### The end frame

The hero ships a *third* picture: the clip's last frame, as its own ladder
(91–361 KB). The clip plays once, the end frame holds the state it finished in,
and the video element unloads itself (`unloadAtEnd`) to give the buffer back.
Without an end frame, a clip that unloads snaps back to frame 0 — the product
closes again after you watched it open.

## Transitions between images

Four techniques, all measured from shipped CSS. Each is driven by **one scalar**
— a custom property — so the motion can be reduced to zero in one place.

### The asymmetric crossfade

The outgoing image leaves faster than the incoming one arrives, with a hold
between them:

```css
.frame {
  transition:
    opacity var(--fade-out, 300ms) ease-in-out var(--fade-out-delay, 0ms),
    display  var(--fade-in, 600ms) ease-in-out var(--fade-in-delay, 250ms);
  transition-behavior: allow-discrete;    /* so display can animate */
}
.frame[hidden] { display: none; opacity: 0; }
```

Measured: **out 300ms / delay 0, in 600ms / delay 250ms.** The 250ms hold is
the whole effect. A symmetric 300/300 crossfade produces a muddy double
exposure at the midpoint; staggering it reads as one image replacing another.

`transition-behavior: allow-discrete` lets the outgoing frame leave the layout
instead of sitting invisible and eating clicks. Supporting browsers get the
fade, others get an instant swap — both correct.

### The clip-path open

One scalar drives inset and corner radius together, so a card "opens" into a
full-bleed panel as it is scrolled:

```css
.panel {
  --open: 0;                                    /* 0 card · 1 full bleed */
  clip-path: inset(
    0 calc((1 - var(--open)) * 6.25vw)
    round calc((1 - var(--open)) * var(--radius-tile))
  );
}
```

Shipped values: `6.25vw` of side inset, the tile radius, and the property set
to a flat `1` or `0` on breakpoints where the effect does not apply — the
effect disables itself by setting its own scalar, with no second rule to keep
in sync.

### Progress-driven blur, with the absolute-value trick

CSS has no `abs()` in wide circulation yet. Apple's shipped idiom:

```css
.layer {
  --abs: max(var(--progress), -1 * var(--progress));
  backdrop-filter: blur(calc(var(--blur-amount) * (1 - var(--abs))));
}
```

`--progress` runs −1 → 0 → 1 across the transition and the layer is sharpest at
centre. `--blur-amount: 20px` as shipped.

### The staggered reveal

The canonical tokens, identical on all seven 2026 product pages that use them:

```css
[data-staggered] {
  --staggered-delay: 0.15s;              /* per item */
  --staggered-opacity-duration: 0.9s;
  --staggered-translate-y: 30px;
  --staggered-translate-y-duration: 0.7s;
}
[data-staggered-item] {
  opacity: 0;
  translate: 0 var(--staggered-translate-y);
  transition:
    opacity var(--staggered-opacity-duration) var(--ease-out-soft)
      calc(var(--i) * var(--staggered-delay)),
    translate var(--staggered-translate-y-duration) var(--ease-out-soft)
      calc(var(--i) * var(--staggered-delay));
}
[data-staggered].is-in [data-staggered-item] { opacity: 1; translate: none; }
```

Note what is being said here: **the fade is longer than the move** (0.9s vs
0.7s), so the element has arrived in place while still settling in opacity. And
the stagger is **150ms**, slower than the 60–80ms commonly recommended — at
60ms a six-item row reads as one block flashing in; at 150ms you see it deal
the items out. Cap the multiplier past six items, or the last one arrives a
second late.

## Scroll windows are declared, not computed

Apple's scroll system takes windows as an expression over element edges, which
is worth copying as a way of *thinking* even without their framework:

```
start: "a0t - 100vh"     end: "a1b + 50vh"     anchors: [".hero", "#gallery"]
```

- `t` `b` `h` — the target's own top, bottom, height.
- `a0t` `a0b` `a0h` — anchor 0's top, bottom, height; `a1…` the second anchor.
- units `vh` `%` `px`, arithmetic `+ − *`, and `var(--token)` inline.
- `breakpointMask: "S"` restricts a window to small screens; `disabledWhen:
  ["reduced-motion"]` removes it.

The lesson is that every animation on the page states its own window against
named edges, rather than each component inventing a threshold. Two anchors and
an offset in `vh` express "while the hero is leaving and the gallery has not
arrived" without a single magic pixel value.

## Apple ships no scroll-driven CSS

Across **739 stylesheets** in the mirror: `animation-timeline` 0 occurrences,
`view-timeline` 0, `scroll()` 0, `view()` 0. Every scroll-linked effect on
apple.com is their JS writing custom properties, plus `position: sticky`.

That is a statement about their support floor, not about the technique. If your
floor allows it, scroll-driven CSS does the same job with no main-thread work:

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    [data-staggered-item] {
      animation: rise 0.9s var(--ease-out-soft) both;
      animation-timeline: view();
      animation-range: entry 0% entry 60%;
    }
  }
}
```

Use it as an enhancement over a visible resting state, the same way the
`enhance-xp` gate works in `motion.md` — never as the thing that makes content
appear, or non-supporting browsers get a blank page.

## Where footage comes from

Order of preference, same logic as `imagery.md`: licence first, quality second.

1. **Your own capture.** A 3-second clip of the actual product beats any
   library. A phone at 4K/60 downsampled to 1260×612 looks correct.
2. **Coverr** (coverr.co) and **Mixkit** (mixkit.co) — free for commercial use,
   no attribution, short loops shot for exactly this slot. The best fit for
   abstract texture: liquid, cloth, light, machinery.
3. **Pexels Video** — free, commercial use allowed, API key for search.
   Attribution appreciated, not required. Larger catalogue, more stock-looking.
4. **Wikimedia Commons / NASA / USGS** — public domain and documentary. Thin on
   product footage, strong on nature, science and archive material. Check each
   file: Commons mixes CC BY-SA in, and a re-crop is a derivative work.
5. **A clip you make from a still.** A slow push on a good photograph
   (`zoompan`) is honest motion and better than a static tile:

   ```sh
   ffmpeg -loop 1 -i photo.jpg -t 3 -an \
     -vf "scale=3780:-1,zoompan=z='1+0.0012*on':d=90:s=1260x612:fps=30,format=yuv420p" \
     -c:v libx264 -profile:v high -crf 25 -g 300 -movflags +faststart large.mp4
   ```

   Scale up 3× before `zoompan` or the pan samples a too-small source and
   crawls. `d=90` at `fps=30` is the three seconds; `0.0012` per frame lands at
   **1.11× total**. Keep it under about 1.15× — past that it reads as a
   screensaver.

`tools/make-clip.sh <source> <out-dir>` in this repo builds the whole ladder —
six files and the three stills — from either a master or a photograph, with the
crops and CRFs above. `example/motion/` is built with it.

Never a watermarked preview, never a clip lifted from a product page — a
competitor's hero video in your tile is the most visible possible failure.

## What goes wrong

| symptom | cause |
|---|---|
| clip stutters while scrolling | scrubbing `currentTime` on a single-keyframe file |
| black box on mobile | missing `muted` or `playsinline`; iOS refuses inline |
| empty box on a slow connection | no start-frame under the video, or no load timeout |
| tile jumps when media arrives | layers absolutely positioned, so the stack had no height |
| subject tiny on phone | one 16:9 render letterboxed instead of a portrait crop |
| bars down both sides of the clip | `object-fit` set on the layer's children but not on the layer, so the `<video>` never got it |
| page weighs 40 MB | `preload="auto"`, or 2× files served to 1× screens |
| motion loops forever at the edge of vision | `loop` on a narrative clip; loop only abstract texture |
| screen reader says "video" | name on the `<video>` instead of `role="img"` on the stack |
| reduced-motion users see a frozen first frame | video hidden but not replaced by the still |
