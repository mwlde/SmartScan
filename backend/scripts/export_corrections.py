#!/usr/bin/env python3
# admin script, run manually — not part of the live api
# downloads misclassified imgs from supabase and sorts them into per-label folders for retraining
#
# output:  corrections/{label}/{feedback_id}.jpg
# usage:   python export_corrections.py
#          python export_corrections.py --dry-run
#
# needs:   SUPABASE_URL and SUPABASE_SERVICE_KEY in env or backend/.env
#          (service role key, NOT the anon key — needs to bypass RLS)

import argparse
import collections
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

# 𓆝 𓆟 𓆞 𓆟 𓆝 env + config

def _load_dotenv() -> None:
    # loads backend/.env so you dont have to export vars manually every time
    env_path = pathlib.Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if key and key not in os.environ:   # shell-set vars take priority over .env
            os.environ[key] = value

_load_dotenv()

VALID_LABELS = {"handwritten", "invoice", "form", "printed_page"}
OUTPUT_ROOT  = pathlib.Path("corrections")
PAGE_SIZE    = 1000   # supabase max rows per request


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"Error: environment variable {name!r} is not set.", file=sys.stderr)
        sys.exit(1)
    return value


def supabase_get(base_url: str, service_key: str, path: str, params: dict) -> list[dict]:
    """paginated GET from supabase REST api. loops until we get fewer than PAGE_SIZE rows back, meaning we hit the end."""
    headers = {
        "apikey":        service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept":        "application/json",
        "Prefer":        "count=exact",
    }
    all_rows: list[dict] = []
    offset = 0

    while True:
        paged = {**params, "limit": PAGE_SIZE, "offset": offset}
        url   = f"{base_url}{path}?{urllib.parse.urlencode(paged)}"
        req   = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode()
        except urllib.error.HTTPError as exc:
            body = exc.read().decode()
            print(f"Supabase API error {exc.code}: {body}", file=sys.stderr)
            sys.exit(1)

        rows = json.loads(body)
        all_rows.extend(rows)

        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return all_rows


def download_bytes(url: str, timeout: int = 30) -> bytes | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.read()
    except Exception as exc:
        print(f"    warning: download failed — {exc}")
        return None

# 𓆝 𓆟 𓆞 𓆟 𓆝 main

def main() -> None:
    parser = argparse.ArgumentParser(
        description="download misclassified feedback imgs sorted by true label",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print what would be downloaded without writing any files",
    )
    args = parser.parse_args()

    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    service_key  = require_env("SUPABASE_SERVICE_KEY")

    print("Querying feedback table...")
    rows = supabase_get(
        supabase_url,
        service_key,
        "/rest/v1/feedback",
        {
            "select":        "id,correct_label,image_url",
            "was_correct":   "eq.false",
            "image_url":     "not.is.null",
            "correct_label": "not.is.null",
        },
    )
    print(f"Found {len(rows)} correction row{'s' if len(rows) != 1 else ''}.\n")

    per_class: collections.Counter[str] = collections.Counter()
    skipped         = 0
    download_errors = 0

    for row in rows:
        feedback_id   = row.get("id", "unknown")
        correct_label = row.get("correct_label")
        image_url     = row.get("image_url")

        # query already filters but guard anyway
        if not correct_label or not image_url:
            skipped += 1
            continue

        if correct_label not in VALID_LABELS:
            print(f"  skip {feedback_id}: unrecognised label {correct_label!r}")
            skipped += 1
            continue

        dest = OUTPUT_ROOT / correct_label / f"{feedback_id}.jpg"

        if args.dry_run:
            print(f"  [dry-run] {correct_label:<20} ← {feedback_id}.jpg")
            per_class[correct_label] += 1
            continue

        print(f"  {correct_label:<20} ← {feedback_id}.jpg")
        data = download_bytes(image_url)
        if data is None:
            download_errors += 1
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        per_class[correct_label] += 1

    # summary
    divider    = "─" * 50
    mode_tag   = "[DRY RUN] " if args.dry_run else ""
    total_done = sum(per_class.values())

    print(f"\n{divider}")
    print(f"{mode_tag}Summary")
    print(divider)
    print(f"Total corrections found : {len(rows)}")
    print("Per class:")
    for label in sorted(VALID_LABELS):
        n = per_class.get(label, 0)
        print(f"  {label:<20} {n:>4} image{'s' if n != 1 else ''}")
    if skipped:
        print(f"Skipped (bad data)      : {skipped}")
    if download_errors:
        print(f"Download errors         : {download_errors}")

    if args.dry_run:
        print(f"\nDry run complete — no files written.")
    else:
        print(f"\nDone. {total_done} image{'s' if total_done != 1 else ''} saved to ./{OUTPUT_ROOT}/")


if __name__ == "__main__":
    main()
