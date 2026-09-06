import data from '../data/page-content.json';
import en from '../i18n/content.en.json';
import type { Lang } from '../i18n/config';

export interface TextBlock {
  t: string;
  lines: string[];
}
export interface ImgBlock {
  t: 'img';
  file: string;
  href: string | null;
}
export interface LinkBlock {
  t: 'a';
  text: string;
  href: string | null;
}
export type Block = TextBlock | ImgBlock | LinkBlock;

const pages = data as unknown as Record<string, { title: string; blocks: Block[] }>;
const english = en as unknown as {
  pages: Record<string, TextBlock[]>;
  products: Record<string, ProductEn>;
};

export interface ProductEn {
  designerLines: string[];
  orderLabel: string;
  description: string;
  material: string;
  dimensionsRaw?: string;
  care: string;
  backLabel: string;
}

/**
 * Verbatim harvested content for a page, keyed by its harvest slug.
 *
 * Pages render FROM this data rather than from retyped strings, so the client's
 * Swedish copy cannot drift through a transcription slip.
 */
export function pageBlocks(slug: string): Block[] {
  const p = pages[slug];
  if (!p) throw new Error(`No harvested content for page "${slug}"`);
  return p.blocks;
}

/**
 * The prose blocks of a page in the requested language.
 *
 * The English array is validated to be exactly parallel to the Swedish — same
 * block count, same order, same number of lines per block — so callers can
 * index into either identically. The one exception is the three category pages,
 * where the untranslated English string "Portfolio category:" is dropped from
 * the Swedish side too, since the rebuild replaces it with a real heading.
 */
export function prose(slug: string, lang: Lang = 'sv'): TextBlock[] {
  const sv = pageBlocks(slug).filter(
    (b): b is TextBlock =>
      'lines' in b && b.lines.length > 0 && b.lines[0] !== 'Portfolio category:'
  );
  if (lang === 'sv') return sv;

  const t = english.pages[slug];
  if (!t) throw new Error(`No English translation for page "${slug}"`);
  if (t.length !== sv.length) {
    throw new Error(
      `English translation for "${slug}" has ${t.length} blocks, Swedish has ${sv.length}`
    );
  }
  return t;
}

/** English strings for a product, or undefined when rendering Swedish. */
export function productEn(slug: string): ProductEn {
  const p = english.products[slug];
  if (!p) throw new Error(`No English translation for product "${slug}"`);
  return p;
}

/** The images a page carries, in source order. Language-independent. */
export function images(slug: string): ImgBlock[] {
  return pageBlocks(slug).filter((b): b is ImgBlock => b.t === 'img');
}
