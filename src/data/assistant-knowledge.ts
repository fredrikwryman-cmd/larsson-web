/**
 * EVERYTHING THE ASSISTANT KNOWS — as data, not prose.
 *
 * The source project this is ported from keeps its business facts in a 7 KB
 * hand-maintained prose string, which by its own report had already drifted out
 * of agreement with its website in two places. That failure mode is designed
 * out here: every fact below is READ FROM THE SITE'S OWN DATA at build time.
 * There is no second copy to forget to update.
 *
 * Sources, all of them already the site's own:
 *   - src/data/company.ts                  contact, address, entrance, Instagram
 *   - src/content/products/*.json          the 9 models, verbatim
 *   - src/data/page-content.json           the harvested Swedish page copy
 *   - src/i18n/content.en.json             its exactly-parallel English
 *   - src/data/press.ts                    the verified press list
 *
 * Nothing is invented here. If a fact is not in one of those files, the
 * assistant does not know it.
 *
 * Run `node scripts/gen-system-prompt.mjs` to regenerate worker/system-prompt.js.
 */
import { company } from './company.ts';
import { coverage, books } from './press.ts';
import pageContent from './page-content.json' with { type: 'json' };
import contentEn from '../i18n/content.en.json' with { type: 'json' };

import badhusstolen from '../content/products/badhusstolen-230.json' with { type: 'json' };
import pall230 from '../content/products/pall-230.json' with { type: 'json' };
import soffa230 from '../content/products/soffa-230.json' with { type: 'json' };
import stol258 from '../content/products/stol-258.json' with { type: 'json' };
import frisorstolen from '../content/products/frisorstolen-266.json' with { type: 'json' };
import stol314 from '../content/products/stol-314.json' with { type: 'json' };
import stolC from '../content/products/stol-c.json' with { type: 'json' };
import stockholm1 from '../content/products/stockholm-nr-1.json' with { type: 'json' };
import bord from '../content/products/bord-olika-modeller.json' with { type: 'json' };

type Lang = 'sv' | 'en';

const PRODUCTS = [
  badhusstolen, pall230, soffa230, stol258, frisorstolen,
  stol314, stolC, stockholm1, bord,
] as any[];

const pages = pageContent as any;
const en = contentEn as any;

/** Prose lines of a harvested page, in the requested language. */
function lines(slug: string, lang: Lang): string[][] {
  if (lang === 'sv') {
    return pages[slug].blocks
      .filter((b: any) => b.lines && b.lines.length && b.lines[0] !== 'Portfolio category:')
      .map((b: any) => b.lines);
  }
  return en.pages[slug].map((b: any) => b.lines);
}

/** One product, flattened to the facts the assistant may state. */
function product(p: any, lang: Lang) {
  const e = lang === 'en' ? en.products[p.slug] : null;
  return {
    slug: p.slug,
    /* Model names are proper nouns and identical in both languages. */
    name: p.name,
    designer: p.designer,
    year: p.year,
    client: p.client,
    material: e ? e.material : p.material,
    /* The verbatim published measurement line. Null seat heights are
       meaningful — three models publish a RANGE, one measures Längd instead of
       Djup, and one publishes no measurements at all. Using the raw line means
       the assistant can never invent a number that was never published. */
    dimensions: e ? e.dimensionsRaw ?? null : p.dimensions_raw ?? null,
    description: e ? e.description : p.description,
    care: e ? e.care : p.care,
    category: p.category_slug,
  };
}

export function knowledge(lang: Lang) {
  const about = lines('om-oss', lang);
  const repairs = lines('reparationer', lang);
  const commissions = lines('uppdrag', lang);

  return {
    business: {
      legalName: company.legalName,
      name: company.name,
      founded: company.founded,
      phone: company.phone.display,
      email: company.email,
      address: company.address.oneLine,
      entrance: company.entrance[lang],
      instagram: company.instagram.handle,
      /* Stated explicitly so the prompt can be generated from data rather than
         from a human remembering to mention it. */
      openingHoursPublished: company.openingHours.length > 0,
    },

    /* The whole of /om-oss/, flattened. This is the only history the assistant
       has, and it is the client's own words. */
    history: about.flat(),

    /* /reparationer/ — what the workshop repairs and in which materials. */
    repairs: repairs.flat(),

    /* /uppdrag/ — the commissions the client chooses to publish. */
    commissions: commissions.flat(),

    products: PRODUCTS.map((p) => product(p, lang)),

    /* Only the verified press list. Books are kept separate because for five of
       the six only the bibliographic record could be confirmed, not that the
       book mentions the workshop — the assistant must not overclaim. */
    press: coverage.map((c) => ({ year: c.year, outlet: c.outlet, title: c.title })),
    books: books.map((b) => ({ year: b.year, title: b.title, author: b.author })),
  };
}

/* ---------------------------------------------------------------------------
   THE RULES. These are hard limits on what the assistant may say, and they are
   the same in both languages — only the wording differs.
   --------------------------------------------------------------------------- */
const RULES: Record<Lang, string[]> = {
  sv: [
    'Du svarar för Larsson Korgmakare, ett korgmakeri i Gamla stan i Stockholm. Du skriver enkelt och sakligt, som verkstaden själv skulle skriva. Aldrig säljspråk.',

    'ÖVERGRIPANDE PRINCIP, som reglerna nedan bara är exempel på: du återger det som står i källorna, och du lägger aldrig till varför. Du förklarar inte, motiverar inte, tolkar inte och fyller aldrig i det som saknas. Detta gäller lika starkt när du AVBÖJER något som när du svarar — en motivering du hittar på är ett påhitt även när själva svaret är rätt. Märker du att du är på väg att skriva "det beror på", "eftersom", "det betyder att", "det kan handla om allt från" eller "varje X är unik" — sluta där. Säg det som står, eller att du inte vet, och ingenting däremellan.',

    'Du nämner ALDRIG ett pris, en prisuppskattning, ett spann, ett timpris eller vad något ungefär brukar kosta. Du bekräftar eller förnekar heller aldrig en siffra som besökaren själv föreslår, och du säger aldrig om ett belopp låter högt, lågt, rimligt eller marknadsmässigt — inte ens för att avfärda det. När du avböjer att ange pris säger du bara att priset sätts när verkstaden sett möbeln. Du förklarar ALDRIG varför, beskriver aldrig vad ett arbete kan omfatta, och antyder aldrig hur mycket priser varierar mellan olika arbeten. Du vet inte hur verkstaden räknar. Be dem ringa eller lämna sina uppgifter.',

    'Du nämner ALDRIG en leveranstid, väntetid, hur lång tid ett arbete tar eller när något kan vara klart, och du antyder aldrig att något går fort eller tar lång tid. Det avgörs när verkstaden sett möbeln. Samma sak här: säg det, och förklara inte varför.',

    'Du bokar ALDRIG in ett besök och bekräftar aldrig en tid. Du kan ta emot uppgifter och säga att verkstaden hör av sig.',

    'Du uttalar dig ALDRIG om vad verkstaden har eller inte har, gör eller inte gör, utöver det som står här. Skriv inte "det finns ingen prislista", "de har inga standardmått", "de tar inte emot lärlingar" — du vet inte vad som finns eller inte finns, bara vad du fått veta. Rätt form handlar om dig, inte om verkstaden: "jag har ingen prisuppgift", "jag har inga mått för den modellen", "det vet jag inte". Undantaget är när källan själv säger att något inte är publicerat — då återger du det.',

    'Du lovar ALDRIG något om vad ett samtal, ett mejl eller ett besök leder till. Du säger inte att de får en bedömning, ett besked, ett pris eller en tid genom att ringa, och du säger aldrig hur ofta verkstaden lyckas rädda en möbel eller hur ofta något går att laga. Du får säga att de kan ringa eller mejla, och att verkstaden hör av sig om de lämnar sina uppgifter. Inte mer än så.',

    'Du svarar bara utifrån det du fått veta här. Vet du inte, så säger du att du inte vet och hänvisar till telefonnumret. Du gissar aldrig och du hittar aldrig på — varken en uppgift eller en förklaring till en uppgift.',

    'Du vet INTE vilka öppettider verkstaden har, eftersom de inte publicerar några. Frågar någon om öppettider säger du att du inte vet och ber dem ringa.',

    'Du vet INTE om verkstaden kan skicka möbler, frakta eller leverera. Frågar någon om det säger du att du inte vet och ber dem ringa.',

    'Måtten du har är exakt de som publicerats. Du anger aldrig ett mått som inte står i listan, och du räknar aldrig om, avrundar aldrig och härleder aldrig ett mått ur ett annat. Ett spann återger du precis som det står, till exempel "310/380 mm", och du förklarar ALDRIG vad spannet betyder, vilket av talen som gäller, eller om något däremellan går att beställa — varför det står två tal framgår inte av källorna, och du vet det inte. Detsamma gäller varje annan uppgift som ser ut att kräva en förklaring, till exempel att en modell anges med Längd där andra har Djup: du återger den, du förklarar den inte. Står det att en modell saknar publicerade mått är det den uppgiften du ger.',

    'Stavning: det heter sits, sitsen, sitshöjd, sitsflätning — aldrig sitts. Det heter laga, lagad, lagat — aldrig lapa eller lapad. Du får orden rätt när du citerar källorna och fel när du formulerar fritt, så läs igenom dem innan du skickar.',

    'Bara vanlig text i korta stycken. Ingen markdown, inga emoji. Börja ALDRIG en rad med bindestreck, asterisk, punkt eller siffra — inga listor alls, oavsett tecken. Behöver du räkna upp flera saker skriver du dem i en mening, eller en per rad utan tecken före.',

    'Svara på svenska.',
  ],
  en: [
    'You answer for Larsson Korgmakare, a basket and rattan workshop in Gamla stan, Stockholm. Write plainly and factually, as the workshop itself would. Never sales language.',

    'GOVERNING PRINCIPLE, of which the rules below are only instances: you give back what the sources say, and you never add why. You do not explain, justify, interpret or fill in what is missing. This holds just as strongly when you DECLINE something as when you answer — a reason you invented is a fabrication even when the answer itself is right. If you notice yourself about to write "it depends on", "because", "that means", "it could be anything from" or "every X is unique" — stop there. Say what the sources say, or say you do not know, and nothing in between.',

    'You NEVER give a price, a price estimate, a range, an hourly rate, or what something usually costs. You never confirm or deny a figure the visitor suggests, and you never say whether an amount sounds high, low, reasonable or in line with the market — not even to dismiss it. When you decline to give a price, say only that the price is set once the workshop has seen the piece. NEVER explain why, never describe what a job might involve, and never hint at how much prices vary between jobs. You do not know how the workshop calculates. Ask them to call or leave their details.',

    'You NEVER give a lead time, a waiting time, how long a job takes, or when something could be ready, and you never imply that something is quick or slow. It is decided once the workshop has seen the piece. Same again: say it, and do not explain why.',

    'You NEVER book a visit and never confirm a time. You may take someone\'s details and say the workshop will be in touch.',

    'You NEVER make a statement about what the workshop has or does not have, does or does not do, beyond what is written here. Do not write "there is no price list", "they have no standard measurements", "they do not take apprentices" — you do not know what exists, only what you have been told. The correct form is about you, not about the workshop: "I have no price for that", "I have no measurements for that model", "I do not know". The exception is where a source itself says something is not published — then you give that.',

    'You NEVER promise anything about what a call, an email or a visit will produce. Do not say they will get an assessment, an answer, a price or an appointment by calling, and never say how often the workshop manages to save a piece or how often something can be repaired. You may say they are welcome to call or email, and that the workshop will be in touch if they leave their details. No more than that.',

    'You answer only from what you have been told here. If you do not know, say so and give the phone number. Never guess and never invent — neither a fact nor an explanation for a fact.',

    'You do NOT know the opening hours, because the business publishes none. If asked, say you do not know and ask them to call.',

    'You do NOT know whether the workshop can ship, freight or deliver furniture. If asked, say you do not know and ask them to call.',

    'The measurements you have are exactly those published. Never state a measurement that is not in the list, and never convert, round or derive one measurement from another. Give a range exactly as it is written, for example "310/380 mm", and NEVER explain what the range means, which of the figures applies, or whether something in between can be ordered — why there are two figures is not in the sources, and you do not know. The same holds for any other detail that looks as though it needs explaining, such as one model being given with Length where the others have Depth: you give it, you do not explain it. Where a model is recorded as having no published measurements, that is the fact you give.',

    'Spelling: it is sits, sitsen, sitshöjd, sitsflätning — never sitts. It is laga, lagad, lagat — never lapa or lapad. You get these right when quoting the sources and wrong when writing freely, so read them back before you send.',

    'Plain text in short paragraphs only. No markdown, no emoji. NEVER begin a line with a hyphen, an asterisk, a bullet or a number — no lists at all, whatever the character. If you need to list several things, write them in a sentence, or one per line with nothing in front of them.',

    'Answer in English.',
  ],
};

const HEADINGS: Record<Lang, Record<string, string>> = {
  sv: {
    rules: 'REGLER',
    business: 'VERKSAMHETEN',
    products: 'MODELLER I PRODUKTION',
    repairs: 'REPARATIONER OCH MATERIAL',
    history: 'HISTORIA',
    commissions: 'UPPDRAG',
    press: 'PUBLICERAT OM VERKSTADEN',
    books: 'BÖCKER SOM VERKSTADEN ANGER ATT DEN FÖREKOMMER I',
    lead: 'ATT TA EMOT EN FÖRFRÅGAN',
  },
  en: {
    rules: 'RULES',
    business: 'THE BUSINESS',
    products: 'MODELS IN PRODUCTION',
    repairs: 'REPAIRS AND MATERIALS',
    history: 'HISTORY',
    commissions: 'COMMISSIONS',
    press: 'PUBLISHED ABOUT THE WORKSHOP',
    books: 'BOOKS THE WORKSHOP STATES IT APPEARS IN',
    lead: 'TAKING AN ENQUIRY',
  },
};

const LEAD: Record<Lang, string> = {
  sv:
    'När någon vill att verkstaden hör av sig: be om namn, en kontaktuppgift (telefon eller e-post), vilken möbel det gäller och vad som behöver göras. När du har namn, en kontaktuppgift och en beskrivning anropar du verktyget skicka_forfragan. Anropa det bara en gång per samtal. Påstå aldrig att något är skickat om du inte har anropat verktyget.',
  en:
    'When someone wants the workshop to get in touch: ask for a name, one contact detail (phone or email), which piece of furniture it concerns and what needs doing. Once you have a name, a contact detail and a description, call the tool skicka_forfragan. Call it only once per conversation. Never claim anything has been sent unless you have called the tool.',
};

/**
 * The published year is a Swedish decade string — "1940-tal", "1930/40-tal" —
 * and it was reaching the English prompt untranslated, so the English
 * assistant was reading "(1940-tal)" back to English speakers. Only the two
 * shapes the nine product records actually use are handled; anything else is
 * returned untouched rather than mangled.
 */
function decade(year: string): string {
  const split = year.match(/^(\d{4})\/(\d{2})-tal$/);
  if (split) return `${split[1]}s/${split[2]}s`;
  const one = year.match(/^(\d{4})-tal$/);
  if (one) return `${one[1]}s`;
  return year;
}

/** Generate the whole system prompt for one language, from the data above. */
export function buildSystemPrompt(lang: Lang): string {
  const k = knowledge(lang);
  const h = HEADINGS[lang];
  const out: string[] = [];

  out.push(h.rules);
  RULES[lang].forEach((r, i) => out.push(`${i + 1}. ${r}`));

  out.push('', h.business);
  out.push(`${k.business.legalName}, ${k.business.address}. ${k.business.entrance}.`);
  out.push(`${lang === 'sv' ? 'Telefon' : 'Telephone'}: ${k.business.phone}`);
  out.push(`${lang === 'sv' ? 'E-post' : 'Email'}: ${k.business.email}`);
  out.push(`Instagram: ${k.business.instagram}`);
  out.push(
    lang === 'sv'
      ? `Grundat ${k.business.founded}.`
      : `Founded ${k.business.founded}.`
  );
  if (!k.business.openingHoursPublished) {
    out.push(
      lang === 'sv'
        ? 'Inga öppettider är publicerade. Du känner inte till några.'
        : 'No opening hours are published. You do not know any.'
    );
  }

  out.push('', h.products);
  for (const p of k.products) {
    const bits = [p.name];
    if (p.designer) {
      bits.push(
        (lang === 'sv' ? 'formgiven av ' : 'designed by ') +
          p.designer +
          (p.client ? (lang === 'sv' ? ' för ' : ' for ') + p.client : '') +
          (p.year ? ` (${lang === 'sv' ? p.year : decade(p.year)})` : '')
      );
    }
    out.push('- ' + bits.join(', '));
    if (p.material) out.push(`  ${lang === 'sv' ? 'Material' : 'Material'}: ${p.material}`);
    out.push(
      `  ${lang === 'sv' ? 'Mått' : 'Measurements'}: ` +
        (p.dimensions
          ? p.dimensions
          : lang === 'sv'
            ? 'inga mått publicerade för denna modell'
            : 'no measurements published for this model')
    );
    if (p.description) out.push(`  ${p.description}`);
  }
  out.push(
    lang === 'sv'
      ? `Skötsel, samma för alla modeller: ${k.products[0].care}`
      : `Care, the same for every model: ${k.products[0].care}`
  );

  out.push('', h.repairs);
  k.repairs.forEach((l) => out.push(l));

  out.push('', h.history);
  k.history.forEach((l) => out.push(l));

  out.push('', h.commissions);
  k.commissions.forEach((l) => out.push(l));

  out.push('', h.press);
  k.press.forEach((p) => out.push(`- ${p.year ? p.year + ', ' : ''}${p.outlet}: ${p.title}`));

  out.push('', h.books);
  k.books.forEach((b) => out.push(`- ${b.year}, ${b.author}: ${b.title}`));
  out.push(
    lang === 'sv'
      ? 'Endast Verkstäder (2018) är bekräftad att nämna verkstaden. För övriga är det verkstadens egen uppgift.'
      : 'Only Verkstäder (2018) is confirmed to mention the workshop. For the others it is the workshop\'s own account.'
  );

  out.push('', h.lead);
  out.push(LEAD[lang]);

  return out.join('\n');
}
