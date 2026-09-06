import type { Lang } from '../i18n/config';

/**
 * PRESS AND PUBLICATIONS — every entry verified by opening the source.
 *
 * Full evidence, including the exact quotation that proves each source names
 * the workshop, is in larsson-harvest/press-research.md. Nothing here rests on
 * a search-result snippet, and nothing was included that could not be opened.
 *
 * Two kinds of entry are kept apart on purpose:
 *   `coverage`  — a third party wrote about the workshop by name.
 *   `books`     — the bibliographic record was verified in LIBRIS, the Swedish
 *                 national catalogue. For all but one, whether the book's
 *                 CONTENTS mention the workshop could not be confirmed, so the
 *                 page does not claim it.
 *
 * TODO(client): five notes on where this page differs from /om-oss/.
 *   1. /om-oss/ lists "Svenska stolar, Norstedts (2002)". LIBRIS has no such
 *      book. The 2002 title is "Svenska stolar och deras formgivare
 *      1899–2001", published by BYGGFÖRLAGET. Listed here as verified.
 *   2. /om-oss/ spells the author "Björnstad". LIBRIS records "Biörnstad".
 *      Listed here as verified; the /om-oss/ text is left verbatim.
 *   3. hantverksvandringar.se is dead — the domain now serves a parking page.
 *      It is therefore not linked anywhere on this site.
 *   3b. /om-oss/ names the exhibition "Designprocessen NM&". Nationalmuseum's
 *      own record has "Designprocesser NM&", which is what this page uses. The
 *      /om-oss/ wording is left verbatim, so the site carries both spellings
 *      by design — the client's on their page, the museum's on this one.
 *   4. The Göteborgs-Posten and Sundsvalls Tidning entries are the SAME article:
 *      Maria Soxbo's feature distributed on the TT Spektra wire in July 2017 and
 *      run by each title under its own headline and its own date. Both were
 *      opened and read. The same text was also found at vlt.se (10 July 2017,
 *      "Rotting på modet") and bblat.se under that second headline; those are
 *      not listed, because listing one article four times would overstate the
 *      coverage. Two are listed only because the client's own press page names
 *      both titles.
 */

export interface PressEntry {
  /** Blank when the source genuinely carries no date. */
  year: string;
  outlet: string;
  title: string;
  what: Record<Lang, string>;
  url: string;
}

/** Third-party sources that name the workshop. */
export const coverage: PressEntry[] = [
  {
    year: '2000',
    outlet: 'Sankt Eriks årsbok, Samfundet S:t Erik',
    title: 'Stig Larsson – korgmakare: Larsson Korgmakare AB, Skeppsbron 46',
    what: {
      sv: 'Artikel av Arne Biörnstad i årsboken Hantverkare i Stockholm, s. 141–148.',
      en: 'Article by Arne Biörnstad in the yearbook Hantverkare i Stockholm, pp. 141–148.',
    },
    url: 'https://libris.kb.se/bib/3217414',
  },
  {
    year: '2017',
    outlet: 'Göteborgs-Posten',
    title: 'Nu råder rottingfeber i Sverige',
    what: {
      sv: 'Reportage av Maria Soxbo för nyhetsbyrån TT Spektra om rottingmöbler, där verkstaden beskrivs som den enda kvarvarande tillverkaren i Sverige. Publicerat 3 juli 2017.',
      en: 'Feature by Maria Soxbo for the TT Spektra wire on rattan furniture, describing the workshop as the only remaining maker in Sweden. Published 3 July 2017.',
    },
    url: 'https://www.gp.se/livsstil/bostad/nu-rader-rottingfeber-i-sverige.194d0375-d741-44a4-a519-5fa742cfdf87',
  },
  {
    /**
     * Placed here rather than by date order alone: it is the same wire piece as
     * the entry above, eighteen days later under a different headline, and the
     * two only make sense read together. See note 4 at the top of this file.
     */
    year: '2017',
    outlet: 'Sundsvalls Tidning',
    title:
      'Rottingfeber i landet – häng med in till Erica Larsson som är fjärde generationens korgmakare',
    what: {
      sv: 'Samma reportage av Maria Soxbo för TT Spektra som Göteborgs-Posten publicerade, här under egen rubrik och med Erica Larsson i verkstaden. Publicerat 21 juli 2017.',
      en: 'The same feature by Maria Soxbo for the TT Spektra wire that Göteborgs-Posten ran, here under its own headline and with Erica Larsson in the workshop. Published 21 July 2017.',
    },
    url: 'https://www.st.nu/artikel/rottingfeber-i-landet-hang-med-in-till-erica-larsson-som-ar-fjarde-generationens-korgmakare',
  },
  {
    year: '2021',
    outlet: 'Borgarnytt, Stockholms borgerskap',
    title: 'För traditionen in i nutid',
    what: {
      sv: 'Artikel av Gabriella Kvarnlöf med intervju med Erica Larsson.',
      en: 'Article by Gabriella Kvarnlöf, with an interview with Erica Larsson.',
    },
    url: 'https://www.borgerskapet.se/fo%CC%88r-traditionen-in-i-nutid/',
  },
  {
    year: '2019',
    outlet: 'Matti Klenell Studio',
    title: 'NM& 040, Larsson Korgmakare',
    what: {
      sv: 'Formgivarens egen projektsida om fåtöljen NM& 040 för Nationalmuseum.',
      en: "The designer's own project page for the NM& 040 easy chair for the Nationalmuseum.",
    },
    url: 'https://mattiklenell.com/NM-040-Larsson-Korgmakare',
  },
  {
    year: '2018',
    outlet: 'Kurbits',
    title: 'Verkstäder: ömsint om görandets vrår och människor',
    what: {
      sv: 'Bokrecension av Frida Arnqvist Engström som nämner verkstadens arbete för Nationalmuseum.',
      en: "Book review by Frida Arnqvist Engström, noting the workshop's work for the Nationalmuseum.",
    },
    url: 'https://www.kurbits.nu/2018/10/22/verkstader-omsint-om-gorandets-vrar-och-manniskor/',
  },
  {
    year: '1978–1984',
    outlet: 'ArkDes / Arkitekturmuseet',
    title: 'Samlingsposter ARKM.1973-206-01 och -02',
    what: {
      sv: 'Museets egna katalogposter för två stolar av Marcel Breuer, där rottingflätningen anges vara renoverad av verkstaden.',
      en: "The museum's own catalogue records for two Marcel Breuer chairs, crediting the workshop with restoring the caning.",
    },
    url: 'https://digitaltmuseum.se/011024781751/foremal',
  },
  {
    year: '2024',
    outlet: 'SMÅA',
    title: 'Flera generationer korgmakare',
    what: {
      sv: 'Filmat verkstadsbesök hos Erica Larsson.',
      en: 'A filmed workshop visit with Erica Larsson.',
    },
    url: 'https://www.youtube.com/watch?v=m43cgXf-iAw',
  },
  {
    year: '2024',
    outlet: 'Konsthantverkets vänner',
    title: 'Ateljébesök i Gamla stan',
    what: {
      sv: 'Studiebesök i verkstaden, 9 april 2024.',
      en: 'A study visit to the workshop, 9 April 2024.',
    },
    url: 'https://www.khv.se/aktiviteter-resor/ateljbesk-i-gamla-stan',
  },
  {
    year: '',
    outlet: 'Svenskt Tenn, Journalen',
    title: 'Larsson Korgmakare – tillverkare av rottingmöbler',
    what: {
      sv: 'Reportage hos Svenskt Tenn om samarbetet och tillverkningen. Sidan saknar publiceringsdatum.',
      en: "A feature on Svenskt Tenn's own site about the collaboration and the making. The page carries no date.",
    },
    url: 'https://www.svenskttenn.com/se/sv/journalen/hantverk/larsson-korgmakare/',
  },
  {
    year: '',
    outlet: 'En Företagares Vardag',
    title: 'Larsson Korgmakare ett hantverk i hjärtat av huvudstaden',
    what: {
      sv: 'Företagsporträtt av Mats Eriksson. Sidan saknar publiceringsdatum.',
      en: 'A business profile by Mats Eriksson. The page carries no date.',
    },
    url: 'https://www.enforetagaresvardag.se/larsson-korgmakare-ett-hantverk-i-hjartat-av-huvudstaden/',
  },
  {
    year: '',
    outlet: 'Wikipedia',
    title: 'Larsson Korgmakare',
    what: {
      sv: 'Uppslagsartikel på svenska Wikipedia.',
      en: 'Encyclopedia article on Swedish Wikipedia.',
    },
    url: 'https://sv.wikipedia.org/wiki/Larsson_Korgmakare',
  },
];

export interface BookEntry {
  year: string;
  title: string;
  author: string;
  publisher: string;
  url: string;
  /** True only where the book's contents were confirmed to name the workshop. */
  contentsConfirmed?: boolean;
}

/**
 * Books. Every bibliographic record below was verified in LIBRIS. Only
 * `Verkstäder` could be confirmed to mention the workshop inside; the page says
 * so rather than implying more.
 */
export const books: BookEntry[] = [
  {
    year: '2018',
    title: 'Verkstäder',
    author: 'Cilla Ramnek',
    publisher: 'Natur & Kultur',
    url: 'https://libris.kb.se/bib/20704101',
    contentsConfirmed: true,
  },
  {
    year: '2014',
    title: 'Svenska stolar och deras formgivare 1899–2013',
    author: 'Dan Gordan',
    publisher: 'Norstedts',
    url: 'https://libris.kb.se/bib/14757661',
  },
  {
    year: '2009',
    title: 'Stockholms korgmakare',
    author: 'Arne Biörnstad',
    publisher: 'Nordiska museets förlag',
    url: 'https://libris.kb.se/bib/11378643',
  },
  {
    year: '2003',
    title: 'Historiska hantverk: 20 nutidsreportage',
    author: 'Samuel Karlsson',
    publisher: 'Byggförlaget',
    url: 'https://libris.kb.se/bib/9344365',
  },
  {
    year: '2002',
    title: 'Svenska stolar och deras formgivare 1899–2001',
    author: 'Dan Gordan',
    publisher: 'Byggförlaget',
    url: 'https://libris.kb.se/bib/8693401',
  },
  {
    year: '1999',
    title: 'Korgmöbelmakeriet i Sverige med utblickar mot övriga Norden',
    author: 'Albin Tingbo',
    publisher: 'Carlsson',
    url: 'https://libris.kb.se/bib/7622205',
  },
];

export const exhibition = {
  year: '2018–2019',
  title: 'Designprocesser NM&',
  outlet: 'Nationalmuseum, Stockholm',
  url: 'https://www.nationalmuseum.se/en/designprocesser-nm',
  what: {
    sv: 'Utställning i Designdepån, 13 oktober 2018 – 9 juni 2019. Verkstaden tillverkade rottingmöblerna i NM&-serien.',
    en: 'Exhibition in the Design Depot, 13 October 2018 – 9 June 2019. The workshop made the rattan furniture in the NM& series.',
  },
};

/** Copy around the lists. TODO(client): new copy in the client's name. */
export const pressCopy = {
  sv: {
    intro:
      'Ett urval av det som skrivits om verkstaden. Varje uppgift är kontrollerad mot källan.',
    booksHeading: 'Böcker',
    booksNote:
      'Verkstaden är omnämnd i Verkstäder (2018). Övriga titlar är kontrollerade mot Libris; att verkstaden förekommer i dem är uppgifter från oss själva.',
    exhibitionHeading: 'Utställning',
  },
  en: {
    intro:
      'A selection of what has been written about the workshop. Every entry has been checked against its source.',
    booksHeading: 'Books',
    booksNote:
      'The workshop is named in Verkstäder (2018). The other titles have been checked against Libris; that the workshop appears in them is our own account.',
    exhibitionHeading: 'Exhibition',
  },
};
