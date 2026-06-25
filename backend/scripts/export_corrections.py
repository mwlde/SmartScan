#!/usr/bin/env python3
# admin script, run manually, not part of the live api
# downloads misclassified imgs from supabase and sorts them into per label folders for retraining
#
# output:  corrections/{label}/{feedback_id}.jpg
# usage:   python export_corrections.py
#          python export_corrections.py --dry-run
#
# needs:   SUPABASE_URL and SUPABASE_SERVICE_KEY in env or backend/.env
#          (service role key, not the anon key, needs to bypass rls)

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

# reads backend/.env and sets env vars from it so you dont have to export them manually every time
# shell set vars take priority, .env values only fill in what isnt already set
def _load_dotenv() -> None:
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
        if key and key not in os.environ:
            os.environ[key] = value

_load_dotenv()

VALID_LABELS = {"handwritten", "invoice", "form", "printed_page"}
OUTPUT_ROOT  = pathlib.Path("corrections")
PAGE_SIZE    = 1000   # supabase max rows per request


# just grabs an env var and exits with a clear error if its missing
def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"error: environment variable {name!r} is not set.", file=sys.stderr)
        sys.exit(1)
    return value


# paginates through a supabase rest endpoint until all rows are fetched
# supabase caps responses at PAGE_SIZE rows, so we keep requesting with an increasing offset
# until we get back fewer rows than PAGE_SIZE which means we hit the end
def supabase_get(base_url: str, service_key: str, path: str, params: dict) -> list[dict]:
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
            print(f"supabase api error {exc.code}: {body}", file=sys.stderr)
            sys.exit(1)

        rows = json.loads(body)
        all_rows.extend(rows)

        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return all_rows


# downloads an image from a url and returns the raw bytes
# returns none on any failure so the caller can skip and continue
def download_bytes(url: str, timeout: int = 30) -> bytes | None:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.read()
    except Exception as exc:
        print(f"    warning: download failed, {exc}")
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

    print("querying feedback table...")
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
    print(f"found {len(rows)} correction row{'s' if len(rows) != 1 else ''}.\n")

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
            print(f"  [dry-run] {correct_label:<20} {feedback_id}.jpg")
            per_class[correct_label] += 1
            continue

        print(f"  {correct_label:<20} {feedback_id}.jpg")
        data = download_bytes(image_url)
        if data is None:
            download_errors += 1
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        per_class[correct_label] += 1

    divider    = "-" * 50
    mode_tag   = "[dry run] " if args.dry_run else ""
    total_done = sum(per_class.values())

    print(f"\n{divider}")
    print(f"{mode_tag}summary")
    print(divider)
    print(f"total corrections found : {len(rows)}")
    print("per class:")
    for label in sorted(VALID_LABELS):
        n = per_class.get(label, 0)
        print(f"  {label:<20} {n:>4} image{'s' if n != 1 else ''}")
    if skipped:
        print(f"skipped (bad data)      : {skipped}")
    if download_errors:
        print(f"download errors         : {download_errors}")

    if args.dry_run:
        print(f"\ndry run complete, no files written.")
    else:
        print(f"\ndone. {total_done} image{'s' if total_done != 1 else ''} saved to ./{OUTPUT_ROOT}/")


if __name__ == "__main__":
    main()
