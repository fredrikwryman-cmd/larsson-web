import { SYSTEM_PROMPT } from './system-prompt.js';

/* ---------------------------------------------------------------------------
   Larsson Korgmakare — svarsassistent.

   GitHub Pages serves static files and cannot hold a secret, so the Anthropic
   key lives here and nowhere else. The browser never sees it and never talks to
   api.anthropic.com directly. That split is the whole reason this worker exists.

   Ported from the kastar-se worker. What is unchanged: origin check before
   anything else, input validation, the two-turn tool loop, the forced-tool-call
   fallback when the model claims to have sent without calling the tool, the
   generic error reply that never leaks an upstream status or body, and logging
   the lead server-side as a safety net.

   What is new, and what the source report named as missing:
     - rate limiting, per IP and a daily ceiling
     - AbortController with a 30 s timeout on the upstream call
     - a per-language system prompt
   --------------------------------------------------------------------------- */

const ALLOWED_ORIGINS = [
  'https://larssonkorgmakare.se',
  'https://www.larssonkorgmakare.se',
  'https://fredrikwryman-cmd.github.io',
];

/* Development origins. A page served from localhost on ANY machine can drive
   the worker and spend the key, so these are off unless the deployment opts in
   with TILLAT_LOKALT="1". Set it on a dev worker; never on the live one. */
const LOKALA_ORIGINS = ['http://localhost:4321', 'http://localhost:8000'];

/* The largest body worth reading. A conversation at the documented caps is a
   few tens of kilobytes; anything far above that is not a visitor. Checked
   against Content-Length BEFORE the body is read, because request.text() has
   already buffered the whole thing by the time its length can be measured; the
   character count afterwards is only a backstop for a missing header, and it
   counts UTF-16 units, so it is the looser of the two. */
const MAX_BODY_BYTES = 100 * 1024;

/* How many distinct rate-limit keys the in-isolate fallback will hold. */
const MINNE_TAK = 5000;

const MODEL = 'claude-haiku-4-5';

const MAX_HISTORY = 20;
const MAX_CHARS = 2000;
const MAX_TOKENS = 1024;

/* Upstream timeout. The source hangs indefinitely if Anthropic never answers,
   which pins a request open and shows the visitor a spinner forever. */
const UPPSTROMS_TIMEOUT_MS = 30000;

/* Rate limiting. Per-IP over a short window stops one person hammering it; the
   daily ceiling caps what a bad day can cost in total. Both are deliberately
   generous for a workshop's enquiry assistant — a real conversation is well
   under 20 turns. */
const IP_TAK = 20; // requests per IP
const IP_FONSTER_S = 600; // per 10 minutes
const DAG_TAK = 1000; // requests per calendar day, all callers

const TOOL = {
  name: 'skicka_forfragan',
  description:
    'Skickar en förfrågan till Larsson Korgmakare. Anropas när du har kundens namn, en kontaktuppgift, vilken möbel det gäller och vad som behöver göras.',
  input_schema: {
    type: 'object',
    properties: {
      namn: { type: 'string', description: 'Kundens namn.' },
      telefon: { type: 'string', description: 'Kundens telefonnummer.' },
      epost: { type: 'string', description: 'Kundens e-postadress.' },
      mobel: {
        type: 'string',
        description:
          'Vilken möbel det gäller. Till exempel "en karmstol i rotting", "Badhusstolen 230", "en stol av Josef Frank".',
      },
      arbete: {
        type: 'string',
        description:
          'Vad som behöver göras: omflätning av sits, renovering av stomme, lindning, nytillverkning, måttbeställning eller annat.',
      },
      beskrivning: {
        type: 'string',
        description:
          'Kundens egen beskrivning av möbeln och skadan, med det som framkommit i samtalet.',
      },
    },
    required: ['namn', 'mobel', 'arbete'],
  },
};

/* Phrases that claim something has been sent, without having called the tool.
   Every alternative is anchored on word boundaries: an unanchored "sent" also
   matches inside "preSENTerades", which turned a sentence about a museum
   exhibition into a forced tool call and a fabricated enquiry. */
const PASTAR_SKICKAT = {
  sv: /\b(skickar|skickat|skickad|skickats|vidarebefordrar|vidarebefordrat|hör av sig|hor av sig)\b/i,
  /* "sent" is also a Swedish adverb — "verkstaden stänger sent" — so the
     English terms are only looked for in an English conversation. */
  en: /\b(sent|forwarded|forwards?)\b|\bwill be in touch\b|\bpassed (it |this )?on\b/i,
};

/* A claim is only worth acting on if there is something to claim. The forced
   retry runs only when the VISITOR has actually left a way to be reached.
   Three things this deliberately does not count as one:
     - anything the assistant said. The system prompt tells it to answer "Ring
       08-411 50 53" to prices, lead times, opening hours and shipping, and the
       client sends that turn back in the history — so reading assistant turns
       meant the workshop's own number opened the gate on almost every
       multi-turn conversation.
     - the workshop's own number wherever it appears, for the same reason.
     - a decade range. "1930-40-talet" is in the prompt for six of the nine
       models, and a bare 6-digit match let it through; a real number has at
       least seven digits, so the digits are counted rather than pattern-matched. */
const EPOST_MONSTER = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const TELEFON_KANDIDAT = /\+?\d[\d\s\-()]{5,}\d/g;
const EGET_NUMMER = /0?8[\s-]?411[\s-]?50[\s-]?53|\+?468411\s?5053/g;

function harKontaktuppgift(messages) {
  const text = messages
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content)
    .join(' ')
    .replace(EGET_NUMMER, ' ');
  if (EPOST_MONSTER.test(text)) return true;
  const kandidater = text.match(TELEFON_KANDIDAT) || [];
  return kandidater.some(
    /* A year range written with a plain hyphen — "1899-2013", the subtitle of
       one of the books the workshop is listed in — has eight digits and would
       otherwise read as a phone number. */
    (k) => !/^\d{4}\s*-\s*\d{4}$/.test(k.trim()) && k.replace(/\D/g, '').length >= 7
  );
}

/* One generic message. No upstream status, no upstream body, ever. */
const FELSVAR = {
  sv: 'Något gick fel på vår sida. Ring 08-411 50 53 eller mejla info@larssonkorgmakare.se så hjälper vi dig.',
  en: 'Something went wrong at our end. Call 08-411 50 53 or email info@larssonkorgmakare.se and we will help you.',
};

const TAKSVAR = {
  sv: 'Det har blivit många frågor på kort tid. Vänta en stund och försök igen, eller ring 08-411 50 53.',
  en: 'There have been a lot of questions in a short time. Wait a moment and try again, or call 08-411 50 53.',
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

/* Two of the rejections are the visitor's fault and worth telling them about;
   the rest are a broken client and get nothing but the generic message. The
   difference travels as a `kod`, never as the exception text — see FEL_TEXT. */
function avvisa(kod, detalj) {
  const fel = new Error(detalj);
  fel.kod = kod;
  return fel;
}

const FEL_TEXT = {
  for_langt: {
    sv: 'Meddelandet är för långt. Korta ner det lite och skicka igen.',
    en: 'That message is too long. Please shorten it a little and send again.',
  },
  for_lang_historik: {
    sv: 'Samtalet har blivit långt. Välj Börja om, så tar vi det från början.',
    en: 'This conversation has grown long. Choose Start again and we will begin afresh.',
  },
};

/* Throws on invalid input. Only a `kod` ever reaches the client. */
function validera(body) {
  const messages = body && body.messages;
  if (!Array.isArray(messages)) throw avvisa(null, 'messages måste vara en array');
  if (messages.length === 0) throw avvisa(null, 'messages är tom');
  if (messages.length > MAX_HISTORY) throw avvisa('for_lang_historik', 'För lång historik');
  for (const m of messages) {
    if (!m || typeof m !== 'object') throw avvisa(null, 'Ogiltigt meddelande');
    if (m.role !== 'user' && m.role !== 'assistant') throw avvisa(null, 'Ogiltig roll');
    if (typeof m.content !== 'string') throw avvisa(null, 'content måste vara text');
    if (m.content.length > MAX_CHARS) throw avvisa('for_langt', 'För långt meddelande');
  }
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/* ---------------------------------------------------------------------------
   Rate limiting.

   Uses a KV namespace bound as RATE. If the binding is absent the worker still
   runs — it falls back to an in-isolate counter and says so in the log, because
   refusing to answer at all would be a worse failure than limiting loosely.
   The in-isolate counter is genuinely weaker: Cloudflare may run many isolates.
   The namespace exists and is bound — see wrangler.toml. The fallback below
   is what runs only if the binding is ever removed.
   --------------------------------------------------------------------------- */
const minnesRakning = new Map();

async function rakna(env, nyckel, ttl, fonster) {
  if (env && env.RATE) {
    const nu = Number((await env.RATE.get(nyckel)) || 0) + 1;
    await env.RATE.put(nyckel, String(nu), { expirationTtl: ttl });
    return nu;
  }
  /* Keys carry the window number, so every key from an older window is dead and
     can go. Clearing the WHOLE map instead — which is what this did first — wipes
     the current window too, so an address that had been correctly blocked was
     served again as soon as other traffic filled the map. Prune precisely, and
     if 5000 live addresses remain in one window, fail closed rather than
     forgetting who was over the limit. */
  if (minnesRakning.size > MINNE_TAK) {
    const levande = `:${fonster}`;
    for (const k of minnesRakning.keys()) {
      if (!k.startsWith('dag:') && !k.endsWith(levande)) minnesRakning.delete(k);
    }
    if (minnesRakning.size > MINNE_TAK) return Infinity;
  }
  const nu = (minnesRakning.get(nyckel) || 0) + 1;
  minnesRakning.set(nyckel, nu);
  return nu;
}

async function overTak(env, ip) {
  const dag = new Date().toISOString().slice(0, 10);
  const fonster = Math.floor(Date.now() / 1000 / IP_FONSTER_S);

  const perIp = await rakna(env, `ip:${ip}:${fonster}`, IP_FONSTER_S * 2, fonster);
  if (perIp > IP_TAK) {
    console.error('Rate limit: IP över taket', ip, perIp);
    return true;
  }

  /* DAG_TAK bounds a day's SPEND, so it counts only requests that get past the
     per-IP gate and are actually going to cost something upstream. Counting
     refused traffic here instead — which is what this did for one revision —
     hands any single address a way to exhaust the global cap for everybody with
     a thousand requests that cost nothing. */
  const perDag = await rakna(env, `dag:${dag}`, 60 * 60 * 30, fonster);

  if (perDag > DAG_TAK) {
    console.error('Rate limit: dagstaket nått', perDag);
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------------------
   Upstream call, with a hard timeout. Without the AbortController a stalled
   upstream holds the request open until the platform kills it.
   --------------------------------------------------------------------------- */
async function anropaAnthropic(messages, apiKey, lang, toolChoice) {
  const kropp = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT[lang] || SYSTEM_PROMPT.sv,
    tools: [TOOL],
    messages,
  };
  if (toolChoice) kropp.tool_choice = toolChoice;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPPSTROMS_TIMEOUT_MS);
  try {
    const svar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(kropp),
      signal: ctrl.signal,
    });

    if (!svar.ok) {
      /* Logged server-side only. Never reaches the client. */
      const text = await svar.text();
      throw new Error('Anthropic svarade ' + svar.status + ': ' + String(text).slice(0, 300));
    }
    return await svar.json();
  } catch (fel) {
    if (fel && fel.name === 'AbortError') {
      throw new Error('Anthropic svarade inte inom ' + UPPSTROMS_TIMEOUT_MS + ' ms');
    }
    throw fel;
  } finally {
    clearTimeout(timer);
  }
}

/* The worker does not post to Web3Forms itself: Workers egress from shared
   Cloudflare IPs and Web3Forms rate-limits per IP, so every send from here
   would 429. The widget posts from the visitor's own browser instead — the same
   path the site's ordinary contact form uses. This log is the safety net: if
   the client's send fails, the details are still in `wrangler tail`. */
function loggaForfragan(input) {
  try {
    console.error('FÖRFRÅGAN från assistenten:', JSON.stringify(input));
  } catch (fel) {
    console.error('FÖRFRÅGAN kunde inte serialiseras');
  }
}

function textUr(data) {
  const block = (data && data.content) || [];
  return block
    .filter((b) => b && b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const tillaten =
      ALLOWED_ORIGINS.includes(origin) ||
      (env && env.TILLAT_LOKALT === '1' && LOKALA_ORIGINS.includes(origin));

    /* Origin is decided before anything else. Without an allowed origin the
       worker returns neither data nor CORS headers. */
    if (!tillaten) {
      return new Response(JSON.stringify({ fel: 'Otillåtet ursprung', reply: FELSVAR.sv }), {
        status: 403,
        headers: { 'content-type': 'application/json', Vary: 'Origin' },
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return json({ fel: 'Endast POST', reply: FELSVAR.sv }, 405, origin);
    }

    /* Metered BEFORE the body is parsed. A malformed body used to return 400
       without touching either counter, which left the endpoint free to hammer.
       The 429 itself is held back until the language is known, so a rate-limited
       English visitor is not answered in Swedish. */
    const ip = request.headers.get('CF-Connecting-IP') || 'okand';
    let lang = 'sv';
    let overGransen = false;
    try {
      overGransen = await overTak(env, ip);
    } catch (fel) {
      /* A failing counter must not take the assistant down with it. */
      console.error('Rate limit kunde inte räknas:', fel && fel.message ? fel.message : fel);
    }

    const angivenLangd = Number(request.headers.get('Content-Length') || 0);
    if (angivenLangd > MAX_BODY_BYTES) {
      return json({ fel: 'Ogiltig förfrågan', reply: FELSVAR[lang] }, 413, origin);
    }

    let messages;
    try {
      const rakropp = await request.text();
      if (rakropp.length > MAX_BODY_BYTES) throw avvisa(null, 'Kroppen är för stor');
      const body = JSON.parse(rakropp);
      if (body && (body.lang === 'sv' || body.lang === 'en')) lang = body.lang;
      messages = validera(body);
    } catch (fel) {
      /* One message, ours. JSON.parse's own text is a V8 internal and the only
         place this worker would have handed an engine string to a browser. The
         two rejections the visitor can actually act on travel as a `kod`, and
         every response the widget might have to show carries `reply` as well as
         `fel` — the widget reads one field on every status, not two. */
      console.error('Ogiltig förfrågan:', fel && fel.message ? fel.message : fel);
      const text = (fel && fel.kod && FEL_TEXT[fel.kod] && FEL_TEXT[fel.kod][lang]) || null;
      return json({ fel: 'Ogiltig förfrågan', reply: text || FELSVAR[lang] }, 400, origin);
    }

    if (overGransen) {
      return json({ reply: TAKSVAR[lang] }, 429, origin);
    }

    let forfragan = null;

    try {
      const apiKey = env.ANTHROPIC_API_KEY;
      /* Length only, never the key or any part of it. Server log only. An
         implausible length reveals a broken paste immediately. */
      console.log('ANTHROPIC_API_KEY längd:', apiKey ? String(apiKey).length : 0);
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY saknas i miljön');

      let data = await anropaAnthropic(messages, apiKey, lang);

      /* Two upstream calls, total: one that decides to send the enquiry and one
         that words the confirmation. The bound used to be two ITERATIONS, which
         is three calls, and a model that called the tool on both passes had its
         first enquiry silently overwritten by its second and logged twice. */
      for (let varv = 0; varv < 1 && data.stop_reason === 'tool_use'; varv++) {
        const verktyg = (data.content || []).find(
          (b) => b && b.type === 'tool_use' && b.name === TOOL.name
        );
        if (!verktyg) break;

        forfragan = forfragan || verktyg.input || {};
        loggaForfragan(forfragan);

        messages = messages.concat([
          { role: 'assistant', content: data.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: verktyg.id,
                content: 'Förfrågan mottagen och vidarebefordrad',
              },
            ],
          },
        ]);

        data = await anropaAnthropic(messages, apiKey, lang);
      }

      /* Guard against the model claiming it sent without calling the tool. The
         call is redone once with a forced tool choice so the lead at least gets
         structure. The lead itself is already secured by the widget's own
         deterministic detection — this is a complement, not the protection. */
      if (!forfragan && harKontaktuppgift(messages) && PASTAR_SKICKAT[lang].test(textUr(data))) {
        console.error(
          'Modellen påstod att den skickat utan verktygsanrop. Hela konversationen:',
          JSON.stringify(messages)
        );
        try {
          const tvingat = await anropaAnthropic(messages, apiKey, lang, {
            type: 'tool',
            name: TOOL.name,
          });
          const block = (tvingat.content || []).find(
            (b) => b && b.type === 'tool_use' && b.name === TOOL.name
          );
          if (block) {
            forfragan = block.input || {};
            loggaForfragan(forfragan);
          }
        } catch (fel) {
          console.error(
            'Tvingat verktygsanrop misslyckades:',
            fel && fel.message ? fel.message : fel
          );
        }
      }

      /* The model sometimes answers with a tool block and no text. The visitor
         must never meet an empty bubble. */
      let text = textUr(data);
      if (!text) {
        text = forfragan
          ? lang === 'sv'
            ? 'Tack. Jag skickar uppgifterna vidare till verkstaden.'
            : 'Thank you. I am passing your details on to the workshop.'
          : lang === 'sv'
            ? 'Kan du formulera om frågan? Jag hängde inte riktigt med.'
            : 'Could you put that another way? I did not quite follow.';
      }

      /* forfragan travels only when the tool was actually called. The widget
         posts it onward and owns the claim about whether it arrived. */
      const svar = { reply: text };
      if (forfragan) svar.forfragan = forfragan;

      return json(svar, 200, origin);
    } catch (fel) {
      console.error('Fel i assistenten:', fel && fel.message ? fel.message : fel);
      return json({ reply: FELSVAR[lang] }, 500, origin);
    }
  },
};
