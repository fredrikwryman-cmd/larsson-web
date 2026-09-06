#!/usr/bin/env node
/**
 * Refuse to call a build deployable if it contains an unlicensed typeface.
 *
 * Run this in CI immediately before any publish step:
 *
 *     npm run build && npm run verify:deployable && <deploy>
 *
 * It is the last line of defence. Two earlier guards already exist in
 * astro.config.mjs — one refuses to build Gravur when a CI/deploy signal is
 * present, one fails the build if a licensed build somehow emitted Gravur —
 * but those only run when the build runs. This checks the artefact itself, so
 * it also catches a stale `dist/` left over from a local FONT=gravur preview.
 *
 * Exit 0 = safe to publish. Exit 1 = do not publish.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');

if (!fs.existsSync(dist)) {
  console.error('[verify:deployable] No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

const marker = path.join(dist, '.LOCAL-ONLY-DO-NOT-DEPLOY');
// Fatal: font bytes, or a url() that would fetch them.
// Inert: the family-name strings tokens.css ships in every build. They load
// nothing unless <html data-font="gravur">, which a licensed build never sets.
const hits = [];
const inert = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const rel = path.relative(dist, full);
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

walk(dist);

if (fs.existsSync(marker)) {
  console.error('\n[verify:deployable] REFUSING: dist/.LOCAL-ONLY-DO-NOT-DEPLOY is present.');
  console.error('  This build was produced with FONT=gravur and must not be published.');
  console.error('  Rebuild with: FONT=archivo npm run build\n');
  process.exit(1);
}

if (hits.length > 0) {
  console.error('\n[verify:deployable] REFUSING: unlicensed font artefacts found in dist/:\n');
  for (const h of hits) console.error('    - ' + h);
  console.error('\n  Gravur is commercial and we hold no licence. Do not publish this build.');
  console.error('  Rebuild with: FONT=archivo npm run build\n');
  process.exit(1);
}

if (inert.length > 0) {
  console.log(
    `[verify:deployable] note: ${inert.length} file(s) carry the inert Gravur family name from ` +
      'tokens.css. No font bytes and no url() reference — nothing can load it.'
  );
}
console.log('[verify:deployable] OK — no unlicensed font bytes in dist/. Safe to publish.');
