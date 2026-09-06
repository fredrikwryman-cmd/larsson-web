import type { Lang } from '../i18n/config';

/**
 * The three portfolio categories.
 *
 * Labels are verbatim from the live site's own category pages — including the
 * singular/plural difference between "Formgiven av …" and "Formgivna av …",
 * which is correct Swedish for one designer versus a firm's output and is not
 * a typo to normalise. The English labels are translations of those.
 *
 * The live site prefixed each of these with the untranslated English string
 * "Portfolio category:". That label is dropped entirely; the category name is
 * now the h1, as agreed.
 *
 * TODO(client): the `intro` paragraphs are NEW COPY written for this rebuild —
 * the live category pages are bare lists with no introduction. They are drawn
 * only from what the harvested pages already establish (the /om-oss/ history
 * and the product descriptions) and deliberately assert nothing beyond it. They
 * go out in the client's name and need the client's approval.
 */
export const categories = [
  {
    slug: 'formgiven-av-john-larsson',
    label: {
      sv: 'Formgiven av John Larsson',
      en: 'Designed by John Larsson',
    },
    description: {
      sv: 'Rottingmöbler formgivna av John Larsson, i produktion hos Larsson korgmakare sedan 1930-talet.',
      en: 'Rattan furniture designed by John Larsson, in production at Larsson korgmakare since the 1930s.',
    },
    intro: {
      sv: 'John Larsson var son till en av företagets grundare och arbetade som korgmakare i verkstaden. Under 1930- och 40-talen ritade han ett antal modeller för Larsson korgmakare, flera av dem på beställning till badhus, frisersalonger och offentliga miljöer i Stockholm. Många av modellerna finns i produktion än idag.',
      en: 'John Larsson was the son of one of the founders and worked as a basket maker in the workshop. During the 1930s and 40s he designed a number of models for Larsson korgmakare, several of them commissioned for bathhouses, hairdressing salons and public interiors in Stockholm. Many of them are still in production today.',
    },
  },
  {
    slug: 'formgiven-av-nyrens-arkitektkontor',
    label: {
      sv: 'Formgiven av Nyréns arkitektkontor',
      en: "Designed by Nyréns arkitektkontor",
    },
    description: {
      sv: 'Rottingmöbler formgivna av Nyréns arkitektkontor och tillverkade av Larsson korgmakare.',
      en: 'Rattan furniture designed by Nyréns arkitektkontor and made by Larsson korgmakare.',
    },
    intro: {
      sv: 'Nyréns arkitektkontor är ett av de arkitektkontor som Larsson korgmakare har samarbetat med genom åren. Modellen här ritades i mitten av 1960-talet och ingick i en serie rottingmöbler.',
      en: 'Nyréns arkitektkontor is one of the architectural practices Larsson korgmakare has worked with over the years. The model here was drawn in the mid-1960s and formed part of a series of rattan furniture.',
    },
  },
  {
    slug: 'formgivna-av-larsson-korgmakare',
    label: {
      sv: 'Formgivna av Larsson korgmakare',
      en: 'Designed by Larsson korgmakare',
    },
    description: {
      sv: 'Möbler formgivna och tillverkade av Larsson korgmakare i Gamla stan, Stockholm.',
      en: 'Furniture designed and made by Larsson korgmakare in Gamla stan, Stockholm.',
    },
    intro: {
      sv: 'Vid sidan av de ritade modellerna tillverkar verkstaden också egna möbler, ofta på beställning och efter mått. De görs enligt överenskommelse och anpassas till rummet de ska stå i.',
      en: 'Alongside the drawn models, the workshop also makes furniture of its own, often to order and to measure. These are made by agreement and adapted to the room they are intended for.',
    },
  },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

export function categoryLabel(slug: string, lang: Lang): string {
  return categories.find((c) => c.slug === slug)?.label[lang] ?? slug;
}

export function category(slug: string) {
  return categories.find((c) => c.slug === slug);
}
