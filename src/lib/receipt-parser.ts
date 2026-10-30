import type { FulfillmentMethod, ImportLine, Unit } from "./types";
import { addDays, classifyFood, createId, parseUnit, titleCase, todayKey } from "./utils";

/**
 * Heuristic parser for grocery receipts and order confirmations that the user
 * pastes (or uploads as .txt/.csv/.eml). Runs entirely in the browser; no text
 * is sent anywhere. Output is always shown to the user for review before
 * anything touches inventory, because receipts are messy and the parser will
 * sometimes guess wrong.
 */

export interface ParsedReceipt {
  lines: ImportLine[];
  /** Lines we deliberately ignored (totals, tax, payment, addresses…). */
  skipped: string[];
  orderRef: string;
  detectedFulfillment: FulfillmentMethod | null;
}

const SKIP_PATTERNS: RegExp[] = [
  /\b(sub\s*-?total|subtotal|total|tax|balance|change due|change|cash|tender|visa|mastercard|amex|discover|debit|credit|card|payment|paid|auth|approval|ref\s*#|tip|gratuity|savings|you saved|coupon|discount|rewards?|points|bag fee|delivery fee|service fee|pickup fee|membership|refund|return)\b/i,
  /\b(thank you|thanks for|receipt|store\s*#|register|cashier|transaction|tc#|st#|op#|te#|tr#|survey|feedback|www\.|https?:|\.com\b)/i,
  /\b(order\s*(#|number|no\.?|id)|order placed|order date|invoice|placed on|delivered on|delivery window|pickup window|ready for pickup|arriving|estimated)/i,
  /\b(street|ave|avenue|road|blvd|suite|apt)\b.*\d/i,
  /\b[A-Z]{2}\s+\d{5}(-\d{4})?\s*$/, // "IL 62701" (state + ZIP)
  /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(\s+\d{1,2}:\d{2}.*)?$/,
  /^[\W_]+$/,
  // Store headers ("WALMART SUPERCENTER", "Walmart pickup order") and order headings.
  /^(walmart|costco|sam'?s club|kroger|target|instacart|aldi|whole foods|safeway|publix|amazon(\s+fresh)?)(\s+(supercenter|neighborhood market|wholesale|store|pickup|delivery|curbside|online|grocery|order|receipt|#?\d+))*\s*$/i,
  /\b(pickup|delivery|curbside|online|grocery)\s+order\b|\border\s+(summary|details|confirmation|confirmed|status|total)\b/i,
  // Email prose rather than item lines.
  /^(your|hi|hello|dear|we|we're|track|view|manage|questions|need help|here's|here is|see|shop|download)\b/i,
  /\b(is ready|on its way|has been|have been|was placed|out of stock|unavailable|substitutions?:?$)/i,
  /^(qty|quantity|item|items|description|price|amount)\b[\s:|,]*((qty|quantity|item|items|description|price|amount)\b[\s:|,]*)*$/i,
];

const PRICE_RE = /(-?\$?\s?\d{1,4}[.,]\d{2})\s*([A-Z]{1,2})?\s*$/;
const UNIT_PRICE_RE = /\b(\d+(?:\.\d+)?)\s*@\s*\$?\d+(?:\.\d{2})?(\s*\/\s*\w+)?/i;
const QTY_LABEL_RE = /\b(?:qty|quantity)\s*[:x]?\s*(\d+(?:\.\d+)?)/i;
const LEADING_QTY_X_RE = /^(\d+(?:\.\d+)?)\s*[x×]\s+/i;
const TRAILING_QTY_X_RE = /\s[x×]\s*(\d+(?:\.\d+)?)\s*$/i;
const LEADING_QTY_UNIT_RE = /^(\d+(?:\.\d+)?)\s+([a-z]{1,7}\.?)\s+(?=[a-z])/i;
const LEADING_QTY_RE = /^(\d{1,2})\s+(?=[a-z])/i;
const WEIGHT_RE = /\b(\d+(?:\.\d+)?)\s*(lb|lbs|kg)\b/i;

function cleanName(raw: string): string {
  let name = raw
    .replace(/\b\d{6,}\b/g, " ") // SKU / UPC numbers
    .replace(/@?\s*\$?\d+\.\d{2}\s*(\/\s*[a-z]+|ea\b|each\b)?/gi, " ") // leftover unit prices
    .replace(/[|•*#]+/g, " ")
    .replace(/\s[-–—:,]+\s/g, " ")
    .replace(/^[-–—:,\s]+|[-–—:,\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Trailing receipt flags like " F", " N", " T", " X" (tax/food stamp markers).
  name = name.replace(/\s+[A-Z]$/, "").trim();
  if (name && name === name.toUpperCase()) name = titleCase(name);
  return name;
}

function detectFulfillment(text: string): FulfillmentMethod | null {
  if (/\b(delivered|delivery|out for delivery|shipped|driver)\b/i.test(text)) return "delivery";
  if (/\b(pickup|pick-up|pick up|curbside)\b/i.test(text)) return "pickup";
  if (/\b(cashier|register|store\s*#|change due)\b/i.test(text)) return "in_store";
  return null;
}

function detectOrderRef(text: string): string {
  const m = text.match(/order\s*(?:#|number|no\.?|id)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})/i);
  return m?.[1] ?? "";
}

export function buildImportLine(name: string, quantity = 1, unit: Unit = "count", price: number | null = null, rawText = name): ImportLine {
  const c = classifyFood(name);
  return {
    id: createId(),
    include: true,
    rawText,
    name,
    quantity: quantity > 0 ? quantity : 1,
    unit,
    category: c.category,
    location: c.location,
    price,
    expiresOn: c.shelfDays != null ? addDays(todayKey(), c.shelfDays) : null,
  };
}

export function parseReceiptLine(raw: string): ImportLine | null {
  let text = raw.replace(/\t/g, " ").replace(/\s+/g, " ").trim();
  if (text.replace(/[^a-z]/gi, "").length < 2) return null;
  if (SKIP_PATTERNS.some((p) => p.test(text))) return null;

  let price: number | null = null;
  const priceMatch = text.match(PRICE_RE);
  if (priceMatch?.[1]) {
    const value = Number(priceMatch[1].replace(/[$\s]/g, "").replace(",", "."));
    if (value < 0) return null; // discounts / coupons
    price = value;
    text = text.slice(0, priceMatch.index).trim();
  }

  let quantity: number | null = null;
  let unit: Unit = "count";

  const take = (re: RegExp, group = 1): string | null => {
    const m = text.match(re);
    if (!m) return null;
    text = (text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length)).trim();
    return m[group] ?? null;
  };

  const labelled = take(QTY_LABEL_RE);
  if (labelled) quantity = Number(labelled);

  if (quantity == null) {
    const at = take(UNIT_PRICE_RE);
    if (at) quantity = Number(at);
  }
  if (quantity == null) {
    const lead = take(LEADING_QTY_X_RE);
    if (lead) quantity = Number(lead);
  }
  if (quantity == null) {
    const trail = take(TRAILING_QTY_X_RE);
    if (trail) quantity = Number(trail);
  }
  if (quantity == null) {
    const m = text.match(LEADING_QTY_UNIT_RE);
    const parsedUnit = parseUnit(m?.[2]);
    if (m?.[1] && parsedUnit) {
      quantity = Number(m[1]);
      unit = parsedUnit;
      text = text.slice(m[0].length).trim();
    }
  }
  if (quantity == null) {
    const lead = take(LEADING_QTY_RE);
    if (lead) quantity = Number(lead);
  }
  if (quantity == null) {
    // Weighed produce/meat: "Chicken Breast 2.31 lb"
    const m = text.match(WEIGHT_RE);
    if (m?.[1] && m[2]) {
      quantity = Number(m[1]);
      unit = parseUnit(m[2]) ?? "lb";
      text = (text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length)).trim();
    }
  }

  const name = cleanName(text);
  if (name.replace(/[^a-z]/gi, "").length < 2) return null;
  return buildImportLine(name, quantity ?? 1, unit, price, raw.trim());
}

function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(rows: string[]): ParsedReceipt | null {
  const header = splitCsvRow(rows[0] ?? "").map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => /^(name|item|product|description)/.test(h));
  if (nameIdx < 0) return null;
  const qtyIdx = header.findIndex((h) => /^(qty|quantity|count)/.test(h));
  const unitIdx = header.findIndex((h) => /^unit$/.test(h));
  const priceIdx = header.findIndex((h) => /^(price|amount|total|cost)/.test(h));
  const lines: ImportLine[] = [];
  const skipped: string[] = [];
  for (const row of rows.slice(1)) {
    if (!row.trim()) continue;
    const cells = splitCsvRow(row);
    const name = cleanName(cells[nameIdx] ?? "");
    if (!name) {
      skipped.push(row);
      continue;
    }
    const qty = qtyIdx >= 0 ? Number(cells[qtyIdx]) : 1;
    const unit = (unitIdx >= 0 ? parseUnit(cells[unitIdx]) : null) ?? "count";
    const priceRaw = priceIdx >= 0 ? Number((cells[priceIdx] ?? "").replace(/[$,]/g, "")) : NaN;
    lines.push(buildImportLine(name, Number.isFinite(qty) && qty > 0 ? qty : 1, unit, Number.isFinite(priceRaw) ? priceRaw : null, row));
  }
  return { lines, skipped, orderRef: "", detectedFulfillment: null };
}

/** Extract readable text from a raw .eml file (RFC 822). Handles plain, quoted-printable and base64 text parts. */
export function extractEmailText(eml: string): string {
  const decodeQP = (s: string) =>
    s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  const stripHtml = (s: string) =>
    s
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#36;|&dollar;/g, "$")
      .replace(/[ \t]+/g, " ");

  const boundary = eml.match(/boundary="?([^";\r\n]+)"?/i)?.[1];
  const parts = boundary ? eml.split(`--${boundary}`) : [eml];
  let plain = "";
  let html = "";
  for (const part of parts) {
    const split = part.search(/\r?\n\r?\n/);
    if (split < 0) continue;
    const headers = part.slice(0, split);
    let body = part.slice(split).trim();
    const type = headers.match(/content-type:\s*([^;\s]+)/i)?.[1]?.toLowerCase() ?? (boundary ? "" : "text/plain");
    const encoding = headers.match(/content-transfer-encoding:\s*(\S+)/i)?.[1]?.toLowerCase();
    if (encoding === "quoted-printable") body = decodeQP(body);
    if (encoding === "base64") {
      try {
        body = atob(body.replace(/\s+/g, ""));
      } catch {
        continue;
      }
    }
    if (type === "text/plain" && !plain) plain = body;
    if (type === "text/html" && !html) html = stripHtml(body);
  }
  return (plain || html || eml).trim();
}

export function parseReceipt(text: string): ParsedReceipt {
  const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (rows.length > 1 && rows[0]?.includes(",")) {
    const csv = parseCsv(rows);
    if (csv) return csv;
  }
  const lines: ImportLine[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const line = parseReceiptLine(row);
    if (line) lines.push(line);
    else skipped.push(row);
  }
  return { lines, skipped, orderRef: detectOrderRef(text), detectedFulfillment: detectFulfillment(text) };
}
