import { Author, initials } from "@/lib/data";

export function AuthorBlock({ author }: { author: Author }) {
  return (
    <div className="mt-10 flex gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${author.initialsColor}`}
      >
        {initials(author.name)}
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Автор
        </div>
        <div className="text-base font-semibold">{author.name}</div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {author.bio}
        </p>
      </div>
    </div>
  );
}
