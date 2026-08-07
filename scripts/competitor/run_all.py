"""Весь пайплайн одной командой.

    .venv-competitor/bin/python scripts/competitor/run_all.py

Шаги идут в порядке зависимости. Скачивание кешируется в data/raw, поэтому
повторный прогон при прогретом кеше сеть не трогает и занимает минуты.

  --skip-network   пропустить шаги сбора (пересчитать метрики и отчёт
                   на уже собранном корпусе)

sample.py в цепочку не входит намеренно: он предлагает НОВУЮ выборку для
качественного кодирования, а разметка этапа 4 закреплена за конкретными url
внутри qualitative.py. Запускать его нужно вручную, когда начинают новый
цикл чтения.
  --from ШАГ       начать с указанного шага
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = sys.executable

STEPS = [
    ("discover", ["discover_sources.py"], True),
    ("index", ["collect_index.py"], True),
    ("articles", ["fetch_articles.py"], True),
    ("telegram", ["collect_telegram.py"], True),
    ("links", ["resolve_links.py"], True),
    ("parse", ["parse_articles.py"], False),
    ("ours", ["parse_ours.py"], False),
    ("normalize", ["normalize.py"], False),
    ("metrics", ["metrics.py"], False),
    ("topics", ["topics.py"], False),
    ("newsbreaks", ["newsbreaks.py", "--top", "8", "--min-outlets", "5"], False),
    ("newsbreaks-h2h", ["newsbreaks.py", "--since", "2026-08-01", "--min-outlets", "4",
                        "--top", "8", "--out-prefix", "newsbreaks-headtohead"], False),
    ("events-depth", ["fetch_event_articles.py"], True),
    ("events-depth-h2h", ["fetch_event_articles.py",
                          "--input", "output/newsbreaks-headtohead-detail.json",
                          "--output", "output/newsbreaks-headtohead-depth.csv"], True),
    ("agenda", ["agenda.py"], False),
    ("qualitative", ["qualitative.py"], False),
    ("dashboard", ["dashboard.py"], False),
    ("verify", ["verify_report.py"], False),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-network", action="store_true")
    ap.add_argument("--from", dest="start", help="имя шага, с которого начать")
    args = ap.parse_args()

    started = args.start is None
    for name, cmd, needs_network in STEPS:
        if not started:
            if name != args.start:
                continue
            started = True
        if args.skip_network and needs_network:
            print(f"-- пропуск {name} (сеть отключена)", flush=True)
            continue
        script = HERE / cmd[0]
        if not script.exists():
            print(f"-- пропуск {name}: {cmd[0]} ещё не написан", flush=True)
            continue
        print(f"\n===== {name} =====", flush=True)
        t0 = time.time()
        res = subprocess.run([PY, str(script), *cmd[1:]], cwd=HERE.parents[1])
        if res.returncode != 0:
            print(f"!! шаг {name} завершился с кодом {res.returncode}", flush=True)
            return res.returncode
        print(f"-- {name}: {time.time() - t0:.0f} с", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
