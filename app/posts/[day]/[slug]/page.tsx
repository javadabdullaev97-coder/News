import Link from "next/link";
import type { Metadata } from "next";
import { articleHref, articles, getArticle } from "@/lib/data";

// Старый адрес статьи: /posts/ГГГГ-ММ-ДД/<slug>.
//
// Такого маршрута у сайта никогда не было — его изобрели агенты, когда
// ставили ссылки на свои же материалы. Формат ниоткуда не следовал, в
// редполитике про внутренние ссылки не было ни слова, и все 155 ссылок
// вели в 404 (обнаружено 06.08.2026 владельцем, ещё 21 добавилась за
// следующие сутки).
//
// Сами ссылки переписаны, правило записано, публикатор теперь не выпускает
// материал с неверной ссылкой. Но этого мало: битые адреса уже разошлись —
// в постах Telegram-канала, которые старше 48 часов не отредактировать,
// и в индексе поисковиков. Поэтому здесь то же решение, что и для
// /article/<slug>: страница-перенаправление на настоящий адрес.
//
// День в старом адресе — тот же, что в дневной папке материала, поэтому
// сопоставление однозначное.

export function generateStaticParams() {
  return articles
    .filter((a) => a.publishedDate)
    .map((a) => ({ day: a.publishedDate as string, slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { robots: { index: false, follow: false } };
  return {
    title: article.title,
    alternates: { canonical: articleHref(article) },
    robots: { index: false, follow: true },
  };
}

export default async function LegacyPostsRedirect({
  params,
}: {
  params: Promise<{ day: string; slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  const href = article ? articleHref(article) : "/";

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${href}`} />
      <div className="container-news py-16 text-center">
        <p className="text-neutral-600 dark:text-neutral-400">
          Статья переехала на новый адрес.
        </p>
        <Link href={href} className="mt-4 inline-block font-medium text-brand hover:underline">
          {article ? article.title : "На главную"} →
        </Link>
      </div>
    </>
  );
}
