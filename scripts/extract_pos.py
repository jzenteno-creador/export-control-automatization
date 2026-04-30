"""Descarga JSONs 304 desde Importer por lista de PO numbers.

Uso:
  IMPORTER_EMAIL='...' IMPORTER_PASSWORD='...' \
  PO_NUMBERS='118254602,118282166,...' \
  SAMPLES_DIR='samples/304' \
  python3 scripts/extract_pos.py

Variables:
  IMPORTER_EMAIL   — email de login (obligatorio)
  IMPORTER_PASSWORD — password de login (obligatorio)
  PO_NUMBERS       — lista de PO numbers separados por coma (obligatorio)
  SAMPLES_DIR      — directorio destino (default: samples/304)
  TIMEOUT          — segundos por request HTTP (default: 30)
  SLEEP_BETWEEN    — pausa entre requests, en segundos (default: 0.2)

Salida:
  - Un archivo {PO}.json por cada PO encontrado, con leading zeros stripeados.
  - Reporte stdout con status por PO: ok / not_found / not_304 / error.
  - Exit code 0 si todos los PO encontraron un 304 válido, 1 si hubo fallas.

Notas:
  - La ruta del Importer es /admin/jsonLogs/listarLogsJson (prefijo admin con
    middleware auth+admin — confirmado en routes/web.php:44 del repo importer).
  - El filtro po_number usa LIKE %X% en el backend (LogJson::scopePoNumber),
    así que matches con o sin leading zeros.
  - is_304() valida que el payload tenga Items (lista), RoutingNumber y Entities.
  - Si una orden tiene múltiples log entries para el mismo PO, se toma el más
    reciente (orden DESC por id) que pase la validación 304.
"""
import os
import re
import sys
import json
import time
from pathlib import Path
from urllib.parse import unquote

import requests

BASE = "https://importer.ssbplatform.com"


def env(key: str, default: str | None = None, required: bool = False) -> str:
    val = os.environ.get(key, default)
    if required and not val:
        sys.exit(f"missing env var: {key}")
    return val  # type: ignore


EMAIL = env("IMPORTER_EMAIL", required=True)
PASSWORD = env("IMPORTER_PASSWORD", required=True)
PO_NUMBERS_RAW = env("PO_NUMBERS", required=True)
SAMPLES_DIR = Path(env("SAMPLES_DIR", "samples/304"))
TIMEOUT = int(env("TIMEOUT", "30"))
SLEEP_BETWEEN = float(env("SLEEP_BETWEEN", "0.2"))

PO_NUMBERS = [p.strip() for p in PO_NUMBERS_RAW.split(",") if p.strip()]

if not PO_NUMBERS:
    sys.exit("PO_NUMBERS está vacío")


def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        ),
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    })
    return s


def login(s: requests.Session) -> None:
    r = s.get(f"{BASE}/login", timeout=TIMEOUT)
    r.raise_for_status()
    m = re.search(r'name="_token"\s+value="([^"]+)"', r.text)
    csrf_form = m.group(1) if m else None
    xsrf = unquote(s.cookies.get("XSRF-TOKEN") or "")
    headers = {
        "Referer": f"{BASE}/login",
        "Origin": BASE,
        "X-Requested-With": "XMLHttpRequest",
    }
    if xsrf:
        headers["X-XSRF-TOKEN"] = xsrf
    data = {"email": EMAIL, "password": PASSWORD}
    if csrf_form:
        data["_token"] = csrf_form
    r = s.post(
        f"{BASE}/login",
        data=data,
        headers=headers,
        allow_redirects=False,
        timeout=TIMEOUT,
    )
    if r.status_code not in (200, 302, 303):
        raise RuntimeError(f"login failed: status={r.status_code}")
    s.get(f"{BASE}/", timeout=TIMEOUT)
    s.get(f"{BASE}/admin/jsonLogs", timeout=TIMEOUT)


def fetch_by_po(s: requests.Session, po: str, draw: int) -> list[dict]:
    xsrf = unquote(s.cookies.get("XSRF-TOKEN") or "")
    headers = {
        "Referer": f"{BASE}/admin/jsonLogs",
        "Origin": BASE,
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
    }
    if xsrf:
        headers["X-XSRF-TOKEN"] = xsrf
    payload = {
        "draw": str(draw),
        "start": "0",
        "length": "20",
        "columns[0][data]": "id",
        "columns[1][data]": "status",
        "columns[2][data]": "po_number",
        "columns[3][data]": "shipment_number",
        "columns[4][data]": "json",
        "columns[5][data]": "created_at",
        "order[0][column]": "0",
        "order[0][dir]": "desc",
        "filtro[0][name]": "po_number",
        "filtro[0][value]": po,
    }
    r = s.post(
        f"{BASE}/admin/jsonLogs/listarLogsJson",
        data=payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json().get("data") or []


def is_304(d) -> bool:
    return (
        isinstance(d, dict)
        and isinstance(d.get("Items"), list)
        and "RoutingNumber" in d
        and "Entities" in d
    )


def parse_row_json(raw):
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


def main() -> int:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    s = make_session()
    login(s)
    print(f"[login] OK ({EMAIL})")
    print(f"[targets] {len(PO_NUMBERS)} PO numbers: {PO_NUMBERS}")

    results = {}
    for i, po in enumerate(PO_NUMBERS, 1):
        try:
            rows = fetch_by_po(s, po, draw=i)
        except Exception as e:
            results[po] = ("error", f"fetch failed: {e}")
            print(f"[{i}/{len(PO_NUMBERS)}] {po}: ERROR fetch — {e}")
            time.sleep(SLEEP_BETWEEN)
            continue

        if not rows:
            results[po] = ("not_found", None)
            print(f"[{i}/{len(PO_NUMBERS)}] {po}: NOT_FOUND (sin rows)")
            time.sleep(SLEEP_BETWEEN)
            continue

        # rows ya viene ordenado DESC por id según el payload (order[0][dir]=desc).
        # Tomamos el primer row cuyo campo `json` sea un 304 válido.
        chosen = None
        skipped = 0
        for row in rows:
            d = parse_row_json(row.get("json"))
            if d is None:
                skipped += 1
                continue
            if not is_304(d):
                skipped += 1
                continue
            chosen = (row, d)
            break

        if chosen is None:
            results[po] = ("not_304", f"{len(rows)} rows, ninguno 304 válido")
            print(f"[{i}/{len(PO_NUMBERS)}] {po}: NOT_304 ({len(rows)} rows revisados)")
            time.sleep(SLEEP_BETWEEN)
            continue

        row, d = chosen
        po_clean = po.lstrip("0") or "0"
        out_path = SAMPLES_DIR / f"{po_clean}.json"
        out_path.write_text(json.dumps(d, separators=(",", ":")))
        results[po] = ("ok", {
            "file": str(out_path),
            "row_id": row.get("id"),
            "shipment": row.get("shipment_number"),
            "created_at": row.get("created_at"),
            "rows_seen": len(rows),
            "rows_skipped": skipped,
        })
        print(
            f"[{i}/{len(PO_NUMBERS)}] {po}: OK → {out_path.name} "
            f"(id={row.get('id')}, shipment={row.get('shipment_number')}, "
            f"rows={len(rows)}, skipped={skipped})"
        )
        time.sleep(SLEEP_BETWEEN)

    print("\n=== Resumen ===")
    ok = sum(1 for v in results.values() if v[0] == "ok")
    print(f"  ok        : {ok}/{len(PO_NUMBERS)}")
    for status in ("not_found", "not_304", "error"):
        n = sum(1 for v in results.values() if v[0] == status)
        if n:
            print(f"  {status:<10}: {n}")
            for po, (st, info) in results.items():
                if st == status:
                    print(f"    - {po}: {info}")

    return 0 if ok == len(PO_NUMBERS) else 1


if __name__ == "__main__":
    sys.exit(main())
