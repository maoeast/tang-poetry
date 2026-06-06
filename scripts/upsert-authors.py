#!/usr/bin/env python3
"""Upsert author supplement data into authors.json.

Usage:
  python3 scripts/upsert-authors.py <supplement.json> [authors.json]

Default authors.json path: data/authors.json

The script reads a JSON array of entries (each with "name" and fields to upsert)
and merges them into authors.json, only filling in empty/missing fields.
Existing data is never overwritten (safe upsert).
"""
import json
import sys


def upsert(supplement_path: str, authors_path: str) -> dict:
    with open(supplement_path) as f:
        supplement = json.load(f)
    with open(authors_path) as f:
        authors = json.load(f)

    author_map = {a["name"]: a for a in authors}
    stats = {"bio": 0, "lifeStory": 0, "skipped": 0, "not_found": 0}

    for entry in supplement:
        name = entry["name"]
        if name not in author_map:
            print(f"  SKIP (not found): {name}")
            stats["not_found"] += 1
            continue
        target = author_map[name]
        updated_any = False
        for field in ["bio", "lifeStory"]:
            val = entry.get(field)
            if val and not target.get(field):
                target[field] = val
                stats[field] += 1
                updated_any = True
        if not updated_any:
            stats["skipped"] += 1

    with open(authors_path, "w") as f:
        json.dump(authors, f, ensure_ascii=False, indent=2)

    print(f"  bio added: {stats['bio']}")
    print(f"  lifeStory added: {stats['lifeStory']}")
    print(f"  skipped (already has data): {stats['skipped']}")
    print(f"  not found: {stats['not_found']}")

    # Summary stats
    no_bio = sum(1 for a in authors if not a.get("bio"))
    no_ls = sum(1 for a in authors if not a.get("lifeStory"))
    print(f"\n  After import: {no_bio} missing bio, {no_ls} missing lifeStory (of {len(authors)} total)")

    return stats


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    supp_path = sys.argv[1]
    auth_path = sys.argv[2] if len(sys.argv) > 2 else "data/authors.json"
    stats = upsert(supp_path, auth_path)
