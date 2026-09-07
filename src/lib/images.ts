import type { ImageMetadata } from 'astro';
import altText from '../data/alt-text.json';
import altTextEn from '../i18n/alt-text.en.json';
import type { Lang } from '../i18n/config';

/**
 * Resolve an image by its filename in src/assets.
 *
 * Astro's <Image> needs a real module reference, not a string path, so every
 * asset is eagerly globbed once here and looked up by basename. One vocabulary
 * across the whole project: the same string names the file on disk, keys the
 * alt text, and appears in the JSON the pages read.
 *
 * The filenames are no longer the harvest's. They were the WordPress originals
 * — 230_27193-1x1.jpg, C_27208_1x1.jpg — and are now descriptive, lowercase,
 * ASCII and hyphenated, because the filename is one of the few signals Google
 * Images has to go on and a chair is something people look for by picture. The
 * WordPress name is still recorded, unchanged, in the `url` field beside every
 * `file` in src/data/page-content.json and src/content/products/*.json: that is
 * the harvest record and it does not move. src/assets/README.md holds the map.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/*.{jpg,jpeg,png,JPG,JPEG,PNG}',
  { eager: true }
);

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split('/').pop();
  // Filenames are normalised to Unicode NFC on import; normalise the key too.
  // This used to matter for a decomposed "ö" in the Kjellström photo's name.
  // Every asset is ASCII now, so nothing depends on it — it stays because the
  // next file someone drops in here may not be.
  if (name) byName.set(name.normalize('NFC'), mod.default);
}

export function getImage(file: string): ImageMetadata {
  const img = byName.get(file.normalize('NFC'));
  if (!img) {
    throw new Error(
      `Unknown image "${file}". Available: ${[...byName.keys()].sort().join(', ')}`
    );
  }
  return img;
}

const alts: Record<Lang, Record<string, string>> = {
  sv: altText as Record<string, string>,
  en: altTextEn as Record<string, string>,
};

/**
 * Approved Swedish alt text for a harvested image, from alt-drafts.md.
 *
 * Drafts were written by looking at every image; they are pending client
 * review but are far better than the `alt=""` every content image ships with
 * on the live site. Returns undefined for files with no draft, so the caller
 * must decide explicitly rather than silently rendering an empty alt.
 */
export function getAlt(file: string, lang: Lang = 'sv'): string | undefined {
  return alts[lang][file.normalize('NFC')];
}

/**
 * Widths to generate for a full-bleed-ish content image. Deliberately capped
 * at the source width (1181px for most photos) — there is nothing larger to
 * upscale from.
 */
export const CONTENT_WIDTHS = [320, 480, 640, 900, 1200];

/** Widths for a grid thumbnail. */
export const THUMB_WIDTHS = [200, 320, 480, 640];
