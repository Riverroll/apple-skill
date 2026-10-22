# Where components sit, and how they move

Every number in this file was read out of apple.com's own shipped CSS — the
`--sk-dotnav-*`, `--sk-paddlenav-*` and `--tabnav-*` token blocks. This is the
layer people notice without being able to name: nothing on the page is placed
loosely, and nothing changes state instantly.

## Placement is a small fixed vocabulary

Apple has about six places a component can go. Nothing floats.

```
┌─────────────────────────────────────────────┐
│ global nav      sticky, 48px                │
│ local nav       sticky under it, 52px       │
├──┬───────────────────────────────────────┬──┤
│g │                                       │g │
│u │   content column — 1068px, centered   │u │
│t │                                       │t │
│t │   copy, headlines, CTA rows, tiles    │t │
│e │                                       │e │
│r │                                       │r │
└──┴───────────────────────────────────────┴──┘
   media bands go full-bleed, past the gutters
   paddles live IN the gutter, never over the content
   the dot row sits centered, below the gallery it drives
```

Three rules come out of that:

1. **Copy lives in the column; media ignores it.** A photograph that stops at
   the content edge looks like a placed asset. One that runs to the viewport
   edge looks like the subject of the page. Apple's measured gutter is
   `calc(50% - min(1068px, 87.5%) / 2)`, and the paddle reserve is **90px** with
   **24px** of padding inside it.
2. **Controls sit outside what they control.** Paddles in the gutter, dots
   below, tabs above. A control placed on top of the thing it moves means the
   reader's cursor is covering the content at the moment they change it.
3. **A control over media gets a scrim, not a shadow.** Measured:
   `linear-gradient(0deg, var(--bg), var(--bg) 58%, transparent)` — the surface
   colour dissolving upward, so the control has contrast without a visible box.

## The dot nav, measured

The thing people notice in a carousel and cannot explain. Apple's dots are not
a pagination widget; they are a physical row that compresses.

```css
.dotnav {
  --sk-dotnav-size: 8px;              /* the dot itself                       */
  --sk-dotnav-margin-block: 8px;      /* padding around it, so the TARGET      */
  --sk-dotnav-margin-inline: 8px;     /* is 24x24 around an 8px dot            */
  --sk-dotnav-scale: 1;               /* the dots nearest the current one      */
  --sk-dotnav-scale-2: 0.75;          /* taper instead of disappearing         */
  --sk-dotnav-scale-3: 0.5;
  --sk-dotnav-hover-animation-duration: 120ms;
  --sk-dotnav-variable-duration: 320ms;      /* a slide change                 */
  --sk-dotnav-animation-stagger-duration: 40ms;
  --sk-dotnav-animation-collapse-duration: 380ms;

  /* light */
  --sk-dotnav-background:         rgba(0, 0, 0, 0.42);
  --sk-dotnav-background-hover:   rgba(0, 0, 0, 0.54);
  --sk-dotnav-background-current: rgba(0, 0, 0, 0.80);
  /* dark */
  --sk-dotnav-background:         rgba(255, 255, 255, 0.36);
  --sk-dotnav-background-hover:   rgba(255, 255, 255, 0.48);
  --sk-dotnav-background-current: rgba(255, 255, 255, 0.80);
}
```

Six things in that block are the craft:

**The dot is drawn in `::before`, not on the element.** The `<button>` is
24×24; the circle inside it is 8px. The target is three times the size of the
thing you see, and it costs no layout:

```css
.dotnav-link { display: block; width: 8px; height: 8px;
               padding-block: 8px; padding-inline: 8px; box-sizing: content-box; }
.dotnav-link::before {
  content: ""; position: absolute; border-radius: 999px;
  top: calc(50% - var(--sk-dotnav-size) / 2);
  left: calc(50% - var(--sk-dotnav-size) / 2);
  width: var(--sk-dotnav-size); height: var(--sk-dotnav-size);
  scale: var(--sk-dotnav-scale);
  background: var(--sk-dotnav-background);
  transition: background-color 120ms linear,
              scale 120ms ease-in-out,
              transform 120ms ease-in-out;
}
```

**Nothing is ever fully opaque except the current dot** — and even that is
`0.80`, not `1`. The resting state at `0.42` is the detail that makes the row
read as a hint rather than a control. Pure black dots on a photograph look like
a bug report.

**Hover is 120ms linear; a slide change is 320ms ease-in-out.** Two different
jobs: feedback has to feel instant, a position change has to be followed by the
eye. The same duration for both is the single most common carousel mistake.

**Overflow tapers, it does not paginate.** When there are more slides than fit,
the dots away from the current one shrink instead of vanishing:

```css
.dotnav-truncate-2 { --sk-dotnav-scale: 0.75; }
.dotnav-truncate-3 { --sk-dotnav-scale: 0.50; }
.dotnav-truncate-4,
.dotnav-truncate-hidden { --sk-dotnav-scale: 0.5; --sk-dotnav-size: 0;
                          --sk-dotnav-margin-block: 0; --sk-dotnav-margin-inline: 0;
                          --sk-dotnav-opacity: 0; }
```

A twelve-slide gallery shows five dots at full size and the rest fading to
nothing at the edges, so the row never grows and never jumps. The JS only adds
and removes those classes; every value above is CSS.

**The motion is staggered, not simultaneous.** Apple writes per-position delays
so the row moves like a physical object:

```css
.dotnav-collapse .dotnav-dot-4 ::before,
.dotnav-collapse .dotnav-dot-5 ::before { transition: transform 320ms ease-in-out 60ms; }
.dotnav-collapse .dotnav-dot-6 ::before { transition: opacity 160ms ease-in-out 80ms,
                                                      transform 160ms ease-in-out 80ms; }
.dotnav-collapse .dotnav-dot-7 ::before { transition: opacity 160ms ease-in-out,
                                                      transform 160ms ease-in-out; }
.dotnav-expand   .dotnav-dot-6 ::before { transition: opacity 160ms ease-in-out 120ms,
                                                      transform 120ms ease-in-out 160ms; }
.dotnav-expand   .dotnav-dot-7 ::before { transition: opacity 160ms ease-in-out 200ms,
                                                      transform 160ms ease-in-out 200ms; }
```

40ms between neighbours. It is below the threshold at which anyone could count
it, and above the threshold at which it reads as one rigid block moving.

**The dot you are on is not clickable.**

```css
.dotnav .current .dotnav-link { cursor: default; pointer-events: none; }
```

Obvious and almost never done. Clicking the current dot either does nothing
visible, or re-runs the transition — both feel broken.

**And there is an escape hatch for programmatic jumps:**

```css
.dotnav-stop-transitions .dotnav-link,
.dotnav-stop-transitions .dotnav-link::before { transition: none !important; }
```

When the position changes because the user did something *else* — resized,
deep-linked, hit the end of an autoplay loop — the dots must not animate. The
animation means "you moved this". Add the class, move, remove the class.

## The autoplay dot: a circle that becomes a progress track

This is the one that looks expensive. The current dot morphs into a 32px pill
and fills over the slide's duration:

```css
.dotnav-timed {
  --sk-dotnav-timed-track-width: 32px;
  --sk-dotnav-timed-duration: 3000ms;
  --sk-dotnav-timed-track-color: rgb(0, 0, 0);
  --sk-dotnav-timed-track-background-color: rgba(0, 0, 0, 0.42);
}
.dotnav-timed .dotnav-link { transition: width 250ms linear; }

@keyframes dotnav-timed-dot-expand {
  0%   { left: calc(50% - var(--sk-dotnav-size) / 2); width: 8px; }
  100% { left: calc(50% - 16px);                      width: 32px; }
}
@keyframes dotnav-timed-dot-shrink {
  0%   { left: calc(50% - 16px);                      width: 32px; }
  100% { left: calc(50% - var(--sk-dotnav-size) / 2); width: 8px; }
}
/* the fill, on ::after, so the track and the fill are separate layers */
@keyframes dotnav-timed-animation {
  0%   { width: var(--sk-dotnav-size); }
  100% { width: calc(100% - var(--sk-dotnav-margin-inline) * 2); }
}
.dotnav-timed .dotnav-link::after {
  content: ""; position: absolute; border-radius: 999px;
  inset-block: var(--sk-dotnav-margin-block);
  left: var(--sk-dotnav-margin-inline);
  width: var(--sk-dotnav-size); opacity: 0;
  animation-duration: var(--sk-dotnav-timed-duration);
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
  animation-play-state: paused;        /* JS flips this to running */
}
```

Three details worth copying exactly:

- The expand is **250ms ease-in**, the fill is **linear**. A progress bar that
  eases is lying about time.
- `animation-play-state: paused` in CSS, flipped to `running` by JS. Pausing on
  hover then becomes one property, not a rebuilt timer.
- The track and the fill are `::before` and `::after` on the same button. No
  extra markup, and the two can never desynchronise.

## The paddle nav

```css
.paddlenav {
  --sk-paddlenav-diameter: 36px;
  --sk-paddlenav-arrow-color:        rgba(0, 0, 0, 0.56);
  --sk-paddlenav-arrow-color-hover:  rgba(0, 0, 0, 0.64);
  --sk-paddlenav-background:         transparent;          /* bare over media  */
}
.paddlenav-alpha { --sk-paddlenav-background: rgba(210, 210, 215, 0.64); }
.paddlenav-solid { --sk-paddlenav-background: rgb(232, 232, 237); }

.paddlenav-arrow {
  width: 36px; height: 36px; border-radius: 36px;
  transition: background 100ms linear, color 100ms linear;
}
.paddlenav-arrow svg path { transition: fill 100ms linear; }
.paddlenav-arrow:disabled { pointer-events: none; opacity: 0.42; }
```

The part that matters most:

```css
.with-paddlenav-onhover .paddlenav-arrow {
  opacity: 0;
  transition: background 100ms linear, color 100ms linear, opacity 100ms linear;
}
.with-paddlenav-onhover:hover .paddlenav-arrow:not(.disabled),
.with-paddlenav-onhover   .paddlenav-arrow:focus-visible { opacity: 1; }
```

The arrows are invisible until you hover the gallery — **or until they take
keyboard focus**. Hiding a control on hover without that second selector makes
the component unusable from the keyboard while looking identical in a
screenshot. It is the commonest accessibility bug in a hand-built carousel, and
it is one selector.

Note also that `rgba(...0.56) -> rgba(...0.64)` is the entire hover change: an
8% alpha step. Not a colour change, not a scale, not a shadow.

## The segmented tab control

```css
.tabnav {
  font-size: 14px; line-height: 1.2857742857; letter-spacing: -0.016em; font-weight: 400;
  --tabnav-height: 44px;              /* the outer control                 */
  --tabnav-inner-height: 36px;        /* the pill that slides              */
  --tabnav-platter-padding: 4px;      /* 44 - 36 = 8, so 4 each side       */
  --tabnav-platter-background: rgb(232, 232, 237);
  --tabnav-platter-blur: 20px;
  --tabnav-mask-gradient-width: 22px; /* the edge fade when it scrolls     */
}
.theme-dark .tabnav {
  --tabnav-platter-background: rgb(51, 51, 54);
  --tabnav-item-color: rgb(255, 255, 255);
  --tabnav-item-color-active: rgb(0, 0, 0);   /* inverted, not accented    */
}
```

The active tab is the **inverse** of the platter — black text on a white pill
inside a grey platter — not the accent colour. The accent stays reserved for
actions. And when the strip is scrollable, the 22px edge mask fades the
overflow instead of clipping it, with the fade itself delayed:

```css
.tabnav { transition-property: --tabnav-mask-color-left, --tabnav-mask-color-right;
          transition-duration: 40ms; }
.tabnav:has(.tabnav-paddle-left.tabnav-paddle-hidden)  { transition-delay: 280ms, 0ms; }
.tabnav:has(.tabnav-paddle-right.tabnav-paddle-hidden) { transition-delay: 0ms, 280ms; }
```

A 280ms delay so the mask does not flicker while the paddle is still fading
out. This is the level of care the whole page is made of.

## The rules behind all of it

Strip the specifics and six transferable rules are left:

1. **Four states, always.** Rest, hover, active, disabled — with measured
   values, not guesses. Disabled is `opacity: 0.42` plus
   `pointer-events: none`, every time.
2. **Hover is 100–120ms linear. A state change is 250–320ms ease-in-out.** Two
   jobs, two timings. Never one duration for the whole component.
3. **The current item is inert.** `pointer-events: none` on whatever you are
   already on.
4. **Hidden controls stay focusable.** Anything revealed on hover needs
   `:focus-visible` in the same selector.
5. **Motion is staggered by ~40ms.** Neighbours move in sequence, so a row of
   elements reads as one object with mass rather than a group that teleports.
6. **Every value is a custom property on the component root**, so the dark
   theme is a token block and not a second component. Apple's dark dot nav is
   six lines of overrides.

And one rule about the state change itself: the resting state is quiet. `0.42`
alpha, `transparent` background, `opacity: 0`. Apple's controls are nearly
invisible until you need them, which is why its pages look like photographs
rather than like software.
