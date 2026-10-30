import type { EmailConsent } from "./types";

/**
 * Integration registry.
 *
 * Honesty rules for this file:
 *  - Only mark something "available" if it works end-to-end in this build.
 *  - Retailers have no public API for personal order history, so they are
 *    supported through manual import (paste text / upload a file) only.
 *  - Email connectors (Gmail, Outlook) are defined as interfaces so they can be
 *    implemented later, but no connector ships in this build. Any future
 *    connector MUST go through `requireEmailConsent` and is opt-in only.
 */

export type IntegrationStatus =
  /** Works today in this build. */
  | "available"
  /** No automatic sync; supported by pasting or uploading order details. */
  | "manual_import"
  /** Interface designed, but no working connector exists in this build. */
  | "not_available";

export const STATUS_LABELS: Record<IntegrationStatus, string> = {
  available: "Available",
  manual_import: "Manual import only",
  not_available: "Not available yet",
};

export interface RetailerIntegration {
  id: string;
  name: string;
  status: Extract<IntegrationStatus, "manual_import">;
  statusReason: string;
  /** Where to find an order's item list so it can be pasted into PantryIQ. */
  importSteps: string[];
  /** Used to recognise which retailer pasted text came from. */
  detectPatterns: RegExp[];
  /** Order-confirmation sender domains a future, opt-in email connector would filter on. */
  orderEmailDomains: string[];
  fulfillment: { pickup: boolean; delivery: boolean };
}

const NO_API =
  "This retailer does not offer a public API for personal order history. PantryIQ never asks for your retailer password and does not scrape your account.";

export const RETAILERS: RetailerIntegration[] = [
  {
    id: "walmart",
    name: "Walmart",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: [
      "Open your order in the Walmart app or on walmart.com (Account → Purchase history).",
      "Select the item list and copy it, or forward yourself the order confirmation email and copy from there.",
      "Paste it into Import Groceries and review the lines.",
    ],
    detectPatterns: [/walmart/i, /great value/i, /\bmarketside\b/i],
    orderEmailDomains: ["walmart.com"],
    fulfillment: { pickup: true, delivery: true },
  },
  {
    id: "sams-club",
    name: "Sam's Club",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: [
      "Open the order in the Sam's Club app or on samsclub.com (Account → Purchase history).",
      "Copy the item list (Curbside Pickup and Delivery orders both work).",
      "Paste it into Import Groceries and review the lines.",
    ],
    detectPatterns: [/sam'?s club/i, /member'?s mark/i],
    orderEmailDomains: ["samsclub.com"],
    fulfillment: { pickup: true, delivery: true },
  },
  {
    id: "costco",
    name: "Costco",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: [
      "Open costco.com → Orders & Purchases (warehouse receipts are listed there too).",
      "Copy the item lines from the receipt or order.",
      "Paste into Import Groceries and review the lines.",
    ],
    detectPatterns: [/costco/i, /kirkland/i],
    orderEmailDomains: ["costco.com"],
    fulfillment: { pickup: false, delivery: true },
  },
  {
    id: "kroger",
    name: "Kroger",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: ["Open My Purchases on kroger.com or in the app.", "Copy the item list and paste it into Import Groceries."],
    detectPatterns: [/kroger/i],
    orderEmailDomains: ["kroger.com"],
    fulfillment: { pickup: true, delivery: true },
  },
  {
    id: "target",
    name: "Target",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: ["Open Orders on target.com or in the Target app.", "Copy the item list and paste it into Import Groceries."],
    detectPatterns: [/\btarget\b/i, /good & gather/i],
    orderEmailDomains: ["target.com"],
    fulfillment: { pickup: true, delivery: true },
  },
  {
    id: "instacart",
    name: "Instacart",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: ["Open the order receipt in Instacart (Your orders).", "Copy the items found and paste into Import Groceries."],
    detectPatterns: [/instacart/i],
    orderEmailDomains: ["instacart.com"],
    fulfillment: { pickup: true, delivery: true },
  },
  {
    id: "amazon",
    name: "Amazon Fresh / Whole Foods",
    status: "manual_import",
    statusReason: NO_API,
    importSteps: ["Open Your Orders on amazon.com.", "Copy the grocery items and paste into Import Groceries."],
    detectPatterns: [/amazon/i, /whole foods/i],
    orderEmailDomains: ["amazon.com"],
    fulfillment: { pickup: true, delivery: true },
  },
  {
    id: "other",
    name: "Other store / paper receipt",
    status: "manual_import",
    statusReason: "Any store works: paste receipt text, upload a .txt/.csv file, or type items manually.",
    importSteps: [
      "Copy text from a digital receipt, or type the items one per line (e.g. \"2 x Avocados 3.98\").",
      "Paste into Import Groceries and review the lines.",
    ],
    detectPatterns: [],
    orderEmailDomains: [],
    fulfillment: { pickup: true, delivery: true },
  },
];

export function getRetailer(id: string): RetailerIntegration {
  return RETAILERS.find((r) => r.id === id) ?? RETAILERS[RETAILERS.length - 1]!;
}

export function detectRetailer(text: string): string | null {
  const hit = RETAILERS.find((r) => r.detectPatterns.some((p) => p.test(text)));
  return hit?.id ?? null;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export interface OrderEmail {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  text: string;
}

/**
 * Contract any future mailbox connector must implement. Connectors must:
 *  - be started only by an explicit user action after opt-in (requireEmailConsent),
 *  - request read-only scopes,
 *  - search only for order confirmations from known retailer domains,
 *  - never store message bodies server-side; parsed lines go through the normal review flow.
 */
export interface EmailConnector {
  readonly providerId: EmailProviderId;
  connect(consent: EmailConsent): Promise<void>;
  isConnected(): boolean;
  fetchOrderEmails(opts: { senderDomains: string[]; since: Date; limit: number }): Promise<OrderEmail[]>;
  disconnect(): Promise<void>;
}

export type EmailProviderId = "gmail" | "outlook";

export interface EmailProviderIntegration {
  id: EmailProviderId;
  name: string;
  status: IntegrationStatus;
  statusReason: string;
  /** The minimal read-only scope a connector would request. Shown to users before any consent. */
  plannedScopes: string[];
}

export const EMAIL_PROVIDERS: EmailProviderIntegration[] = [
  {
    id: "gmail",
    name: "Gmail",
    status: "not_available",
    statusReason:
      "Not built yet. Reading Gmail requires Google's restricted-scope verification and a security assessment, which this app has not completed. You can still import an order email by saving it as an .eml file or copying its text.",
    plannedScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    status: "not_available",
    statusReason:
      "Not built yet. A Microsoft Graph connector needs an Azure app registration and publisher verification. You can still import an order email by saving it as an .eml file or copying its text.",
    plannedScopes: ["Mail.Read (delegated, read-only)"],
  },
];

export class EmailConsentRequiredError extends Error {
  constructor() {
    super("Email import is off. Turn it on in Settings before connecting a mailbox.");
    this.name = "EmailConsentRequiredError";
  }
}

export class IntegrationUnavailableError extends Error {
  constructor(name: string) {
    super(`${name} is not available in this version of PantryIQ.`);
    this.name = "IntegrationUnavailableError";
  }
}

export function requireEmailConsent(consent: EmailConsent): void {
  if (!consent.optedIn) throw new EmailConsentRequiredError();
}

/** Registered connectors. Intentionally empty: no mailbox connector ships in this build. */
const EMAIL_CONNECTORS: Partial<Record<EmailProviderId, () => EmailConnector>> = {};

/**
 * The single entry point for mailbox access. Consent is checked first, so even a
 * future connector can never be reached unless the user opted in.
 */
export function getEmailConnector(id: EmailProviderId, consent: EmailConsent): EmailConnector {
  requireEmailConsent(consent);
  const factory = EMAIL_CONNECTORS[id];
  const provider = EMAIL_PROVIDERS.find((p) => p.id === id);
  if (!factory || provider?.status !== "available") throw new IntegrationUnavailableError(provider?.name ?? id);
  return factory();
}
