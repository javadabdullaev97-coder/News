import { HomePage } from "@/components/HomePage";

// Русская главная живёт в корне: так проиндексированы все ссылки издания.
// Узбекская и английская — /uz и /en, см. app/[lang]/page.tsx.
export default function Page() {
  return <HomePage lang="ru" />;
}
