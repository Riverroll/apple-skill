# On dark

Apple's own pages are light with dark *sections*. A site that is dark all the
way through is a different problem, and most of what goes wrong is not taste —
it is that four of the system's habits invert and one of them silently breaks.

## The surfaces

Apple's dark values, measured:

```
--surface        #000       pure black, not a dark grey
--surface-alt    #1d1d1f    the near neighbour
--ink            #f5f5f7    primary
--ink-secondary  #a1a1a6
--ink-muted      #86868b    supporting copy on dark
```

Pure black is deliberate. Apple's dark moments are full-bleed and usually carry
a product shot with its own black background, so any grey would show the seam.
A dark *site*, as opposed to a dark section, usually wants a near-black with a
little warmth or coolness in it — `#0b0f12`, `#14110e` — because a full page of
`#000` with no photography on it reads as a void rather than a choice. Either
way the rule that transfers is the **size of the step**: alt surface sits about
1.05–1.15:1 from the base, barely a step, never a second theme.

## Alpha ink is a trap on dark

`rgba(255,255,255,0.6)` looks like one ink step. It is not — it is a step
*relative to whatever is behind it*, and it multiplies when nested:

```html
<div class="text-white/60">            <!-- 60% -->
  <span class="text-white/60">…</span> <!-- still 60%: colour does not inherit multiplicatively -->
</div>

<div style="opacity: 0.6">             <!-- but THIS does -->
  <span style="opacity: 0.6">…</span>  <!-- 36% of the original -->
</div>
```

The first is safe, the second is the bug. Any component that fades itself in
with `opacity` and contains text already set at 60% ships that text at 36%,
which is below AA and invisible on a phone outdoors. Reveal animations are
where this lands: a section fades in at `opacity: 0 -> 1`, and during the
transition every ink step in it is wrong. That is fine for 400ms; it is not
fine if the reveal never completes because the observer never fired.

Prefer resolving the three ink steps to **solid colours** on dark, or to
`color-mix(in srgb, var(--ink) 66%, var(--surface))`. They then behave like
paint instead of like glass, they survive nesting, and the audit can check
their contrast honestly.

## Contrast inverts, and so does the comfortable maximum

On light, you push body text toward maximum contrast — `#1d1d1f` on `#fff` is
about 16:1 and it reads beautifully.

On dark, maximum contrast is *harsh*. Pure `#fff` on `#000` is 21:1 and it
glares, haloes on low-quality panels, and makes long paragraphs physically
tiring. Apple never does it: supporting copy on its black sections is
`#86868b`, about 5:1. Headlines take `#f5f5f7`, not `#fff`.

The floor still applies — 4.5:1 for body, 3:1 for large text. The change is
that there is now a sensible ceiling too, somewhere around 12:1 for anything
longer than a headline.

## Elevation stops working

A shadow on a dark surface does nothing — there is nothing darker to cast onto.
Everything that used a shadow to say "this is above that" needs another signal:

```css
/* light: elevation by shadow */
.card { background: #fff; box-shadow: 0 2px 8px rgb(0 0 0 / 0.08); }

/* dark: elevation by surface step plus a hairline */
.card { background: var(--surface-alt); border: 1px solid rgb(245 245 247 / 0.10); }
```

The hairline carries most of it. `rgb(255 255 255 / 0.10)` on dark is the
visual equivalent of `rgb(0 0 0 / 0.08)` on light. Going past about 0.16 turns
a hairline into a drawn box, which is the thing Apple avoids — it separates by
surface and spacing, not by outlines.

Glows are the dark-site equivalent of shadows and they are fine, but they
belong to the decoration layer: behind the content, blurred past recognition,
never crossing the copy column.

## The accent moves

A hue that passes on white can disappear on black, and the reverse. Apple's own
two blues, measured:

| | on `#fff` | on `#000` |
|---|---|---|
| `#06c` — the link blue on light | **17.3:1** | **1.2:1** |
| `#2997ff` — the blue it uses on dark | 3.0:1 | **7.0:1** |

`#06c` is not merely thin on black, it is gone. And `#2997ff` fails AA for
small text on white. Neither is a worse colour than the other; they are the
same decision made for two different backgrounds.

Give the accent two values and switch them with the surface:

```css
:root            { --accent: #0071e3; --on-accent: #fff; }
:root[data-dark] { --accent: #2997ff; --on-accent: #00172e; }
```

`#0071e3` is the exception that proves the point — 4.7:1 on white and 4.5:1 on
black, which is why it is the one Apple uses for buttons that appear on both.
A mid-luminance accent survives either background; anything near the ends of
the range needs a pair.

Then check `--on-accent` both ways. A light accent needs **dark** text on it:
white on a teal like `#2dd4bf` is 1.9:1 and unreadable, black on it is 11.3:1.
This is the step people skip, and the audit catches it as a contrast failure on
the primary button.

## Images and video need art direction, not just a filter

A bright photograph dropped on a black page is a hole punched in the page. The
fixes, in order of how well they work:

1. Shoot or select with a dark background in the first place — this is what
   Apple does, and it is why its product shots sit on black so cleanly.
2. A gradient scrim from the surface colour into the image edge, so the frame
   dissolves instead of ending.
3. A rounded container at `--radius-card`, which turns the hole into an object.

What does not work: lowering the image's opacity, or a global `filter:
brightness(0.8)`. Both make the photograph worse to read while still leaving
the luminance mismatch.

## What stays the same

The type scale, the tracking table, the em rhythm, the section padding ladder,
the easing curves, the breakpoints and the parallax technique are all unchanged
on dark. Only colour behaviour inverts. If a dark site feels wrong after a
pass, the problem is nearly always in this file, not in the spacing.
