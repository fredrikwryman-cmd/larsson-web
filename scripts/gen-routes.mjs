/**
 * Generate the thin route files for both languages.
 *
 * Every page's markup lives in src/components/pages/*.astro and takes a `lang`
 * prop. A route file only decides: which language, which component, which
 * title/description, and what the other language's path is. Generating them
 * keeps the two trees from drifting apart — the commonest way a bilingual site
 * rots is one language quietly getting an edit the other does not.
 *
 * Run: node scripts/gen-routes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const P = (...p) => path.join(root, 'src', 'pages', ...p);

const mk = (file, body) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body.replace(/\n{3,}/g, '\n\n'), 'utf8');
};

/** key, sv file, en file, component, ogImageFile, breadcrumb parent key */
const SIMPLE = [
  ['home', 'index.astro', 'en/index.astro', 'Home', null, null],
  ['about', 'om-oss.astro', 'en/about.astro', 'About', 'verkstad.jpg', null],
  ['products', 'produkter.astro', 'en/products.astro', 'Products', '230_27193-1x1.jpg', null],
  ['commissions', 'uppdrag.astro', 'en/commissions.astro', 'Commissions', 'NM_MK.jpg', null],
  ['repairs', 'reparationer.astro', 'en/repairs.astro', 'Repairs', 'Reparation3.jpg', null],
  ['press', 'press.astro', 'en/press.astro', 'PressPage', 'Erica1.jpg', null],
  ['contact', 'kontakt.astro', 'en/contact.astro', 'ContactPage', null, null],
  ['thanks', 'tack.astro', 'en/thank-you.astro', 'Thanks', null, 'contact'],
  ['svensktTenn', 'svenskt-tenn.astro', 'en/svenskt-tenn.astro', 'SvensktTenn',
    'svenskt_tenn_miljo_mobler_50-1882928768-rszww1500h1500-83.jpg', 'commissions'],
];

const rel = (svFile) => (svFile.startsWith('en/') ? '../..' : '..');

for (const [key, svFile, enFile, comp, og, parent] of SIMPLE) {
  for (const [lang, file] of [
    ['sv', svFile],
    ['en', enFile],
  ]) {
    const up = rel(file);
    const other = lang === 'sv' ? 'en' : 'sv';
    const crumbs = parent
      ? `\nconst breadcrumbs = [{ label: t(lang).nav.${parent}, href: withBase(PAGE_PATHS.${parent}[lang]) }];`
      : '';
    mk(
      P(file),
      `---
import Base from '${up}/layouts/Base.astro';
import Page from '${up}/components/pages/${comp}.astro';
import { PAGE_PATHS, withBase, type Lang } from '${up}/i18n/config';
import { pageMeta } from '${up}/i18n/meta';
import { t } from '${up}/i18n/ui';

const lang: Lang = '${lang}';
const meta = pageMeta.${key}.${lang};${crumbs}
---

<Base
  lang={lang}
  altPath={PAGE_PATHS.${key}.${other}}
  title={meta.title}
  description={meta.description}${og ? `\n  ogImageFile="${og}"` : ''}${parent ? '\n  breadcrumbs={breadcrumbs}' : ''}${key === 'home' ? '\n  showWordmark' : ''}
>
  <Page lang={lang} />
</Base>
`
    );
  }
}

/** The two Nationalmuseum case pages share a component. */
const CASES = [
  ['nm040', 'nm-040.astro', 'en/nm-040.astro', 'nm-040',
    'https://www.mattiklenell.com/NM-040-Larsson-Korgmakare-2018', 'NM_MK.jpg'],
  ['akes', 'akes.astro', 'en/akes.astro', 'akes',
    'http://www.carinasethandersson.com/', 'akes_csa.jpg'],
];

for (const [key, svFile, enFile, slug, href, og] of CASES) {
  for (const [lang, file] of [
    ['sv', svFile],
    ['en', enFile],
  ]) {
    const up = rel(file);
    const other = lang === 'sv' ? 'en' : 'sv';
    mk(
      P(file),
      `---
import Base from '${up}/layouts/Base.astro';
import CasePage from '${up}/components/CasePage.astro';
import { PAGE_PATHS, withBase, type Lang } from '${up}/i18n/config';
import { pageMeta } from '${up}/i18n/meta';
import { t } from '${up}/i18n/ui';

const lang: Lang = '${lang}';
const meta = pageMeta.${key}.${lang};
const breadcrumbs = [
  { label: t(lang).nav.commissions, href: withBase(PAGE_PATHS.commissions[lang]) },
];
---

<Base
  lang={lang}
  altPath={PAGE_PATHS.${key}.${other}}
  title={meta.title}
  description={meta.description}
  ogImageFile="${og}"
  breadcrumbs={breadcrumbs}
>
  <CasePage slug="${slug}" externalHref="${href}" lang={lang} />
</Base>
`
    );
  }
}

/** Dynamic routes: 9 products and 3 categories, per language. */
for (const [lang, file] of [
  ['sv', 'portfolios/[slug].astro'],
  ['en', 'en/portfolios/[slug].astro'],
]) {
  const up = lang === 'sv' ? '../..' : '../../..';
  const other = lang === 'sv' ? 'en' : 'sv';
  mk(
    P(file),
    `---
import Base from '${up}/layouts/Base.astro';
import ProductDetail from '${up}/components/pages/ProductDetail.astro';
import { productsInOrder, cardTitle } from '${up}/lib/products';
import { productEn } from '${up}/lib/content';
import { getImage as getAsset } from '${up}/lib/images';
import { getImage as astroGetImage } from 'astro:assets';
import { company } from '${up}/data/company';
import { categoryLabel } from '${up}/data/categories';
import { PAGE_PATHS, productPath, withBase, type Lang } from '${up}/i18n/config';
import { t } from '${up}/i18n/ui';

export async function getStaticPaths() {
  const sorted = await productsInOrder();
  return sorted.map((entry, i) => ({
    params: { slug: entry.data.slug },
    props: {
      entry,
      prev: sorted[(i - 1 + sorted.length) % sorted.length],
      next: sorted[(i + 1) % sorted.length],
    },
  }));
}

const lang: Lang = '${lang}';
const { entry, prev, next } = Astro.props;
const d = entry.data;

const en = lang === 'en' ? productEn(d.slug) : null;
const description = en ? en.description : d.description;
const material = en ? en.material : d.material;

const hero = d.images[0];
const ogImg = await astroGetImage({ src: getAsset(hero.file), width: 1200, format: 'jpeg' });
const heroAbs = new URL(ogImg.src, Astro.site).href;

/** Product JSON-LD. No \`offers\` — the site publishes no price anywhere. */
const dims: Record<string, number | null> = {
  ${lang === 'sv' ? "Höjd: d.dimensions.height_mm,\n  Djup: d.dimensions.depth_mm,\n  Bredd: d.dimensions.width_mm,\n  Sitshöjd: d.dimensions.seat_height_mm," : "Height: d.dimensions.height_mm,\n  Depth: d.dimensions.depth_mm,\n  Width: d.dimensions.width_mm,\n  'Seat height': d.dimensions.seat_height_mm,"}
};
const additionalProperty = Object.entries(dims)
  .filter(([, v]) => v !== null)
  .map(([name, v]) => ({ '@type': 'PropertyValue', name, value: v, unitCode: 'MMT' }));

const structuredData: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: d.name,
  description: description ?? d.body_text,
  image: heroAbs,
  category: categoryLabel(d.category_slug, lang),
  manufacturer: { '@type': 'Organization', name: company.legalName },
  inLanguage: lang,
};
if (material) structuredData.material = material;
if (additionalProperty.length) structuredData.additionalProperty = additionalProperty;

const breadcrumbs = [
  { label: t(lang).nav.products, href: withBase(PAGE_PATHS.products[lang]) },
];
---

<Base
  lang={lang}
  altPath={productPath('${other}', d.slug)}
  title={cardTitle(d.slug, d.name)}
  description={(description ?? '').slice(0, 158)}
  ogImageFile={hero.file}
  structuredData={structuredData}
  breadcrumbs={breadcrumbs}
>
  <ProductDetail lang={lang} entry={entry} prev={prev} next={next} />
</Base>
`
  );
}

for (const [lang, file] of [
  ['sv', 'portfolio-category/[slug].astro'],
  ['en', 'en/portfolio-category/[slug].astro'],
]) {
  const up = lang === 'sv' ? '../..' : '../../..';
  const other = lang === 'sv' ? 'en' : 'sv';
  mk(
    P(file),
    `---
import Base from '${up}/layouts/Base.astro';
import CategoryPage from '${up}/components/pages/CategoryPage.astro';
import { categories } from '${up}/data/categories';
import { productItems } from '${up}/lib/products';
import { PAGE_PATHS, categoryPath, withBase, type Lang } from '${up}/i18n/config';
import { t } from '${up}/i18n/ui';

export async function getStaticPaths() {
  const items = await productItems();
  return categories.map((cat) => ({
    params: { slug: cat.slug },
    props: { cat, items: items.filter((p) => p.categorySlug === cat.slug) },
  }));
}

const lang: Lang = '${lang}';
const { cat, items } = Astro.props;

const breadcrumbs = [
  { label: t(lang).nav.products, href: withBase(PAGE_PATHS.products[lang]) },
];
---

<Base
  lang={lang}
  altPath={categoryPath('${other}', cat.slug)}
  title={cat.label[lang]}
  description={cat.description[lang]}
  ogImageFile={items[0]?.file}
  breadcrumbs={breadcrumbs}
>
  <CategoryPage lang={lang} cat={cat} items={items} />
</Base>
`
  );
}

console.log('routes generated');
