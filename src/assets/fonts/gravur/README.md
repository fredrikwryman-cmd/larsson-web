# Gravur — UNLICENSED. LOCAL PREVIEW ONLY.

**The `.woff` and `.woff2` files in this folder must not be committed, published or
deployed. They are git-ignored. Do not remove them from `.gitignore`.**

## What these are

Gravur is the commercial typeface the live site `larssonkorgmakare.se` renders in.
**We hold no licence for it.** These files were downloaded from that site's own
public `wp-content/uploads/useanyfont/` directory during the phase 1 harvest, and
exist here for one reason only: so the rebuilt site can be viewed locally in the
original typeface, to check that line breaks, set width and colour match the
original.

`gravur-light.woff2` and `gravur-regular.woff2` were generated locally with
fontTools from the `.woff` originals — the server has no woff2 for Gravur. The
conversion is lossless (360 glyphs in, 360 glyphs out, unitsPerEm 2048).

## What ships instead

**Archivo**, OFL-licensed, cut to two static instances matched to Gravur's set
width and stem values. It is the default and it is what any build produces unless
`FONT=gravur` is set explicitly. See `larsson-harvest/font-cut.md`.

## How to use these locally

```
FONT=gravur npm run build && npm run preview
```

A build with `FONT=gravur` writes a `.LOCAL-ONLY-DO-NOT-DEPLOY` marker into
`dist/` and refuses to run at all if a CI or deploy environment is detected.
`npm run verify:deployable` fails if any Gravur byte reached `dist/`.

## If you want the site to use Gravur for real

Buy a webfont licence from the foundry. Until then, Archivo is not a compromise
to be worked around — it is the only typeface this site may legally ship.
