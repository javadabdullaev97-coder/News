export type CbuRate = {
  code: string;
  name: string;
  rate: number;
  diff: number;
  diffPct: number;
  date: string;
};

const WANTED = ["USD", "EUR", "RUB"] as const;

const FALLBACK: CbuRate[] = [
  { code: "USD", name: "Доллар США", rate: 12587, diff: -47, diffPct: -0.37, date: "" },
  { code: "EUR", name: "Евро", rate: 13740, diff: 28, diffPct: 0.2, date: "" },
  { code: "RUB", name: "Российский рубль", rate: 138.2, diff: -0.2, diffPct: -0.14, date: "" },
];

type CbuApiItem = {
  Ccy: string;
  CcyNm_RU: string;
  Rate: string;
  Diff: string;
  Date: string;
};

export async function fetchCbuRates(): Promise<CbuRate[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://cbu.uz/oz/arkhiv-kursov-valyut/json/", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as CbuApiItem[];

    const rates: CbuRate[] = [];
    for (const code of WANTED) {
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
    return rates.length === WANTED.length ? rates : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export function formatRate(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}
