// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/* ===========================================================================
   TYPEFACE SELECTION — FONT=archivo (default) | FONT=gravur

   Archivo is OFL-licensed and is what any build produces unless someone opts
   in explicitly. Gravur is the commercial face the live site uses; we hold no
   licence for it and it exists only for local visual comparison.

   The switch does three things:
     1. aliases the optional @font-face slot to the Gravur block or to an empty
        file, so a licensed build never even references the unlicensed files;
     2. exposes the choice to components as import.meta.env.PUBLIC_FONT, which
        Base.astro puts on <html data-font="…"> to select the token values;
     3. refuses to run at all in the wrong circumstances — see the guards.
   =========================================================================== */
const FONT = (process.env.FONT ?? 'archivo').trim().toLowerCase();

if (!['archivo', 'gravur'].includes(FONT)) {
  throw new Error(
    `\n[font] FONT="${process.env.FONT}" is not a valid choice.\n` +
      `       Use FONT=archivo (default, licensed) or FONT=gravur (local preview only).\n`
  );
}

const GRAVUR_DIR = path.join(root, 'src/assets/fonts/gravur');
const GRAVUR_FILES = [
  'gravur-light.woff2',
  'gravur-light.woff',
  'gravur-regular.woff2',
  'gravur-regular.woff',
];

/* --- GUARD 1: never build Gravur into something that is about to be shipped.
   If any common CI/deploy signal is present, refuse outright. This is the guard
   that stops an unlicensed font reaching a deployed artefact, because it stops
   the artefact being produced in the first place. */
const DEPLOY_SIGNALS = ['CI', 'GITHUB_ACTIONS', 'NETLIFY', 'VERCEL', 'CF_PAGES', 'DEPLOY'];
const activeSignal = DEPLOY_SIGNALS.find((k) => process.env[k]);

if (FONT === 'gravur' && activeSignal) {
  throw new Error(
    `\n[font] REFUSING TO BUILD.\n` +
      `       FONT=gravur was set, but ${activeSignal} is present, so this build\n` +
      `       looks like it is producing a deployable artefact.\n\n` +
      `       Gravur is commercial and unlicensed. It may be used for a local\n` +
      `       preview only and must never be deployed.\n\n` +
      `       Build with FONT=archivo (or just omit FONT).\n`
  );
}

/* --- GUARD 2: fail loudly, never silently.
   If Gravur is requested but the files are not there, stop. Falling back to
   Archivo without saying so would leave someone comparing against the original
   while believing they are looking at Gravur. */
if (FONT === 'gravur') {
  const missing = GRAVUR_FILES.filter((f) => !fs.existsSync(path.join(GRAVUR_DIR, f)));
  if (missing.length > 0) {
    throw new Error(
      `\n[font] FONT=gravur was requested but these files are missing from\n` +
        `       src/assets/fonts/gravur/:\n\n` +
        missing.map((m) => `         - ${m}`).join('\n') +
        `\n\n       They are git-ignored on purpose and are never committed, so a\n` +
        `       fresh clone will not have them. See that folder's README.md.\n` +
        `       Build with FONT=archivo to use the licensed typeface.\n`
    );
  }
  console.warn(
    '\n\x1b[33m[font] FONT=gravur — building with an UNLICENSED typeface.\x1b[0m\n' +
      '\x1b[33m       Local preview only. This output must not be deployed.\x1b[0m\n'
  );
}

/* --- GUARD 3: check the actual output, not just the intent.
   After the build, scan dist/ for any Gravur trace — filenames and the contents
   of every text asset. A licensed build that somehow emitted one fails here. A
   Gravur build gets a marker file so the directory itself says what it is. */
const gravurGuard = {
  name: 'gravur-guard',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const distDir = fileURLToPath(dir);
      // Two different things, deliberately kept apart:
      //   hits  — font BYTES, or a url() that would load them. Fatal.
      //   inert — the family-name strings in tokens.css. They ship in every
      //           build, load nothing, and only ever apply under
      //           data-font="gravur", which a licensed build never sets.
      const hits = [];
      const inert = [];
      const walk = (d) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          const rel = path.relative(distDir, full);
          if (/gravur/i.test(entry.name)) {
            hits.push(rel + '  (font file)');
            continue;
          }
          if (/\.(css|js|html|xml|txt|json)$/i.test(entry.name)) {
            const text = fs.readFileSync(full, 'utf8');
            if (/url\([^)]*gravur/i.test(text)) {
              hits.push(rel + '  (url() would load Gravur)');
            } else if (/gravur/i.test(text)) {
              inert.push(rel);
            }
          }
        }
      };
      walk(distDir);

      if (FONT !== 'gravur' && inert.length > 0) {
        logger.info(
          `no Gravur bytes in dist/. ${inert.length} file(s) carry the inert family name ` +
            `from tokens.css, which loads nothing without data-font="gravur".`
        );
      }

      if (FONT !== 'gravur' && hits.length > 0) {
        throw new Error(
          `\n[gravur-guard] A licensed build (FONT=${FONT}) emitted Gravur into dist/:\n\n` +
            hits.map((h) => `    - ${h}`).join('\n') +
            `\n\n  This output must not be published. Fix the build before deploying.\n`
        );
      }

      if (FONT === 'gravur') {
        fs.writeFileSync(
          path.join(distDir, '.LOCAL-ONLY-DO-NOT-DEPLOY'),
          'This build was produced with FONT=gravur.\n\n' +
            'It embeds Gravur, a commercial typeface for which we hold no licence.\n' +
            'It is for local preview only and MUST NOT be published or deployed.\n' +
            'Rebuild with FONT=archivo to produce a deployable artefact.\n\n' +
            'Gravur artefacts in this build:\n' +
            hits.map((h) => `  - ${h}`).join('\n') +
            '\n'
        );
        logger.warn(
          `built with UNLICENSED Gravur (${hits.length} artefact${hits.length === 1 ? '' : 's'}). ` +
            'dist/.LOCAL-ONLY-DO-NOT-DEPLOY written. Do not deploy this output.'
        );
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  /**
   * Future GitHub Pages URL.
   *
   * TODO(confirm): derived from the local GitHub account (`fredrikwryman-cmd`)
   * and a repo named `larsson-web`. If the repo is created under a different
   * name or owner, change `site` AND `base` together — a mismatch silently
   * breaks every absolute URL in the sitemap.
   *
   * TODO(launch): when the client's real domain is connected, set
   * `site` to that domain and delete `base` entirely.
   */
  site: 'https://fredrikwryman-cmd.github.io',
  base: '/larsson-web',

  /**
   * The live WordPress site serves every URL with a trailing slash
   * (`/produkter/`, `/portfolios/stol-c/`). Matching that means the rebuilt
   * URLs are identical to the old ones, so no redirect map is needed and no
   * inbound link breaks. `format: 'directory'` emits `produkter/index.html`,
   * which is what GitHub Pages needs to serve `/produkter/` without a redirect.
   */
  trailingSlash: 'always',
  build: { format: 'directory' },

  vite: {
    resolve: {
      alias: {
        // The optional @font-face slot. Resolves to the Gravur block only when
        // FONT=gravur; otherwise to an empty file, so a licensed build contains
        // no reference to an unlicensed font and Vite emits nothing for it.
        'virtual:optional-font-face':
          FONT === 'gravur'
            ? path.join(root, 'src/styles/font-face-gravur.css')
            : path.join(root, 'src/styles/font-face-none.css'),
      },
    },
    define: {
      'import.meta.env.PUBLIC_FONT': JSON.stringify(FONT),
    },
  },

  integrations: [
    gravurGuard,
    sitemap({
      /**
       * The current WordPress sitemap lists 14 URLs and omits ALL NINE
       * `/portfolios/` product pages — the commercial point of the site — while
       * also answering HTTP 404 with a valid XML body. That is the single worst
       * defect on the existing site.
       *
       * This integration walks every route Astro actually builds, so the
       * product pages are included automatically once they exist. The filter
       * below is deliberately permissive: it excludes nothing today. If anyone
       * ever adds an exclusion here, they must confirm by hand that
       * `/portfolios/*` still survives it.
       */
      filter: (page) => {
        // Guard rail: product pages may never be filtered out.
        if (page.includes('/portfolios/')) return true;
        /*
         * The two thank-you pages are reached only after a form post. They are
         * not destinations, they say nothing a searcher wants, and listing them
         * invites a crawler to index a page that reads as a dead end.
         */
        if (page.endsWith('/tack/') || page.endsWith('/thank-you/')) return false;
        return true;
      },
      changefreq: 'yearly',
      lastmod: new Date(),
    }),
  ],
});
