import { getCollection } from 'astro:content';
import { productEn } from './content';
import { LANGS, type Lang } from '../i18n/config';

/** Live grid order — used by /produkter/, the category pages and prev/next. */
export const PRODUCT_ORDER = [
  'badhusstolen-230',
  'pall-230',
  'soffa-230',
  'stol-258',
  'frisorstolen-266',
  'stol-314',
  'stol-c',
  'stockholm-nr-1',
  'bord-olika-modeller',
] as const;

/**
 * TODO(client): the live site calls this product TWO different things
 * depending on where you look, and both are reproduced faithfully:
 *
 *   - product page <h1>            -> "Soffa 258"   (from the collection)
 *   - grid card, category page,
 *     <title> and the URL          -> "Stol 258"    (this override)
 *
 * Its own body copy says "Stol 258 är en av de äldsta modellerna…", so five
 * of six surfaces say Stol and the detail heading is the odd one out.
 * Normalising them would be a content decision the client has not made, so
 * the inconsistency is preserved exactly as published.
 */
const CARD_TITLE_OVERRIDES: Record<string, string> = {
  'stol-258': 'Stol 258',
};

export interface GridItem {
  slug: string;
  name: string;
  categorySlug: string;
  file: string;
  /**
   * Ready-to-render measurement lines per language. Empty for a product that
   * publishes no measurements at all (bord-olika-modeller) — callers render
   * nothing in that case rather than an empty block.
   */
  dimensions: Record<Lang, string[]>;
}

/**
 * The measurement segments of a verbatim `dimensions_raw` line.
 *
 * The raw line is the lossless published record and is preferred over the typed
 * `dimensions.*_mm` fields, which are null exactly where the source is not a
 * plain number: the seat-height RANGES on soffa-230 / stol-314 / stol-c, and
 * pall-230, which measures "Längd" (length) rather than "Djup" and has no seat
 * height at all. Splitting the raw line therefore cannot fabricate a value.
 *
 * Segments that are not a "Label: value" pair are dropped: pall-230's raw block
 * ends with a whole sentence ("Pall 230 kan även måttbeställas."), which is
 * product-page prose, not a measurement, and would read as noise on a card. It
 * still renders in full on the product page, which prints the raw line as-is.
 */
export function cardMeasurements(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(' | ')
    .map((part) => part.trim())
    .filter((part) => /^[^:]+:\s*\S/.test(part));
}

/** Products in live grid order, as grid-card items. */
export async function productItems(): Promise<GridItem[]> {
  const products = await getCollection('products');
  return PRODUCT_ORDER.map((slug) => {
    const p = products.find((e) => e.data.slug === slug);
    if (!p) throw new Error(`Missing product "${slug}"`);
    const raw: Record<Lang, string | null | undefined> = {
      sv: p.data.dimensions_raw,
      en: productEn(p.data.slug).dimensionsRaw,
    };
    const dimensions = Object.fromEntries(
      LANGS.map((lang) => [lang, cardMeasurements(raw[lang])])
    ) as Record<Lang, string[]>;

    return {
      slug: p.data.slug,
      name: CARD_TITLE_OVERRIDES[p.data.slug] ?? p.data.name,
      categorySlug: p.data.category_slug,
      file: p.data.images[0].file,
      dimensions,
    };
  });
}

/** Products in live grid order, as collection entries. */
export async function productsInOrder() {
  const products = await getCollection('products');
  return PRODUCT_ORDER.map((slug) => products.find((e) => e.data.slug === slug)!);
}

/** The label used on cards and in <title> — see the override note above. */
export function cardTitle(slug: string, name: string): string {
  return CARD_TITLE_OVERRIDES[slug] ?? name;
}
