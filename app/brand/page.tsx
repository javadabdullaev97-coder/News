import {
  IconBracketL,
  IconChevron,
  IconLeapArrow,
  IconStairs,
  LogoArrow,
  LogoBracket,
  LogoChevron,
  LogoStairs,
  WordmarkOnly,
} from "@/components/brand/Logos";

const concepts = [
  {
    id: 1,
    name: "Концепт 1 — L-стрелка",
    desc: "Бейдж с буквой L, нижняя горизонталь продолжается в стрелку «вперёд». Самый явный визуальный намёк на «leap».",
    Icon: IconLeapArrow,
    Logo: LogoArrow,
  },
  {
    id: 2,
    name: "Концепт 2 — Лесенка",
    desc: "Три восходящие колонки — рост, прогресс, движение вверх. Абстрактнее, ближе к финтех-эстетике.",
    Icon: IconStairs,
    Logo: LogoStairs,
  },
  {
    id: 3,
    name: "Концепт 3 — L с точкой",
    desc: "Классическая буква L + точка-акцент сверху-справа. Сдержанный, газетный, «премиум-медиа».",
    Icon: IconBracketL,
    Logo: LogoBracket,
  },
  {
    id: 4,
    name: "Концепт 4 — Двойной шеврон",
    desc: "Два шеврона «вперёд-вперёд». Скорость, спешка новостей, «опережаем».",
    Icon: IconChevron,
    Logo: LogoChevron,
  },
];

export const metadata = {
  title: "Бренд-варианты логотипа",
};

export default function BrandPage() {
  return (
    <div className="container-news py-10">
      <h1 className="font-serif text-4xl font-bold">Логотип LEAP — варианты</h1>
      <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
        Четыре концепта в SVG. Каждый показан в нескольких размерах: favicon (16),
        мини (24), хедер (32), крупный (64), и горизонтальная связка значок +
        wordmark. Сравни на светлом и тёмном фоне.
      </p>

      <div className="mt-10 space-y-16">
        {concepts.map((c) => (
          <section key={c.id} className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-2xl font-bold">{c.name}</h2>
              <span className="text-xs text-neutral-500">#{c.id}</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              {c.desc}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Светлый фон */}
              <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  На светлом
                </div>
                <div className="mt-4 flex items-center gap-6">
                  <c.Icon size={16} />
                  <c.Icon size={24} />
                  <c.Icon size={32} />
                  <c.Icon size={64} />
                  <c.Icon size={96} />
                </div>
                <div className="mt-6 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <c.Logo size={28} />
                </div>
                <div className="mt-4">
                  <c.Logo size={48} />
                </div>
              </div>

              {/* Тёмный фон */}
              <div className="rounded-xl bg-neutral-900 p-6 text-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  На тёмном
                </div>
                <div className="mt-4 flex items-center gap-6">
                  <c.Icon size={16} />
                  <c.Icon size={24} />
                  <c.Icon size={32} />
                  <c.Icon size={64} />
                  <c.Icon size={96} />
                </div>
                <div className="mt-6 border-t border-neutral-800 pt-4">
                  <c.Logo size={28} />
                </div>
                <div className="mt-4">
                  <c.Logo size={48} />
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Бонус: чистый wordmark */}
        <section className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-bold">Бонус — чистый wordmark</h2>
            <span className="text-xs text-neutral-500">#0</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
            Без значка, только типографика. Цветная буква A — единственный акцент.
            Самый минималистичный, можно сочетать с любым из четырёх значков выше.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                На светлом
              </div>
              <div className="mt-6">
                <WordmarkOnly size={28} />
              </div>
              <div className="mt-4">
                <WordmarkOnly size={48} />
              </div>
              <div className="mt-4">
                <WordmarkOnly size={80} />
              </div>
            </div>
            <div className="rounded-xl bg-neutral-900 p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                На тёмном
              </div>
              <div className="mt-6">
                <WordmarkOnly size={28} />
              </div>
              <div className="mt-4">
                <WordmarkOnly size={48} />
              </div>
              <div className="mt-4">
                <WordmarkOnly size={80} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-16 rounded-xl border border-brand/30 bg-brand-50 p-6 dark:bg-brand/10">
        <h3 className="font-serif text-xl font-bold text-brand">Что дальше</h3>
        <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">
          Скажи номер концепта (1–4 или 0 для wordmark) — поставлю его на сайт
          вместо текущей заглушки и сгенерирую favicon + OG-картинку из него.
          Любой концепт можно ещё подкрутить: цвет, скругление, толщину штриха,
          размер — это правка одной строки в SVG.
        </p>
      </div>
    </div>
  );
}
