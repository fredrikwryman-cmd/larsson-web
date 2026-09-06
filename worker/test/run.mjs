/* ---------------------------------------------------------------------------
   Self-contained test harness for worker/index.js.

   No Anthropic key, no network, no deploy. globalThis.fetch is replaced with a
   stub that impersonates api.anthropic.com, env is built here, and the KV
   namespace is a tiny in-memory fake that honours expirationTtl.

   Run from the project root:   node worker/test/run.mjs
   --------------------------------------------------------------------------- */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../index.js';
import { SYSTEM_PROMPT } from '../system-prompt.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(path.join(here, '..', 'index.js'), 'utf8');

/* --- constants read straight out of the worker source, so the report cannot
       drift from the code ---------------------------------------------------- */
function lista(namn) {
  const m = SRC.match(new RegExp('const ' + namn + ' = \\[([\\s\\S]*?)\\];'));
  return (m ? m[1] : '')
    .split(/,|\n/)
    .map((r) => r.trim().replace(/^'|'$/g, ''))
    .filter((r) => r.startsWith('http'));
}
function tal(namn) {
  const m = SRC.match(new RegExp('const ' + namn + ' = ([^;]+);'));
  return m ? Function('"use strict";return (' + m[1] + ')')() : null;
}
const KONST = {
  ALLOWED_ORIGINS: lista('ALLOWED_ORIGINS'),
  LOKALA_ORIGINS: lista('LOKALA_ORIGINS'),
  MODEL: String(tal('MODEL')),
  MAX_HISTORY: tal('MAX_HISTORY'),
  MAX_CHARS: tal('MAX_CHARS'),
  MAX_TOKENS: tal('MAX_TOKENS'),
  MAX_BODY_BYTES: tal('MAX_BODY_BYTES'),
  MINNE_TAK: tal('MINNE_TAK'),
  UPPSTROMS_TIMEOUT_MS: tal('UPPSTROMS_TIMEOUT_MS'),
  IP_TAK: tal('IP_TAK'),
  IP_FONSTER_S: tal('IP_FONSTER_S'),
  DAG_TAK: tal('DAG_TAK'),
};

const OGILTIG = 'Ogiltig förfrågan';
const FEL_SV = 'Något gick fel på vår sida. Ring 08-411 50 53 eller mejla info@larssonkorgmakare.se så hjälper vi dig.';
const FEL_EN = 'Something went wrong at our end. Call 08-411 50 53 or email info@larssonkorgmakare.se and we will help you.';
const TAK_SV = 'Det har blivit många frågor på kort tid. Vänta en stund och försök igen, eller ring 08-411 50 53.';
const TAK_EN = 'There have been a lot of questions in a short time. Wait a moment and try again, or call 08-411 50 53.';
const LANGT_SV = 'Meddelandet är för långt. Korta ner det lite och skicka igen.';
const LANGT_EN = 'That message is too long. Please shorten it a little and send again.';
const HISTORIK_SV = 'Samtalet har blivit långt. Välj Börja om, så tar vi det från början.';
const HISTORIK_EN = 'This conversation has grown long. Choose Start again and we will begin afresh.';

/* --- console capture --------------------------------------------------------- */
const ekte = { log: console.log.bind(console), error: console.error.bind(console) };
let loggat = [];
const fanga =
  () =>
  (...a) =>
    loggat.push(a.map((x) => (x !== null && typeof x === 'object' ? safeStr(x) : String(x))).join(' '));
function safeStr(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}
console.log = fanga();
console.error = fanga();
const skriv = (s) => ekte.log(s);

/* --- fake KV ---------------------------------------------------------------- */
class FakeKV {
  constructor() {
    this.store = new Map();
    this.puts = [];
  }
  async get(key) {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expires !== null && e.expires <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }
  async put(key, value, opts = {}) {
    const ttl = opts && typeof opts.expirationTtl === 'number' ? opts.expirationTtl : null;
    this.puts.push({ key, value: String(value), ttl });
    this.store.set(key, {
      value: String(value),
      ttl,
      expires: ttl === null ? null : Date.now() + ttl * 1000,
    });
  }
  varde(prefix) {
    for (const [k, v] of this.store) if (k.startsWith(prefix)) return Number(v.value);
    return null;
  }
}

const DUMMY_KEY = 'sk-ant-api03-TESTHARNESS-NOT-A-REAL-KEY';
function makeEnv({ kv = true, lokalt = false } = {}) {
  const env = { ANTHROPIC_API_KEY: DUMMY_KEY };
  if (kv) env.RATE = new FakeKV();
  if (lokalt) env.TILLAT_LOKALT = '1';
  return env;
}

/* --- upstream stub ---------------------------------------------------------- */
let anrop = [];
let hanterare = null;
globalThis.fetch = async (url, init = {}) => {
  let body = null;
  try {
    body = JSON.parse(init.body);
  } catch {
    /* left null */
  }
  const call = {
    url: String(url),
    method: init.method,
    headers: init.headers || {},
    signal: init.signal,
    bodyRaw: init.body,
    body,
  };
  anrop.push(call);
  if (!hanterare) throw new Error('TESTFEL: ingen upstream-hanterare installerad');
  return hanterare(call, anrop.length);
};

const upJson = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const upRaw = (text, status = 200) =>
  new Response(text, { status, headers: { 'content-type': 'text/html' } });

const svarText = (t) => ({
  id: 'msg_text',
  type: 'message',
  role: 'assistant',
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: t }],
});
const svarVerktyg = (input, id = 'toolu_test_1', text = 'Ett ögonblick.') => ({
  id: 'msg_tool',
  type: 'message',
  role: 'assistant',
  stop_reason: 'tool_use',
  content: [
    ...(text ? [{ type: 'text', text }] : []),
    { type: 'tool_use', id, name: 'skicka_forfragan', input },
  ],
});

/* --- request/response helpers ------------------------------------------------ */
const TILLATEN = 'https://larssonkorgmakare.se';
function bygg({
  origin = TILLATEN,
  method = 'POST',
  body,
  raw,
  ip = '198.51.100.1',
  headers = {},
} = {}) {
  const h = { 'content-type': 'application/json', ...headers };
  if (origin !== null) h.Origin = origin;
  if (ip !== null) h['CF-Connecting-IP'] = ip;
  const init = { method, headers: h };
  if (method === 'POST') {
    init.body =
      raw !== undefined ? raw : JSON.stringify(body ?? { messages: [{ role: 'user', content: 'Hej' }] });
  }
  return new Request('https://assistent.example/', init);
}

async function kor(opts, env = makeEnv()) {
  return korRequest(bygg(opts), env);
}

async function korRequest(request, env = makeEnv()) {
  anrop = [];
  const res = await worker.fetch(request, env, { waitUntil() {} });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* left null */
  }
  const headers = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return { res, status: res.status, text, json, headers, calls: anrop, env, request };
}

/* --- runner ------------------------------------------------------------------ */
const utfall = [];
let problem = [];
const ok = (cond, msg) => {
  if (!cond) problem.push(msg);
};
const eq = (got, want, msg) => ok(got === want, `${msg} (fick ${safeStr(got)}, ville ha ${safeStr(want)})`);

async function test(namn, fn) {
  problem = [];
  loggat = [];
  hanterare = () => upJson(svarText('Standardsvar.'));
  try {
    await fn();
  } catch (e) {
    problem.push('kastade: ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : String(e)));
  }
  const pass = problem.length === 0;
  utfall.push({ namn, pass, problem: problem.slice() });
  skriv(`${pass ? 'PASS' : 'FAIL'}  ${namn}`);
  for (const p of problem) skriv(`        · ${p}`);
}

const CORS_KRAV = (h, origin) => {
  ok(h['access-control-allow-origin'] === origin, `ACAO ska vara ${origin}, fick ${h['access-control-allow-origin']}`);
  ok(h['access-control-allow-methods'] === 'POST, OPTIONS', 'Allow-Methods fel: ' + h['access-control-allow-methods']);
  ok(h['access-control-allow-headers'] === 'Content-Type', 'Allow-Headers fel: ' + h['access-control-allow-headers']);
  ok(h['vary'] === 'Origin', 'Vary fel: ' + h['vary']);
};

const UTAN_KONTAKT = [{ role: 'user', content: 'Hej, jag undrar över en stol.' }];
const MED_TELEFON = [{ role: 'user', content: 'Hej, jag heter Sven, 070-123 45 67. En karmstol i rotting.' }];

/* Does the forced retry fire for this conversation? Two upstream calls = yes. */
const PASTAENDE = { sv: 'Tack, jag har skickat det vidare till verkstaden.', en: 'Thank you, I have sent it on to the workshop.' };
async function grinden(messages, lang = 'sv', pastaende) {
  hanterare = (c, n) =>
    n === 1
      ? upJson(svarText(pastaende || PASTAENDE[lang]))
      : upJson(svarVerktyg({ namn: 'Påhittad', mobel: 'x', arbete: 'y' }, 'tu', ''));
  const r = await kor({ body: { lang, messages } });
  return { oppen: r.calls.length === 2, r };
}

/* =========================================================================== */

skriv('');
skriv('worker/index.js — testsvit (ingen nyckel, inget nät, ingen deploy)');
skriv('='.repeat(72));

/* 1 -------------------------------------------------------------------------- */
await test('1  Otillåtet ursprung avvisas 403 FÖRE något upstream-anrop', async () => {
  const dåliga = [
    'https://evil.example',
    'https://larssonkorgmakare.se.evil.com',
    'http://larssonkorgmakare.se',
    '',
    ...KONST.LOKALA_ORIGINS,
  ];
  for (const bad of dåliga) {
    const r = await kor({ origin: bad === '' ? null : bad });
    eq(r.status, 403, `origin ${JSON.stringify(bad)} skulle ge 403`);
    eq(r.calls.length, 0, `origin ${JSON.stringify(bad)}: fetch-stubben fick INTE anropas`);
    eq(r.json && r.json.fel, 'Otillåtet ursprung', 'fel-fält: ' + r.text);
    eq(r.json && r.json.reply, FEL_SV, '403 ska också bära reply');
    ok(!('access-control-allow-origin' in r.headers), 'ingen ACAO får sättas på 403');
    ok(r.headers['vary'] === 'Origin', 'Vary: Origin ska finnas även på 403');
  }
  const o = await kor({ origin: 'https://evil.example', method: 'OPTIONS' });
  eq(o.status, 403, 'OPTIONS från fel ursprung ska också ge 403');
  eq(o.calls.length, 0, 'OPTIONS fel ursprung: inget upstream-anrop');
});

/* 2 -------------------------------------------------------------------------- */
await test('2  Tillåtna ursprung: produktion alltid, localhost bara med TILLAT_LOKALT=1', async () => {
  eq(KONST.ALLOWED_ORIGINS.length, 4, 'antal produktions-ursprung');
  eq(KONST.LOKALA_ORIGINS.length, 2, 'antal lokala ursprung');

  let i = 0;
  for (const o of KONST.ALLOWED_ORIGINS) {
    const r = await kor({ origin: o, ip: '198.51.100.' + ++i });
    eq(r.status, 200, `origin ${o} skulle ge 200`);
    CORS_KRAV(r.headers, o);
    ok(r.headers['content-type'].includes('application/json'), 'content-type ska vara json');
    ok(r.json && typeof r.json.reply === 'string', 'reply saknas för ' + o);
    eq(r.calls.length, 1, 'exakt ett upstream-anrop för ' + o);
  }

  for (const o of KONST.LOKALA_ORIGINS) {
    const av = await kor({ origin: o, ip: '198.51.100.' + ++i }, makeEnv());
    eq(av.status, 403, `${o} ska NEKAS utan TILLAT_LOKALT`);
    eq(av.calls.length, 0, `${o}: inget upstream-anrop när den nekas`);

    const pa = await kor({ origin: o, ip: '198.51.100.' + ++i }, makeEnv({ lokalt: true }));
    eq(pa.status, 200, `${o} ska släppas fram med TILLAT_LOKALT=1`);
    CORS_KRAV(pa.headers, o);
    eq(pa.calls.length, 1, `${o}: ett upstream-anrop med flaggan på`);

    for (const v of ['0', 'true', '', 1]) {
      const fel = await kor({ origin: o, ip: '198.51.100.' + ++i }, { ...makeEnv(), TILLAT_LOKALT: v });
      eq(fel.status, 403, `${o} ska nekas när TILLAT_LOKALT=${safeStr(v)}`);
    }
  }
});

/* 3 -------------------------------------------------------------------------- */
await test('3  OPTIONS-preflight svarar 204 utan kropp; fel metod ger 405', async () => {
  const r = await kor({ method: 'OPTIONS' });
  eq(r.status, 204, 'preflight ska vara 204');
  eq(r.text, '', 'preflight ska sakna kropp');
  CORS_KRAV(r.headers, TILLATEN);
  eq(r.calls.length, 0, 'preflight får inte anropa upstream');

  const g = await kor({ method: 'GET' });
  eq(g.status, 405, 'GET ska ge 405');
  eq(g.json && g.json.fel, 'Endast POST', '405 fel-fält: ' + g.text);
  eq(g.json && g.json.reply, FEL_SV, '405 ska också bära reply');
  CORS_KRAV(g.headers, TILLATEN);
  eq(g.calls.length, 0, 'GET får inte anropa upstream');
});

/* 4 -------------------------------------------------------------------------- */
await test('4  Trasig kropp avvisas 400 med fel + reply, utan upstream-anrop', async () => {
  const fall = [
    ['inte JSON alls', { raw: 'det här är inte json' }],
    ['tom kropp', { raw: '' }],
    ['JSON men inte objekt', { raw: '"bara en sträng"' }],
    ['messages saknas', { body: { lang: 'sv' } }],
    ['messages är inte array', { body: { messages: 'hej' } }],
    ['messages är tom', { body: { messages: [] } }],
    ['null-meddelande', { body: { messages: [null] } }],
    ['ogiltig roll (system)', { body: { messages: [{ role: 'system', content: 'x' }] } }],
    ['ogiltig roll (tool)', { body: { messages: [{ role: 'tool', content: 'x' }] } }],
    ['content är inte sträng', { body: { messages: [{ role: 'user', content: 123 }] } }],
    ['content är array', { body: { messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] } }],
  ];
  for (const [namn, opts] of fall) {
    const r = await kor(opts);
    eq(r.status, 400, `${namn} skulle ge 400`);
    eq(r.calls.length, 0, `${namn}: inget upstream-anrop`);
    eq(r.json && r.json.fel, OGILTIG, `${namn}: generiskt fel-fält`);
    eq(r.json && r.json.reply, FEL_SV, `${namn}: OKODAD avvisning ska ge det generiska felsvaret`);
    eq(Object.keys(r.json).sort().join(','), 'fel,reply', `${namn}: exakt fälten fel och reply`);
    CORS_KRAV(r.headers, TILLATEN);
  }
});

/* 5 -------------------------------------------------------------------------- */
await test(`5  Indatatak ${KONST.MAX_HISTORY}/${KONST.MAX_CHARS} — de två kodade meddelandena, på rätt språk`, async () => {
  const m = (n, len = 5) =>
    Array.from({ length: n }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'a'.repeat(len),
    }));

  eq((await kor({ body: { messages: m(KONST.MAX_HISTORY) } })).status, 200, `${KONST.MAX_HISTORY} meddelanden ska släppas igenom`);
  eq((await kor({ body: { messages: [{ role: 'user', content: 'a'.repeat(KONST.MAX_CHARS) }] } })).status, 200, `${KONST.MAX_CHARS} tecken ska släppas igenom`);

  const kodade = [
    ['för lång historik, sv', { messages: m(KONST.MAX_HISTORY + 1) }, HISTORIK_SV],
    ['för lång historik, en', { lang: 'en', messages: m(KONST.MAX_HISTORY + 1) }, HISTORIK_EN],
    ['för långt meddelande, sv', { messages: [{ role: 'user', content: 'a'.repeat(KONST.MAX_CHARS + 1) }] }, LANGT_SV],
    ['för långt meddelande, en', { lang: 'en', messages: [{ role: 'user', content: 'a'.repeat(KONST.MAX_CHARS + 1) }] }, LANGT_EN],
  ];
  for (const [namn, body, vantad] of kodade) {
    const r = await kor({ body });
    eq(r.status, 400, `${namn}: 400`);
    eq(r.json.fel, OGILTIG, `${namn}: fel-fältet är fortfarande generiskt`);
    eq(r.json.reply, vantad, `${namn}: kodat meddelande på rätt språk`);
    eq(r.calls.length, 0, `${namn}: inget upstream-anrop`);
    ok(!r.text.includes('För lång') && !r.text.includes('För långt'), `${namn}: undantagets egen text får inte läcka`);
  }

  /* Ingen ANNAN avvisning får bära ett kodat meddelande. */
  for (const body of [{ messages: 'hej' }, { messages: [] }, { messages: [{ role: 'system', content: 'x' }] }, { lang: 'en', messages: [] }]) {
    const r = await kor({ body });
    const lang = body.lang === 'en' ? FEL_EN : FEL_SV;
    eq(r.json.reply, lang, 'okodad avvisning ska ge FELSVAR, aldrig ett kodat meddelande: ' + safeStr(body));
    for (const kodat of [LANGT_SV, LANGT_EN, HISTORIK_SV, HISTORIK_EN]) {
      ok(r.json.reply !== kodat, 'okodad avvisning bar ett kodat meddelande');
    }
  }
});

/* 6 -------------------------------------------------------------------------- */
await test('6  Ren text från upstream ger { reply } utan forfragan', async () => {
  hanterare = () => upJson(svarText('Priset sätts när verkstaden sett möbeln.'));
  const r = await kor({ body: { messages: [{ role: 'user', content: 'Vad kostar en omflätning?' }] } });
  eq(r.status, 200, 'status');
  eq(r.json.reply, 'Priset sätts när verkstaden sett möbeln.', 'reply');
  ok(!('forfragan' in r.json), 'forfragan får INTE finnas: ' + r.text);
  eq(Object.keys(r.json).length, 1, 'svaret ska bara ha nyckeln reply');
  eq(r.calls.length, 1, 'ett upstream-anrop');

  const b = r.calls[0].body;
  eq(r.calls[0].url, 'https://api.anthropic.com/v1/messages', 'upstream-url');
  eq(r.calls[0].headers['x-api-key'], DUMMY_KEY, 'x-api-key skickas');
  eq(r.calls[0].headers['anthropic-version'], '2023-06-01', 'anthropic-version');
  eq(b.model, KONST.MODEL, 'modell-id');
  eq(b.max_tokens, KONST.MAX_TOKENS, 'max_tokens');
  eq(b.tools[0].name, 'skicka_forfragan', 'verktygsnamn');
  ok(b.tool_choice === undefined, 'inget tool_choice på första varvet');
  ok(!r.text.includes(DUMMY_KEY), 'API-nyckeln får inte finnas i klientsvaret');
});

/* 7 -------------------------------------------------------------------------- */
await test('7  Verktygsanrop skicka_forfragan ger { reply, forfragan }', async () => {
  const input = {
    namn: 'Erica Larsson',
    telefon: '070-123 45 67',
    epost: 'erica@example.se',
    mobel: 'Badhusstolen 230',
    arbete: 'omflätning av sits',
    beskrivning: 'Sitsen har gått upp i ena hörnet.',
  };
  hanterare = (c, n) =>
    n === 1 ? upJson(svarVerktyg(input)) : upJson(svarText('Tack Erica. Verkstaden hör av sig.'));

  const r = await kor({ body: { messages: [{ role: 'user', content: 'Jag heter Erica, 070-123 45 67, en Badhusstol 230.' }] } });
  eq(r.status, 200, 'status');
  eq(r.calls.length, 2, 'två upstream-anrop');
  eq(JSON.stringify(r.json.forfragan), JSON.stringify(input), 'forfragan ska bära verktygets fält oförändrade');
  eq(r.json.reply, 'Tack Erica. Verkstaden hör av sig.', 'reply ska komma från andra varvet');

  const tool = r.calls[0].body.tools[0];
  eq(Object.keys(tool.input_schema.properties).join(','), 'namn,telefon,epost,mobel,arbete,beskrivning', 'verktygets fältnamn');
  eq(tool.input_schema.required.join(','), 'namn,mobel,arbete', 'obligatoriska fält');

  const andra = r.calls[1].body.messages;
  const sista = andra[andra.length - 1];
  eq(sista.content[0].type, 'tool_result', 'tool_result-block');
  eq(sista.content[0].tool_use_id, 'toolu_test_1', 'tool_use_id kopplas');
  ok(loggat.some((l) => l.includes('FÖRFRÅGAN') && l.includes('Erica Larsson')), 'förfrågan ska loggas server-side');

  hanterare = (c, n) => (n === 1 ? upJson(svarVerktyg(input, 'toolu_x', '')) : upJson({ content: [] }));
  const t = await kor({ body: { messages: [{ role: 'user', content: 'x' }] } });
  eq(t.json.reply, 'Tack. Jag skickar uppgifterna vidare till verkstaden.', 'reservtext när modellen inte skriver något');
  ok(t.json.forfragan, 'forfragan även vid tomt textsvar');
});

/* 8 -------------------------------------------------------------------------- */
await test('8  Tvingat verktygsanrop när modellen PÅSTÅR skickat (och kontakt finns)', async () => {
  const input = { namn: 'Sven Svensson', mobel: 'en karmstol i rotting', arbete: 'omflätning' };
  let sedda = [];
  hanterare = (c, n) => {
    sedda.push(c.body.tool_choice || null);
    return n === 1
      ? upJson(svarText('Tack! Jag har skickat din förfrågan till verkstaden.'))
      : upJson(svarVerktyg(input, 'toolu_forced', ''));
  };
  const r = await kor({ body: { messages: MED_TELEFON } });

  eq(r.calls.length, 2, 'ANDRA upstream-anropet ska ske');
  eq(sedda[0], null, 'första anropet utan tool_choice');
  eq(JSON.stringify(sedda[1]), JSON.stringify({ type: 'tool', name: 'skicka_forfragan' }), 'andra anropet med tvingat tool_choice');
  eq(JSON.stringify(r.json.forfragan), JSON.stringify(input), 'forfragan-innehåll');
  eq(r.json.reply, 'Tack! Jag har skickat din förfrågan till verkstaden.', 'reply är fortfarande modellens text');
  ok(loggat.some((l) => l.includes('påstod att den skickat')), 'händelsen ska loggas');

  hanterare = (c, n) => (n === 1 ? upJson(svarText('Jag har skickat det vidare.')) : upJson({ fel: 'nej' }, 500));
  const f = await kor({ body: { messages: MED_TELEFON } });
  eq(f.status, 200, 'misslyckat tvingat anrop ska inte sänka svaret');
  ok(!('forfragan' in f.json), 'ingen forfragan när det tvingade anropet fallerar');

  hanterare = () => upJson(svarText('Vi tillverkar Badhusstolen 230 i rotting.'));
  eq((await kor({ body: { messages: MED_TELEFON } })).calls.length, 1, 'neutral text ska inte utlösa tvingat anrop');
});

/* 9 -------------------------------------------------------------------------- */
await test('9  Upstream-fel läcker aldrig status eller kropp till klienten', async () => {
  const HEMLIG = 'UPSTREAM_HEMLIG_KROPP_9f3a rate_limit_error organization id org_12345';
  const fall = [
    ['500 med JSON-kropp', () => upJson({ type: 'error', error: { type: 'api_error', message: HEMLIG } }, 500)],
    ['429 med text-kropp', () => upRaw(HEMLIG, 429)],
    ['401 (fel nyckel)', () => upRaw(HEMLIG, 401)],
    ['200 men kroppen är inte JSON', () => upRaw('<html>' + HEMLIG + '</html>', 200)],
    ['nätverksfel', () => { throw new Error(HEMLIG); }],
  ];
  for (const [namn, h] of fall) {
    hanterare = h;
    const r = await kor({ body: { messages: [{ role: 'user', content: 'x' }] } });
    eq(r.status, 500, `${namn}: klienten ska få 500`);
    eq(r.json && r.json.reply, FEL_SV, `${namn}: generiskt felsvar`);
    const allt = r.text + '\n' + JSON.stringify(r.headers);
    ok(!allt.includes('UPSTREAM_HEMLIG_KROPP'), `${namn}: upstream-kroppen läckte -> ${allt}`);
    ok(!allt.includes('rate_limit_error') && !allt.includes('org_12345'), `${namn}: upstream-detalj läckte`);
    ok(!/\b(401|429|api_error)\b/.test(r.text), `${namn}: upstream-status/typ läckte -> ${r.text}`);
    ok(!allt.includes(DUMMY_KEY), `${namn}: API-nyckeln läckte`);
    ok(!/Anthropic/i.test(allt), `${namn}: leverantören nämns för klienten`);
    ok(loggat.some((l) => l.includes('Fel i assistenten')), `${namn}: felet ska loggas server-side`);
    loggat = [];
  }
  hanterare = () => upRaw('boom', 500);
  eq((await kor({ body: { lang: 'en', messages: [{ role: 'user', content: 'x' }] } })).json.reply, FEL_EN, 'engelskt felsvar');

  const utanNyckel = await kor({ body: { messages: [{ role: 'user', content: 'x' }] } }, { RATE: new FakeKV() });
  eq(utanNyckel.status, 500, 'saknad nyckel -> 500');
  ok(!utanNyckel.text.includes('ANTHROPIC_API_KEY'), 'namnet på hemligheten får inte läcka');
});

/* 10 ------------------------------------------------------------------------- */
await test(`10 AbortSignal skickas med och avbrott ger generiskt felsvar (timeout ${KONST.UPPSTROMS_TIMEOUT_MS} ms)`, async () => {
  eq(KONST.UPPSTROMS_TIMEOUT_MS, 30000, 'timeout-konstanten i koden');
  const request = bygg({ body: { messages: [{ role: 'user', content: 'x' }] } });
  const env = makeEnv();

  const EkteAC = globalThis.AbortController;
  const ekteSetTimeout = globalThis.setTimeout;
  const ekteClearTimeout = globalThis.clearTimeout;
  const skapade = [];
  const timers = [];
  let rensade = 0;

  globalThis.AbortController = class extends EkteAC {
    constructor() {
      super();
      skapade.push(this);
    }
  };
  globalThis.setTimeout = (cb, ms, ...rest) => {
    if (ms === KONST.UPPSTROMS_TIMEOUT_MS) {
      const id = { fejk: true, cb, ms };
      timers.push(id);
      return id;
    }
    return ekteSetTimeout(cb, ms, ...rest);
  };
  globalThis.clearTimeout = (id) => {
    if (id && id.fejk) {
      rensade++;
      return;
    }
    return ekteClearTimeout(id);
  };

  let sedd = null;
  let avbruten = false;
  hanterare = (c) =>
    new Promise((_, reject) => {
      sedd = c.signal;
      if (!c.signal) return reject(new Error('ingen signal skickades med i fetch-init'));
      c.signal.addEventListener('abort', () => {
        avbruten = true;
        reject(new DOMException('This operation was aborted', 'AbortError'));
      });
      queueMicrotask(() => timers.forEach((t) => t.cb()));
    });

  const t0 = Date.now();
  let r;
  try {
    r = await korRequest(request, env);
  } finally {
    globalThis.AbortController = EkteAC;
    globalThis.setTimeout = ekteSetTimeout;
    globalThis.clearTimeout = ekteClearTimeout;
  }

  eq(skapade.length, 1, 'exakt en AbortController per upstream-anrop');
  eq(timers.length, 1, `en timer på ${KONST.UPPSTROMS_TIMEOUT_MS} ms`);
  ok(sedd === skapade[0].signal, 'signalen i fetch-init ska vara controllerns egen signal');
  ok(avbruten && sedd.aborted, 'timern ska ha avbrutit signalen');
  eq(rensade, 1, 'clearTimeout ska köras i finally');
  eq(r.status, 500, 'avbrott -> 500');
  eq(r.json.reply, FEL_SV, 'avbrott -> generiskt felsvar');
  ok(!r.text.includes('30000') && !/timeout|abort/i.test(r.text), 'timeout-detaljer får inte läcka');
  ok(loggat.some((l) => l.includes('svarade inte inom ' + KONST.UPPSTROMS_TIMEOUT_MS + ' ms')), 'timeout ska loggas server-side');
  ok(Date.now() - t0 < 5000, 'testet får inte vänta ut timeouten');
});

/* 11 ------------------------------------------------------------------------- */
await test(`11 Takgräns ${KONST.IP_TAK}/IP per ${KONST.IP_FONSTER_S} s, dagstak ${KONST.DAG_TAK} — med KV`, async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv();
  const IP_A = '203.0.113.10';
  const IP_B = '203.0.113.11';
  const kropp = { messages: [{ role: 'user', content: 'x' }] };

  for (let i = 1; i <= KONST.IP_TAK; i++) {
    const r = await kor({ ip: IP_A, body: kropp }, env);
    if (r.status !== 200) problem.push(`begäran ${i} från ${IP_A} skulle vara 200, blev ${r.status}`);
  }
  const over = await kor({ ip: IP_A, body: kropp }, env);
  eq(over.status, 429, `begäran ${KONST.IP_TAK + 1} skulle ge 429`);
  eq(over.json.reply, TAK_SV, 'takmeddelandet');
  eq(over.calls.length, 0, '429 får inte anropa upstream');
  CORS_KRAV(over.headers, TILLATEN);

  const annan = await kor({ ip: IP_B, body: kropp }, env);
  eq(annan.status, 200, 'en ANNAN IP ska vara opåverkad');

  const ipPut = env.RATE.puts.find((p) => p.key.startsWith('ip:' + IP_A));
  const dagPut = env.RATE.puts.find((p) => p.key.startsWith('dag:'));
  eq(ipPut && ipPut.ttl, KONST.IP_FONSTER_S * 2, 'expirationTtl för IP-nyckeln');
  eq(dagPut && dagPut.ttl, 60 * 60 * 30, 'expirationTtl för dagsnyckeln');
  ok(/^ip:203\.0\.113\.10:\d+$/.test(ipPut.key), 'IP-nyckelns form');
  ok(/^dag:\d{4}-\d{2}-\d{2}$/.test(dagPut.key), 'dagsnyckelns form');
});

/* 11b ------------------------------------------------------------------------ */
await test('11b Samma takgräns UTAN KV-bindning (in-isolate-reserven)', async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv({ kv: false });
  const kropp = { messages: [{ role: 'user', content: 'x' }] };
  const IP_C = '203.0.113.200';

  for (let i = 1; i <= KONST.IP_TAK; i++) {
    const r = await kor({ ip: IP_C, body: kropp }, env);
    if (r.status !== 200) problem.push(`utan KV: begäran ${i} skulle vara 200, blev ${r.status}`);
  }
  eq((await kor({ ip: IP_C, body: kropp }, env)).status, 429, 'utan KV: taket ska ändå slå till');
  eq((await kor({ ip: '203.0.113.201', body: kropp }, env)).status, 200, 'utan KV: annan IP opåverkad');

  const trasig = {
    ANTHROPIC_API_KEY: DUMMY_KEY,
    RATE: { get: async () => { throw new Error('KV nere'); }, put: async () => {} },
  };
  const r = await kor({ ip: '203.0.113.250', body: kropp }, trasig);
  eq(r.status, 200, 'trasig KV ska inte sänka assistenten');
  ok(loggat.some((l) => l.includes('Rate limit kunde inte räknas')), 'trasig KV ska loggas');
});

/* 12 ------------------------------------------------------------------------- */
await test('12 lang väljer systemprompt; saknad eller skräp faller tillbaka på svenska', async () => {
  hanterare = () => upJson(svarText('ok'));
  const fall = [
    ['lang: "en"', { lang: 'en' }, 'en'],
    ['lang: "sv"', { lang: 'sv' }, 'sv'],
    ['lang saknas', {}, 'sv'],
    ['lang: null', { lang: null }, 'sv'],
    ['lang: "de"', { lang: 'de' }, 'sv'],
    ['lang: "EN" (versaler)', { lang: 'EN' }, 'sv'],
    ['lang: "sv-SE"', { lang: 'sv-SE' }, 'sv'],
    ['lang: 42', { lang: 42 }, 'sv'],
    ['lang: {}', { lang: {} }, 'sv'],
    ['lang: "__proto__"', { lang: '__proto__' }, 'sv'],
  ];
  let i = 0;
  for (const [namn, extra, vantad] of fall) {
    const r = await kor({ ip: '192.0.2.' + ++i, body: { ...extra, messages: [{ role: 'user', content: 'x' }] } });
    eq(r.status, 200, namn + ': status');
    eq(r.calls[0] && r.calls[0].body.system, SYSTEM_PROMPT[vantad], namn + ': fel systemprompt (ville ha ' + vantad + ')');
  }
  ok(SYSTEM_PROMPT.sv !== SYSTEM_PROMPT.en, 'sv och en måste skilja sig åt');

  hanterare = (c, n) => (n === 1 ? upJson(svarVerktyg({ namn: 'A', mobel: 'B', arbete: 'C' }, 'tu', '')) : upJson({ content: [] }));
  const en = await kor({ ip: '192.0.2.90', body: { lang: 'en', messages: [{ role: 'user', content: 'x' }] } });
  eq(en.json.reply, 'Thank you. I am passing your details on to the workshop.', 'engelsk reservtext');
});

/* 13 ------------------------------------------------------------------------- */
await test('13 De tre verkliga falska positiverna, utan och med kontaktuppgift', async () => {
  const fall = [
    ['Modellen presenterades på Nationalmuseum 2018.', false, false],
    ['Skickar du en bild kan verkstaden bedöma skadan.', false, true],
    ['Verkstaden hör av sig när du lämnat dina uppgifter.', false, true],
  ];
  for (const [mening, utanVantat, medVantat] of fall) {
    const utan = await grinden(UTAN_KONTAKT, 'sv', mening);
    eq(utan.oppen, utanVantat, `UTAN kontakt "${mening.slice(0, 34)}…"`);
    ok(!('forfragan' in utan.r.json), `UTAN kontakt får ALDRIG ge en forfragan — "${mening.slice(0, 34)}…"`);

    const med = await grinden(MED_TELEFON, 'sv', mening);
    eq(med.oppen, medVantat, `MED telefon "${mening.slice(0, 34)}…"`);
    eq('forfragan' in med.r.json, medVantat, `MED telefon: forfragan ska ${medVantat ? 'finnas' : 'saknas'}`);
  }
});

/* 13b ------------------------------------------------------------------------ */
await test('13b Verkstadens EGET nummer öppnar inte längre grinden', async () => {
  /* Assistenten hänvisar till numret — grinden läser inte assistentturer alls. */
  const assistenten = [
    { role: 'user', content: 'Vad kostar en omflätning?' },
    { role: 'assistant', content: 'Priset sätts när verkstaden sett möbeln. Ring 08-411 50 53.' },
    { role: 'user', content: 'Okej, tack.' },
  ];
  const a = await grinden(assistenten);
  eq(a.oppen, false, 'assistentens hänvisning till 08-411 50 53 ska INTE öppna grinden');
  ok(!('forfragan' in a.r.json), 'och ingen påhittad forfragan går ut');

  /* Besökaren citerar numret själv. */
  for (const variant of [
    'Jag ringde 08-411 50 53 men fick inget svar.',
    'Jag har provat 084115053 utan resultat.',
    'Numret 08 411 50 53 gick inte fram.',
    'Jag testade +46 8 411 50 53.',
  ]) {
    const r = await grinden([{ role: 'user', content: variant }]);
    eq(r.oppen, false, `besökaren citerar verkstadens nummer, ska INTE räknas som kontaktuppgift: "${variant}"`);
  }

  /* Men besökarens EGET nummer räknas även om verkstadens också nämns. */
  const bada = await grinden([
    { role: 'user', content: 'Jag ringde 08-411 50 53 men fick inget svar. Nå mig på 070-123 45 67.' },
  ]);
  eq(bada.oppen, true, 'eget nummer ska räknas även när verkstadens nämns i samma mening');
});

/* 13c ------------------------------------------------------------------------ */
await test('13c Kontaktgrinden: vad som räknas och vad som inte gör det', async () => {
  const fall = [
    ['tiosiffrigt mobilnummer', 'Nå mig på 070-123 45 67.', true],
    ['tiosiffrigt utan avdelare', 'Nå mig på 0701234567.', true],
    ['internationellt format', 'Nå mig på +46 70 123 45 67.', true],
    ['sjusiffrigt nummer', 'Mitt nummer är 1234567.', true],
    ['e-postadress', 'Skriv till sven@example.se.', true],
    ['e-post med plus och punkt', 'Min adress är sven.andersson+stol@example.co.uk.', true],
    ['sexsiffrigt, för kort', 'Mitt nummer är 123456.', false],
    ['decennieintervall 1930-40-talet', 'Har ni stolar från 1930-40-talet?', false],
    ['årtalsintervall med tankstreck 1899–2013', 'Jag såg den i Svenska stolar 1899–2013.', false],
    ['bara ett namn', 'Jag heter Sven Andersson och har en stol.', false],
    ['modellnummer', 'Gäller Badhusstolen 230 och Stol 314.', false],
    ['mått ur prompten', 'Höjd: 840 mm, Djup: 780 mm, Bredd: 630 mm.', false],
    /* "111 30" ger inte ens en kandidat: mönstret kräver siffra + minst fem
       tecken + siffra, alltså sju tecken. Rätt utfall — ett postnummer är
       ingen kontaktuppgift. */
    ['postnummer', 'Jag bor på Skeppsbron 46, 111 30 Stockholm.', false],
    /* Åtgärdad: ett årtalsintervall med bindestreck blir åtta siffror och
       passerade tidigare. Boktiteln "Svenska stolar och deras formgivare
       1899–2013" står i systemprompten med tankstreck, men en besökare skriver
       lika gärna bindestreck. Kandidater på formen ÅÅÅÅ-ÅÅÅÅ avvisas nu. */
    ['årtalsintervall med bindestreck 1899-2013', 'Jag såg den i Svenska stolar 1899-2013.', false],
    ['årtalsintervall med mellanslag 1899 - 2013', 'Boken 1899 - 2013 alltså.', false],
    ['riktigt nummer intill ett årtal', 'Boken 1899-2013. Nå mig på 070-123 45 67.', true],
  ];
  for (const [namn, text, vantad] of fall) {
    const r = await grinden([{ role: 'user', content: text }]);
    eq(r.oppen, vantad, `${namn}: grinden ska ${vantad ? 'ÖPPNAS' : 'vara STÄNGD'} — "${text}"`);
  }
});

/* 13d ------------------------------------------------------------------------ */
await test('13d "sent" är inert på svenska men aktivt på engelska', async () => {
  const svenska = [
    'Verkstaden stänger sent på fredagar.',
    'Det är för sent att hinna i år.',
    'Modellen presenterades sent på 1930-talet.',
  ];
  for (const mening of svenska) {
    const r = await grinden(MED_TELEFON, 'sv', mening);
    eq(r.oppen, false, `svenska "sent" ska vara inert: "${mening}"`);
  }

  const engelska = [
    ['I have sent it on to the workshop.', true],
    ['Your enquiry was forwarded.', true],
    ['The workshop will be in touch.', true],
    ['I have passed it on.', true],
    ['We are open late on Fridays.', false],
    ['The chair was presented at the museum.', false],
  ];
  for (const [mening, vantad] of engelska) {
    const r = await grinden(MED_TELEFON, 'en', mening);
    eq(r.oppen, vantad, `engelska: "${mening}" ska ${vantad ? 'utlösa' : 'inte utlösa'} tvingat anrop`);
  }

  /* Och tvärtom: svenska påståenden ska inte plocka upp engelska ord. */
  const korsvis = await grinden(MED_TELEFON, 'sv', 'The enquiry was forwarded.');
  eq(korsvis.oppen, false, 'engelska termer ska inte gälla i ett svenskt samtal');
});

/* 14 ------------------------------------------------------------------------- */
await test('14 Verktyg på BÅDA varven: exakt 2 upstream-anrop, FÖRSTA förfrågan vinner', async () => {
  const forsta = { namn: 'FÖRSTA', telefon: '070-111 11 11', mobel: 'Badhusstolen 230', arbete: 'omflätning' };
  const andra = { namn: 'ANDRA', telefon: '070-222 22 22', mobel: 'Stol 314', arbete: 'lindning' };
  hanterare = (c, n) => upJson(svarVerktyg(n === 1 ? forsta : andra, 'toolu_' + n, ''));

  const r = await kor({ body: { messages: MED_TELEFON } });
  eq(r.calls.length, 2, 'exakt två upstream-anrop, aldrig tre');
  eq(JSON.stringify(r.json.forfragan), JSON.stringify(forsta), 'forfragan ska vara den FÖRSTA förfrågan');
  ok(!r.text.includes('ANDRA'), 'den andra förfrågan får inte nå klienten');
  const loggade = loggat.filter((l) => l.includes('FÖRFRÅGAN från assistenten'));
  eq(loggade.length, 1, 'förfrågan ska loggas EN gång, inte två');
  ok(loggade[0].includes('FÖRSTA'), 'det är den första som loggas');
  eq(r.json.reply, 'Tack. Jag skickar uppgifterna vidare till verkstaden.', 'reservtext, aldrig tom bubbla');
});

/* 15 ------------------------------------------------------------------------- */
await test(`15 Content-Length över ${KONST.MAX_BODY_BYTES} ger 413 utan att kroppen läses; teckenräkning som reserv`, async () => {
  const liten = JSON.stringify({ messages: [{ role: 'user', content: 'x' }] });

  /* 413: headern räcker, kroppen behöver inte ens vara stor. */
  const req = bygg({ raw: liten, headers: { 'Content-Length': String(KONST.MAX_BODY_BYTES + 1) } });
  eq(req.headers.get('content-length'), String(KONST.MAX_BODY_BYTES + 1), 'testdata: headern är satt');
  const r = await korRequest(req, makeEnv());
  eq(r.status, 413, 'för stor Content-Length ska ge 413');
  eq(r.json.fel, OGILTIG, '413 fel-fält');
  eq(r.json.reply, FEL_SV, '413 ska bära reply');
  eq(r.calls.length, 0, '413: inget upstream-anrop');
  eq(req.bodyUsed, false, 'kroppen ska ALDRIG ha lästs vid 413');
  ok(!r.text.includes(String(KONST.MAX_BODY_BYTES)), 'gränsen får inte läcka till klienten');
  CORS_KRAV(r.headers, TILLATEN);

  /* Precis på gränsen släpps igenom. */
  const pa = bygg({ raw: liten, headers: { 'Content-Length': String(KONST.MAX_BODY_BYTES) } });
  eq((await korRequest(pa, makeEnv())).status, 200, 'exakt MAX_BODY_BYTES ska släppas igenom');

  /* Utan header: teckenräkningen fångar den, som 400. */
  const fyll = (n) => JSON.stringify({ messages: [{ role: 'user', content: 'x' }], fyllnad: 'z'.repeat(n) });
  const utanHeader = bygg({ raw: fyll(KONST.MAX_BODY_BYTES + 1000) });
  eq(utanHeader.headers.get('content-length'), null, 'testdata: ingen Content-Length');
  const b = await korRequest(utanHeader, makeEnv());
  eq(b.status, 400, 'utan header ska reserven ge 400 (inte 413)');
  eq(b.json.reply, FEL_SV, 'reserven ger det generiska felsvaret');
  eq(b.calls.length, 0, 'reserven: inget upstream-anrop');
  ok(loggat.some((l) => l.includes('Kroppen är för stor')), 'detaljen ska loggas server-side');

  eq((await kor({ raw: fyll(KONST.MAX_BODY_BYTES - 200) })).status, 200, 'strax under gränsen släpps igenom');

  /* Reserven räknar UTF-16-enheter, inte bytes — dokumenterat i koden. */
  const svenska = JSON.stringify({ messages: [{ role: 'user', content: 'x' }], fyllnad: 'ö'.repeat(KONST.MAX_BODY_BYTES - 200) });
  const bytes = new TextEncoder().encode(svenska).length;
  eq((await kor({ raw: svenska })).status, 200, 'reserven släpper igenom …');
  ok(bytes > KONST.MAX_BODY_BYTES, `… en kropp på ${bytes} bytes (reserven mäter tecken; Content-Length-vägen mäter bytes)`);
});

/* 16 ------------------------------------------------------------------------- */
await test('16 Trasig kropp räknas mot taken (mätning sker före parsning)', async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv();
  const IP = '203.0.113.60';
  const N = 5;
  for (let i = 0; i < N; i++) {
    const r = await kor({ ip: IP, raw: 'inte json alls' }, env);
    eq(r.status, 400, `trasig begäran ${i + 1} ska ge 400`);
    eq(r.calls.length, 0, 'ingen upstream-trafik');
  }
  eq(env.RATE.varde('ip:' + IP), N, 'IP-räknaren ska ha ökat en gång per trasig begäran');
  eq(env.RATE.varde('dag:'), N, 'dagsräknaren räknar de trasiga (de passerade IP-grinden)');

  const env2 = makeEnv();
  const IP2 = '203.0.113.61';
  for (let i = 0; i <= KONST.IP_TAK; i++) await kor({ ip: IP2, body: { messages: [{ role: 'user', content: 'x' }] } }, env2);
  eq((await kor({ ip: IP2, raw: '{{{' }, env2)).status, 400, '400 går före 429 när kroppen är trasig OCH taket är nått');
});

/* 17 ------------------------------------------------------------------------- */
await test('17 400-svaret innehåller ingen text från V8:s JSON-parser', async () => {
  for (const raw of ['{ trasig json', '{"messages":[{"role":"user",', '[1,2,', 'undefined', "{'a':1}", '{"a":01}']) {
    const r = await kor({ raw });
    eq(r.status, 400, `${safeStr(raw)} -> 400`);
    eq(r.json.fel, OGILTIG, `${safeStr(raw)}: generiskt fel-fält`);
    eq(r.json.reply, FEL_SV, `${safeStr(raw)}: generiskt reply`);
    eq(Object.keys(r.json).sort().join(','), 'fel,reply', `${safeStr(raw)}: inga extra fält`);
    for (const spar of ['Unexpected', 'Expected', 'position', 'JSON.parse', 'token', 'line 1', 'column']) {
      ok(!r.text.includes(spar), `${safeStr(raw)}: parsertexten "${spar}" läckte -> ${r.text}`);
    }
    ok(loggat.some((l) => l.includes('Ogiltig förfrågan:')), `${safeStr(raw)}: detaljen ska loggas server-side`);
    loggat = [];
  }
});

/* 18 ------------------------------------------------------------------------- */
await test('18 Engelsk besökare får det engelska 429-meddelandet', async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv();
  const IP = '203.0.113.70';
  for (let i = 0; i < KONST.IP_TAK; i++) {
    await kor({ ip: IP, body: { lang: 'en', messages: [{ role: 'user', content: 'x' }] } }, env);
  }
  const en = await kor({ ip: IP, body: { lang: 'en', messages: [{ role: 'user', content: 'x' }] } }, env);
  eq(en.status, 429, 'status');
  eq(en.json.reply, TAK_EN, 'engelskt takmeddelande');
  eq(en.calls.length, 0, '429 når inte upstream');
  eq((await kor({ ip: IP, body: { lang: 'sv', messages: [{ role: 'user', content: 'x' }] } }, env)).json.reply, TAK_SV, 'svenskt takmeddelande på samma spärrade IP');
  eq((await kor({ ip: IP, body: { messages: [{ role: 'user', content: 'x' }] } }, env)).json.reply, TAK_SV, 'utan lang -> svenska');
});

/* 19 ------------------------------------------------------------------------- */
await test(`19 FIXAD: en ensam IP kan INTE längre tömma dagstaket (${KONST.DAG_TAK})`, async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv();
  const FLODARE = '203.0.113.80';
  const OSKYLDIG = '203.0.113.81';
  const kropp = { messages: [{ role: 'user', content: 'x' }] };

  for (let i = 0; i < KONST.DAG_TAK + 1; i++) await kor({ ip: FLODARE, body: kropp }, env);

  eq(env.RATE.varde('ip:' + FLODARE), KONST.DAG_TAK + 1, 'IP-räknaren följer varje begäran');
  eq(env.RATE.varde('dag:'), KONST.IP_TAK, 'dagsräknaren ska ha stannat vid IP-taket, inte följt flödet');
  const oskyldig = await kor({ ip: OSKYLDIG, body: kropp }, env);
  eq(oskyldig.status, 200, 'en orelaterad besökare ska INTE spärras ut av flödarens trafik');
  eq(oskyldig.calls.length, 1, 'och når assistenten');

  /* Dagstaket ska fortfarande fungera när trafiken kommer från många adresser. */
  const env2 = makeEnv();
  for (let i = 0; i <= KONST.DAG_TAK; i++) {
    await kor({ ip: `100.64.${(i >> 8) & 255}.${(i % 254) + 1}`, body: kropp }, env2);
  }
  const efter = await kor({ ip: '100.100.100.100', body: kropp }, env2);
  eq(efter.status, 429, 'dagstaket ska fortfarande slå till vid spridd trafik');
  ok(loggat.some((l) => l.includes('dagstaket nått')), 'dagstaket ska loggas');
});

/* 20 ------------------------------------------------------------------------- */
/* Sist: dessa två testerna mättar den modulglobala minnesRakning. */
await test(`20 FIXAD: gallringen bevarar det LEVANDE fönstret (MINNE_TAK=${KONST.MINNE_TAK})`, async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv({ kv: false });
  const kropp = { messages: [{ role: 'user', content: 'x' }] };
  const OFFER = '198.18.0.1';

  for (let i = 0; i < KONST.IP_TAK; i++) await kor({ ip: OFFER, body: kropp }, env);
  eq((await kor({ ip: OFFER, body: kropp }, env)).status, 429, 'kontroll: taket håller innan kartan fylls');

  for (let i = 0; i < KONST.MINNE_TAK + 200; i++) {
    await kor({ ip: `198.19.${(i >> 8) & 255}.${(i % 254) + 1}`, body: kropp }, env);
  }

  const efter = await kor({ ip: OFFER, body: kropp }, env);
  eq(efter.status, 429, 'en redan spärrad IP ska FORTSÄTTA vara spärrad efter att kartan fyllts');
  eq(efter.calls.length, 0, 'och ska inte kosta ett upstream-anrop');
});

/* 21 ------------------------------------------------------------------------- */
await test('21 Mättad karta failar closed, och återhämtar sig vid fönsterbytet', async () => {
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv({ kv: false });
  const kropp = { messages: [{ role: 'user', content: 'x' }] };

  /* Test 20 lämnade kartan mättad med nycklar från det LEVANDE fönstret, så
     gallringen har inget att ta bort och rakna() ska returnera Infinity. */
  const ny = await kor({ ip: '198.20.0.1', body: kropp }, env);
  eq(ny.status, 429, 'en helt ny IP ska nekas när kartan är mättad (fail closed, inte nollställ)');
  eq(ny.calls.length, 0, 'fail closed får inte kosta ett upstream-anrop');
  ok(loggat.some((l) => l.includes('IP över taket') && l.includes('Infinity')), 'Infinity ska synas i loggen: ' + safeStr(loggat.slice(0, 3)));

  /* Att fylla kartan kräver fler begäranden än DAG_TAK, så dagsräknaren i
     minnet är också mättad vid det här laget. För att mäta gallringen ensam
     måste klockan flyttas fram över BÅDE fönster- och dygnsgränsen — därför
     kapas hela Date, inte bara Date.now (dagsnyckeln kommer från new Date()). */
  const EkteDate = globalThis.Date;
  try {
    const framtid = EkteDate.now() + 25 * 60 * 60 * 1000;
    globalThis.Date = class extends EkteDate {
      constructor(...a) {
        super(...(a.length ? a : [framtid]));
      }
      static now() {
        return framtid;
      }
    };
    const efter = await kor({ ip: '198.20.0.2', body: kropp }, env);
    eq(efter.status, 200, 'vid nästa fönster ska kartan gallras och trafiken släppas igenom igen');
    eq(efter.calls.length, 1, 'och nå upstream');
    const igen = await kor({ ip: '198.20.0.3', body: kropp }, env);
    eq(igen.status, 200, 'kartan ska vara varaktigt frigjord, inte bara för en begäran');
  } finally {
    globalThis.Date = EkteDate;
  }
});

/* 22 ------------------------------------------------------------------------- */
await test('22 Utan KV mättas dagsräknaren i minnet långt före kartan', async () => {
  /* Konsekvens av reserven, värd att veta: en isolat utan KV-bindning som har
     släppt igenom DAG_TAK begäranden nekar alla för resten av UTC-dygnet, hur
     många olika adresser det än gäller. Kartgränsen (5000) nås aldrig först. */
  hanterare = () => upJson(svarText('ok'));
  const env = makeEnv({ kv: false });
  const kropp = { messages: [{ role: 'user', content: 'x' }] };
  const EkteDate = globalThis.Date;
  try {
    /* Ett orört dygn: ny dagsnyckel, och ett fönster som gallrar bort allt gammalt. */
    const framtid = EkteDate.now() + 60 * 60 * 60 * 1000;
    globalThis.Date = class extends EkteDate {
      constructor(...a) {
        super(...(a.length ? a : [framtid]));
      }
      static now() {
        return framtid;
      }
    };
    let forsta429 = null;
    for (let i = 1; i <= KONST.DAG_TAK + 2 && forsta429 === null; i++) {
      const r = await kor({ ip: `100.65.${(i >> 8) & 255}.${(i % 254) + 1}`, body: kropp }, env);
      if (r.status === 429) forsta429 = i;
    }
    eq(forsta429, KONST.DAG_TAK + 1, `första 429 ska komma på begäran ${KONST.DAG_TAK + 1}, av dagstaket och inte av kartan`);
    ok(loggat.some((l) => l.includes('dagstaket nått')), 'dagstaket ska loggas, inte IP-taket');
  } finally {
    globalThis.Date = EkteDate;
  }
});

/* =========================================================================== */

console.log = ekte.log;
console.error = ekte.error;

skriv('='.repeat(72));
const fel = utfall.filter((u) => !u.pass);
skriv(`${utfall.length - fel.length}/${utfall.length} PASS, ${fel.length} FAIL`);
skriv('');
skriv('Konstanter ur koden:');
skriv('  ALLOWED_ORIGINS       ' + JSON.stringify(KONST.ALLOWED_ORIGINS));
skriv('  LOKALA_ORIGINS        ' + JSON.stringify(KONST.LOKALA_ORIGINS) + '  (kräver env.TILLAT_LOKALT === "1")');
skriv('  MODEL                 ' + KONST.MODEL);
skriv('  MAX_HISTORY / MAX_CHARS / MAX_TOKENS   ' + [KONST.MAX_HISTORY, KONST.MAX_CHARS, KONST.MAX_TOKENS].join(' / '));
skriv('  MAX_BODY_BYTES        ' + KONST.MAX_BODY_BYTES + ' (Content-Length -> 413; teckenreserv -> 400)');
skriv('  MINNE_TAK             ' + KONST.MINNE_TAK + ' nycklar, därefter gallring och fail closed');
skriv('  UPPSTROMS_TIMEOUT_MS  ' + KONST.UPPSTROMS_TIMEOUT_MS);
skriv('  IP_TAK / IP_FONSTER_S / DAG_TAK        ' + [KONST.IP_TAK, KONST.IP_FONSTER_S + ' s', KONST.DAG_TAK].join(' / '));
skriv('  verktyg               skicka_forfragan(namn, telefon, epost, mobel, arbete, beskrivning); krav: namn, mobel, arbete');
skriv('');

process.exitCode = fel.length ? 1 : 0;
