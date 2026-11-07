#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Read-only, best-effort source inventory for project-runtime-acceptance.

Does NOT execute project code, connect to services, or prove security/health.
Writes ONLY to the caller-supplied --out directory.
Python 3.9+ standard library.
"""

from __future__ import annotations

import argparse
import bisect
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import stat

SKIP_DIRS = {
    ".git", ".svn", ".hg", ".idea", ".vscode", ".gradle", ".mypy_cache",
    ".pytest_cache", ".tox", ".venv", "venv", "env", "__pycache__",
    "node_modules", "vendor", "target", "build", "dist", "coverage", ".next",
    ".nuxt", ".turbo", "site-packages", "out", ".DS_Store", "logs",
}
SOURCE_SUFFIXES = {
    ".java", ".kt", ".py", ".go", ".js", ".jsx", ".ts", ".tsx",
    ".sql", ".xml", ".yaml", ".yml", ".properties", ".conf", ".ini",
    ".toml", ".json", ".sh", ".ps1", ".gradle", ".tf", ".cs",
}
SPECIAL_NAMES = {"Dockerfile", "Jenkinsfile", "Procfile", "crontab", "Makefile"}
TEST_DIR_HINTS = {"test", "tests", "__tests__", "fixtures", "__fixtures__", "testdata", "examples", "samples"}
MAX_MATCHES_PER_RULE_PER_FILE = 120

# The scanner extracts likely *entry points*, not semantic call graphs or real database assets.
# Regex captures are intentionally narrow; unmatched syntax remains to be reviewed by an Agent.
RULES = [
    ("DB", "SQL_CREATE_TABLE", r"\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`\"\[]?[\w-]+[`\"\]]?(?:\s*\.\s*[`\"\[]?[\w-]+[`\"\]]?)?)", re.I | re.M),
    ("DB", "JPA_TABLE", r"@Table\s*\(\s*(?:name\s*=\s*)?[\"']([\w.\-]+)[\"']", re.I),
    ("DB", "SQLALCHEMY_TABLE", r"\b__tablename__\s*=\s*[\"']([\w.\-]+)[\"']", 0),
    ("DB", "DJANGO_TABLE", r"\bdb_table\s*=\s*[\"']([\w.\-]+)[\"']", 0),
    ("DB", "JPA_ENTITY", r"@Entity\b", 0),
    ("JOB", "SPRING_SCHEDULED", r"@Scheduled\s*\(", 0),
    ("JOB", "XXL_JOB", r"@XxlJob\s*\(", 0),
    ("JOB", "QUARTZ_JOB", r"\bimplements\s+Job\b|\bQuartzJobBean\b", 0),
    ("JOB", "PYTHON_PERIODIC", r"@(?:\w+\.)?(?:periodic_task|scheduled_job)\s*\(|\b(?:scheduler\.)?add_job\s*\(", 0),
    ("JOB", "CELERY_BEAT", r"\b(?:beat_schedule|add_periodic_task|crontab\s*\()", 0),
    ("CACHE", "SPRING_CACHE", r"@Cache(?:able|Put|Evict|Config)\b", 0),
    ("CACHE", "REDIS_OR_CAFFEINE", r"\b(?:RedisTemplate|StringRedisTemplate|RedisCacheManager|Caffeine|CacheManager|Ehcache)\b", 0),
    ("CACHE", "PYTHON_CACHE", r"@(?:functools\.)?(?:lru_cache|cache)\b|\b(?:cachetools|django\.core\.cache)\b", 0),
    ("CACHE", "FRONTEND_CACHE", r"\b(?:useQuery|queryClient\.invalidateQueries|localStorage|sessionStorage|staleTime|cacheTime)\b", 0),
    ("API", "SPRING_HTTP_ROUTE", r"@(?:Get|Post|Put|Delete|Patch|Request)Mapping\s*\(", 0),
    ("API", "PYTHON_HTTP_ROUTE", r"@(?:app|router|bp|blueprint)\.(?:get|post|put|delete|patch|route)\s*\(", 0),
    ("API", "HTTP_OUTBOUND", r"\b(?:fetch|axios\.(?:get|post|put|delete|patch)|requests\.(?:get|post|put|delete|patch)|httpx\.(?:get|post|put|delete|patch))\s*\(", 0),
    ("API", "JAVA_HTTP_CLIENT", r"\b(?:RestTemplate|WebClient|FeignClient|HttpClient|OkHttpClient)\b", 0),
    ("API", "FRONTEND_POLLING", r"\b(?:setInterval|refetchInterval)\s*(?:\(|:)", 0),
    ("STORE", "OBJECT_STORAGE", r"\b(?:S3Client|AmazonS3|MinioClient|OSSClient|putObject|upload_file|boto3\.client|MultipartFile)\b", 0),
    ("STORE", "TRANSFER_OR_TRANSCODE", r"\b(?:FTPClient|TransMp4|ffmpeg|Files\.createTempFile|tempfile\.NamedTemporaryFile)\b", re.I),
    ("ASYNC", "MESSAGING_CONSUMER", r"@(?:KafkaListener|RabbitListener|JmsListener|SqsListener)\b|\b(?:KafkaConsumer|RabbitMQ|RocketMQ|RedisStream)\b", 0),
    ("ASYNC", "CELERY_TASK", r"@(?:shared_task|(?:\w+\.)?task)\b|\b(?:apply_async|send_task)\s*\(", 0),
    ("ASYNC", "SPRING_ASYNC", r"@Async\b|\b(?:CompletableFuture|@EnableAsync)\b", 0),
    ("RES", "EXECUTOR_THREAD", r"\b(?:ThreadPoolExecutor|ScheduledThreadPoolExecutor|ExecutorService|Executors\.new\w+|new\s+Thread\s*\()", 0),
    ("RES", "WEBSOCKET", r"\b(?:WebSocket|SseEmitter|EventSource)\b", 0),
]
COMPILED = [(category, label, re.compile(pattern, flags)) for category, label, pattern, flags in RULES]


def should_skip_dir(dirname: str, include_tests: bool) -> bool:
    return dirname in SKIP_DIRS or (not include_tests and dirname.lower() in TEST_DIR_HINTS)


def is_scan_file(path: Path) -> bool:
    return path.suffix.lower() in SOURCE_SUFFIXES or path.name in SPECIAL_NAMES


def skip_path_inside(path: Path, excluded: Path) -> bool:
    # Relative comparison avoids accidental substring matches in similar directory names.
    try:
        path.relative_to(excluded)
        return True
    except ValueError:
        return False


def is_link_or_reparse(path: Path) -> bool:
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    )


def validate_output(out: Path, overwrite: bool = False) -> None:
    # Check lexical components BEFORE resolve() can hide a symlink/junction.
    out = Path(os.path.abspath(out.expanduser()))
    for part in (*reversed(out.parents), out):
        if is_link_or_reparse(part):
            raise ValueError(f"Output path contains a link/reparse point: {part}")
        if part.exists() and not part.is_dir():
            raise ValueError(f"Output path is not a directory: {part}")
    for name in ("inventory.json", "inventory.md"):
        target = out / name
        if is_link_or_reparse(target):
            raise ValueError(f"Report target is a link/reparse point: {target}")
        if target.exists() and target.stat().st_nlink > 1:
            raise ValueError(f"Report target has multiple hard links: {target}")
        if target.exists() and (not overwrite or not target.is_file()):
            raise ValueError(f"Report target exists; use a new directory or explicitly --overwrite: {target}")


def read_text(path: Path, max_bytes: int) -> tuple[str | None, str | None]:
    try:
        if not stat.S_ISREG(path.lstat().st_mode) or is_link_or_reparse(path):
            return None, "non-regular-file"
        if path.stat().st_size > max_bytes:
            return None, "size-limit"
        with path.open("rb") as source:
            data = source.read(max_bytes + 1)
        if len(data) > max_bytes:
            return None, "size-limit"
        if b"\0" in data[:4096]:
            return None, "binary"
        # UTF-8 is preferred; legacy sources may be non-UTF8 and are reported, not hidden.
        try:
            return data.decode("utf-8-sig"), None
        except UnicodeDecodeError:
            return None, "encoding-unsupported"
    except (OSError, PermissionError):
        return None, "read-error"


def safe_symbol(label: str, match: re.Match[str]) -> str:
    # Never export code lines or raw config values; only trusted DDL/table-name-like tokens.
    if label in {"SQL_CREATE_TABLE", "JPA_TABLE", "SQLALCHEMY_TABLE", "DJANGO_TABLE"}:
        val = match.group(1)
        return re.sub(r"\s+", "", val)[:100] if val else "(unparsed)"
    return label


def scan(root: Path, out: Path, max_bytes: int, max_files: int, include_tests: bool) -> dict:
    counters = Counter()
    candidates: list[dict] = []
    skips: Counter[str] = Counter()
    exclusions: list[str] = []
    seen_files = 0
    stopped_early = False
    directory_errors: list[dict] = []

    def record_walk_error(error: OSError) -> None:
        failed = Path(error.filename) if error.filename else None
        try:
            location = failed.relative_to(root).as_posix() if failed else "(unknown)"
        except ValueError:
            location = str(failed)
        directory_errors.append({"path": location, "error": type(error).__name__, "errno": error.errno})

    for current, dirs, files in os.walk(root, topdown=True, followlinks=False, onerror=record_walk_error):
        current_path = Path(current)
        dirs[:] = sorted(d for d in dirs if not should_skip_dir(d, include_tests)
                         and not is_link_or_reparse(current_path / d)
                         and not skip_path_inside((current_path / d).resolve(), out))
        for filename in sorted(files):
            full = current_path / filename
            if is_link_or_reparse(full) or not full.is_file() or not is_scan_file(full):
                continue
            seen_files += 1
            if seen_files > max_files:
                stopped_early = True
                break
            relative = full.relative_to(root).as_posix()
            contents, error = read_text(full, max_bytes)
            if error:
                skips[error] += 1
                if len(exclusions) < 200:
                    exclusions.append(f"{relative} ({error})")
                continue
            assert contents is not None
            counters["files_scanned"] += 1
            offsets = [-1] + [m.start() for m in re.finditer("\n", contents)]
            for category, label, regex in COMPILED:
                matched = 0
                for found in regex.finditer(contents):
                    if matched >= MAX_MATCHES_PER_RULE_PER_FILE:
                        skips["match-limit"] += 1
                        break
                    line = bisect.bisect_left(offsets, found.start())
                    symbol = safe_symbol(label, found)
                    stable = hashlib.sha256(f"{category}:{label}:{relative}:{line}:{symbol}".encode("utf-8")).hexdigest()[:12]
                    candidates.append({
                        "candidate_id": stable,
                        "domain": category,
                        "pattern": label,
                        "path": relative,
                        "line": line,
                        "symbol": symbol,
                        "status": "candidate-unverified",
                    })
                    counters[category] += 1
                    matched += 1
        if stopped_early:
            break

    candidates.sort(key=lambda c: (c["domain"], c["path"], c["line"], c["pattern"]))
    return {
        "schema_version": 1,
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "project_name": root.name,
        "inventory_type": "heuristic-candidates-not-complete-inventory",
        "run_mode": "read-only-source-files",
        "scan_settings": {
            "include_tests": include_tests,
            "max_file_bytes": max_bytes,
            "max_files": max_files,
            "excluded_directory_names": sorted(SKIP_DIRS | (set() if include_tests else TEST_DIR_HINTS)),
        },
        "statistics": {
            "source_files_seen": min(seen_files, max_files),
            "files_scanned": counters["files_scanned"],
            "candidates_by_domain": dict(sorted((k, v) for k, v in counters.items() if k != "files_scanned")),
            "file_skips": dict(sorted(skips.items())),
            "truncated_by_max_files": stopped_early,
            "samples_of_unread_files": exclusions,
            "directory_errors": directory_errors,
            "incomplete": stopped_early or bool(directory_errors) or bool(skips),
        },
        "candidates": candidates,
        "warnings": [
            "Regex-based candidate discovery only; false positives and false negatives are expected.",
            "Results do not include actual DB schema, external job scheduler, runtime traffic, metrics or source-level call graph.",
            "An empty candidate list is NOT evidence that the project has no assets or risks.",
            "Do not treat a candidate as a confirmed defect without Agent review and evidence.",
        ],
    }


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").replace("\r", " ")


def write_report(payload: dict, out: Path, overwrite: bool = False) -> None:
    validate_output(out, overwrite)
    out.mkdir(parents=True, exist_ok=True)
    mode = "w" if overwrite else "x"
    with (out / "inventory.json").open(mode, encoding="utf-8") as report:
        report.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    st = payload["statistics"]
    lines = [
        "# 源码资产候选清单（非最终验收结论）", "",
        f"- 项目：`{markdown_escape(payload['project_name'])}`",
        f"- 文件扫描：{st['files_scanned']} / 已识别候选文件 {st['source_files_seen']}",
        f"- 候选记录总数：{len(payload['candidates'])}",
        f"- 触发文件数量上限：{'是' if st['truncated_by_max_files'] else '否'}",
        f"- 扫描不完整（上限、读取或遍历错误）：{'是' if st['incomplete'] else '否'}",
        f"- 无法遍历的目录数：{len(st['directory_errors'])}",
        "- 说明：启发式正则只能定位候选；不保证全量覆盖、无误报或风险存在。", "",
        "## 分类统计", "", "| 领域 | 数量 |", "| --- | ---: |",
    ]
    for category, num in st["candidates_by_domain"].items():
        lines.append(f"| {category} | {num} |")
    if not st["candidates_by_domain"]:
        lines.append("| （无候选） | 0 |")
    lines += ["", "## 候选明细", "", "| 领域 | 类型 | 源文件与行号 | 标识 |", "| --- | --- | --- | --- |"]
    for c in payload["candidates"]:
        lines.append(f"| {c['domain']} | {c['pattern']} | `{markdown_escape(c['path'])}:{c['line']}` | `{markdown_escape(c['symbol'])}` |")
    if not payload["candidates"]:
        lines.append("| — | — | — | — |")
    lines += ["", "## 扫描限制与人工待办", ""]
    for warning in payload["warnings"]:
        lines.append(f"- {warning}")
    lines += ["", f"- 跳过文件原因：`{json.dumps(st['file_skips'], ensure_ascii=False)}`",
              "- 需要用 ORM/真实 DB 表清单、调度平台注册清单、缓存配置、Trace 和运行指标进行交叉验证。", ""]
    if st["directory_errors"]:
        lines += ["## 未覆盖目录（遍历失败，扫描不完整）", ""]
        for error in st["directory_errors"]:
            lines.append(f"- `{markdown_escape(error['path'])}` ({error['error']}, errno={error['errno']})")
    if st["samples_of_unread_files"]:
        lines += ["## 未读取文件样例（最多 200 项）", ""]
        lines.extend(f"- `{markdown_escape(item)}`" for item in st["samples_of_unread_files"])
    with (out / "inventory.md").open(mode, encoding="utf-8") as report:
        report.write("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only heuristic asset inventory for an agent acceptance review")
    parser.add_argument("--project", required=True, type=Path, help="Project source directory")
    parser.add_argument("--out", required=True, type=Path, help="Explicitly chosen output directory; only these files are written")
    parser.add_argument("--max-file-bytes", type=int, default=2_000_000)
    parser.add_argument("--max-files", type=int, default=100_000)
    parser.add_argument("--include-tests", action="store_true", help="Also scan tests/examples/fixtures")
    parser.add_argument("--overwrite", action="store_true", help="Explicitly allow replacement of existing regular reports")
    args = parser.parse_args()
    root = args.project.expanduser().resolve()
    try:
        validate_output(args.out, args.overwrite)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    out = args.out.expanduser().resolve()
    if not root.is_dir():
        parser.error("--project must be an existing directory")
    if args.max_files < 1 or args.max_file_bytes < 1:
        parser.error("limits must be positive")
    if out == root or skip_path_inside(root, out):
        parser.error("--out may not be the project root or one of its ancestors")
    payload = scan(root, out, args.max_file_bytes, args.max_files, args.include_tests)
    try:
        write_report(payload, out, args.overwrite)
    except (OSError, ValueError) as exc:
        print(f"Cannot write output: {exc}", file=sys.stderr)
        return 2
    print(f"Scanned {payload['statistics']['files_scanned']} files, "
          f"{len(payload['candidates'])} unverified candidates. Output: {out}")
    if payload["statistics"]["incomplete"]:
        print("WARNING: scan limits or file/directory errors; inventory is incomplete (see report)", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
