import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/HomePage";
import type { Lang } from "@/lib/types";

// Языковые главные: /uz и /en. Русская — в корне сайта (app/page.tsx),
// её здесь нет намеренно: два адреса с одинаковым содержимым поисковик
// считает дублями, а все существующие ссылки издания ведут на корень.
const LANGS: Lang[] = ["uz", "en"];

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const title = lang === "uz" ? "LEAP News — O'zbekiston yangiliklari" : "LEAP News — Uzbekistan news";
  return { title, alternates: { canonical: `/${lang}` } };
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LANGS.includes(lang as Lang)) notFound();
  return <HomePage lang={lang as Lang} />;
}
