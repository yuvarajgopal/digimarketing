import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ISO 3166-1 alpha-2 country code → ISO 4217 currency code */
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD",
  GB: "GBP",
  IN: "INR",
  JP: "JPY",
  CN: "CNY", HK: "HKD",
  SG: "SGD",
  AE: "AED",
  SA: "SAR",
  QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR",
  CH: "CHF",
  SE: "SEK", NO: "NOK", DK: "DKK",
  MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP",
  KR: "KRW",
  TH: "THB", MY: "MYR", ID: "IDR", PH: "PHP", VN: "VND",
  ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS", EG: "EGP",
  PK: "PKR", BD: "BDT", LK: "LKR",
  TR: "TRY",
  IL: "ILS",
  RU: "RUB", UA: "UAH",
  PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", PT: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR",
  LT: "EUR", LU: "EUR", MT: "EUR", CY: "EUR",
};

export function getCurrencyForCountry(country?: string | null): string {
  if (!country) return "USD";
  return COUNTRY_CURRENCY_MAP[country.toUpperCase()] ?? "USD";
}

/** Resolve currency for a client — always derived from their country */
export function clientCurrency(client?: { country?: string | null } | null): string {
  return getCurrencyForCountry(client?.country);
}

/** Agency's home currency — change this when agency profile is implemented */
export const AGENCY_CURRENCY = "INR";

const CURRENCY_LOCALE: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
};

export function formatCurrency(amount: number, currency = AGENCY_CURRENCY): string {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercent(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
