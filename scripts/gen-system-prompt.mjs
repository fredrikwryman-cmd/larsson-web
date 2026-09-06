/**
 * Generate worker/system-prompt.js from src/data/assistant-knowledge.ts.
 *
 * The worker is deployed separately from the site, so the prompt has to exist
 * as a file it can import. This script is the only thing that writes it — the
 * generated file carries a header saying so. Edit the knowledge, never the
 * output.
 *
 * Run: node scripts/gen-system-prompt.mjs   (also runs as part of `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const src = pathToFileURL(path.join(root, 'src/data/assistant-knowledge.ts')).href;
const { buildSystemPrompt } = await import(src);

const sv = buildSystemPrompt('sv');
const en = buildSystemPrompt('en');

const out = `/* GENERATED FILE — DO NOT EDIT.
 *
 * Written by scripts/gen-system-prompt.mjs from src/data/assistant-knowledge.ts,
 * which reads the site's own data: company.ts, the nine product records,
 * page-content.json, content.en.json and the verified press list.
 *
 * Every business fact the assistant knows has exactly one home, and it is not
 * this file. If something here is wrong, fix the data and regenerate.
 *
 * Generated ${new Date().toISOString().slice(0, 10)}.
 */

export const SYSTEM_PROMPT = {
  sv: ${JSON.stringify(sv)},
  en: ${JSON.stringify(en)},
};
`;

fs.mkdirSync(path.join(root, 'worker'), { recursive: true });
fs.writeFileSync(path.join(root, 'worker/system-prompt.js'), out, 'utf8');
console.log(
  `system-prompt.js written — sv ${sv.length} chars, en ${en.length} chars`
);
