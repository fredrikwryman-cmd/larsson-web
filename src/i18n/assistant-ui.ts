import type { Lang } from './config';
import { company } from '../data/company';

/**
 * Every string and every number the answer assistant uses, in one place.
 *
 * The widget's client script takes this object whole through `define:vars` and
 * reads everything from it — there is not a single literal in the script that a
 * visitor can see. That is deliberate: the source this was ported from had its
 * Swedish spread through the code, which made a second language impossible
 * without a second copy of the code.
 *
 * TODO(client): all of the copy below is new and goes out in the client's name.
 */

const PHONE = company.phone.display;
const EMAIL = company.email;

export interface TopicEntry {
  /** The words on screen. Set in sentence case; the CSS does the capitals. */
  label: string;
  /** What gets asked when it is chosen. A real question, in the visitor's voice. */
  question: string;
}

export interface AssistantStrings {
  /** The launcher, in the corner of every page. */
  open: string;
  /** The panel's own name, and the accessible name of the dialog. */
  title: string;
  /** The line under it. The workshop, not the software. */
  subtitle: string;
  close: string;
  restart: string;
  /** Heads the opening block. */
  welcome: string;
  /** Shown once when the panel opens. Never sent to the model. */
  greeting: string;
  /** Ways in, offered before the visitor has said anything. */
  topics: TopicEntry[];
  inputLabel: string;
  placeholder: string;
  send: string;
  /** Who said what, above each turn. */
  you: string;
  them: string;
  /** While the model is being waited on. Typographic, never a spinner. */
  thinking: string;
  /** Only ever printed after a 2xx from Web3Forms. */
  sent: string;
  /** After the model has called the tool and the conversation is complete. */
  ended: string;
  /** Replaces a claim the widget could not verify. See the truth filter. */
  noted: string;
  /** Heads a failure, in the same voice as every other label. */
  errorLabel: string;
  error: string;
  /** Without JavaScript there is no assistant; say where to go instead. The
   *  phone number is a real link, so the sentence is split around it. */
  noscriptBefore: string;
  noscriptAfter: string;
  noscriptLink: string;
}

export const ASSISTANT_UI: Record<Lang, AssistantStrings> = {
  sv: {
    open: 'Fråga verkstaden…',
    title: 'Fråga verkstaden',
    subtitle: 'Larsson Korgmakare',
    close: 'Stäng',
    restart: 'Börja om',
    welcome: 'Välkommen',
    greeting: 'Hej!\n\nVälkommen till Larsson Korgmakare.\nHur kan vi hjälpa dig?',
    topics: [
      { label: 'Reparationer', question: 'Jag har en möbel som behöver lagas. Vad kan ni göra?' },
      { label: 'Beställningar', question: 'Jag vill beställa en möbel. Hur går det till?' },
      { label: 'Modeller', question: 'Vilka modeller tillverkar ni?' },
      { label: 'Stolsitsflätning', question: 'Kan ni fläta om en stolsits?' },
    ],
    inputLabel: 'Din fråga',
    placeholder: 'Skriv din fråga…',
    send: 'Skicka',
    you: 'Du',
    them: 'Larsson Korgmakare · Verkstaden',
    thinking: 'Verkstaden skriver…',
    sent: 'Förfrågan skickad till verkstaden.',
    ended: 'Samtalet är avslutat. Skriv gärna om du har fler frågor.',
    noted: 'Det här noterar jag i samtalet.',
    errorLabel: 'Det gick inte att skicka frågan',
    error: `Försök igen. Går det fortfarande inte, ring ${PHONE} eller mejla ${EMAIL} så hjälper vi dig.`,
    noscriptBefore: 'Frågeassistenten kräver JavaScript. Ring oss på ',
    noscriptAfter: `, mejla ${EMAIL}, eller skriv till oss i kontaktformuläret.`,
    noscriptLink: 'Till kontaktsidan…',
  },
  en: {
    open: 'Ask the workshop…',
    title: 'Ask the workshop',
    subtitle: 'Larsson Korgmakare',
    close: 'Close',
    restart: 'Start again',
    welcome: 'Welcome',
    greeting: 'Hello.\n\nWelcome to Larsson Korgmakare.\nHow can we help you?',
    topics: [
      { label: 'Repairs', question: 'I have a piece of furniture that needs mending. What can you do?' },
      { label: 'Commissions', question: 'I would like to commission a piece. How does that work?' },
      { label: 'Models', question: 'Which models do you make?' },
      { label: 'Seat weaving', question: 'Can you reweave a chair seat?' },
    ],
    inputLabel: 'Your question',
    placeholder: 'Type your question…',
    send: 'Send',
    you: 'You',
    them: 'Larsson Korgmakare · The workshop',
    thinking: 'The workshop is writing…',
    sent: 'Your enquiry has been sent to the workshop.',
    ended: 'This conversation is complete. Do write again if you have more questions.',
    noted: 'I have noted that in this conversation.',
    errorLabel: 'The question could not be sent',
    error: `Please try again. If it still will not go, call ${PHONE} or email ${EMAIL} and we will help you.`,
    noscriptBefore: 'The assistant needs JavaScript. Call us on ',
    noscriptAfter: `, email ${EMAIL}, or write to us using the contact form.`,
    noscriptLink: 'To the contact page…',
  },
};

/**
 * Claims of having sent, forwarded or passed something on. A model will make
 * these whether or not anything left the browser, so any sentence matching one
 * is removed unless the widget itself has a 2xx from Web3Forms in hand.
 *
 * Held as a source string, not a RegExp, because the whole config crosses into
 * the client through `define:vars`, which is JSON.
 */
export const SENT_CLAIM_PATTERN: Record<Lang, string> = {
  sv: '(skickar|skickat|skickad|skickats|vidarebefordra|hör av sig|hör av oss|återkommer till dig|är på väg|har fått dina uppgifter|tar kontakt)',
  en: '(have sent|has been sent|sending|forwarded|forwarding|passed (it|this|that) on|will be in touch|get back to you|on its way|have your details|will contact you)',
};

/** Everything that is the same in both languages. */
export const ASSISTANT_CONFIG = {
  /**
   * The Cloudflare Worker. The Anthropic key lives there and only there — this
   * file is compiled into the page and a visitor can read every byte of it.
   *
   * Deployed 2026-09-05. The subdomain is the Cloudflare ACCOUNT's, which is why
   * it reads bohagsbolaget-se; it is cosmetic and never shown to a visitor.
   * TODO(launch): a route on the client's own domain would be tidier the day the
   * site is published.
   */
  endpoint: 'https://larsson-korgmakare-assistent.bohagsbolaget-se.workers.dev',

  /**
   * Web3Forms, posted from the visitor's own browser rather than from the
   * worker: Cloudflare egresses from shared addresses and Web3Forms rate-limits
   * them. The visitor's own address has no such history.
   *
   * This key is public. It is in the page source of the contact form too, and
   * it has to be — Web3Forms' free tier authenticates the form, not the sender.
   * The key can only cause mail to be delivered to the address it is registered
   * to; it grants no access to anything.
   */
  formEndpoint: 'https://api.web3forms.com/submit',
  formKey: 'c10462a7-17f2-445f-97a4-b09a499ccf6a',
  /** The conversation id is appended, so a follow-up threads with the first mail. */
  subject: 'Larsson Korgmakare — assistenten',

  /** Must match the worker, which answers 400 above either. */
  maxHistory: 20,
  maxChars: 2000,

  /** A queued send is retried this many times before it is left alone. */
  maxRetries: 10,

  /** Two hours. Later than that and it is a new errand, not the old one. */
  lifetimeMs: 2 * 60 * 60 * 1000,
  /** Silence this long with a contact detail in hand sends the conversation on. */
  idleMs: 5 * 60 * 1000,

  storageKey: 'lk_assistent',
  queueKey: 'lk_assistent_ko',

  fallbackEmail: EMAIL,
} as const;
