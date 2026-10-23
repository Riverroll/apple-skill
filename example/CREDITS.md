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

## The clips in `example/media/summit/`

`example/motion/` needs moving pictures, and nothing in this repository may be
Apple's. So the clips were **made from a photograph already credited above** —
`hero-2400.webp`, the USGS lava-lake frame — with `tools/make-clip.sh`, which
applies a 1.11&times; push over three seconds and cuts the three crops
`references/media.md` measured off apple.com.

| file | pixels | derived from | licence |
|---|---|---|---|
| `small.mp4`, `small_2x.mp4` | 420&times;480, 840&times;960 | [Kilauea Lava Lake (12792432484)](https://commons.wikimedia.org/wiki/File:Kilauea_Lava_Lake_(12792432484).jpg), U.S. Geological Survey | Public domain |
| `medium.mp4`, `medium_2x.mp4` | 934&times;576, 1868&times;1152 | the same frame | Public domain |
| `large.mp4`, `large_2x.mp4` | 1260&times;612, 2520&times;1224 | the same frame | Public domain |
| `start-small.webp`, `start-medium.webp`, `start-large.webp` | frame 0 of each crop | the same frame | Public domain |

A pan across a public-domain photograph is a derivative of a public-domain
work, so the result carries no new restriction. It is also the honest fallback
`references/media.md` ranks last: when there is no footage to be had, a slow
move on a good still beats a static tile, and it beats a watermarked preview
outright.

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
