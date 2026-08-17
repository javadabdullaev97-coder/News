#!/usr/bin/env bash
# Безопасный git push для параллельных workflow.
#
# Проблема без него: news-inbox, telegram-autopost, editor-queue и планёрка
# коммитят в main одновременно. Обычный `git push` на non-fast-forward падает,
# и ретрай того же push бесконечен — нужен rebase на свежий origin/main.
# Без rebase локальный коммит с state-файлом (например, telegram-posted.json)
# пропадает, и следующий запуск постит те же статьи повторно.
#
# Что делает:
#   1. git fetch origin main
#   2. git rebase origin/main   (свои коммиты поверх свежего main)
#   3. git push origin HEAD:main
#   4. На конфликте rebase — abort и перевызов fetch+rebase (до 4 попыток)
#   5. На сетевой ошибке push — экспоненциальный backoff 2/4/8/16 сек
#
# Требует: git идентичность настроена (name/email); есть write-права токена.
# Использование:
#   .github/scripts/git-push-with-rebase.sh
set -euo pipefail

BRANCH="${GIT_TARGET_BRANCH:-main}"

# Число попыток настраивается: постер в Telegram пушит маленький журнал
# после каждого сообщения и делает это ровно тогда, когда планёрка пачками
# коммитит очередь, картинки и журнал тем. 17.08.2026 четырёх попыток
# не хватило — пуши не прошли, записи о постах остались в мёртвых локальных
# коммитах, и материал ушёл в канал пять раз. Для таких коротких пушей
# терпение дешевле повтора у подписчиков.
MAX_ATTEMPTS="${GIT_PUSH_ATTEMPTS:-4}"

for attempt in $(seq 1 $MAX_ATTEMPTS); do
  echo "[git-push] attempt $attempt/$MAX_ATTEMPTS on branch=$BRANCH"

  # Свежая история удалённого main
  if ! git fetch origin "$BRANCH"; then
    echo "[git-push] fetch failed, backoff and retry"
    sleep $((2 ** attempt))
    continue
  fi

  # Наш HEAD может отставать от origin/BRANCH на N коммитов — накатываем
  # свои коммиты поверх. Если rebase упирается в конфликт по файлу — это
  # структурная проблема (два воркфлоу редактируют один файл несогласованно),
  # надо разбираться руками, а не молча дропать локальные изменения.
  if ! git rebase "origin/$BRANCH"; then
    echo "[git-push] rebase conflict — aborting rebase and reporting"
    git rebase --abort || true
    git status
    echo "[git-push] CONFLICT: два воркфлоу правят один файл. Разберись вручную."
    exit 2
  fi

  # Push. На non-fast-forward снова цикл (кто-то успел коммитнуть между
  # нашим fetch и push). На сетевой — backoff.
  if git push origin "HEAD:$BRANCH"; then
    echo "[git-push] pushed OK on attempt $attempt"
    exit 0
  fi

  # Джиттер: без него два постера, стартовавшие одновременно, повторяют
  # попытку в одну и ту же секунду и мешают друг другу столько же раз.
  echo "[git-push] push failed, will re-fetch and retry"
  sleep $(( (2 ** attempt) + (RANDOM % 3) ))
done

echo "[git-push] exhausted $MAX_ATTEMPTS attempts"
exit 1
