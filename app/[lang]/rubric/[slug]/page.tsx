import { notFound } from "next/navigation";
import { RubricPage, RUBRIC_SLUGS } from "@/components/RubricPage";
import type { Lang } from "@/lib/types";

const LANGS: Lang[] = ["uz", "en"];

export function generateStaticParams() {
  return LANGS.flatMap((lang) => RUBRIC_SLUGS.map((slug) => ({ lang, slug })));
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!LANGS.includes(lang as Lang)) notFound();
  return <RubricPage slug={slug} lang={lang as Lang} />;
}
