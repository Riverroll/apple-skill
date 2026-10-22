# ERP, admin panels, dense tools

apple.com is a **marketing page**: read once, three words per headline, one
idea per screen, 100px of air between sections. An ERP is a **tool**: opened at
09:00 and closed at 17:00, forty fields per screen, scanned rather than read,
operated by someone who already knows where everything is and resents every
pixel that moved.

Both can be Apple's craft. Most of the numbers are not shared.

The failure mode this file exists to prevent: someone runs the audit on a
purchase-order screen, reads "section padding should be 80px" and "body is
17px", applies it, and ships a grid that fits six rows per screen where it used
to fit twenty-four. The warehouse team will hate it, and they will be right.

## What transfers unchanged

| Transfers | Why |
|---|---|
| Restraint counts | One accent, three inks, three radii, two weights. Harder in an ERP and matters more — 200 screens multiply every stray decision. |
| The tracking table | Tracking is a function of size at any density. |
| Easing curves | The five curves are correct for a tool; only the durations shorten. |
| Token roles | `--ink` / `--ink-secondary` / `--ink-muted` / `--surface` / `--surface-alt` / `--accent`, plus the semantic set below. |
| The em rhythm | Inside a form or a card — label to field, field to help text. |
| Art direction rules | Empty-state illustrations, avatars, document thumbnails. |

## What gets re-derived

| Does not transfer | Marketing | Tool |
|---|---|---|
| Body size | 17px | **14px** (12px for metadata, 17px only for a page title's subhead) |
| Section padding | 80–100px | **16–24px** content gutter |
| Vertical rhythm between blocks | 0.8–1.6em | a 4px grid: 4 / 8 / 12 / 16 / 24 / 32 |
| Largest type on screen | 64–96px | **28px** page title, often 20px |
| Default transition | 250ms | **150ms** |
| Scroll-linked motion | the signature | **delete it** |
| Breakpoints | three bands | one band that matters: ≥1069px. Below that, a different product |

### The dense type ladder is already in the measured set

Apple's own 106 classes contain a dense ladder; nobody notices it because the
marketing pages barely use it. All three are the Text optical size, all three
measured:

```css
--t-data:      14px / 1.2857742857  w400  -0.016em   /* table cells, field values  */
--t-data-label:14px / 1.2857742857  w600  -0.016em   /* column headers, field labels */
--t-meta:      12px / 1.3333733333  w400  -0.01em    /* ids, timestamps, units, help */
--t-body:      17px / 1.4705882353  w400  -0.022em   /* the one paragraph per screen */
--t-title:     28px / 1.142854      w600  -0.016em   /* page title — the ceiling */
```

Note the 14px **tight** line-height (1.2857) rather than the 1.4286 variant.
Apple ships both; the tight one exists for stacked dense copy, which is every
cell in a grid.

Three sizes in the data region. That is the whole budget. A table with 14px
values, 14px semibold headers and 12px ids is finished; a fourth size is a
decision nobody made.

## Density is one number

Every dense interface that holds together derives its geometry from a single
row height. Expose it, let the user pick, derive everything else:

```css
:root            { --row-h: 40px; }   /* default    */
[data-density="compact"]     { --row-h: 32px; }
[data-density="comfortable"] { --row-h: 48px; }

.cell      { height: var(--row-h); padding-inline: 12px; }
.toolbar   { height: calc(var(--row-h) + 12px); }
.field     { height: var(--row-h); }
.btn       { height: var(--row-h); }          /* a button matches a field it sits beside */
.btn--sm   { height: calc(var(--row-h) - 8px); }
```

32 / 40 / 48 are the three row heights, and they are multiples of 8 so a
28px avatar, a 20px icon and a 16px checkbox all centre on a whole pixel.

The rest of the grid is 4px: `4` inside a chip, `8` between a label and its
field, `12` inside a cell, `16` between fields, `24` between field groups,
`32` between a page title and the content. Six values. Not a scale — a list.

Anything that is not on this list in a dense screen is a mistake, including
`13px`, `15px`, `18px`, `padding: 10px` and `gap: 14px`.

## The table contract

The table is the ERP. Everything else is navigation to a table.

**Structure**

- `thead th` is `position: sticky; top: 0; z-index: 2` with an opaque
  background. A header that scrolls away in a 400-row grid means the reader
  scrolls back up to remember which column they are in — twice a minute,
  eight hours a day.
- The identifying first column is `position: sticky; left: 0` when the table
  scrolls sideways. Without it a horizontal scroll loses the row's identity and
  the data becomes anonymous numbers.
- Sticky needs no clipping ancestor on the scroll axis — the scroll container
  itself is fine, an `overflow: hidden` wrapper around it is not. This is the
  single commonest reason a sticky header silently does nothing.

**Alignment is a function of the data type, not taste**

| Data | Alignment | Why |
|---|---|---|
| Text, names, descriptions | left | ragged right is how reading works |
| Numbers, currency, quantities | **right** + `tabular-nums` | digits line up by place value so the eye compares magnitude without reading |
| Dates, times | left (or right if ISO) | a fixed-width format is a number |
| Status, icons, actions | centre, or right-anchored at the row end | |
| Column header | **matches its column** | a left-aligned header over right-aligned numbers is the most common table defect on earth |

```css
.num { text-align: right; font-variant-numeric: tabular-nums; }
```

`tabular-nums` is not a nicety. Proportional digits make `1,111` narrower than
`8,888`, so a column of them has a jagged left edge and the reader cannot
compare two rows at a glance. One declaration fixes it. Put the currency symbol
and the unit in the **header** (`Amount (IDR)`), not in every cell.

**Separation: pick one**

Zebra striping **or** row borders. Never both — that is two grids drawn on top
of each other, and it is why a table can look busy while containing nothing.
Apple's own tables separate with a hairline between rows and no vertical rules
at all. Vertical rules are only ever needed when the horizontal rhythm has
already failed.

```css
tbody tr + tr td { border-top: 1px solid var(--hairline); }  /* and nothing else */
```

**States**

```css
tbody tr:hover    { background: var(--surface-alt); }
tbody tr[aria-selected="true"] {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  box-shadow: inset 2px 0 0 var(--accent);         /* a marker, not a fill */
}
```

A fully accent-filled selected row destroys every ink step inside it. 10% plus
an inset edge reads as selected at any density and keeps the text legible.

**Truncation**

Any cell that can truncate carries the full value in `title` (or a tooltip).
An ellipsis with no way to see the rest is data loss presented as design.
Prefer: give the column a sensible `min-width` and let the *description*
column be the one that truncates — never the identifier.

**The four states every grid ships**

Loading, empty, error, and no-permission. The ERP that gets delivered has one
state: rows. Then a filter returns nothing and the user sees a blank rectangle
and files a bug.

- **Loading** — skeleton rows at `--row-h`, same column widths. Never a
  centred spinner: the layout jumps when data lands.
- **Empty** — one line of what would be here, one button that creates it.
- **Empty because of a filter** — different copy, and a *clear filters*
  action. This is a separate state and it is the one always missing.
- **Error** — what failed, and retry. Not a toast that disappears.

## The form contract

```
label        14px/600   --ink
             ↓ 8px
field        14px/400   height var(--row-h)
             ↓ 6px
help / error 12px/400   --ink-muted / --critical
             ↓ 16px  (next field)   ↓ 24px  (next group)
```

- Label **above** the field, left-aligned. A label column that is right-aligned
  across a 40-field screen leaves a ragged gutter and forces the eye to track
  twice per field.
- One column for a form that is read. Two columns only when the operator is
  copying from a paper document and the layout mirrors it.
- Mark **required**, not optional, and mark it once — an asterisk on the label.
  A screen where 38 of 40 fields are required should instead say so once at the
  top and mark the two that are not.
- The error message **replaces the help text in place**. It never appears as a
  tooltip, never in a toast, never only at the top of the form. A tooltip
  cannot be read while typing in the field it describes.
- Validate on blur, not per keystroke. Telling someone their email is invalid
  while they are on the third character is an insult performed 40 times.
- Group boundaries are 24px of space, not a card with a border. A form of
  eight bordered cards is eight boxes to parse before any field is read.
- The primary action is the rightmost button in a dialog footer, and the
  leftmost in a page-level form where the eye returns to the gutter. Pick one
  per product and never mix.

## Shell layout

```
┌──────────────────────────────────────────────────────────┐
│ topbar 52px   tenant · search · user                     │
├────────────┬─────────────────────────────────────────────┤
│ sidebar    │ toolbar  44px   title · filters · actions   │
│ 260px      ├─────────────────────────────────────────────┤
│            │ content   gutter 20–24px                    │
│ items 32px │                                             │
└────────────┴─────────────────────────────────────────────┘
```

- Sidebar 240–280px, items at 32px, **one level of nesting**. An ERP menu tree
  five levels deep is a sitemap, not navigation; it means the information
  architecture was never decided and the tree is standing in for it. Flatten to
  one level plus a search field over the whole menu.
- The toolbar belongs to the view, holds its title and its actions, and is
  sticky. Filters live in it, not in a drawer the user must open to find out
  why the grid is empty — **active filters are always visible as chips**.
- One inspector panel on the right at most, 320–360px, for the selected row's
  detail. It is the alternative to a modal, and it is the better one: the list
  stays in view and the user keeps their place.
- Modals are for a decision that blocks, not for editing a record. An ERP that
  edits in modals cannot support two records side by side, which is the thing
  the job actually requires.

## Status colour: the one exemption to one accent

Marketing pages get one accent. A tool needs a semantic set, because status
*is* meaning and the reader has to pick it out of 400 rows without reading.

```css
:root {
  --accent:   /* the one action colour */
  --neutral:  var(--ink-muted);    /* draft, inactive, archived */
  --success:  /* posted, approved, paid   */
  --warning:  /* pending, due soon        */
  --critical: /* rejected, overdue, failed */
}
```

Five hues on the page, and that is the ceiling — one action plus four semantic.
Everything else is ink on a surface. In particular: a colour per module, per
department or per category is still the rainbow mistake. Document type is not
status.

Two rules that keep this honest:

1. **The badge carries the word.** Colour is reinforcement, never the only
   carrier — 8% of men cannot separate the success green from the warning
   amber, and a printed report has no colour at all.
2. **Tint, not fill.** A grid of saturated badges has 400 competing accents.
   `color-mix(in srgb, var(--success) 12%, var(--surface))` with the text in
   the full-strength hue reads at a glance and lets the row's own data stay the
   loudest thing in it.

```css
.badge {
  height: 20px; padding-inline: 8px; border-radius: 980px;
  font: 600 12px/1 inherit; letter-spacing: -0.01em;
  background: color-mix(in srgb, var(--c) 12%, var(--surface));
  color: var(--c);
}
.badge--success { --c: var(--success); }
```

## Motion in a tool

Keep the curves, cut the durations, delete the choreography.

```css
--dur-hover:  80ms;    /* was 100 */
--dur-state: 150ms;    /* was 250 — the default */
--dur-panel: 200ms;    /* a drawer or inspector sliding in */
```

- Anything performed hundreds of times a day animates in **0ms**: opening a
  dropdown, selecting a row, moving between cells. The animation is charming
  the first time and an obstacle the three-hundredth.
- **No scroll-triggered reveals.** A row that fades in as it enters the
  viewport is, in a data grid, indistinguishable from a rendering bug — and it
  breaks `Cmd+F`, screen readers and the user's attempt to drag-select.
- **No parallax.** The entire sticky-and-spacer technique from
  `references/motion.md` has no place here. It is a marketing device.
- What motion is *for* in a tool: showing where something went. A deleted row
  collapsing its height, a drawer sliding from the edge it will return to, a
  toast rising from the corner it belongs to. Motion that explains a change of
  state, nothing else.
- Layout must never animate on data arrival. Reserve the space (skeleton at
  `--row-h`), then fill it.

## Keyboard and focus are not an accessibility checkbox

A marketing page is operated by a trackpad. An ERP is operated by someone with
one hand on the number pad who will be measurably slower if they have to reach
for the mouse to confirm a dialog.

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: inherit;
}
```

- `outline: none` with nothing in its place is the defect the audit looks for.
  If the project's reset removes outlines, the replacement goes in the same
  commit.
- Tab order follows the visual order. A two-column form whose DOM is
  column-by-column tabs down the left side then jumps back up — the layout and
  the keyboard disagree, and the keyboard wins arguments.
- `Esc` closes, `Enter` submits, the primary action is reachable without Tab
  cycling the whole grid. A grid gets arrow-key navigation between rows or it
  does not get called a grid.
- Hit targets: **28px minimum** in a dense desktop tool (not 44 — that is the
  touch figure, and it would blow the density budget). A 16px icon button in a
  40px row is a 16px target with 24px of wasted padding around it; give the
  button the row height and centre the icon inside it.

## Numbers, dates, money

A finance screen is judged on this and nothing else.

- `tabular-nums` everywhere a number can sit under another number.
- One locale decision, applied by a formatter, not by string concatenation.
  `Intl.NumberFormat` already knows that `id-ID` wants `1.234.567,89`.
- Negatives: one convention per product — `(1.234)` or `-1.234`, and if the
  domain is accounting, red *and* the parentheses, because the red is lost on
  print.
- Align the decimal, not the digits: equal decimal places in a column, so
  `1.000,00` sits under `12,50` correctly. A column where one cell shows `7`
  and the next `7,25` cannot be scanned.
- Totals get a hairline above and weight 600 — never a different size, never a
  background fill.
- Dates in a grid are `DD MMM YYYY` or ISO. Never relative time ("3 days ago")
  in a column that gets sorted or compared: relative time is for a feed.

## Running the audit on a tool

```bash
node tools/audit.mjs http://localhost:3000/purchase-orders --mode erp
```

`--mode erp` changes what counts as wrong:

- allows five hues instead of one, and exempts `[data-status]` elements
- stops asking for 80px section padding, and starts flagging it
- adds the table, form, focus, hit-target and `tabular-nums` checks
- ignores the headline-voice and parallax findings entirely

Without the flag it auto-detects (a grid, a `role="grid"`, or more than ten
table rows) and tells you to pass it.

## The smell list

| Symptom | Actual cause |
|---|---|
| "Feels cramped but also empty" | 10px paddings everywhere, zero grouping. Space comes in 24px blocks between groups, not 4px added to every element. |
| "Can't find anything in the table" | Headers not aligned to their columns, no sticky header, no `tabular-nums`. |
| "Looks like a 2009 admin panel" | Every cell bordered, striping *and* borders, a gradient on the header row. |
| "Looks like a website, not a system" | 17px body, 48px page titles, 80px padding, cards around everything. |
| "Slow to use" but the API is fast | Animated row selection, modal-per-edit, filters hidden in a drawer, no keyboard path. |
| "Every module looks different" | No row height token. Each team picked their own, so nothing lines up across screens. |
| "Users keep asking what the colours mean" | Colour carrying meaning alone, and more than five hues doing it. |

## What stays Apple about it

Restraint, exactly three ink steps, one radius per role, two weights, the
tracking table, the easing curves, hairlines instead of boxes, surfaces instead
of borders, and the refusal to decorate a thing that has a job. An ERP built
this way looks nothing like apple.com and is recognisably the same discipline —
which is the point of the whole skill.
