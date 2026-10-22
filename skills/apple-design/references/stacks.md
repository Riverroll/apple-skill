# Translating this into a real stack

The audit tells you what is wrong and where. This is how the fix is expressed
in the tool the project actually uses. Nothing here changes the system — it is
the same tokens, the same ladder, the same tracking table.

## Tailwind

Tailwind is where most of this work lands, and it fights three of the rules by
default.

### Its breakpoints are not Apple's

| | Tailwind default | Apple |
|---|---|---|
| phone edge | `sm` 640px | **734px** |
| tablet | `md` 768px | 735–1068px |
| desktop | `lg` 1024px, `xl` 1280px | **1069px** |

A layout built on `md:` switches at 768px, which is 33px past the band Apple's
type scale was measured for — close enough to look almost right and never be
right. Replace them rather than adding to them:

```css
/* Tailwind v4 — app.css */
@theme {
  --breakpoint-*: initial;      /* drop the defaults so nothing switches at 768 */
  --breakpoint-md: 735px;       /* tablet band opens */
  --breakpoint-lg: 1069px;      /* desktop band opens */
  --breakpoint-xl: 1441px;      /* oversized art direction only */
}
```

```js
// Tailwind v3 — tailwind.config.js
module.exports = { theme: { screens: { md: "735px", lg: "1069px", xl: "1441px" } } };
```

Now `md:` and `lg:` mean what the rest of this skill means by them. Phone is
the unprefixed base, which is also the right default order.

### Its opacity modifier is how the ink ladder happens

`text-white/60` is one keystroke, so a page ends up with `/80 /70 /60 /50 /40
/35 /30` and nobody ever decided on them. Name three and use the names:

```css
@theme {
  --color-ink:           #f5f5f7;
  --color-ink-secondary: rgb(245 245 247 / 0.66);
  --color-ink-muted:     rgb(245 245 247 / 0.42);
  --color-surface:       #0b0f12;
  --color-surface-alt:   #121a1f;
  --color-accent:        #2dd4bf;
  --color-on-accent:     #06231f;
}
```

```
text-white/70   ->  text-ink-secondary
text-white/50   ->  text-ink-secondary
text-white/40   ->  text-ink-muted
text-white/35   ->  text-ink-muted
text-white/30   ->  text-ink-muted
text-cyan-400/60, text-violet-400/70, text-pink-400/60  ->  text-ink-muted
```

The last line is the one that matters. A tag coloured per category is not
carrying meaning — collapsing those three to one ink step is most of what the
audit's "accent hues" finding is asking for.

Keep `/10` and `/20` alphas for **borders and fills**, where they are a
surface treatment rather than an ink step: `border-white/10`, `bg-white/5`.

### Its weight scale includes 700, and Apple does not

`font-bold` is 700. Apple ships 400 and 600, with one 700 in the whole measured
set. `font-semibold` is the headline weight. If a headline needs more presence
it gets bigger, not heavier.

### Type goes in as arbitrary values

Tailwind's `text-4xl` is 36px with its own line-height — a scale that is not
this one. Put the measured step in directly:

```html
<!-- section headline: 48px desktop, re-picked to 40px on phone -->
<h2 class="text-[40px] leading-[1.1] tracking-[0em]
           md:text-[48px] md:leading-[1.0834933333] md:tracking-[-0.003em]
           font-semibold">
```

```html
<!-- hero -->
<h1 class="text-[40px] leading-[1.1] tracking-[0em]
           md:text-[64px] md:leading-[1.0625] md:tracking-[-0.009em]
           font-semibold">
```

Or, if the project would rather keep utility names, define the steps once:

```css
@theme {
  --text-headline: 48px;
  --text-headline--line-height: 1.0834933333;
  --text-headline--letter-spacing: -0.003em;
  --text-headline--font-weight: 600;
}
```
…and then `text-headline` carries all four, which is what you want: a size and
its tracking should not be separable.

### Rhythm is an arbitrary em value

```html
<p class="eyebrow">Work</p>
<h2 class="mt-[0.4em] mb-[1.6em]">Projects.</h2>
```

`mt-[0.4em]` resolves against the element's own font size, so the gap scales
with the headline. `mt-4` does not, which is the whole point.

## CSS modules / plain CSS

The straightforward case — this is the shape `assets/apple-base.css` already
ships. Two things worth repeating:

- Put the tokens on `:root` at plain specificity. A selector like
  `:root:not([data-theme="light"])` outranks every consumer's `:root` and
  silently drags your defaults back into their palette.
- Keep size and tracking in the same rule. Anything that lets a size be
  changed without its tracking will eventually be changed without its tracking.

```css
.headline { font-size: 48px; line-height: 1.0834933333; font-weight: 600; letter-spacing: -0.003em; }
@media (max-width: 734px) { .headline { font-size: 40px; line-height: 1.1; letter-spacing: 0em; } }
```

Avoid the `font:` shorthand unless you are also naming the family — `font: 600
48px/1.08 inherit` is invalid and drops the whole declaration, taking the size
with it. It fails silently and looks like a cascade problem.

## CSS-in-JS

Define the ladder once as an object and spread it, so a size cannot arrive
without its tracking:

```js
export const type = {
  headline:  { fontSize: 48, lineHeight: 1.0834933333, fontWeight: 600, letterSpacing: "-0.003em" },
  headlineS: { fontSize: 40, lineHeight: 1.1,          fontWeight: 600, letterSpacing: "0em" },
  intro:     { fontSize: 21, lineHeight: 1.381002381,  fontWeight: 400, letterSpacing: "0.011em" },
  body:      { fontSize: 17, lineHeight: 1.4705882353, fontWeight: 400, letterSpacing: "-0.022em" },
};
```

## Component libraries

MUI, Chakra, shadcn and friends arrive with their own radius scale, their own
grey ramp and their own transition timings — usually three or four radii and a
nine-step grey. Override the theme once at the root rather than per component,
and expect the audit to keep finding the library's own defaults in places you
did not style. That is the correct result: the page is wearing two systems.

## The migration order

Doing this to a page that exists, in the order that keeps it shippable at every
step:

1. **Add the tokens.** Nothing changes yet; the names just exist.
2. **Breakpoints.** One commit, on its own — it moves every responsive rule on
   the page and you want it isolated in history.
3. **Ink steps.** Find every `/NN` opacity on text and map it to one of three.
   This is the commit that makes the page look decided.
4. **Accent.** Everything coloured for decoration becomes an ink step;
   everything coloured for meaning keeps colour only if the meaning survives
   being stated in words.
5. **Radii**, then **weights** — both are find-and-replace.
6. **Type ladder**, size and tracking together, never separately.
7. **Rhythm**, **padding**, **durations** — the ones nobody sees individually
   and everybody feels together.

Run `node tools/audit.mjs <url> --json before.json` at step 0 and
`--baseline before.json` after each commit. The counts go down in public,
which is the only way anyone believes a pass like this did anything.
