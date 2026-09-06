import { prose } from './content';
import type { Lang } from '../i18n/config';
import { getCollection } from 'astro:content';

/**
 * FAQ structured data for the repairs page.
 *
 * The rule here is that **every answer is the client's own published sentence**,
 * lifted from the harvested copy (or its parallel translation), not written by
 * us. Only the questions are new, and they are questions the existing copy
 * plainly answers — what a repair costs, and how to look after a finished
 * piece. Nothing is asserted that the site does not already say.
 *
 * TODO(client): the two question strings are new copy in the client's name.
 * The answers are verbatim.
 */
const QUESTIONS: Record<Lang, { price: string; care: string }> = {
  sv: {
    price: 'Vad kostar en reparation?',
    care: 'Hur sköter jag en rottingmöbel?',
  },
  en: {
    price: 'What does a repair cost?',
    care: 'How do I look after a rattan piece?',
  },
};

/** Pull the sentence about agreeing scope and price out of the repairs copy. */
function priceAnswer(lang: Lang): string | null {
  for (const block of prose('reparationer', lang)) {
    for (const line of block.lines) {
      const marker = lang === 'sv' ? 'prisbild' : 'price';
      if (line.includes(marker)) {
        // The sentence that actually answers the question, not the paragraph.
        const sentences = line.split(/(?<=\.)\s+/);
        const hit = sentences.find((x) => x.includes(marker));
        if (hit) return hit.trim();
      }
    }
  }
  return null;
}

export async function faqFor(lang: Lang) {
  const products = await getCollection('products');
  const first = products.find((p) => p.data.slug === 'badhusstolen-230');

  let careAnswer: string | null = null;
  if (first) {
    if (lang === 'sv') {
      careAnswer = first.data.care;
    } else {
      const { productEn } = await import('./content');
      careAnswer = productEn(first.data.slug).care;
    }
  }

  const price = priceAnswer(lang);
  const q = QUESTIONS[lang];

  const entries = [
    price ? { q: q.price, a: price } : null,
    careAnswer ? { q: q.care, a: careAnswer } : null,
  ].filter((x): x is { q: string; a: string } => x !== null);

  if (entries.length === 0) return undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: { '@type': 'Answer', text: e.a },
    })),
  };
}
