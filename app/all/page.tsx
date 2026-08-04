import type { Metadata } from "next";
import { AllNewsPage } from "@/components/AllNewsPage";

export const metadata: Metadata = {
  title: "Все новости — LEAP",
  description:
    "Единая лента всех материалов LEAP: политика, экономика, бизнес, общество, спорт, мир, технологии и культура.",
};

export default function Page() {
  return <AllNewsPage lang="ru" />;
}
