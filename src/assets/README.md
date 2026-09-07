# src/assets — filenames

The images here were harvested from larssonkorgmakare.se and carried WordPress's
own filenames: `230_27193-1x1.jpg`, `C_27208_1x1.jpg`, `NM_MK.jpg`. They are now
named for what they show, in lowercase ASCII with hyphens, because a filename is
one of the few things Google Images has to rank on and a chair is something
people look for by picture rather than by word.

**The harvest record has not moved.** Every `file` in
`src/data/page-content.json` and `src/content/products/*.json` sits beside a
`url` that still holds the original WordPress address, filename included. That
field is the archive of what the client published; this table is only the map
from it to what we serve.

| Was | Is |
| --- | --- |
| `230_27193-1x1.jpg` | `badhusstolen-230-rottingfatolj-john-larsson.jpg` |
| `230pall_27244-1x1.jpg` | `pall-230-rottingpall-john-larsson.jpg` |
| `230soffa_27274-1x1.jpg` | `soffa-230-rottingsoffa-john-larsson.jpg` |
| `258_27229-1x1.jpg` | `stol-258-rottingstol-john-larsson.jpg` |
| `266_27238-1x1.jpg` | `frisorstolen-266-rottingstol-john-larsson.jpg` |
| `314_27221-1x1.jpg` | `stol-314-rottingfatolj-john-larsson.jpg` |
| `C_27208_1x1.jpg` | `stol-c-rottingfatolj-john-larsson.jpg` |
| `stockholm1_27226-1x1.jpg` | `stockholm-no-1-rottingstol-nyrens-arkitektkontor.jpg` |
| `bild-kommer_Rityta-1-kopia-4.jpg` | `bord-olika-modeller-bild-kommer.jpg` |
| `verkstad.jpg` | `verkstad-rottingstav-varms-med-gaslaga.jpg` |
| `verkstad_36511.jpg` | `verkstad-rorflatad-sits-rottingskenor.jpg` |
| `Erica1.jpg` | `korgmakare-erica-larsson-i-verkstaden.jpg` |
| `JakobsbergsgatanElin.jpg` | `korgmakeributiken-pa-jakobsbergsgatan.jpg` |
| `Verktyg.jpg` | `korgmakarverktyg-i-trelada.jpg` |
| `textbild_1.jpg` | `startsidans-textbild-sedan-1903.jpg` |
| `Reparation1.jpg` | `reparation-rottingflatning-runt-armstod.jpg` |
| `Reparation2.jpg` | `reparation-omflatning-av-rorflatad-sits.jpg` |
| `Reparation3.jpg` | `reparation-sitsflatning-i-papperssnore.jpg` |
| `Reparation4.jpg` | `reparation-rottingstav-varms-over-skruvstad.jpg` |
| `NM_MK.jpg` | `nm-040-rottingfatolj-matti-klenell-nationalmuseum.jpg` |
| `akes_csa.jpg` | `akes-fatolj-carina-seth-andersson.jpg` |
| `svenskt_tenn_miljo_mobler_50-…-83.jpg` | `svenskt-tenn-josef-frank-rottingsoffa-och-stol.jpg` |
| `svenskt_tenn_miljo_mobler_51-…-83.jpg` | `svenskt-tenn-josef-frank-rottingbord-och-liggstol.jpg` |
| `Estrid-Ericson-o-Josef-Frank-NM-…-Kjellström-…_3.jpg` | `estrid-ericson-och-josef-frank-nationalmuseum-1952.jpg` |
| `36270005.jpg` | `man-i-flatad-rottingstol-arkivbild.jpg` |
| `map-skeppsbron-46.png` | `karta-skeppsbron-46-gamla-stan-stockholm.png` |
| `Extend_and_warm_photograph_2K_202609051926.jpeg` | `ingang-sodra-dryckesgrand-larsson-korgmakare.jpeg` |

## Left alone, deliberately

`LK-80x80.png`, `LK-160x160.png` (the monogram), `Logo-300px_2_Rityta-1.png`
(the wordmark) and the four `cropped-Rityta-1-*.png` favicons. They are brand
artwork and browser chrome, not pictures of furniture; renaming them buys no
image search and costs the one thing a logo file should have, which is a stable
name. TODO(client): say so if you would rather the wordmark were renamed too.

## Rules for the next one

- ASCII only. No å, ä or ö — write `a` and `o`. Diacritics in filenames still
  break on some servers and in some tools, and one of these files carried a
  decomposed `ö` that needed a Unicode normalisation step in `src/lib/images.ts`
  just to resolve.
- Lowercase, hyphen-separated, no underscores.
- Describe the picture, do not restate the alt text. The alt text is for someone
  who cannot see the image; the filename is for a machine deciding what the
  image is of. Naming a product, what it is and who drew it does more than
  repeating a sentence about armrests.
- Do not assert what the source does not say. `36270005.jpg` shows a man in a
  rattan chair and the client publishes no caption for it, so the file is called
  `man-i-flatad-rottingstol-arkivbild.jpg` and not by any name.
