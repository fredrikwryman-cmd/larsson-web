/**
 * Two languages. Swedish is the original and its URLs never change — the site
 * has been at those paths for years and inbound links depend on them. English
 * lives under /en/ with translated slugs for the ordinary pages, and keeps the
 * Swedish slugs for products and categories because those are proper nouns
 * (Badhusstolen 230 is Badhusstolen 230 in both languages).
 */
export const LANGS = ['sv', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'sv';

/** Every fixed page, by a stable key, in both languages. */
export const PAGE_PATHS = {
  home: { sv: '/', en: '/en/' },
  about: { sv: '/om-oss/', en: '/en/about/' },
  history: { sv: '/historia/', en: '/en/history/' },
  products: { sv: '/produkter/', en: '/en/products/' },
  commissions: { sv: '/uppdrag/', en: '/en/commissions/' },
  repairs: { sv: '/reparationer/', en: '/en/repairs/' },
  press: { sv: '/press/', en: '/en/press/' },
  contact: { sv: '/kontakt/', en: '/en/contact/' },
  thanks: { sv: '/tack/', en: '/en/thank-you/' },
  nm040: { sv: '/nm-040/', en: '/en/nm-040/' },
  akes: { sv: '/akes/', en: '/en/akes/' },
  svensktTenn: { sv: '/svenskt-tenn/', en: '/en/svenskt-tenn/' },
} as const;

export type PageKey = keyof typeof PAGE_PATHS;

export const productPath = (lang: Lang, slug: string) =>
  lang === 'sv' ? `/portfolios/${slug}/` : `/en/portfolios/${slug}/`;

export const categoryPath = (lang: Lang, slug: string) =>
  lang === 'sv' ? `/portfolio-category/${slug}/` : `/en/portfolio-category/${slug}/`;

/** The base path GitHub Pages serves the site from. */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix a site-relative path with the deployment base. */
export const withBase = (path: string) => `${base}${path}`;

/** The six links in the main navigation, in the client's own order. */
export const NAV_KEYS: PageKey[] = [
  'about',
  'products',
  'commissions',
  'repairs',
  'press',
  'contact',
];

/** The other language, for the switcher and for hreflang. */
export const otherLang = (lang: Lang): Lang => (lang === 'sv' ? 'en' : 'sv');
