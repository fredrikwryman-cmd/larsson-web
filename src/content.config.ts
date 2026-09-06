import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Product collection — the 9 rattan furniture models Larsson Korgmakare has in
 * production, harvested from the live WordPress site on 2026-09-05.
 *
 * ---------------------------------------------------------------------------
 * TEXT IS VERBATIM SWEDISH. DO NOT EDIT IT.
 * ---------------------------------------------------------------------------
 * Two known oddities in the source are preserved deliberately and must NOT be
 * "fixed" without the client saying so:
 *
 *   1. `stol-258.json` has `name: "Soffa 258"` while its URL, page <title>,
 *      product-grid card, category page and its own body copy all say
 *      "Stol 258". The visible heading on the live page is the odd one out.
 *
 *   2. `pall-230` and `soffa-230` both refer in their body text to "Stol 230",
 *      a product that has no page — the chair in question is published as
 *      "Badhusstolen 230".
 *
 * Both are content decisions for the client, not defects to silently correct.
 * ---------------------------------------------------------------------------
 */

/**
 * Dimensions in millimetres.
 *
 * Every value is nullable, and the nulls are meaningful rather than missing
 * data — see `dimensionsRaw` for what the source actually said:
 *
 *  - `seat_height_mm` is null for `soffa-230` (300/360), `stol-314` (310/380)
 *    and `stol-c` (310/400). The source gives a RANGE, not a single number, so
 *    there is no honest integer to store. The verbatim string survives in
 *    `dimensions_raw`.
 *  - `seat_height_mm` is also null for `pall-230`, which simply has no
 *    "Sitshöjd" line at all.
 *  - `depth_mm` is null for `pall-230`, which is the only product that
 *    measures "Längd" (length) instead of "Djup" (depth). That value lives in
 *    `dimensions_extra`.
 *  - All four are null for `bord-olika-modeller`, a made-to-order item that
 *    publishes no measurements.
 *
 * No product on the site expresses a dimension in cm — everything is already
 * in mm — but `dimensions_raw` is populated regardless so no wording is lost.
 */
const dimensions = z.object({
  height_mm: z.number().int().positive().nullable(),
  depth_mm: z.number().int().positive().nullable(),
  width_mm: z.number().int().positive().nullable(),
  seat_height_mm: z.number().int().positive().nullable(),
});

const image = z.object({
  /**
   * Absolute source URL on the old WordPress install.
   *
   * NORMALISED ON IMPORT: the live pages emit these as `http://` while serving
   * the page itself over HTTPS. All 9 product image URLs were rewritten to
   * `https://` when this collection was generated. (Phase 1 counted 42 such
   * `src` attributes across all 22 archived pages; the other 33 sit on
   * non-product pages and are outside this collection.)
   */
  url: z.string().url().refine((u) => u.startsWith('https://'), {
    message: 'Image URLs must be https:// — the http:// originals are normalised on import.',
  }),
  /**
   * Alt text as published. Null everywhere, because the live site ships
   * `alt=""` on every content image. Swedish drafts for all of them are in
   * `larsson-harvest/alt-drafts.md`, pending human review — do not wire those
   * in until a person has approved them.
   */
  alt: z.string().nullable(),
  /**
   * Basename of the corresponding file in `src/assets/`. Derived on import so
   * pages can resolve the local asset without re-parsing the URL. This is the
   * full-size master; Astro's image pipeline generates its own responsive
   * variants, so none of the WordPress `-600x600`-style files were imported.
   */
  file: z.string().min(1),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/products' }),
  schema: z.object({
    slug: z.string().min(1),

    /** Heading as it appears on the live page. See the `stol-258` note above. */
    name: z.string().min(1),

    /** "John Larsson", "Nyréns arkitektkontor", "Larsson korgmakare". */
    designer: z.string().nullable(),

    /** Free-form Swedish decade string: "1940-tal", "1930/40-tal". Never a number. */
    year: z.string().nullable(),

    /** The "för <kund>" line. Null on the 3 products that have none. */
    client: z.string().nullable(),

    /** Text after "Material:", verbatim. */
    material: z.string().nullable(),

    dimensions,

    /**
     * The measurement paragraph exactly as published, lines joined with " | ".
     * This is the lossless record: seat-height ranges, `Längd` instead of
     * `Djup`, and the stray sentence inside `pall-230`'s block all survive
     * here even where the typed fields above are null.
     * Absent on `bord-olika-modeller`, which has no measurement block.
     */
    dimensions_raw: z.string().optional(),

    /**
     * Labelled measurements that do not map onto the four typed slots.
     * Currently only `{ "Längd": "480 mm" }` on `pall-230`.
     */
    dimensions_extra: z.record(z.string(), z.string()).optional(),

    /** The "Rengöres med..." care paragraph, minus the trailing "Tillbaka…" link. */
    care: z.string().nullable(),

    /**
     * EVERY line of the page's content area, in source order, newline-joined —
     * heading, designer line, "Beställ här…", description, material,
     * dimensions, care text and "Tillbaka…". Navigation, header and footer are
     * excluded. This is the archival record; render from the typed fields
     * instead, and keep this for verification.
     */
    body_text: z.string().min(1),

    /** Just the narrative paragraph(s) — body_text minus the structured lines. */
    description: z.string().nullable(),

    /** One of the 3 portfolio categories. */
    category_slug: z.enum([
      'formgiven-av-john-larsson',
      'formgiven-av-nyrens-arkitektkontor',
      'formgivna-av-larsson-korgmakare',
    ]),

    images: z.array(image).min(1),

    /** Canonical URL on the old site, for the redirect map and for provenance. */
    source_url: z.string().url(),
  }),
});

export const collections = { products };
