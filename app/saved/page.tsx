import { SavedClient } from "./SavedClient";

export const metadata = {
  title: "Сохранённое",
  description: "Статьи, которые вы отложили на потом",
};

export default function SavedPage() {
  return (
    <div className="container-news py-10">
      <h1 className="font-serif text-4xl font-bold">Сохранённое</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Статьи, которые вы отложили на потом. Хранятся в браузере, не нужно
        регистрироваться.
      </p>
      <SavedClient />
    </div>
  );
}
