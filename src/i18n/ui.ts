import type { Lang } from './config';

/**
 * Interface strings — everything the site says that is NOT the client's own
 * harvested copy. The client's Swedish lives in src/data/page-content.json and
 * its English in src/i18n/content.en.json; neither is repeated here.
 *
 * New Swedish copy written for this rebuild is marked TODO(client) at the point
 * it is used, because it goes out in the client's name.
 */
export const ui = {
  sv: {
    // --- homepage. The Swedish is the client's approved copy from phase 3.
    home_h1: 'Vi tillverkar & reparerar möbler i rotting, sjögräs och snöre — sedan 1903',
    home_intro:
      'I korgmakeriet på Skeppsbron i Gamla stan arbetar fjärde generationen Larsson. Sedan 1903 har vi tillverkat rottingmöbler för hand, och sedan 1930-talet har vi tillverkat Josef Franks rottingmöbler för Svenskt Tenn. Idag är vi den enda kvarvarande tillverkaren av rottingmöbler i Sverige.',
    home_repairsHeading: 'Laga en möbel',
    home_repairs:
      'Har du en möbel som behöver lagas? Vi tar emot allt från enstaka stolar till hela möbelgrupper, och inget uppdrag är för litet. Kom in till verkstaden på Skeppsbron 46, ingång från Södra Dryckesgränd, eller hör av dig så tittar vi på den tillsammans.',
    home_repairsLink: 'Läs mer om reparationer…',

    // --- chrome
    skipToContent: 'Hoppa till innehållet',
    openMenu: 'Öppna meny',
    closeMenu: 'Stäng meny',
    mainMenu: 'Huvudmeny',
    shortcuts: 'Genvägar',
    breadcrumb: 'Brödsmulor',
    home: 'Hem',
    langLabel: 'Språk',
    svenska: 'Svenska',
    english: 'English',

    /* Historia is deliberately NOT in the main navigation — the live site has
       six links and adding a seventh would change the header the client knows.
       It is reached from Om oss and from the footer. */
    historyLabel: 'Historia',
    historyLink: 'Läs mer om vår historia…',

    // --- nav labels, matching the live site exactly
    nav: {
      about: 'Om oss',
      products: 'Produkter',
      commissions: 'Uppdrag',
      repairs: 'Reparationer',
      press: 'Press',
      contact: 'Kontakt',
    },

    // --- products
    category: 'Kategori:',
    allModels: 'Alla modeller',
    filter: 'Filtrera',
    showModel: 'Visa modell',
    previous: 'Föregående',
    next: 'Nästa',
    moreModels: 'Fler modeller',
    backToProducts: 'Alla modeller…',
    noneInCategory: 'Inga modeller i den här kategorin.',

    // --- images
    requestQuote: "Begär offert…",
    enlarge: 'Förstora bilden',
    enlarged: 'Förstorad bild',
    close: 'Stäng',
    prevImage: 'Föregående bild',
    nextImage: 'Nästa bild',
    carouselHelp: 'Använd vänster- och högerpil för att bläddra mellan bilderna.',
    carouselImage: (i: number, n: number) => `Visa bild ${i} av ${n}`,

    // --- footer
    footerContact: 'Kontakt',
    footerVisit: 'Hitta hit',
    footerNav: 'På webbplatsen',
    footerMemberships: 'Medlemskap',
    footerFollow: 'Följ oss',
    entrance: 'Ingång från Södra Dryckesgränd',

    // --- contact / directions. TODO(client): new copy in the client's name.
    /* Skylten beskrivs som en svart skylt med ett monogram — aldrig med vad den
       säger. Texten på skylten i bilden är omritad av det generativa verktyget
       och stämmer inte. Se TODO(client) i ContactPage.astro. */
    entranceAlt:
      'Verkstadens entré från Södra Dryckesgränd: en brun trädubbeldörr med glasade övre fält och räfflade nedre fält, i en ockragul putsad fasad över en mörk stensockel. Ovanför dörren sitter en svart skylt med ett monogram i guld. Framför dörren ligger kullersten.',
    directionsHeading: 'Hitta till verkstaden',
    directions: [
      'Korgmakeriet ligger på Skeppsbron 46 i Gamla stan. Ingången är inte från Skeppsbron utan runt hörnet, från Södra Dryckesgränd.',
      'Närmaste tunnelbana är Gamla stan, cirka fem minuters promenad. Slussen ligger några minuter längre bort.',
      'Kommer du med en möbel går det bra att stanna till på Skeppsbron för att lasta av.',
    ],
    mapAlt: 'Karta över Skeppsbron 46 i Gamla stan, Stockholm, med ingång från Södra Dryckesgränd',
    openInMaps: 'Öppna i kartan…',
    osmContributors: 'bidragsgivare',

    // --- press. TODO(client): new chrome around the client's own list.
    pressListHeading: 'Publicerat om oss',
    pressImagesHeading: 'Pressbilder',
    pressYear: 'År',
    pressWhat: 'Publikation',

    // --- form
    requiredLegend: '* obligatoriskt fält',
    formName: 'Namn',
    formEmail: 'E-post',
    formSubject: 'Ämne',
    formModel: 'Modell',
    formMessage: 'Meddelande',
    formPhoto: 'Bild på möbeln',
    formPhotoByEmail:
      'Har du en bild på möbeln? Mejla den till info@larssonkorgmakare.se, gärna med samma ämne som här ovan, så tittar vi på den.',
    formPhotoHint: (mb: number) =>
      `Frivilligt. Har du en möbel som behöver lagas går det bra att fotografera den och bifoga bilden här. Max ${mb} MB.`,
    formPhotoTooBig: (size: string, mb: number) =>
      `Bilden är ${size} MB. Max ${mb} MB — välj en mindre bild eller skicka den i ett mejl i stället.`,
    formConsent: 'Jag samtycker till att mina uppgifter sparas för att besvara min förfrågan.',
    formSubmit: 'SKICKA',

    // --- thanks page. TODO(client): new copy.
    thanksHeading: 'Tack för ditt meddelande',
    thanksBody:
      'Vi har tagit emot din förfrågan och hör av oss så snart vi kan. Är det bråttom går det alltid bra att ringa oss i stället.',
    thanksProducts: 'Se våra modeller…',
    thanksHome: 'Till startsidan…',

    // --- 404. TODO(client): new copy.
    notFoundHeading: 'Sidan finns inte',
    notFoundBody:
      'Sidan du letade efter finns inte, eller har fått en ny adress. Kanske hittar du det du söker här:',
    notFoundProducts: 'våra modeller i rotting',
    notFoundRepairs: 'laga en möbel',
    notFoundContact: 'ring eller mejla oss',
  },

  en: {
    // --- homepage
    home_h1: 'We make & repair furniture in rattan, seagrass and paper cord — since 1903',
    home_intro:
      "In the workshop on Skeppsbron in Gamla stan the fourth generation of the Larsson family is at work. Since 1903 we have made rattan furniture by hand, and since the 1930s we have made Josef Frank's rattan furniture for Svenskt Tenn. Today we are the only remaining maker of rattan furniture in Sweden.",
    home_repairsHeading: 'Having a piece repaired',
    home_repairs:
      'Do you have a piece of furniture that needs repairing? We take on everything from single chairs to whole suites of furniture, and no job is too small. Come to the workshop at Skeppsbron 46, entrance on Södra Dryckesgränd, or get in touch and we will look at it together.',
    home_repairsLink: 'More about repairs…',

    skipToContent: 'Skip to content',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    mainMenu: 'Main menu',
    shortcuts: 'Shortcuts',
    breadcrumb: 'Breadcrumb',
    home: 'Home',
    langLabel: 'Language',
    svenska: 'Svenska',
    english: 'English',

    historyLabel: 'History',
    historyLink: 'Read more about our history…',

    nav: {
      about: 'About us',
      products: 'Products',
      commissions: 'Commissions',
      repairs: 'Repairs',
      press: 'Press',
      contact: 'Contact',
    },

    category: 'Category:',
    allModels: 'All models',
    filter: 'Filter',
    showModel: 'View model',
    previous: 'Previous',
    next: 'Next',
    moreModels: 'More models',
    backToProducts: 'All models…',
    noneInCategory: 'No models in this category.',

    requestQuote: "Request a quote…",
    enlarge: 'Enlarge image',
    enlarged: 'Enlarged image',
    close: 'Close',
    prevImage: 'Previous image',
    nextImage: 'Next image',
    carouselHelp: 'Use the left and right arrow keys to move between the images.',
    carouselImage: (i: number, n: number) => `Show image ${i} of ${n}`,

    footerContact: 'Contact',
    footerVisit: 'Finding us',
    footerNav: 'On this site',
    footerMemberships: 'Memberships',
    footerFollow: 'Follow us',
    entrance: 'Entrance on Södra Dryckesgränd',

    /* The sign is described as a black sign with a monogram — never by what it
       says. The lettering in the photograph was redrawn by the generative tool
       and is wrong. See the TODO(client) in ContactPage.astro. */
    entranceAlt:
      'The workshop entrance on Södra Dryckesgränd: a brown wooden double door with glazed upper panels and ribbed lower panels, set in an ochre rendered façade above a dark stone base. A black sign with a monogram in gold hangs above the door. Cobblestones lie in front of the door.',
    directionsHeading: 'Finding the workshop',
    directions: [
      'The workshop is at Skeppsbron 46 in Gamla stan. The entrance is not on Skeppsbron itself but around the corner, on Södra Dryckesgränd.',
      'The nearest underground station is Gamla stan, about five minutes on foot. Slussen is a few minutes further.',
      'If you are bringing a piece of furniture, you can pull in on Skeppsbron to unload.',
    ],
    mapAlt:
      'Map of Skeppsbron 46 in Gamla stan, Stockholm, with the entrance on Södra Dryckesgränd',
    openInMaps: 'Open in maps…',
    osmContributors: 'contributors',

    pressListHeading: 'Published about us',
    pressImagesHeading: 'Press images',
    pressYear: 'Year',
    pressWhat: 'Publication',

    requiredLegend: '* required field',
    formName: 'Name',
    formEmail: 'Email',
    formSubject: 'Subject',
    formModel: 'Model',
    formMessage: 'Message',
    formPhoto: 'Photograph of the piece',
    formPhotoByEmail:
      'Do you have a photograph of the piece? Email it to info@larssonkorgmakare.se, ideally with the same subject line as above, and we will look at it.',
    formPhotoHint: (mb: number) =>
      `Optional. If you have a piece that needs repairing, you are welcome to photograph it and attach the picture here. Maximum ${mb} MB.`,
    formPhotoTooBig: (size: string, mb: number) =>
      `The image is ${size} MB. Maximum ${mb} MB — choose a smaller picture or send it by email instead.`,
    formConsent: 'I consent to my details being kept so that my enquiry can be answered.',
    formSubmit: 'SEND',

    thanksHeading: 'Thank you for your message',
    thanksBody:
      'We have received your enquiry and will be in touch as soon as we can. If it is urgent you are always welcome to call us instead.',
    thanksProducts: 'See our models…',
    thanksHome: 'To the home page…',

    notFoundHeading: 'Page not found',
    notFoundBody:
      'The page you were looking for does not exist, or has moved. You may find what you are after here:',
    notFoundProducts: 'our rattan models',
    notFoundRepairs: 'have a piece repaired',
    notFoundContact: 'call or email us',
  },
} as const;

export const t = (lang: Lang) => ui[lang];
