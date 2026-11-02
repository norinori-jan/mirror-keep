#!/usr/bin/env python3
"""Mirror Keep: incremental, hash-verified local copies for Windows and macOS."""
from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import shutil
import tempfile
import tkinter as tk
from datetime import datetime
from pathlib import Path, PurePosixPath
from tkinter import filedialog, messagebox, ttk
from urllib.parse import unquote, urlsplit

APP_TITLE = "Mirror Keep"
MANIFEST = ".mirror-keep-manifest.json"
BACKUP_ROOT = ".mirror-keep-backups"
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
            results = [update_project(source, dest) for source in selected]
            lines = []
            for r in results:
                lines.append(
                    f"{r['key']}: 追加 {r['added']} / 変更 {r['changed']} / 削除 {r['deleted']} / 据置 {r['unchanged']} / 合計 {r['files']} files ({r['bytes']/1048576:.2f} MB)"
                )
            self.status.set("\n".join(lines))
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
