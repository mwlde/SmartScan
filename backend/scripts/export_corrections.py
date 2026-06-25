#!/usr/bin/env python3
"""
export_corrections.py
─────────────────────
Admin script — run manually, not part of the live API.

Downloads images from the feedback table where the user said the classifier
was wrong, then organises them into per-label folders ready to use as
additional training data for the next model version.

Output structure:
    corrections/
        handwritten/   <feedback_id>.jpg
        invoice/       <feedback_id>.jpg
        form/          <feedback_id>.jpg
        printed_page/  <feedback_id>.jpg

Usage:
    python export_corrections.py              # download for real
    python export_corrections.py --dry-run    # preview only, no files written

Required environment variables:
    SUPABASE_URL          https://<project>.supabase.co
    SUPABASE_SERVICE_KEY  service_role JWT  (NOT the anon key)

No extra packages needed — uses stdlib urllib only.
"""

import argparse
import collections
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

# ── Load .env from the backend root (parent of this script's directory) ──────

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
        if key and key not in os.environ:   # shell-set vars take priority
            os.environ[key] = value

_load_dotenv()

# ── Constants ────────────────────────────────────────────────────────────────

VALID_LABELS = {"handwritten", "invoice", "form", "printed_page"}
OUTPUT_ROOT  = pathlib.Path("corrections")
PAGE_SIZE    = 1000   # Supabase max rows per request


# ── Helpers ──────────────────────────────────────────────────────────────────

def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"Error: environment variable {name!r} is not set.", file=sys.stderr)
        sys.exit(1)
    return value


def supabase_get(base_url: str, service_key: str, path: str, params: dict) -> list[dict]:
    """
    Paginated GET against the Supabase REST API.
    Returns all rows across multiple pages.
    """
    headers = {
        "apikey":        service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept":        "application/json",
        # Ask Supabase to return the total count so we can sanity-check
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
        print(f"    Warning: download failed — {exc}")
        return None


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Export misclassified scan images from the feedback table, "
            "organised by true label for use as training data."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be downloaded without writing any files.",
    )
    args = parser.parse_args()

    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    service_key  = require_env("SUPABASE_SERVICE_KEY")

    # ── 1. Fetch rows ─────────────────────────────────────────────────────────
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

    # ── 2. Process each row ───────────────────────────────────────────────────
    per_class: collections.Counter[str] = collections.Counter()
    skipped         = 0
    download_errors = 0

    for row in rows:
        feedback_id   = row.get("id", "unknown")
        correct_label = row.get("correct_label")
        image_url     = row.get("image_url")

        # Belt-and-suspenders: the query already filters these out but guard anyway
        if not correct_label or not image_url:
            skipped += 1
            continue

        if correct_label not in VALID_LABELS:
            print(f"  Skip {feedback_id}: unrecognised label {correct_label!r}")
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

    # ── 3. Summary ────────────────────────────────────────────────────────────
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
