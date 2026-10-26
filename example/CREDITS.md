# Image credits

Every photograph bundled with this example is in the **public domain**, taken by
U.S. federal employees in the course of their duties (17 U.S.C. § 105) or
released as public domain by the U.S. National Park Service. None of it is
Apple's, and none of it was generated.

Files were downloaded from Wikimedia Commons, cropped for the frame they sit in,
and re-encoded to WebP. Nothing is hotlinked. The crop is the only alteration.

| File | Source | Credit | Licence |
|---|---|---|---|
| `hero-2400.webp`, `hero-1600.webp`, `hero-1000.webp` | [Kilauea Lava Lake (12792432484)](https://commons.wikimedia.org/wiki/File:Kilauea_Lava_Lake_(12792432484).jpg) | U.S. Geological Survey | Public domain |
| `band-2400.webp` | [November 30, 2022 — Mauna Loa Lava Flow (111218)](https://commons.wikimedia.org/wiki/File:November_30,_2022_%E2%80%94_Mauna_Loa_Lava_Flow_(111218).jpg) | USGS Hawaiian Volcano Observatory | Public domain |
| `card-summit.webp` | [Lava fountain from Kīlauea's ongoing summit eruption (96758)](https://commons.wikimedia.org/wiki/File:Lava_fountain_from_K%C4%ABlauea%27s_ongoing_summit_eruption_(96758).jpg) | USGS Hawaiian Volcano Observatory | Public domain |
| `card-rift.webp` | [Kilauea Fissure 8 cone erupting on 6-28-2018](https://commons.wikimedia.org/wiki/File:Kilauea_Fissure_8_cone_erupting_on_6-28-2018.jpg) | U.S. Geological Survey | Public domain |
| `card-sample.webp` | [Lava Sampling (16368518133)](https://commons.wikimedia.org/wiki/File:Lava_Sampling_(16368518133).jpg) | U.S. Geological Survey | Public domain |
| `pinned-1800.webp` | [Eruption at the summit of Kilauea volcano (118574)](https://commons.wikimedia.org/wiki/File:Eruption_at_the_summit_of_Kilauea_volcano_(118574).jpeg) | U.S. Geological Survey | Public domain |
| `slide-fountain.webp` | [Lava fountain dome 2](https://commons.wikimedia.org/wiki/File:Lava_fountain_dome_2.jpg) | J. B. Judd, USGS | Public domain |
| `slide-curtain.webp` | [Pahoeoe fountain edit2](https://commons.wikimedia.org/wiki/File:Pahoeoe_fountain_edit2.jpg) | J. D. Griggs, USGS | Public domain |
| `slide-sea.webp` | [USGS Kīlauea multimediaFile-2066](https://commons.wikimedia.org/wiki/File:USGS_K%C4%ABlauea_multimediaFile-2066.jpg) | U.S. Geological Survey | Public domain |
| `slide-vent.webp` | [Fountaining at a fissure within Halemaʻumaʻu crater, January 2021](https://commons.wikimedia.org/wiki/File:Fountaining_at_a_fissure_within_Halema%CA%BBuma%CA%BBu_crater,_January_2021.jpg) | M. Patrick, U.S. Geological Survey | Public domain |

## The clips in `example/media/summit/` and `example/media/flow/`

The example pages need moving pictures, and nothing in this repository may be
Apple's. So the clips were **made from photographs already credited above** —
`hero-2400.webp`, the USGS lava-lake frame, for `summit/`, and
`band-2400.webp`, the Mauna Loa flow, for `flow/` — with
`tools/make-clip.sh`, which applies a 1.11&times; push over three seconds and
cuts the three crops `references/media.md` measured off apple.com.

`flow/` was built with `CRF_BUMP=6`. At the default CRFs that footage missed
the byte budget by a third, which is the case the reference describes: an
aerial of braided lava channels is close to worst case for h264, so the
bitrate goes where the texture is. The honest first move is a simpler frame;
this one is kept because the page wants that picture.

| file | pixels | derived from | licence |
|---|---|---|---|
| `summit/small.mp4`, `small_2x.mp4` | 420&times;480, 840&times;960 | [Kilauea Lava Lake (12792432484)](https://commons.wikimedia.org/wiki/File:Kilauea_Lava_Lake_(12792432484).jpg), U.S. Geological Survey | Public domain |
| `summit/medium.mp4`, `medium_2x.mp4` | 934&times;576, 1868&times;1152 | the same frame | Public domain |
| `summit/large.mp4`, `large_2x.mp4` | 1260&times;612, 2520&times;1224 | the same frame | Public domain |
| `flow/small.mp4` … `flow/large_2x.mp4` | the same six sizes | [November 30, 2022 — Mauna Loa Lava Flow (111218)](https://commons.wikimedia.org/wiki/File:November_30,_2022_%E2%80%94_Mauna_Loa_Lava_Flow_(111218).jpg), USGS Hawaiian Volcano Observatory | Public domain |
| `start-small.webp`, `start-medium.webp`, `start-large.webp` in each | frame 0 of each crop | the frame that directory was built from | Public domain |

A pan across a public-domain photograph is a derivative of a public-domain
work, so the result carries no new restriction. It is also the honest fallback
`references/media.md` ranks last: when there is no footage to be had, a slow
move on a good still beats a static tile, and it beats a watermarked preview
outright.

## The clips in `tilt/`, `network/` and `alert/`

These three are **the interface itself**, rendered frame by frame over a
photograph. `example/scenes/tilt.html`, `network.html` and `alert.html` each
expose one function, `setFrame(t)`, and `tools/render-clip.mjs` drives a
headless browser through 90 values of `t`, captures each paint, and encodes
the result into the same six-file ladder `references/media.md` measured off
apple.com.

Each scene loads one of the public-domain photographs already credited above
as its bed, scrims it, and draws the data on top — so the encoded clip
**contains that photograph**, and inherits its licence. Everything drawn over
it is this repository's: the numbers are invented, the product is invented,
and the typefaces are the system stack the page already uses. Nothing is
traced, sampled or generated from somebody else's work.

| file | pixels | drawn over | licence |
|---|---|---|---|
| `tilt/*.mp4` | the six measured sizes | `band-2400.webp` — [Mauna Loa lava flow](https://commons.wikimedia.org/wiki/File:November_30,_2022_%E2%80%94_Mauna_Loa_Lava_Flow_(111218).jpg), USGS HVO | Public domain bed, MIT overlay |
| `network/*.mp4` | the same six | `slide-sea.webp` — [USGS Kīlauea multimediaFile-2066](https://commons.wikimedia.org/wiki/File:USGS_K%C4%ABlauea_multimediaFile-2066.jpg), USGS | Public domain bed, MIT overlay |
| `alert/*.mp4` | the same six | `card-rift.webp` — [Kilauea Fissure 8 cone erupting on 6-28-2018](https://commons.wikimedia.org/wiki/File:Kilauea_Fissure_8_cone_erupting_on_6-28-2018.jpg), USGS | Public domain bed, MIT overlay |
| `start-small.webp`, `start-medium.webp`, `start-large.webp` in each | frame 0 of each crop — the frame under the clip | exported from the rendered frames | as above |
| `end-small.webp`, `end-medium.webp`, `end-large.webp` in each | the last frame — the fallback for reduced motion and no JS | exported from the rendered frames | as above |

Putting the data on the picture roughly quadrupled them — 20&ndash;60 KB at
1&times; where the same scenes on a flat dark panel cost 18&ndash;50 KB, and
up to 407 KB at 2&times;. That is the bits-per-pixel table in
`references/media.md` doing exactly what it says: the cost is texture, and a
photograph is texture. It is also the right trade. A page that alternates
photographs with flat dark panels reads as two pages interleaved.

## Why these and not stock photography

`references/imagery.md` records what was actually reachable when this page was
built: `source.unsplash.com` is dead, Pexels and Unsplash need API keys, and
Wikimedia Commons is a documentation archive rather than a stock library — it is
strong on landscape, architecture, machinery and science, and thin on styled
product photography.

So the page's subject was chosen to match what the archive is strong at. That is
the honest order of operations: find the pictures, then decide what the page is
about. A page whose subject nothing can illustrate ends up as correct tokens on
an empty canvas, which is the failure `references/composition.md` measures.

Creative Commons **ShareAlike** images were deliberately excluded. A crop is a
derivative work, and CC BY-SA would require this repository to carry a
compatible licence.
