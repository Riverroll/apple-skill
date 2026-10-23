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

**Motion does not move a subject up this list.** A three-second clip of the
real thing is step 1 and the strongest thing on a product page; a three-second
clip of a gradient is still step 4, and animating it makes it a step 4 that
also costs 300 KB. The order is about what is being shown, never about whether
it moves.

What motion *does* change is the count: a flagship apple.com product page
carries 6 to 14 short clips against 110 to 204 stills, so roughly one section
in three has something moving in it. A category page carries none. If every
screen on a product page is frozen, the page is missing a third of the
vocabulary even when the ratios above are met — `references/media.md`.

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

## Text on a picture is not text on a surface

An ink token was picked against a flat colour. Over a photograph there is
nothing holding it up, and the contrast checks cannot help — the backdrop is an
image, so there is no value to measure against.

- Text over media is **white, or near-black, at high alpha.** The muted step
  that reads as "quiet" on a surface reads as "nearly gone" on a picture.
- **The scrim has to reach the topmost line**, not the headline. A gradient
  tuned to the 80px type leaves the 12px eyebrow above it sitting on bare
  photograph, which is the most common version of this mistake and the easiest
  to miss, because the headline looks fine.
- A scrim that runs `transparent → 0.25 at 35% → 0.68` covers a three-part
  lockup without greying the picture. One stop is rarely enough.
- If the picture is busy enough that even white at full alpha is hard, the
  answer is a different crop, not a darker scrim. Past about 0.7 the photograph
  stops being a photograph.

The audit flags mid-tone text whose paint stack reaches a picture before it
reaches any opaque surface.

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

The countable version: **a rest has to be visibly shorter than what surrounds
it.** If every section on a long page is one screenful give or take, the page
has no pace — it has a frequency. A worked page runs something like 100vh
hero, 220px rest, 90vh media, 72px stat strip, 250vh pinned, 100vh climax.
The audit measures the spread and says so.

## A spine, not just a subject

Pace fixes how the page *feels*. It does not fix the other half of the
complaint, which sounds like this: **"there is no connection between the
sections, it feels bland."** That is a different fault, and restraint, rhythm
and even good photography cannot touch it.

The test is mechanical. **Shuffle the sections. If nothing breaks, there is no
spine.** A page whose sections can be reordered without anybody noticing is a
page where every section makes the same claim in a different format — stat
row, feature row, carousel, spec table, all saying "we measure the thing
well". Each one is correct. Together they are wallpaper.

A spine is one claim told **in order**, carried by a device that repeats:

- **A clock.** One event, minute by minute: 05:30 nothing · 06:41 the reading
  moves · 06:42 the alert · 07:00 it happens. Every section is a step, and the
  time appears in the same place, in the same type, every time.
- **A distance, a count, a temperature** — anything that can only go one way.
- **One person, from first screen to last.**

Three rules follow from having one:

1. **The first screen states the stake, not the category.** "Nineteen minutes."
   beats "Ground deformation monitoring." The reader should finish the hero
   wanting to know what happens, not knowing what the product category is.
2. **The climax is the loudest section and the one with the least type on it.**
   A full-bleed photograph, a time, four words. A climax that also explains
   itself is not a climax.
3. **The explanation goes after the payoff.** Specs, stat rows and feature rows
   are the answer to "how is that possible", and that question does not exist
   until the story has landed. A page that opens with its feature grid has
   answered a question nobody asked yet.

### Bind the two worlds

A page that carries photographs *and* interface data has two visual worlds in
it, and if they only ever alternate — bright photograph, flat dark dashboard,
bright photograph — it reads as two different pages interleaved. That is a
large part of what "AI slop" means when somebody says it about a page whose
tokens are all correct.

The fix is not to tone down the photography. It is to put the data **on** the
picture: the tilt trace over the ground it was read from, the station map over
the terrain it covers, the alert over the night it fired in. One surface, two
layers, one page. `references/media.md` has the mechanics — a rendered scene
can load the page's own photograph as its bed, scrim it, and draw on top.

Two things that go wrong doing it:

- **Too much scrim and the picture is gone**, which is the flat dark box
  again with extra steps. Keep the wash light enough that the photograph is
  unmistakably there, and buy the contrast per element instead — a text
  shadow, a `drop-shadow` on the stroke — rather than per section.
- **The bed has to be a quiet picture.** A chart climbing through a bright
  steam plume is unreadable at any scrim. Pick the dark, textured frame for
  the data, and save the bright one for the climax, where nothing is written
  on it.

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
