# Finding the pictures

`references/composition.md` measures the problem: a page with 0% media is
unfinished, whatever its spacing looks like. This file is how to fix that when
the project arrives with no images — which is most of the time.

**Sourcing images is part of building the page, not a blocker to hand back.**
A page delivered as flat colour blocks with a note saying "add images later" is
an unfinished page, and the version with real pictures in it is the only one
anyone can judge.

## Order of preference

1. **Whatever the project already has.** Ask for it, and look in the repo
   first — `public/`, `assets/`, `static/`, a Figma export, an old site.
2. **Capture it.** For software this is the strongest option available and it
   is nearly always skipped: a real screenshot of the real product, with real
   data in it, cropped to one feature and run full-bleed. For a portfolio, the
   work itself. For a physical business, a photo of the actual place.
3. **Licensed free photography**, downloaded into the repo and credited. The
   recipes below are verified working.
4. **A render or illustration**, if the identity is illustrated — one style,
   never mixed with photography.
5. **A large abstract field** — gradient, texture, long exposure — as a
   *backdrop for type* only. This is the floor, not a solution.

## Verified sources

### Wikimedia Commons — no API key, licence and author in the response

This works with no account and returns exactly what an attribution line needs.
Verified against the live API:

```bash
curl -s "https://commons.wikimedia.org/w/api.php?action=query&format=json\
&generator=search&gsrsearch=steel%20warehouse&gsrnamespace=6&gsrlimit=5\
&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600"
```

`gsrnamespace=6` is required — without it the search returns articles, not
files, and comes back empty. `iiurlwidth` gives a resized URL instead of the
50MP original. Each result carries `extmetadata.LicenseShortName` and
`extmetadata.Artist`, which is what goes in the credits file.

Mostly public domain, CC0, CC BY and CC BY-SA. Strong for places, machinery,
architecture, food, nature. Weak for anything that looks like contemporary
commercial photography.

### Pexels and Unsplash — free keys, better photography

Both need a free API key (`Authorization` header for Pexels,
`Client-ID <key>` for Unsplash). Without one they return 401. Ask the project
owner for a key, or use Commons.

`source.unsplash.com/1440x900/?keyword` — the old no-key trick seen in a lot of
tutorials — is **dead**; it returns 503. Anything suggesting it is out of date.

### Openverse

Aggregates CC-licensed images across sources. `api.openverse.org/v1/images/`
needs no key, but it is unreachable from some networks (it returned nothing on
the machine this was written on). Try it, fall back to Commons.

### picsum.photos

For **layout only**. `https://picsum.photos/1600/900` returns a random
photograph instantly, which is the right way to get the geometry of a page
settled before the real images exist. It must never ship — a page with picsum
URLs in it is a wireframe pretending to be a design.

## The workflow

```
search → read the licence → download into the repo → crop → encode → credit
```

Each step matters:

- **Read the licence per image**, not per site. "Free to use" on a listing page
  is not a licence; `extmetadata.LicenseShortName` is. CC BY and CC BY-SA
  require attribution. CC BY-SA also requires that *your* page's licence be
  compatible, which usually rules it out for a commercial site — prefer CC0 and
  public domain for those.
- **Download. Never hotlink.** A remote URL in production is an outage someone
  else controls, a privacy leak, and usually a licence violation.
- **Crop before encoding.** See the crop rules below. Resizing a badly framed
  photo gives a smaller badly framed photo.
- **Encode properly.** AVIF or WebP with a JPEG fallback, and a size budget: a
  full-bleed hero should land under ~250KB at 2× after encoding. A 4MB PNG hero
  undoes every other decision on the page.
- **Credit in a file.** `CREDITS.md` at the project root, one line per image:

  ```
  hero-warehouse.avif — "K Steels warehouse, Townsend Fold" by David Dixon,
  CC BY-SA 2.0, via Wikimedia Commons. Cropped.
  ```

## Cropping and art direction

This is where sourced photography either works or looks like stock.

- **Crop so the subject bleeds off two edges.** An image with air on all four
  sides inside a rounded card is a stock photo in a frame. Apple's product
  shots run past the viewport edge.
- **One focal point, placed off-centre**, with the copy in the opposite third.
- **Art-direct per breakpoint** — a different crop, not the same image scaled:

  ```html
  <picture>
    <source media="(min-width: 1069px)" srcset="hero-wide.avif 1x, hero-wide@2x.avif 2x">
    <source media="(min-width: 735px)"  srcset="hero-mid.avif 1x,  hero-mid@2x.avif 2x">
    <img src="hero-tall.avif" srcset="hero-tall@2x.avif 2x"
         width="1440" height="900" alt="Gudang baja di Cakung"
         fetchpriority="high" decoding="async">
  </picture>
  ```

  A 16:9 landscape crop scaled down to a phone shows a thumbnail of a scene.
  A separate 4:5 crop of the same subject fills the screen.
- **Always set `width` and `height`** (or `aspect-ratio`). Without them the page
  reflows as each image lands, which is the single most visible performance
  defect and it is free to fix.
- **`loading="lazy"` on everything except the hero.** The hero gets
  `fetchpriority="high"` and no lazy attribute — lazy-loading the first thing
  on the page delays the only image that affects the first impression.
- **`object-fit: cover` plus a chosen `object-position`.** The default `50% 50%`
  decapitates people and cuts products in half; pick the position per image.

```css
.media-full { position: relative; aspect-ratio: 16 / 9; }
.media-full img { position: absolute; inset: 0; width: 100%; height: 100%;
                  object-fit: cover; object-position: 50% 35%; }
@media (max-width: 734px) { .media-full { aspect-ratio: 4 / 5; } }
```

- **A dark page needs dark-background images.** See `references/dark.md`: a
  bright photo on black is a hole punched in the page. Select for it, or scrim
  the edge from the surface colour.

## The honesty rules

These are not style preferences.

- **Do not present a generated image as a photograph of something real.** No
  fabricated product shots, no invented premises, no fake teams or offices. If
  generated imagery is used at all, keep it to abstract backdrops and say so in
  `CREDITS.md`.
- **No fabricated proof.** No invented logos, testimonials, review counts or
  stat tiles ("99.9% uptime", "10k+ users") on a site with no users. A page is
  allowed to be small; it is not allowed to lie, and these are the first thing
  a reader checks.
- **Never ship Apple's photography, renders, icons, wordmarks or fonts.** This
  skill teaches Apple's system and carries none of its content, and a page
  built with it must not either.
- **Real screenshots or none.** A product screenshot with lorem ipsum, "John
  Doe" and `$0.00` in it is worse than no screenshot: it says the product is
  not running.
- **Alt text that describes the image**, in the page's language. Not the
  filename, not empty unless the image is purely decorative.

## When there is genuinely nothing to photograph

A consultancy, an API, an internal tool. The honest answers, in order:

1. **The artifact.** The dashboard, the report, the code, the document — shot
   large and cropped to one legible detail.
2. **The process.** Hands at a desk, a whiteboard, a site visit, a machine
   running. Specific places and real people beat any abstraction.
3. **The output.** What the client got: the building, the shipment, the chart
   that went up.
4. **Typography as the image.** A whole screen given to one sentence at 96px on
   a bare surface, with real air around it, is a legitimate composition — Apple
   uses it between media bands. It works *because* it is the rest between two
   pictures. A page made entirely of it is the blank canvas again.

Option 4 is the only one that needs no sourcing, and it is the one to reach for
last, once per page.
