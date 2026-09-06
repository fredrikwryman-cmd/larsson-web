/**
 * Single source of truth for company identity, contact details and opening hours.
 *
 * Nothing in this object may be duplicated inline in a component or page.
 * If you find yourself typing the phone number or the address into a .astro
 * file, import from here instead.
 *
 * Every value below is transcribed verbatim from the live WordPress site
 * (harvested 2026-09-05). Swedish spelling and punctuation are as the client
 * wrote them — do not "tidy" them.
 */

export interface OpeningHours {
  /** Day label as it should be displayed, in Swedish. */
  readonly day: string;
  /** Displayed hours, e.g. "10–18". Null means closed that day. */
  readonly hours: string | null;
}

export const company = {
  /** Legal name, as it appears in the site footer. */
  legalName: 'Larsson Korgmakare AB',

  /** Display name used in the header/wordmark and <title> suffix. */
  name: 'Larsson Korgmakare',

  /**
   * Note the casing: the site writes the company as "Larsson Korgmakare" in
   * the header and footer but "Larsson korgmakare" (lowercase k) inside body
   * copy and product descriptions. Both are reproduced verbatim where they
   * occur; this field is the header/footer form only.
   */
  founded: 1903,

  phone: {
    /** As displayed on the site. */
    display: '08-411 50 53',
    /** E.164, for the tel: href. */
    href: 'tel:+468411 5053'.replace(/\s/g, ''),
  },

  email: 'info@larssonkorgmakare.se',

  /**
   * The workshop's position, for the OpenStreetMap links.
   *
   * One home for it: the footer and the contact page used to carry two
   * different literals — 59.3232/18.0742 and 59.32255/18.07405 — about forty
   * metres apart. Both land on the right block, but two coordinates for one
   * door is one too many. The more precise pair is kept.
   */
  geo: {
    lat: '59.32255',
    lon: '18.07405',
    zoom: 18,
  },

  address: {
    street: 'Skeppsbron 46',
    postalCode: '111 30',
    city: 'Stockholm',
    country: 'Sverige',
    /** Exactly as the footer renders it, on one line. */
    oneLine: 'Skeppsbron 46, 111 30 Stockholm',
  },

  /**
   * TODO(content): The live site publishes NO opening hours — not on /kontakt/,
   * not on /om-oss/, not in the footer. Nothing was invented here. Ask the
   * client for real hours before rendering an opening-hours block anywhere.
   * Until then `openingHours` is empty and any consuming component must handle
   * the empty case by rendering nothing.
   */
  openingHours: [] as readonly OpeningHours[],

  /**
   * The entrance is NOT on Skeppsbron. Customers arrive carrying furniture and
   * need the door, so this is called out separately everywhere the address
   * appears rather than buried in prose.
   */
  entrance: {
    street: 'Södra Dryckesgränd',
    sv: 'Ingång från Södra Dryckesgränd',
    en: 'Entrance on Södra Dryckesgränd',
  },

  /**
   * Memberships, exactly as the client publishes them on /om-oss/ — same three
   * organisations, same names, same URLs. Nothing added.
   */
  memberships: [
    { name: 'Föreningen Skråhantverkarna', url: 'https://skrahantverkarna.se/directory/larsson-korgmakare-ab/' },
    { name: 'Hantverkarna Stockholm', url: 'https://www.hantverkarna.se' },
    /* hantverksvandringar.se is DEAD — the domain now serves a Websupport
       parking page with a mismatched TLS certificate (verified 2026-09-05, see
       larsson-harvest/press-research.md). The membership is still listed because
       the client publishes it on /om-oss/, but it is NOT linked: sending a
       visitor to a parked domain is worse than plain text.
       TODO(client): confirm whether this organisation still exists. */
    { name: 'Hantverksvandringar i Gamla stan', url: null },
  ] as readonly { name: string; url: string | null }[],

  /**
   * Instagram. The account is active with roughly 2,000 followers. The live
   * site runs a paid feed plugin that ships 294 KB per page view and renders
   * nothing; this replaces it with a plain link, which is all it needs to be.
   *
   * TODO(confirm): handle verified by opening the profile — see
   * larsson-harvest/press-research.md. Correct it here if the client uses a
   * different account.
   */
  instagram: {
    handle: '@larssonkorgmakare',
    url: 'https://www.instagram.com/larssonkorgmakare/',
  },
} as const;

export type Company = typeof company;
