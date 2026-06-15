import Image from "next/image";
import Link from "next/link";
import { articles, feedDate } from "@/lib/data";
import { WC_MATCHES, getMatchStatus, type WCMatch } from "@/lib/wc2026";
import {
  LiveMatchCenter,
  type LiveMatchItem,
} from "@/components/wc2026/LiveMatchCenter";
import { ScorersBlock } from "@/components/wc2026/ScorersBlock";

function pickMatchCenter(now: number): LiveMatchItem[] {
  const day = 24 * 60 * 60 * 1000;
  const all = WC_MATCHES.map((m): LiveMatchItem => {
    const st = getMatchStatus(m, now);
    return {
      m,
      status: st.status,
      minute: st.minute,
      when: new Date(m.dateLocal).getTime(),
    };
  });

  const live = all.filter((x) => x.status === "live");
  const recent = all
    .filter((x) => x.status === "finished" && now - x.when < day + 3 * 3600 * 1000)
    .sort((a, b) => b.when - a.when);
  const upcoming = all
    .filter((x) => x.status === "scheduled" && x.when - now < day)
    .sort((a, b) => a.when - b.when);

  const inWindow = [...live, ...recent.slice(0, 4), ...upcoming.slice(0, 8)];
  if (inWindow.length > 0) return inWindow.slice(0, 12);

  return all
    .filter((x) => x.status === "scheduled")
    .sort((a, b) => a.when - b.when)
    .slice(0, 6);
}

// «HOME|AWAY|UTC» → внутренний ID матча. Передаём в client-компонент,
// чтобы он мог быстро понять, какой live-апдейт куда патчить.
function buildLookup(items: LiveMatchItem[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const item of items) {
    const utc = new Date(item.m.dateLocal).toISOString();
    lookup[`${item.m.homeRef}|${item.m.awayRef}|${utc}`] = item.m.id;
  }
  return lookup;
}

export default function WCHomePage() {
  const now = Date.now();
  const matchCenter = pickMatchCenter(now);
  const lookup = buildLookup(matchCenter);
  const todayKey = new Date(now).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tashkent",
  });

  const wcNews = articles
    .filter((a) => a.tags.includes("ЧМ-2026"))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  const lead = wcNews[0];
  const rest = wcNews.slice(1);

  return (
    <div className="space-y-12">
      {/* Матч-центр: последние сутки + лайв + ближайшие сутки */}
      {matchCenter.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold uppercase tracking-wider text-white">
              Матч-центр
            </h2>
            <Link
              href="/wc2026/schedule"
              className="text-xs font-medium text-brand hover:underline"
            >
              Все матчи →
            </Link>
          </div>
          <LiveMatchCenter
            initialItems={matchCenter}
            lookup={lookup}
            todayKey={todayKey}
          />
        </section>
      )}

      {/* Бомбардиры */}
      <ScorersBlock />

      {/* Лента новостей */}
      {wcNews.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold uppercase tracking-wider text-white">
            Новости турнира
          </h2>

          {lead && (
            <Link
              href={`/article/${lead.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-brand/40 hover:bg-white/10"
            >
              <div className="grid md:grid-cols-[3fr_2fr]">
                <div className="relative aspect-[16/9] md:aspect-auto">
                  <Image
                    src={lead.cover}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center p-5 md:p-6">
                  <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                    {feedDate(lead.publishedAt)}
                  </div>
                  <h3 className="mt-2 font-serif text-2xl font-bold leading-snug text-white transition-colors group-hover:text-brand">
                    {lead.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                    {lead.lead}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="mt-4 divide-y divide-white/10">
              {rest.map((a) => (
                <Link
                  key={a.slug}
                  href={`/article/${a.slug}`}
                  className="group block py-5"
                >
                  <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                    {feedDate(a.publishedAt)}
                  </div>
                  <div className="mt-2 flex gap-4">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg md:h-24 md:w-36">
                      <Image
                        src={a.cover}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 112px, 144px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base font-bold leading-snug text-white transition-colors group-hover:text-brand md:text-lg">
                        {a.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-400 md:text-sm">
                        {a.lead}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
