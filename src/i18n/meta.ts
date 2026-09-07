import type { Lang, PageKey } from './config';

/**
 * Title and meta description for every fixed page, written per page in both
 * languages. Nothing here is templated from a pattern — each one describes what
 * is actually on that page.
 *
 * Product and category pages take their descriptions from the client's own copy
 * for that item, so they are unique by construction; see the route files.
 */
type Meta = { title: string; description: string };

export const pageMeta: Record<PageKey, Record<Lang, Meta>> = {
  /*
   * The titles are unchanged, deliberately. "Josef Frank" and "Svenskt Tenn"
   * are the only terms on this site with reach beyond Stockholm, but the title
   * is 45 characters of which every word earns its place: rottingmöbler is
   * what the workshop sells, möbelreparation is what most visitors arrive
   * searching for, and Gamla stan is the local term. Adding the two names
   * means dropping one of those three, and a title that trades the service
   * people search for against a name they may not be searching for yet is a
   * worse trade than it looks. The names go in the description, where there is
   * room for both without losing anything.
   *
   * TODO(client): the descriptions below name Josef Frank and Svenskt Tenn.
   * Same caveat as the homepage copy in ui.ts — confirm with the client that
   * the collaboration may be communicated this way before the site is indexed.
   */
  home: {
    sv: {
      title: 'Rottingmöbler och möbelreparation i Gamla stan',
      description:
        'Larsson Korgmakare tillverkar och reparerar möbler i rotting, sjögräs och snöre i Gamla stan. Sedan 1930-talet Josef Franks rottingmöbler för Svenskt Tenn.',
    },
    en: {
      title: 'Rattan furniture and furniture repair in Gamla stan',
      description:
        "Larsson Korgmakare makes and repairs furniture in rattan, seagrass and paper cord in Gamla stan, Stockholm. Josef Frank's rattan furniture for Svenskt Tenn.",
    },
  },
  about: {
    sv: {
      title: 'Om oss',
      description:
        'Larsson korgmakare i Gamla stan, Stockholm. Sedan 1903 tillverkar och renoverar vi möbler i rotting, sjögräs och snöre — nu i fjärde generationen.',
    },
    en: {
      title: 'About us',
      description:
        'Larsson korgmakare in Gamla stan, Stockholm. Since 1903 we have made and restored furniture in rattan, seagrass and paper cord — now in the fourth generation.',
    },
  },
  history: {
    sv: {
      title: 'Historia',
      description:
        'Larsson korgmakare grundades 1903 av bröderna Emil och Knut Wilhelm Larsson. Fyra generationer korgmakare, och Josef Franks rottingmöbler sedan 1930-talet.',
    },
    en: {
      title: 'History',
      description:
        "Larsson korgmakare was founded in 1903 by the brothers Emil and Knut Wilhelm Larsson. Four generations of basket makers, and Josef Frank's rattan furniture since the 1930s.",
    },
  },
  products: {
    sv: {
      title: 'Produkter',
      description:
        'Ett tiotal modeller i miljövänligt odlad rotting, tillverkade för hand i korgmakeriet. Fåtöljer, stolar, soffor, pallar och bord av John Larsson och Nyréns.',
    },
    en: {
      title: 'Products',
      description:
        'Around ten models in environmentally friendly cultivated rattan, made by hand in the workshop. Easy chairs, chairs, sofas, stools and tables by John Larsson and Nyréns.',
    },
  },
  commissions: {
    sv: {
      title: 'Uppdrag',
      description:
        'Beställningsuppdrag för privata och offentliga miljöer: Nationalmuseum, Svenskt Tenn, Gröna Lund och Statens maritima museer. Rotting på beställning.',
    },
    en: {
      title: 'Commissions',
      description:
        'Commissioned work for private and public interiors: the Nationalmuseum, Svenskt Tenn, Gröna Lund and the Swedish National Maritime Museums. Rattan made to order.',
    },
  },
  repairs: {
    sv: {
      title: 'Reparationer',
      description:
        'Alla slags reparationer av möbler i korg och rotting: renovering av stomme, omflätning av sits i rotting, sjögräs eller papperssnöre. Inget uppdrag är för litet.',
    },
    en: {
      title: 'Repairs',
      description:
        'Every kind of repair to basket and rattan furniture: restoring frames, re-weaving seats in rattan, seagrass or paper cord. No job is too small.',
    },
  },
  press: {
    sv: {
      title: 'Press',
      description:
        'Publicerat om Larsson Korgmakare — artiklar, böcker och samlingar, med källa till varje uppgift. Här finns också villkoren för pressbilder.',
    },
    en: {
      title: 'Press',
      description:
        'Published about Larsson Korgmakare — articles, books and collections, each with its source. The terms for press images are here too.',
    },
  },
  contact: {
    sv: {
      title: 'Kontakt',
      description:
        'Hör av dig om reparationer, beställningar och uppdrag. Korgmakeriet ligger på Skeppsbron 46 i Gamla stan — ingång från Södra Dryckesgränd.',
    },
    en: {
      title: 'Contact',
      description:
        'Get in touch about repairs, orders and commissions. The workshop is at Skeppsbron 46 in Gamla stan, Stockholm — entrance on Södra Dryckesgränd.',
    },
  },
  thanks: {
    sv: {
      title: 'Tack för ditt meddelande',
      description: 'Tack, ditt meddelande har skickats till Larsson Korgmakare. Vi återkommer så snart vi kan.',
    },
    en: {
      title: 'Thank you for your message',
      description: 'Thank you, your message has been sent to Larsson Korgmakare. We will be in touch as soon as we can.',
    },
  },
  nm040: {
    sv: {
      title: 'NM& 040',
      description:
        'Stol NM& 040 av Matti Klenell för Nationalmuseum, 2018. Tillverkad av Larsson korgmakare i miljövänligt odlad rotting.',
    },
    en: {
      title: 'NM& 040',
      description:
        'The NM& 040 chair by Matti Klenell for the Nationalmuseum, 2018. Made by Larsson korgmakare in environmentally friendly cultivated rattan.',
    },
  },
  akes: {
    sv: {
      title: 'Åkes',
      description:
        'Stol Åkes av Carina Seth Andersson för Nationalmuseum, 2018. Tillverkad av Larsson korgmakare i miljövänligt odlad rotting.',
    },
    en: {
      title: 'Åkes',
      description:
        'The Åkes chair by Carina Seth Andersson for the Nationalmuseum, 2018. Made by Larsson korgmakare in environmentally friendly cultivated rattan.',
    },
  },
  svensktTenn: {
    sv: {
      title: 'Svenskt Tenn',
      description:
        'Sedan 1930-talet tillverkar Larsson korgmakare Josef Franks rottingmöbler för Svenskt Tenn — soffa 311, stol 1184, liggstol P6 och soffbord P73.',
    },
    en: {
      title: 'Svenskt Tenn',
      description:
        "Since the 1930s Larsson korgmakare has made Josef Frank's rattan furniture for Svenskt Tenn — sofa 311, chair 1184, reclining chair P6 and coffee table P73.",
    },
  },
};

/** The 404 page, which exists once and is served for both languages. */
export const notFoundMeta: Record<Lang, Meta> = {
  sv: {
    title: 'Sidan finns inte',
    description:
      'Sidan du letade efter finns inte på larssonkorgmakare.se. Här är vägar vidare till våra modeller, våra reparationer och våra kontaktuppgifter.',
  },
  en: {
    title: 'Page not found',
    description:
      'The page you were looking for does not exist. Here are ways on to our models, our repairs and our contact details.',
  },
};
