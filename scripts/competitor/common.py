"""Общая инфраструктура пайплайна анализа конкурентов.

Здесь живёт всё, что нужно каждому шагу: конфиг корпуса, вежливый HTTP-клиент
с задержками и кешем сырых ответов, чтение robots.txt и мелкие утилиты путей.

Ни один шаг не ходит в сеть мимо fetch() — иначе кеш сырья перестаёт быть
полным и при ошибке парсера пришлось бы перекачивать корпус заново.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
import urllib.robotparser
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
DATA_RAW = ROOT / "data" / "raw"
DATA_CLEAN = ROOT / "data" / "clean"
OUTPUT = ROOT / "output"
CONFIG_PATH = Path(__file__).resolve().parent / "corpus-config.json"

# Ташкент — UTC+5, без переходов на летнее время.
TASHKENT = timezone(timedelta(hours=5))

# Только ASCII: httpx кодирует заголовки в ascii и падает на кириллице.
USER_AGENT = (
    "LeapNewsResearchBot/1.0 (editorial competitor analysis for leap.uz; "
    "contact: newsroom@leap.uz)"
)

DEFAULT_DELAY = 1.5  # секунд между запросами к одному хосту


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def period_bounds(cfg: dict) -> tuple[datetime, datetime]:
    start = datetime.fromisoformat(cfg["period"]["start"]).replace(tzinfo=TASHKENT)
    end = datetime.fromisoformat(cfg["period"]["end"]).replace(tzinfo=TASHKENT)
    return start, end


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "x"


def url_key(url: str) -> str:
    """Стабильное имя файла для сырого ответа: хэш + читаемый хвост."""
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]
    tail = slugify(url.split("?")[0].rstrip("/").split("/")[-1])[:60]
    return f"{digest}-{tail}" if tail else digest


# Gazeta.uz обрывает соединение на любом небраузерном User-Agent
# (RemoteProtocolError на первом же запросе), при пустом robots.txt без единого
# правила. Для таких хостов конфиг разрешает подставить браузерный UA — это
# записано в PROGRESS.md, задержка и объём запросов при этом те же.
BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)


@dataclass
class Fetcher:
    """HTTP-клиент с кешем сырья на диске и паузой между запросами.

    cache_dir хранит ровно то, что отдал сервер, до всякого парсинга. Повторный
    прогон пайплайна при уже прогретом кеше сеть не трогает вовсе.
    """

    cache_dir: Path
    delay: float = DEFAULT_DELAY
    timeout: float = 40.0
    force: bool = False
    user_agent: str = USER_AGENT
    _last_hit: dict[str, float] = field(default_factory=dict)
    _robots: dict[str, urllib.robotparser.RobotFileParser | None] = field(
        default_factory=dict
    )
    _client: httpx.Client | None = None

    def __post_init__(self) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._client = httpx.Client(
            follow_redirects=True,
            timeout=self.timeout,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru,en;q=0.8",
            },
        )

    # -- robots ---------------------------------------------------------
    def robots_allows(self, url: str) -> bool:
        host = httpx.URL(url).host or ""
        if host not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            robots_url = f"https://{host}/robots.txt"
            try:
                resp = self._client.get(robots_url)
                if resp.status_code == 200 and resp.text.strip():
                    rp.parse(resp.text.splitlines())
                else:
                    rp = None
            except Exception:
                rp = None
            self._robots[host] = rp
            self._sleep(host)
        rp = self._robots[host]
        if rp is None:
            # Нет читаемого robots.txt — считаем разрешённым, как и положено RFC 9309.
            return True
        # Проверяем и по нашему имени, и по «*»: если хост запрещает всем — не идём.
        return rp.can_fetch(USER_AGENT, url) and rp.can_fetch("*", url)

    # -- fetch ----------------------------------------------------------
    def _sleep(self, host: str) -> None:
        last = self._last_hit.get(host)
        if last is not None:
            wait = self.delay - (time.monotonic() - last)
            if wait > 0:
                time.sleep(wait)
        self._last_hit[host] = time.monotonic()

    def cache_path(self, url: str, suffix: str = ".html") -> Path:
        return self.cache_dir / f"{url_key(url)}{suffix}"

    def fetch(
        self, url: str, *, suffix: str = ".html", check_robots: bool = True
    ) -> tuple[str | None, dict]:
        """Вернуть (текст, мета). Текст None — если не удалось получить."""
        path = self.cache_path(url, suffix)
        meta_path = path.with_suffix(path.suffix + ".meta.json")
        if path.exists() and not self.force:
            meta = {}
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            meta["cached"] = True
            return path.read_text(encoding="utf-8", errors="replace"), meta

        if check_robots and not self.robots_allows(url):
            return None, {"url": url, "error": "robots-disallow"}

        host = httpx.URL(url).host or ""
        self._sleep(host)
        try:
            resp = self._client.get(url)
        except Exception as exc:  # сеть, TLS, таймаут
            return None, {"url": url, "error": f"{type(exc).__name__}: {exc}"}

        meta = {
            "url": url,
            "final_url": str(resp.url),
            "status": resp.status_code,
            "content_type": resp.headers.get("content-type", ""),
            "bytes": len(resp.content),
            "fetched_at": datetime.now(TASHKENT).isoformat(),
            "cached": False,
        }
        if resp.status_code != 200:
            meta["error"] = f"http-{resp.status_code}"
            return None, meta

        text = resp.text
        path.write_text(text, encoding="utf-8")
        meta_path.write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return text, meta

    def close(self) -> None:
        if self._client is not None:
            self._client.close()


def write_jsonl(path: Path, rows) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            n += 1
    return n


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def env_flag(name: str) -> bool:
    return os.environ.get(name, "").lower() in {"1", "true", "yes"}
