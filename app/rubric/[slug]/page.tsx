import { RubricPage, RUBRIC_SLUGS } from "@/components/RubricPage";

export function generateStaticParams() {
  return RUBRIC_SLUGS.map((slug) => ({ slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RubricPage slug={slug} lang="ru" />;
}
