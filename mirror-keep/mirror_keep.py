#!/usr/bin/env python3
"""Mirror Keep: incremental, hash-verified local copies for Windows and macOS."""
from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import tkinter as tk
import uuid
from datetime import datetime
from pathlib import Path, PurePosixPath
from tkinter import filedialog, messagebox, ttk
from urllib.parse import unquote, urlsplit

APP_TITLE = "Mirror Keep"
MANIFEST = ".mirror-keep-manifest.json"
BACKUP_ROOT = ".mirror-keep-backups"
VERSION_ROOT = ".mirror-keep-versions"
VERSION_ID_RE = re.compile(r"^\d{8}-\d{6}-\d{6}-[0-9a-f]{6}$")
VERSION_SPACE_MARGIN = 16 * 1024 * 1024
EXCLUDED_DIRS = {
    ".git", ".wrangler", "node_modules", ".next", ".cache", ".parcel-cache",
    ".turbo", "coverage", ".venv", "venv", "__pycache__", ".pytest_cache",
    ".mypy_cache", "backups", "backup", "tmp", "temp", ".idea", ".vscode",
    "dist", "build"
}
EXCLUDED_SUFFIXES = {
    ".pem", ".key", ".p12", ".pfx", ".keystore", ".jks", ".sqlite-wal",
    ".sqlite-shm", ".log", ".tmp", ".bak", ".backup"
}
SECRET_NAME = re.compile(
    r"(^|[._-])(?:\.env(?:\..*)?|auth[_-]?token|api[_-]?key|secret|credential|private[_-]?key)(?:[._-]|$)",
    re.I
)
TEXT_EXTENSIONS = {
    ".html", ".htm", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".json", ".css", ".xml", ".yaml", ".yml", ".md", ".txt", ".py",
    ".toml", ".webmanifest"
}
REF_RE = re.compile(
    r"""(?:src|href|poster|data-src)\s*=\s*['"]([^'"]+)['"]|"""
    r"""url\(\s*['"]?([^'")]+)|@import\s+['"]([^'"]+)['"]|"""
    r"""(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]""",
    re.I
)
URL_RE = re.compile(r"https?://[A-Za-z0-9.-]+(?::\d+)?", re.I)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_rel(raw: str) -> Path:
    """Reject absolute/traversal paths from manifests."""
    p = PurePosixPath(str(raw).replace("\\", "/"))
    if p.is_absolute() or not p.parts or any(part in ("", ".", "..") for part in p.parts):
        raise ValueError(f"不正な相対パス: {raw}")
    return Path(*p.parts)


def excluded(rel: Path) -> bool:
    if any(part in EXCLUDED_DIRS for part in rel.parts):
        return True
    if rel.suffix.lower() in EXCLUDED_SUFFIXES or re.search(r"\.(?:bak|backup)(?:[-_.]|$)", rel.name, re.I):
        return True
    if SECRET_NAME.search(rel.name):
        return True
    if rel.name.lower() in {"auth_token.local.txt", "credentials.json", "secrets.json"}:
        return True
    return False


def collect_files(source: Path):
    rows = []
    skipped_symlinks = 0
    for path in source.rglob("*"):
        try:
            if path.is_symlink():
                skipped_symlinks += 1
                continue
            if not path.is_file():
                continue
            rel = path.relative_to(source)
            if excluded(rel):
                continue
            rows.append((path, rel, path.stat().st_size))
        except (OSError, PermissionError):
            continue
    rows.sort(key=lambda row: row[1].as_posix().casefold())
    return rows, skipped_symlinks


def analyze_refs(source: Path, rows):
    known = {rel.as_posix() for _, rel, _ in rows}
    local, missing, external = set(), set(), set()
    for path, rel, size in rows:
        if size > 5 * 1024 * 1024 or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in URL_RE.finditer(text):
            u = urlsplit(m.group(0))
            if u.scheme and u.netloc:
                external.add(f"{u.scheme}://{u.netloc}")
        for m in REF_RE.finditer(text):
            raw = next((x for x in m.groups() if x), "").strip()
            if not raw or raw.startswith(("#", "data:", "blob:", "mailto:", "tel:", "javascript:")):
                continue
            u = urlsplit(raw)
            if u.scheme or u.netloc:
                if u.scheme in ("http", "https") and u.netloc:
                    external.add(f"{u.scheme}://{u.netloc}")
                continue
            candidate = Path(unquote(u.path))
            if candidate.is_absolute():
                candidate = Path(str(candidate).lstrip("/"))
            else:
                candidate = rel.parent / candidate
            normalized = Path(os.path.normpath(str(candidate))).as_posix()
            if normalized in known:
                local.add(normalized)
            elif (Path(normalized) / "index.html").as_posix() in known:
                local.add((Path(normalized) / "index.html").as_posix())
            elif normalized not in ("", ".") and not normalized.startswith("../"):
                missing.add(f"{rel.as_posix()} -> {raw}")
    return sorted(local), sorted(external), sorted(missing)


def atomic_copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=".mk-", dir=str(dst.parent))
    os.close(fd)
    temp = Path(temp_name)
    try:
        shutil.copy2(src, temp)
        os.replace(temp, dst)
    finally:
        if temp.exists():
            temp.unlink(missing_ok=True)


def read_manifest(path: Path):
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("format") != "mirror-keep-v2" or not isinstance(data.get("files"), dict):
        raise ValueError(f"認識できないマニフェスト: {path}")
    return data


def project_key(source: Path) -> str:
    clean = re.sub(r"[^A-Za-z0-9._-]+", "-", source.name).strip(".-_") or "app"
    suffix = hashlib.sha256(str(source.resolve()).encode("utf-8")).hexdigest()[:8]
    return f"{clean[:48]}-{suffix}"


def update_project(source: Path, destination_root: Path):
    source = source.resolve()
    destination_root = destination_root.resolve()
    if not source.is_dir():
        raise ValueError(f"元フォルダーがありません: {source}")
    if source == destination_root or source in destination_root.parents or destination_root in source.parents:
        raise ValueError("元フォルダーと保存先は別の場所にしてください。")

    key = project_key(source)
    target = destination_root / key
    target.mkdir(parents=True, exist_ok=True)
    manifest_path = target / MANIFEST
    old = read_manifest(manifest_path)
    rows, skipped_symlinks = collect_files(source)
    local_refs, external_hosts, missing_refs = analyze_refs(source, rows)
    new_map = {}
    changed = added = unchanged = deleted = 0
    backup_stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup_dir = destination_root / BACKUP_ROOT / key / backup_stamp
    backup_entries = []
    had_old_manifest = manifest_path.exists()

    if had_old_manifest:
        backup_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(manifest_path, backup_dir / "previous-manifest.json")

    old_files = old.get("files", {}) if old else {}
    source_paths = {rel.as_posix() for _, rel, _ in rows}

    def flush_backup_index():
        if not backup_entries:
            return
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_record = {
            "format": "mirror-keep-backup-v1",
            "created": datetime.now().astimezone().isoformat(timespec="seconds"),
            "projectKey": key,
            "hadPreviousManifest": had_old_manifest,
            "entries": backup_entries
        }
        temp_index = backup_dir / "backup-manifest.json.tmp"
        temp_index.write_text(json.dumps(backup_record, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(temp_index, backup_dir / "backup-manifest.json")

    for src, rel, size in rows:
        rel_text = rel.as_posix()
        digest = sha256_file(src)
        previous = old_files.get(rel_text, {})
        dest = target / rel
        same = previous.get("sha256") == digest and dest.is_file() and sha256_file(dest) == digest
        if same:
            unchanged += 1
        else:
            kind = "restore" if dest.is_file() else "remove"
            if dest.is_file():
                backup_file = backup_dir / "files" / rel
                backup_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(dest, backup_file)
                backup_entries.append({"path": rel_text, "action": "restore"})
            else:
                backup_entries.append({"path": rel_text, "action": "remove"})
            flush_backup_index()
            atomic_copy(src, dest)
            if sha256_file(dest) != digest:
                raise IOError(f"コピー後のSHA-256が一致しません: {rel_text}")
            if previous:
                changed += 1
            else:
                added += 1
        new_map[rel_text] = {
            "sha256": digest,
            "bytes": size,
            "modified_ns": src.stat().st_mtime_ns
        }

    for rel_text in sorted(set(old_files) - source_paths):
        rel = safe_rel(rel_text)
        dest = target / rel
        if dest.is_file():
            backup_file = backup_dir / "files" / rel
            backup_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dest, backup_file)
            backup_entries.append({"path": rel_text, "action": "restore"})
            flush_backup_index()
            dest.unlink()
            deleted += 1

    manifest = {
        "format": "mirror-keep-v2",
        "appName": source.name,
        "source": str(source),
        "updated": datetime.now().astimezone().isoformat(timespec="seconds"),
        "fileCount": len(new_map),
        "totalBytes": sum(v["bytes"] for v in new_map.values()),
        "files": new_map,
        "analysis": {
            "localReferences": local_refs,
            "externalHosts": external_hosts,
            "unresolvedReferences": missing_refs,
            "staticAnalysisNote": "動的import、実行時URL生成、サーバー側処理は静的解析だけでは完全に追跡できません。"
        }
    }
    temp_manifest = target / (MANIFEST + ".tmp")
    temp_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp_manifest, manifest_path)

    if backup_entries:
        flush_backup_index()
    else:
        shutil.rmtree(backup_dir, ignore_errors=True)

    return {
        "key": key, "target": target, "added": added, "changed": changed,
        "deleted": deleted, "unchanged": unchanged, "files": len(new_map),
        "bytes": manifest["totalBytes"], "skippedSymlinks": skipped_symlinks,
        "externalHosts": external_hosts, "missingRefs": missing_refs
    }


def verify_project(target: Path):
    manifest_path = target / MANIFEST
    manifest = read_manifest(manifest_path)
    if not manifest:
        raise ValueError(f"マニフェストがありません: {target}")
    errors = []
    expected = set(manifest["files"])
    for rel_text, entry in manifest["files"].items():
        rel = safe_rel(rel_text)
        path = target / rel
        if not path.is_file():
            errors.append(f"missing: {rel_text}")
        elif sha256_file(path) != entry.get("sha256"):
            errors.append(f"hash mismatch: {rel_text}")
    actual = set()
    for p in target.rglob("*"):
        if p.is_file() and p.name != MANIFEST and not p.name.endswith(".tmp"):
            actual.add(p.relative_to(target).as_posix())
    extras = sorted(actual - expected)
    return {"ok": not errors and not extras, "checked": len(expected), "errors": errors, "extras": extras}


def restore_latest(destination_root: Path, key: str):
    project_backups = destination_root / BACKUP_ROOT / key
    if not project_backups.is_dir():
        raise ValueError("復元できるバックアップがありません。")
    candidates = sorted(
        [p for p in project_backups.iterdir() if p.is_dir() and (p / "backup-manifest.json").is_file()],
        key=lambda p: p.name
    )
    if not candidates:
        raise ValueError("復元できるバックアップがありません。")
    backup_dir = candidates[-1]
    record = json.loads((backup_dir / "backup-manifest.json").read_text(encoding="utf-8"))
    target = destination_root / key
    for entry in record.get("entries", []):
        rel = safe_rel(entry["path"])
        dest = target / rel
        if entry["action"] == "restore":
            backup_file = backup_dir / "files" / rel
            if not backup_file.is_file():
                raise FileNotFoundError(f"バックアップファイルがありません: {rel}")
            atomic_copy(backup_file, dest)
        elif entry["action"] == "remove":
            if dest.is_file():
                dest.unlink()
    previous_manifest = backup_dir / "previous-manifest.json"
    if record.get("hadPreviousManifest") and previous_manifest.is_file():
        shutil.copy2(previous_manifest, target / MANIFEST)
    elif not record.get("hadPreviousManifest"):
        (target / MANIFEST).unlink(missing_ok=True)
    return backup_dir


# ---------------------------------------------------------------------------
# バージョン管理（追加機能）
# 既存の差分バックアップ（BACKUP_ROOT）とは別機能として共存する。
# 保存先: <保存先>/.mirror-keep-versions/<アプリキー>/<日時-識別子>/
# 保存版は完全スナップショットで、このプログラムは保存版を自動削除しない。
# ---------------------------------------------------------------------------
class VersionSpaceError(Exception):
    """空き容量不足。削除候補を提示するだけで、何も削除しない。"""

    def __init__(self, message, candidates):
        super().__init__(message)
        self.candidates = candidates


def format_size(num_bytes):
    value = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.0f} {unit}" if unit == "B" else f"{value:.2f} {unit}"
        value /= 1024


def new_version_id():
    return datetime.now().strftime("%Y%m%d-%H%M%S-%f") + "-" + uuid.uuid4().hex[:6]


def check_version_id(version_id):
    if not isinstance(version_id, str) or not VERSION_ID_RE.match(version_id):
        raise ValueError(f"不正なバージョンID: {version_id}")
    return version_id


def versions_root(destination_root: Path, key: str) -> Path:
    return destination_root / VERSION_ROOT / key


def scan_current_files(target: Path):
    """ミラーフォルダーの実際の中身（マニフェストを信用しない）を走査する。"""
    files = {}
    for p in sorted(target.rglob("*")):
        if p.is_symlink() or not p.is_file():
            continue
        if p.name == MANIFEST or p.name.endswith(".tmp"):
            continue
        st = p.stat()
        files[p.relative_to(target).as_posix()] = {
            "sha256": sha256_file(p), "bytes": st.st_size, "modified_ns": st.st_mtime_ns
        }
    return files


def list_versions(destination_root: Path, key: str):
    """保存版を古い順に返す。壊れた保存版も error 付きで一覧に残す。"""
    vroot = versions_root(destination_root, key)
    if not vroot.is_dir():
        return []
    rows = []
    for p in sorted(vroot.iterdir(), key=lambda x: x.name):
        if not p.is_dir() or not VERSION_ID_RE.match(p.name):
            continue  # .tmp-* などの作業フォルダーは正式な保存版ではない
        info = {"id": p.name, "path": p, "created": "", "fileCount": 0, "totalBytes": 0,
                "kind": "", "verifiedAtSave": False, "error": None}
        try:
            m = read_manifest(p / MANIFEST)
            if not m:
                raise ValueError("マニフェストがありません")
            meta = m.get("version") or {}
            info.update(
                created=meta.get("created", ""), fileCount=len(m["files"]),
                totalBytes=sum(int(v.get("bytes", 0)) for v in m["files"].values()),
                kind=meta.get("kind", ""), verifiedAtSave=bool(meta.get("verifiedAtSave"))
            )
        except Exception as exc:
            info["error"] = str(exc)
        rows.append(info)
    for number, info in enumerate(rows, 1):
        info["number"] = number
    return rows


def suggest_deletion_candidates(destination_root: Path, key: str, bytes_needed: int):
    """削除候補（古い順、最新版は除く）を返すだけ。実際の削除は一切しない。"""
    out, freed = [], 0
    for v in list_versions(destination_root, key)[:-1]:
        if freed >= bytes_needed:
            break
        out.append(v)
        freed += v["totalBytes"]
    return out


def save_version(destination_root: Path, key: str, kind="update", from_disk=False, note=""):
    """ミラーの完全スナップショットを一時フォルダーに作り、検証後に正式登録する。

    from_disk=False: ミラーのマニフェストを基準に保存（更新直後用）。
    from_disk=True : 現在の実ファイルを走査して保存（復元前の保護用。ミラーが壊れていても保存できる）。
    """
    destination_root = destination_root.resolve()
    target = destination_root / key
    if not target.is_dir():
        raise ValueError(f"保存するミラーがありません: {target}")
    manifest_path = target / MANIFEST
    base = read_manifest(manifest_path) if manifest_path.is_file() else None
    if from_disk:
        files = scan_current_files(target)
    else:
        if not base:
            raise ValueError(f"マニフェストがありません: {target}")
        files = {
            rel_text: {"sha256": e["sha256"], "bytes": e["bytes"], "modified_ns": e.get("modified_ns")}
            for rel_text, e in base["files"].items()
        }
    for rel_text in files:
        safe_rel(rel_text)
    total = sum(e["bytes"] for e in files.values())

    vroot = versions_root(destination_root, key)
    vroot.mkdir(parents=True, exist_ok=True)
    needed = total + VERSION_SPACE_MARGIN
    free = shutil.disk_usage(vroot).free
    if free < needed:
        candidates = suggest_deletion_candidates(destination_root, key, needed - free)
        raise VersionSpaceError(
            f"空き容量が不足しています（必要 {format_size(needed)} / 空き {format_size(free)}）。"
            "保存版は自動削除しません。不要な保存版を自分で判断して整理してください。",
            candidates
        )

    version_id = new_version_id()
    final = vroot / version_id
    temp = vroot / (".tmp-" + version_id)
    if final.exists() or temp.exists():
        raise FileExistsError(f"同じIDの保存版が既にあります: {version_id}")
    created = datetime.now().astimezone().isoformat(timespec="seconds")
    base = base or {}
    manifest = {
        "format": "mirror-keep-v2",
        "appName": base.get("appName", key),
        "source": base.get("source", ""),
        "updated": base.get("updated", created),
        "fileCount": len(files),
        "totalBytes": total,
        "files": files,
        "analysis": base.get("analysis", {}),
        "version": {
            "id": version_id, "projectKey": key, "kind": kind,
            "created": created, "note": note, "verifiedAtSave": True
        }
    }
    try:
        temp.mkdir()
        for rel_text in sorted(files):
            rel = safe_rel(rel_text)
            src = target / rel
            if not src.is_file():
                raise FileNotFoundError(f"保存元のファイルがありません: {rel_text}")
            dst = temp / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        (temp / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        check = verify_project(temp)  # 保存後にSHA-256で全ファイルを再確認
        if not check["ok"]:
            raise IOError("保存後のSHA-256検証に失敗しました: " + "; ".join((check["errors"] + check["extras"])[:5]))
        os.replace(temp, final)  # ここで初めて正式な保存版になる
    except BaseException:
        shutil.rmtree(temp, ignore_errors=True)  # 自分が作った不完全な作業フォルダーだけを片付ける
        raise
    return {"id": version_id, "path": final, "files": len(files), "bytes": total, "kind": kind}


def verify_version(destination_root: Path, key: str, version_id: str):
    check_version_id(version_id)
    vdir = versions_root(destination_root.resolve(), key) / version_id
    if not vdir.is_dir():
        raise ValueError(f"保存版がありません: {version_id}")
    return verify_project(vdir)


def _tree_matches_snapshot(tree: Path, files: dict) -> bool:
    seen = {}
    for p in tree.rglob("*"):
        if p.is_symlink():
            return False
        if not p.is_file() or p.name == MANIFEST or p.name.endswith(".tmp"):
            continue
        seen[p.relative_to(tree).as_posix()] = p.stat().st_size
    return seen == {k: v["bytes"] for k, v in files.items()}


def restore_version(destination_root: Path, key: str, version_id: str):
    """選択した保存版をミラーフォルダーへ反映する。失敗時は元の状態に戻す。元アプリのフォルダーには触れない。"""
    destination_root = destination_root.resolve()
    check_version_id(version_id)
    vroot = versions_root(destination_root, key)
    vdir = vroot / version_id
    if not vdir.is_dir():
        raise ValueError(f"保存版がありません: {version_id}")
    manifest = read_manifest(vdir / MANIFEST)
    if not manifest:
        raise ValueError(f"保存版のマニフェストがありません: {version_id}")
    meta = manifest.get("version") or {}
    if meta.get("id") != version_id or meta.get("projectKey") != key:
        raise ValueError("保存版のマニフェストが、このアプリ/IDと一致しません。")
    target = destination_root / key

    # 1. 現在の使用状態を先に完全保存（失敗したら何も変えずに中止）
    pre = None
    if target.is_dir():
        pre = save_version(destination_root, key, kind="pre-restore", from_disk=True,
                           note=f"復元前の自動保存（復元先: {version_id}）")

    # 2. 選択した保存版のSHA-256を確認
    check = verify_project(vdir)
    if not check["ok"]:
        detail = "; ".join((check["errors"] + check["extras"])[:5])
        raise IOError(f"選択した保存版のSHA-256検証に失敗したため復元を中止しました（ミラーは変更していません）: {detail}")

    # 3-4. 一時フォルダーへ展開して整合性を確認
    token = uuid.uuid4().hex[:8]
    stage = vroot / f".tmp-restore-{token}"
    aside = vroot / f".tmp-old-{token}"
    try:
        stage.mkdir(parents=True)
        for rel_text in manifest["files"]:
            rel = safe_rel(rel_text)
            dst = stage / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(vdir / rel, dst)
        restored = {k: v for k, v in manifest.items() if k != "version"}
        restored["restoredFrom"] = {
            "id": version_id, "restoredAt": datetime.now().astimezone().isoformat(timespec="seconds")
        }
        (stage / MANIFEST).write_text(json.dumps(restored, ensure_ascii=False, indent=2), encoding="utf-8")
        check = verify_project(stage)
        if not check["ok"]:
            raise IOError("展開後のSHA-256検証に失敗しました: " + "; ".join((check["errors"] + check["extras"])[:5]))
    except BaseException:
        shutil.rmtree(stage, ignore_errors=True)
        raise

    # 5-6. 切り替え。途中で失敗したら元のフォルダーへ戻す
    moved = False
    try:
        if target.exists():
            os.replace(target, aside)
            moved = True
        os.replace(stage, target)
    except BaseException:
        try:
            if moved and not target.exists() and aside.exists():
                os.replace(aside, target)
        finally:
            shutil.rmtree(stage, ignore_errors=True)
        raise

    # 切替前の内容は復元前の保存版に完全保存済み。内容が一致する場合だけ作業用の退避コピーを片付ける。
    kept = None
    if moved:
        pre_files = read_manifest(vroot / pre["id"] / MANIFEST)["files"] if pre else None
        if pre_files is not None and _tree_matches_snapshot(aside, pre_files):
            shutil.rmtree(aside, ignore_errors=True)
        else:
            kept = aside
    return {
        "restored": version_id, "preRestoreVersion": pre["id"] if pre else None,
        "files": len(manifest["files"]), "bytes": sum(e["bytes"] for e in manifest["files"].values()),
        "keptOldCopy": str(kept) if kept else None
    }


def update_project_with_version(source: Path, destination_root: Path):
    """既存の update_project を変更せず実行し、続けて完全な保存版を作る。

    保存版の作成に失敗しても、完了済みのミラー更新は取り消さない（結果に versionError を載せる）。
    """
    result = update_project(source, destination_root)
    result.update(versionId=None, versionError=None, versionCandidates=[])
    try:
        result["versionId"] = save_version(destination_root.resolve(), result["key"])["id"]
    except VersionSpaceError as exc:
        result["versionError"] = str(exc)
        result["versionCandidates"] = exc.candidates
    except Exception as exc:
        result["versionError"] = f"{type(exc).__name__}: {exc}"
    return result


class VersionDialog(tk.Toplevel):
    KIND_LABEL = {"update": "更新", "pre-restore": "復元前"}

    def __init__(self, parent, destination, key, app_name, on_status=None):
        super().__init__(parent)
        self.destination = destination
        self.key = key
        self.app_name = app_name
        self.on_status = on_status
        self.versions = []
        self.verified = {}
        self.status = tk.StringVar()
        self.title(f"バージョン管理 — {app_name}")
        self.geometry("880x460")
        self.minsize(720, 380)
        self._build()
        self.refresh()
        self.transient(parent)
        self.grab_set()

    def _build(self):
        outer = ttk.Frame(self, padding=14)
        outer.pack(fill="both", expand=True)
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(2, weight=1)
        ttk.Label(outer, text=f"アプリ: {self.app_name}（{self.key}）").grid(row=0, column=0, sticky="w")
        ttk.Label(
            outer, text=f"保存場所: {versions_root(self.destination, self.key)}", wraplength=830
        ).grid(row=1, column=0, columnspan=2, sticky="w", pady=(2, 8))
        columns = ("no", "created", "files", "size", "state", "kind")
        self.tree = ttk.Treeview(outer, columns=columns, show="headings", selectmode="browse")
        for name, text, width in (
            ("no", "版", 110), ("created", "保存日時", 170), ("files", "ファイル数", 80),
            ("size", "合計容量", 100), ("state", "検証状態", 150), ("kind", "種別", 80)
        ):
            self.tree.heading(name, text=text)
            self.tree.column(name, width=width, anchor="w")
        self.tree.grid(row=2, column=0, sticky="nsew")
        scroll = ttk.Scrollbar(outer, orient="vertical", command=self.tree.yview)
        scroll.grid(row=2, column=1, sticky="ns")
        self.tree.configure(yscrollcommand=scroll.set)

        buttons = ttk.Frame(outer)
        buttons.grid(row=3, column=0, columnspan=2, sticky="w", pady=10)
        ttk.Button(buttons, text="選択版を検証", command=self.verify_selected).pack(side="left", padx=(0, 6))
        ttk.Button(buttons, text="選択版に復元…", command=self.restore_selected).pack(side="left", padx=6)
        ttk.Button(buttons, text="保存場所を開く", command=self.open_folder).pack(side="left", padx=6)
        ttk.Button(buttons, text="再読込", command=self.refresh).pack(side="left", padx=6)
        ttk.Button(buttons, text="閉じる", command=self.destroy).pack(side="left", padx=6)

        ttk.Label(outer, textvariable=self.status, wraplength=830).grid(row=4, column=0, columnspan=2, sticky="ew")
        ttk.Label(
            outer,
            text="保存版は自動では削除されません。容量が不足した場合は削除候補を表示するだけで、削除はご自身で判断して行ってください。",
            wraplength=830
        ).grid(row=5, column=0, columnspan=2, sticky="ew", pady=(8, 0))

    def state_text(self, v):
        if v["id"] in self.verified:
            return self.verified[v["id"]]
        if v["error"]:
            return "異常（マニフェスト不明）"
        return "保存時OK" if v["verifiedAtSave"] else "未検証"

    def refresh(self, reselect=None):
        self.versions = list_versions(self.destination, self.key)
        self.tree.delete(*self.tree.get_children())
        latest = self.versions[-1]["id"] if self.versions else None
        for v in reversed(self.versions):
            label = f"#{v['number']}" + ("（最新）" if v["id"] == latest else "")
            created = (v["created"] or v["id"]).replace("T", " ")[:19]
            self.tree.insert("", "end", iid=v["id"], values=(
                label, created, v["fileCount"], format_size(v["totalBytes"]),
                self.state_text(v), self.KIND_LABEL.get(v["kind"], v["kind"] or "-")
            ))
        if reselect and self.tree.exists(reselect):
            self.tree.selection_set(reselect)
        if self.versions:
            self.status.set(f"{len(self.versions)} 件の保存版があります。一覧から選んで操作してください。")
        else:
            self.status.set("保存版はまだありません。「② 差分更新」を実行すると作成されます。")

    def selected_version(self):
        selection = self.tree.selection()
        if not selection:
            raise ValueError("一覧から保存版を1つ選択してください。")
        for v in self.versions:
            if v["id"] == selection[0]:
                return v
        raise ValueError("選択した保存版が見つかりません。再読込してください。")

    def verify_selected(self):
        try:
            v = self.selected_version()
            result = verify_version(self.destination, self.key, v["id"])
            stamp = datetime.now().strftime("%H:%M")
            self.verified[v["id"]] = ("検証OK " if result["ok"] else "検証NG ") + stamp
            self.refresh(reselect=v["id"])
            if result["ok"]:
                messagebox.showinfo(APP_TITLE, f"#{v['number']} のSHA-256検証はすべて一致しました。（{result['checked']} files）", parent=self)
            else:
                lines = result["errors"][:15] + [("extra: " + x) for x in result["extras"][:15]]
                messagebox.showwarning(APP_TITLE, "検証で不一致が見つかりました。\n\n" + "\n".join(lines), parent=self)
        except Exception as exc:
            messagebox.showerror(APP_TITLE, str(exc), parent=self)

    def restore_selected(self):
        try:
            v = self.selected_version()
            latest = self.versions[-1]["id"] if self.versions else None
            older = "\n※ これは最新ではない、古い保存版です。" if v["id"] != latest else ""
            created = (v["created"] or v["id"]).replace("T", " ")[:19]
            ok = messagebox.askyesno(
                APP_TITLE,
                f"次の保存版に切り替えます。\n\n版: #{v['number']}\n保存日時: {created}\n"
                f"ファイル数: {v['fileCount']} / 容量: {format_size(v['totalBytes'])}{older}\n\n"
                "・切替前に、現在の状態を新しい保存版として完全保存します\n"
                "・保存版のSHA-256を確認してから切り替えます\n"
                "・途中で失敗した場合は元の状態に戻ります\n"
                "・元アプリのフォルダーは変更されません\n\n続けますか？",
                icon="warning", default="no", parent=self
            )
            if not ok:
                return
            self.config(cursor="watch")
            self.update_idletasks()
            try:
                result = restore_version(self.destination, self.key, v["id"])
            finally:
                self.config(cursor="")
            self.refresh()
            message = (
                f"#{v['number']} に切り替えました（{result['files']} files）。\n"
                f"切替前の状態は保存版として保護済みです。\n\n"
                "注意: 次回の「差分更新」では、元アプリのフォルダーの現在の内容に再同期されます。"
            )
            if result["keptOldCopy"]:
                message += f"\n\n作業用の退避コピーを残しています:\n{result['keptOldCopy']}"
            if self.on_status:
                self.on_status(f"{self.app_name}: 保存版 #{v['number']} に切り替えました。")
            messagebox.showinfo(APP_TITLE, message, parent=self)
        except Exception as exc:
            self.refresh()
            messagebox.showerror(APP_TITLE, str(exc), parent=self)

    def open_folder(self):
        path = versions_root(self.destination, self.key)
        if not path.is_dir():
            messagebox.showinfo(APP_TITLE, f"まだ保存版フォルダーがありません:\n{path}", parent=self)
            return
        try:
            if os.name == "nt":
                os.startfile(str(path))  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.run(["open", str(path)], check=False)
            else:
                subprocess.run(["xdg-open", str(path)], check=False)
        except Exception:
            messagebox.showinfo(APP_TITLE, f"保存場所:\n{path}", parent=self)


class MirrorKeepApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Mirror Keep — Windows / macOS")
        self.root.geometry("900x640")
        self.root.minsize(720, 500)
        self.projects = []
        self.destination = tk.StringVar()
        self.status = tk.StringVar(value="ミラー対象のアプリを追加してください。")
        self._build()

    def _build(self):
        outer = ttk.Frame(self.root, padding=14)
        outer.pack(fill="both", expand=True)
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(2, weight=1)

        ttk.Label(outer, text="保存先フォルダー").grid(row=0, column=0, sticky="w")
        row = ttk.Frame(outer)
        row.grid(row=1, column=0, sticky="ew", pady=(4, 10))
        row.columnconfigure(0, weight=1)
        ttk.Entry(row, textvariable=self.destination).grid(row=0, column=0, sticky="ew")
        ttk.Button(row, text="参照…", command=self.choose_destination).grid(row=0, column=1, padx=(8, 0))

        actions = ttk.Frame(outer)
        actions.grid(row=2, column=0, sticky="nsew")
        actions.columnconfigure(0, weight=1)
        actions.rowconfigure(1, weight=1)
        buttons = ttk.Frame(actions)
        buttons.grid(row=0, column=0, sticky="w", pady=(0, 8))
        ttk.Button(buttons, text="アプリを追加", command=self.add_project).pack(side="left", padx=(0, 6))
        ttk.Button(buttons, text="選択を削除", command=self.remove_project).pack(side="left", padx=6)
        ttk.Button(buttons, text="全選択", command=lambda: self.set_all(True)).pack(side="left", padx=6)
        ttk.Button(buttons, text="全解除", command=lambda: self.set_all(False)).pack(side="left", padx=6)

        self.tree = ttk.Treeview(actions, columns=("use", "path", "state"), show="headings", selectmode="browse")
        self.tree.heading("use", text="今回")
        self.tree.heading("path", text="元アプリのフォルダー")
        self.tree.heading("state", text="状態")
        self.tree.column("use", width=55, anchor="center", stretch=False)
        self.tree.column("path", width=540)
        self.tree.column("state", width=170)
        self.tree.grid(row=1, column=0, sticky="nsew")
        self.tree.bind("<Button-1>", self.toggle_row)

        ops = ttk.Frame(outer)
        ops.grid(row=3, column=0, sticky="w", pady=10)
        ttk.Button(ops, text="① 構成を調査", command=self.scan).pack(side="left", padx=(0, 6))
        ttk.Button(ops, text="② 差分更新", command=self.update).pack(side="left", padx=6)
        ttk.Button(ops, text="③ SHA-256検証", command=self.verify).pack(side="left", padx=6)
        ttk.Button(ops, text="④ 最新バックアップを復元", command=self.restore).pack(side="left", padx=6)
        ttk.Button(ops, text="⑤ バージョン管理…", command=self.open_versions).pack(side="left", padx=6)

        ttk.Label(outer, textvariable=self.status, wraplength=850).grid(row=4, column=0, sticky="ew")
        ttk.Label(
            outer,
            text="選択したアプリだけを更新します。初回は全コピー、2回目以降は変更分のみ。秘密情報・Git履歴・キャッシュ類は除外します。",
            wraplength=850
        ).grid(row=5, column=0, sticky="ew", pady=(8, 0))

    def choose_destination(self):
        p = filedialog.askdirectory(title="Mirror Keepの保存先")
        if p:
            self.destination.set(p)

    def add_project(self):
        p = filedialog.askdirectory(title="ミラーするアプリのフォルダー")
        if not p:
            return
        path = Path(p).resolve()
        if any(x["path"] == path for x in self.projects):
            return
        self.projects.append({"path": path, "selected": True})
        self.refresh()

    def remove_project(self):
        item = self.tree.selection()
        if not item:
            return
        index = self.tree.index(item[0])
        if 0 <= index < len(self.projects):
            self.projects.pop(index)
        self.refresh()

    def set_all(self, selected):
        for item in self.projects:
            item["selected"] = selected
        self.refresh()

    def toggle_row(self, event):
        row = self.tree.identify_row(event.y)
        col = self.tree.identify_column(event.x)
        if row and col == "#1":
            index = self.tree.index(row)
            if 0 <= index < len(self.projects):
                self.projects[index]["selected"] = not self.projects[index]["selected"]
                self.refresh()
            return "break"

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        for item in self.projects:
            path = item["path"]
            state = "選択中" if item["selected"] else "対象外"
            self.tree.insert("", "end", values=("✓" if item["selected"] else "—", str(path), state))

    def selected_projects(self):
        return [x["path"] for x in self.projects if x["selected"]]

    def destination_path(self):
        value = self.destination.get().strip()
        if not value:
            raise ValueError("保存先フォルダーを選択してください。")
        return Path(value).expanduser().resolve()

    def current_project(self):
        """バージョン管理の対象: 行をクリックして選んだアプリ。無ければ「今回」が1つだけの場合のそのアプリ。"""
        selection = self.tree.selection()
        if selection:
            index = self.tree.index(selection[0])
            if 0 <= index < len(self.projects):
                return self.projects[index]["path"]
        chosen = self.selected_projects()
        if len(chosen) == 1:
            return chosen[0]
        raise ValueError("バージョンを確認するアプリの行を1つクリックして選択してください。")

    def open_versions(self):
        try:
            dest = self.destination_path()
            source = self.current_project()
            VersionDialog(self.root, dest, project_key(source), source.name, self.status.set)
        except Exception as exc:
            messagebox.showerror(APP_TITLE, str(exc))

    def scan(self):
        try:
            dest = self.destination_path()
            selected = self.selected_projects()
            if not selected:
                raise ValueError("今回ミラーするアプリを選択してください。")
            summaries = []
            for source in selected:
                if source == dest or source in dest.parents or dest in source.parents:
                    raise ValueError(f"元フォルダーと保存先が重なっています: {source}")
                rows, links = collect_files(source)
                local, hosts, missing = analyze_refs(source, rows)
                total = sum(size for _, _, size in rows)
                summaries.append(f"{source.name}: {len(rows)} files / {total/1048576:.2f} MB / local refs {len(local)} / external hosts {len(hosts)} / unresolved {len(missing)} / skipped symlinks {links}")
            self.status.set("\n".join(summaries))
        except Exception as exc:
            messagebox.showerror(APP_TITLE, str(exc))

    def update(self):
        try:
            dest = self.destination_path()
            selected = self.selected_projects()
            if not selected:
                raise ValueError("今回ミラーするアプリを選択してください。")
            results = [update_project_with_version(source, dest) for source in selected]
            lines = []
            warnings = []
            for r in results:
                lines.append(
                    f"{r['key']}: 追加 {r['added']} / 変更 {r['changed']} / 削除 {r['deleted']} / 据置 {r['unchanged']} / 合計 {r['files']} files ({r['bytes']/1048576:.2f} MB)"
                )
                if r["versionError"]:
                    warnings.append(f"{r['key']}: 差分更新は完了しましたが、バージョン保存に失敗しました。\n  {r['versionError']}")
                    for c in r["versionCandidates"][:5]:
                        warnings.append(f"  削除候補（自動削除はしません）: #{c['number']} {c['path']} ({format_size(c['totalBytes'])})")
                else:
                    lines.append(f"  └ 保存版を作成: {r['versionId']}")
            self.status.set("\n".join(lines + warnings))
            if warnings:
                messagebox.showwarning(APP_TITLE, "差分更新が完了しました。\n\n" + "\n".join(lines) + "\n\n" + "\n".join(warnings))
            else:
                messagebox.showinfo(APP_TITLE, "差分更新が完了しました。\n\n" + "\n".join(lines))
        except Exception as exc:
            messagebox.showerror(APP_TITLE, str(exc))
            self.status.set("更新を中断しました。")

    def verify(self):
        try:
            dest = self.destination_path()
            selected = self.selected_projects()
            if not selected:
                raise ValueError("検証するアプリを選択してください。")
            lines = []
            failed = False
            for source in selected:
                target = dest / project_key(source)
                result = verify_project(target)
                failed = failed or not result["ok"]
                lines.append(f"{source.name}: {'OK' if result['ok'] else 'NG'} / checked {result['checked']} / errors {len(result['errors'])} / extras {len(result['extras'])}")
                lines.extend(result["errors"][:10])
                lines.extend(("extra: " + x) for x in result["extras"][:10])
            self.status.set("\n".join(lines))
            if failed:
                messagebox.showwarning(APP_TITLE, "検証で不一致が見つかりました。\n\n" + "\n".join(lines[:30]))
            else:
                messagebox.showinfo(APP_TITLE, "選択したミラーのSHA-256検証はすべて一致しました。\n\n" + "\n".join(lines))
        except Exception as exc:
            messagebox.showerror(APP_TITLE, str(exc))

    def restore(self):
        try:
            dest = self.destination_path()
            selected = self.selected_projects()
            if not selected:
                raise ValueError("復元するアプリを選択してください。")
            if not messagebox.askyesno(APP_TITLE, "最新バックアップ時点の状態に戻します。現在のミラー内容は上書きされます。続けますか？"):
                return
            lines = []
            for source in selected:
                key = project_key(source)
                restored = restore_latest(dest, key)
                lines.append(f"{source.name}: {restored.name} から復元")
            self.status.set("\n".join(lines))
            messagebox.showinfo(APP_TITLE, "復元が完了しました。\n\n" + "\n".join(lines))
        except Exception as exc:
            messagebox.showerror(APP_TITLE, str(exc))


def main():
    root = tk.Tk()
    MirrorKeepApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
