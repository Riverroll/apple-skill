# Why a correct page can still be dead

A page can pass every check in this skill — one accent, three inks, the
tracking table, the em ladder, the easing curves — and still feel like nothing.
The restraint rules describe what to *remove*. Nothing in them says what has to
be *there*.

Here is the measurement that makes it concrete. Eight apple.com product pages,
sampled at a 64-point grid on every screenful of scroll, classified by what is
actually under each point:

| What a visitor sees | apple.com (median of 8 pages) |
|---|---|
| photograph or video | **38%** |
| flat surface colour | 51% |
| text | 12% |
| gradient | 6% |

Roughly **three times as much of the page is picture as is text.** The median
page is 26,000px tall — 34 screenfuls — and carries about 105 media elements.

Now the same measurement on this skill's own showcase page, the one that scores
100/100 on the audit:

| | `example/index.html` |
|---|---|
| photograph or video | **0%** |
| flat surface colour | 88% |
| text | 8% |
| screens containing no image at all | **3 of 3** |

That is the whole problem in one table. Perfect tokens, nothing to look at. A
page built to this skill's numbers and no further is a blank canvas with
beautiful margins — and the person who commissioned it will say it has no soul,
and they will be right.

## The ratios to hold

- **Media to text, roughly 3:1 by area.** Not 1:1. A section whose picture is
  the same size as its paragraph reads as a document, not a page.
- **No more than one screenful in four without an image.** Apple's own rate is
  about 22%, and those bare screens are the spec tables, the footnotes and the
  footer — the rests. A rest only reads as a rest if something came before it.
- **Scale contrast of ×6 or more.** The largest type on the page divided by the
  body size: apple.com's median is **×6.7** (96px over 17px, 80px over 12px).
  A page whose biggest type is 2× the body has no voice; everything is talking
  at the same volume.
- **One subject per screen.** Not one section — one *screen*. Apple's long
  pages are a sequence of single ideas, each given a whole viewport. Three
  cards side by side is one screen with three subjects, which is zero subjects.

## The subject hierarchy

When a screen needs something in it, this is the order of what actually works.
Each step down is noticeably weaker:

1. **A photograph of the real thing**, shot with intent — the product, the
   place, the person, the work. This is what apple.com is made of.
2. **A screenshot or capture of the real artifact**, full-bleed and cropped so
   one part of it is legible. For software, this is the equivalent of step 1.
3. **A render or a mockup** of the real thing.
4. **A large abstract field** — a gradient, a texture, a long exposure — used
   as a *backdrop for type*, never as the subject itself.
5. **An illustration**, if the identity is illustrated. One style, used
   everywhere, never mixed with photography.
6. **An icon.** An icon is not media. Three rounded squares with 24px glyphs in
   them is a list with decoration, and it counts as 0% picture.
7. **Nothing.** Valid only as a deliberate rest, and only next to something
   that was not nothing.

If a page has no step 1–3 available, that is a content problem, not a design
problem, and it has to be solved as one. See `references/imagery.md` for
finding and making real images, including when the project arrives with none.

## Composition inside a screen

- **Give the subject a side.** Apple's full-bleed media is either centered with
  the copy above it, or offset with copy in the opposite third. Subject and
  copy do not share the middle — one of them yields.
- **Crop hard.** The single biggest difference between a designed page and an
  assembled one: Apple crops a product shot so the subject bleeds off two
  edges. An image floating with air on all four sides inside a card is a stock
  photo in a frame.
- **Let it be big.** Measured: the hero media on these pages occupies the whole
  viewport. A 400px-tall image in a 900px viewport reads as an attachment.
- **Negative space is around the composition, not inside it.** 100px above the
  headline, 0px between the headline and the thing it names.
- **One focal point.** If two elements on a screen are the same size and the
  same weight, the reader's eye picks neither and moves on.

## Sequence: the thing restraint cannot give you

A long page is a sequence, and a sequence has to change pace. Apple's product
pages run roughly:

```
full-bleed hero, product filling the screen, 96px headline over it
  → a single line of copy on a bare surface                (rest)
  → full-bleed video that plays as it enters
  → a 2-up of detail crops, tight
  → a pinned section where one image changes as you scroll
  → a bare surface with three short stat lines              (rest)
  → full-bleed photograph, the product in use
  → spec table                                             (rest)
  → footer
```

The rhythm is **loud, quiet, loud, quiet**. What a generated page does instead
is the same block repeated at the same volume: section, three cards, section,
three cards. Every screen has identical weight, so none of them land. That is
the actual mechanism behind "it feels AI-made" — not the colours, the monotony.

## The tells of a generated page

These are specific, and most of them are countable. If a page has three or more
of them it will read as slop no matter how good the spacing is.

| Tell | Why it reads that way |
|---|---|
| **0% media** — icons and gradients only | the page has nothing to look at |
| Three equal cards in every section | one layout idea, repeated until the page ends |
| A gradient on the headline (`background-clip: text`) | decoration where the type should carry itself; Apple does this on **zero** of its headlines |
| Emoji used as icons | a placeholder that shipped |
| Glass cards — `backdrop-filter: blur()` over a gradient | a 2021 template, and it blurs what is behind it into mush |
| Purple-to-blue gradient background | the default of every generator |
| Everything centered, every section | centering is an emphasis; applied everywhere it emphasises nothing |
| A 24px icon in a 48px rounded square, ×3, ×6, ×9 | see "an icon is not media" |
| Headlines from the vocabulary below | nobody says these words out loud |
| Identical section padding and identical section height throughout | no loud, no quiet |
| Stat tiles with invented numbers | "99.9% uptime", "10k+ users" on a page with no users |

The vocabulary, which is worth refusing by name: *elevate, seamless, unleash,
supercharge, transform your, empower, revolutionize, unlock, effortless,
journey, craft(ed), game-changing, next-level, cutting-edge, robust,
leverage, holistic, curated*.

Apple's actual headlines, for contrast, are three words and name a thing:
"Ringan. Ringkas. Luar biasa." See `references/voice.md`.

## What taste is, operationally

It is not a feeling you either have or lack. On this evidence it is five
decisions, each of which can be checked:

1. **Is there a subject?** Something real, on every screen that is not a rest.
2. **Is it big enough and cropped hard enough** to be the point of the screen?
3. **Is there a size difference** — ×6 or more — between the loudest and the
   quietest type?
4. **Does the page change pace**, or is every screen the same weight?
5. **Did anything get refused?** One accent, two weights, no gradient text, no
   glass, no emoji. Restraint is only visible next to the thing it declined.

Run `node tools/audit.mjs <url>` and the first four are measured for you. The
fifth is the one that needs a person.
