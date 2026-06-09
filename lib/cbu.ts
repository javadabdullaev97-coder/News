export type CbuRate = {
  code: string;
  name: string;
  rate: number;
  diff: number;
  diffPct: number;
  date: string;
};

export type CbuSnapshot = {
  rates: CbuRate[];
  fetchedAt: string;
};

const ALL_WANTED = ["USD", "EUR", "RUB", "GBP", "JPY", "CHF", "CNY", "KZT"] as const;

const FALLBACK: CbuRate[] = [
  { code: "USD", name: "Доллар США", rate: 12587, diff: -47, diffPct: -0.37, date: "" },
  { code: "EUR", name: "Евро", rate: 13740, diff: 28, diffPct: 0.2, date: "" },
  { code: "RUB", name: "Российский рубль", rate: 138.2, diff: -0.2, diffPct: -0.14, date: "" },
  { code: "GBP", name: "Фунт стерлингов", rate: 16125, diff: 36, diffPct: 0.22, date: "" },
  { code: "JPY", name: "Японская иена", rate: 83.5, diff: -0.1, diffPct: -0.12, date: "" },
  { code: "CHF", name: "Швейцарский франк", rate: 14380, diff: 12, diffPct: 0.08, date: "" },
  { code: "CNY", name: "Китайский юань", rate: 1748, diff: -3, diffPct: -0.17, date: "" },
  { code: "KZT", name: "Казахстанский тенге", rate: 25.8, diff: -0.05, diffPct: -0.19, date: "" },
];

type CbuApiItem = {
  Ccy: string;
  CcyNm_RU: string;
  Rate: string;
  Diff: string;
  Date: string;
};

export async function fetchCbuSnapshot(): Promise<CbuSnapshot> {
  const fetchedAt = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://cbu.uz/oz/arkhiv-kursov-valyut/json/", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) return { rates: FALLBACK, fetchedAt };
    const data = (await res.json()) as CbuApiItem[];

    const rates: CbuRate[] = [];
    for (const code of ALL_WANTED) {
      const found = data.find((r) => r.Ccy === code);
      if (!found) continue;
      const rate = parseFloat(found.Rate);
      const diff = parseFloat(found.Diff);
      rates.push({
        code,
        name: found.CcyNm_RU,
        rate,
        diff,
        diffPct: rate > 0 ? (diff / rate) * 100 : 0,
        date: found.Date,
      });
    }
    return rates.length >= 3
      ? { rates, fetchedAt }
      : { rates: FALLBACK, fetchedAt };
  } catch {
    return { rates: FALLBACK, fetchedAt };
  }
}

export function pickRates(rates: CbuRate[], codes: string[]): CbuRate[] {
  return codes
    .map((c) => rates.find((r) => r.code === c))
    .filter((r): r is CbuRate => Boolean(r));
}

export function formatRate(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

const FLAG_CODES: Record<string, string> = {
  USD: "us",
  EUR: "eu",
  RUB: "ru",
  GBP: "gb",
  JPY: "jp",
  CHF: "ch",
  CNY: "cn",
  KZT: "kz",
};

export function flagUrl(code: string, size: 40 | 80 | 160 = 80): string {
  const cc = FLAG_CODES[code] ?? "xx";
  return `https://flagcdn.com/w${size}/${cc}.png`;
}

export function formatDiff(diff: number): string {
  const abs = Math.abs(diff);
  if (abs === 0) return "0 сум";
  if (abs >= 10) {
    return `${abs.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} сум`;
  }
  if (abs >= 1) {
    return `${abs.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} сум`;
  }
  return `${abs.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} сум`;
}

export function formatFetchedAt(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(",", " ·");
}
