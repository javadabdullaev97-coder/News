import { notFound } from "next/navigation";
import { AllNewsPage } from "@/components/AllNewsPage";
import type { Lang } from "@/lib/types";

const LANGS: Lang[] = ["uz", "en"];

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LANGS.includes(lang as Lang)) notFound();
  return <AllNewsPage lang={lang as Lang} />;
}
