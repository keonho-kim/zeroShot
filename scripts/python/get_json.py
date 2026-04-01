#!/usr/bin/env python3
"""
scripts/python/get_json.py

JSON 파일에서 값을 추출하는 작은 유틸리티입니다.
shell 안의 python heredoc을 없애고, 별도 파일로 분리하기 위해 만들었습니다.

사용 예:
  uv run python scripts/python/get_json.py path/to/file.json gate
  uv run python scripts/python/get_json.py path/to/file.json progress_made
  uv run python scripts/python/get_json.py path/to/file.json nested.key

출력 규칙:
- bool  -> true / false
- list  -> 각 원소를 줄바꿈으로 출력
- dict  -> compact JSON으로 출력
- None  -> 빈 문자열 출력
- scalar -> 문자열로 출력
"""

from __future__ import annotations

import json
import pathlib
import sys
from typing import Any


def print_usage_and_exit() -> None:
    print("Usage: get_json.py <json_file> <key_or_dotted_path>", file=sys.stderr)
    raise SystemExit(2)


def resolve_path(data: Any, path: str) -> Any:
    current = data

    if not path:
        return current

    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                raise KeyError(part)
            current = current[part]
            continue

        if isinstance(current, list):
            if not part.isdigit():
                raise KeyError(part)
            current = current[int(part)]
            continue

        raise KeyError(part)

    return current


def emit(value: Any) -> None:
    if isinstance(value, bool):
        print("true" if value else "false")
        return

    if isinstance(value, list):
        for item in value:
            if isinstance(item, (dict, list)):
                print(json.dumps(item, ensure_ascii=False, separators=(",", ":")))
            elif item is None:
                print("")
            else:
                print(str(item))
        return

    if isinstance(value, dict):
        print(json.dumps(value, ensure_ascii=False, separators=(",", ":")))
        return

    if value is None:
        print("")
        return

    print(str(value))


def main() -> None:
    if len(sys.argv) != 3:
        print_usage_and_exit()

    json_path = pathlib.Path(sys.argv[1])
    key_path = sys.argv[2]

    if not json_path.exists():
        print(f"JSON file not found: {json_path}", file=sys.stderr)
        raise SystemExit(1)

    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Failed to parse JSON: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    try:
        value = resolve_path(data, key_path)
    except Exception:
        print("", end="")
        raise SystemExit(1)

    emit(value)


if __name__ == "__main__":
    main()
