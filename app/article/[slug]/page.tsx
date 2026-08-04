import Link from "next/link";
import type { Metadata } from "next";
import { articleHref, articles, getArticle } from "@/lib/data";

// Старый адрес статьи: /article/<slug>.
//
// Адреса переехали на /ru/ГГГГ/ММ/ДД/<slug> — слаг сам по себе уникален
// только внутри одного дня, а новостные заголовки повторяются из года в год.
// Но старые адреса обязаны работать вечно: они проиндексированы поисковиками
// и разосланы в Telegram-канал, а сообщения старше 48 часов Bot API
// редактировать не даёт. Оборвать их — значит своими руками сделать битыми
// все ссылки, которые уже у читателей.
//
// Статический экспорт (output: "export") серверных редиректов не умеет,
// поэтому здесь страница-перенаправление: canonical сообщает поисковику
// настоящий адрес, meta refresh уводит читателя, ссылка остаётся на случай
// отключённых скриптов и старых клиентов.
//
// Страницы генерируются на все статьи разом, включая демо-корпус, — так
// ни один существующий адрес не остаётся без пары.

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { robots: { index: false, follow: false } };
  return {
    title: article.title,
    alternates: { canonical: articleHref(article) },
    // Страница-заглушка в выдаче не нужна: поисковик должен взять canonical.
    robots: { index: false, follow: true },
  };
}

export default async function LegacyArticleRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
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
