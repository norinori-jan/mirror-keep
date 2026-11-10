"""Mirror Keep バージョン管理機能のテスト（標準ライブラリのみ）。

実行:  py -3 -m unittest discover -s mirror-keep/tests -v
すべて一時フォルダーで行い、実際のアプリデータには触れません。
"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
MODULE_PATH = HERE.parent / "mirror_keep.py"


# --- tkinter が無い環境（CI等）でも import できるよう最小のスタブを用意 -----------------
class _FakeWidget:
    def __init__(self, *args, **kwargs):
        self.args, self.kwargs = args, kwargs

    def __getattr__(self, name):
        return lambda *a, **k: None


class _FakeVar:
    def __init__(self, value=""):
        self.value = value

    def set(self, value):
        self.value = value

    def get(self):
        return self.value


class _FakeTree(_FakeWidget):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.items, self.sel = {}, []

    def insert(self, parent, index, iid=None, values=()):
        iid = iid or str(len(self.items))
        self.items[iid] = values
        return iid

    def delete(self, *ids):
        for i in ids:
            self.items.pop(i, None)

    def get_children(self):
        return list(self.items)

    def exists(self, iid):
        return iid in self.items

    def selection(self):
        return tuple(self.sel)

    def selection_set(self, iid):
        self.sel = [iid]


FAKE_TK = False
try:
    import tkinter  # noqa: F401
except ImportError:
    FAKE_TK = True
    fake = types.ModuleType("tkinter")
    fake.Tk = _FakeWidget
    fake.Toplevel = _FakeWidget
    fake.StringVar = _FakeVar
    fake_ttk = types.ModuleType("tkinter.ttk")
    for name in ("Frame", "Label", "Entry", "Button", "Scrollbar"):
        setattr(fake_ttk, name, _FakeWidget)
    fake_ttk.Treeview = _FakeTree
    fake_mb = types.ModuleType("tkinter.messagebox")
    fake_fd = types.ModuleType("tkinter.filedialog")
    fake.ttk, fake.messagebox, fake.filedialog = fake_ttk, fake_mb, fake_fd
    sys.modules.update({"tkinter": fake, "tkinter.ttk": fake_ttk,
                        "tkinter.messagebox": fake_mb, "tkinter.filedialog": fake_fd})

spec = importlib.util.spec_from_file_location("mirror_keep", MODULE_PATH)
mk = importlib.util.module_from_spec(spec)
sys.modules["mirror_keep"] = mk
spec.loader.exec_module(mk)


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def snapshot_tree(root: Path):
    """マニフェストと作業ファイルを除いた {相対パス: 内容}。"""
    out = {}
    for p in root.rglob("*"):
        if p.is_file() and p.name != mk.MANIFEST and not p.name.endswith(".tmp"):
            out[p.relative_to(root).as_posix()] = p.read_text(encoding="utf-8")
    return out


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="mk-test-")).resolve()
        self.src = self.tmp / "work" / "demo-app"
        self.dest = self.tmp / "mirror"
        self.dest.mkdir()
        write(self.src / "index.html", "<html>v1</html>")
        write(self.src / "js" / "app.js", "console.log(1)")
        write(self.src / "old.txt", "will be deleted")
        write(self.src / ".env", "SECRET=1")  # 除外されるはず
        self.key = mk.project_key(self.src)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def update(self):
        return mk.update_project_with_version(self.src, self.dest)

    def versions(self):
        return mk.list_versions(self.dest, self.key)

    def vdir(self, vid):
        return mk.versions_root(self.dest, self.key) / vid

    def target(self):
        return self.dest / self.key

    def tmp_leftovers(self):
        root = mk.versions_root(self.dest, self.key)
        return [p.name for p in root.iterdir() if p.name.startswith(".tmp-")] if root.is_dir() else []


class VersionTests(Base):
    # 1
    def test_first_update_saves_a_version(self):
        r = self.update()
        self.assertIsNone(r["versionError"])
        vs = self.versions()
        self.assertEqual(len(vs), 1)
        self.assertEqual(vs[0]["id"], r["versionId"])
        self.assertEqual(vs[0]["fileCount"], 3)  # .env は除外
        self.assertTrue(vs[0]["verifiedAtSave"])
        self.assertTrue((vs[0]["path"] / mk.MANIFEST).is_file())
        self.assertFalse((vs[0]["path"] / ".env").exists())
        self.assertTrue(mk.verify_version(self.dest, self.key, vs[0]["id"])["ok"])

    # 2
    def test_second_update_makes_another_version_even_if_unchanged(self):
        a = self.update()["versionId"]
        b = self.update()["versionId"]
        self.assertNotEqual(a, b)
        self.assertEqual([v["id"] for v in self.versions()], [a, b])
        self.assertTrue(self.vdir(a).is_dir() and self.vdir(b).is_dir())

    # 3
    def test_changed_file_is_saved_correctly(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2 changed</html>")
        b = self.update()["versionId"]
        self.assertEqual((self.vdir(a) / "index.html").read_text(encoding="utf-8"), "<html>v1</html>")
        self.assertEqual((self.vdir(b) / "index.html").read_text(encoding="utf-8"), "<html>v2 changed</html>")

    # 4
    def test_deleted_file_state_is_reflected(self):
        a = self.update()["versionId"]
        (self.src / "old.txt").unlink()
        write(self.src / "new.txt", "added")
        b = self.update()["versionId"]
        self.assertTrue((self.vdir(a) / "old.txt").is_file())
        self.assertFalse((self.vdir(b) / "old.txt").exists())
        self.assertTrue((self.vdir(b) / "new.txt").is_file())
        self.assertEqual(next(v for v in self.versions() if v["id"] == b)["fileCount"], 3)

    # 5 + 6 + 7
    def test_select_and_restore_old_version_and_protect_current_state(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2</html>")
        (self.src / "old.txt").unlink()
        self.update()
        before_restore = snapshot_tree(self.target())
        count_before = len(self.versions())

        self.assertIn(a, [v["id"] for v in self.versions()])  # 古い版を選べる
        result = mk.restore_version(self.dest, self.key, a)

        self.assertEqual(result["restored"], a)
        self.assertEqual(snapshot_tree(self.target())["index.html"], "<html>v1</html>")
        self.assertIn("old.txt", snapshot_tree(self.target()))
        self.assertTrue(mk.verify_project(self.target())["ok"])
        # 復元前の状態が新しい保存版として残っている
        vs = self.versions()
        self.assertEqual(len(vs), count_before + 1)
        pre = next(v for v in vs if v["id"] == result["preRestoreVersion"])
        self.assertEqual(pre["kind"], "pre-restore")
        self.assertEqual(snapshot_tree(pre["path"]), before_restore)
        self.assertTrue(mk.verify_version(self.dest, self.key, pre["id"])["ok"])
        # 元アプリのフォルダーは変わらない
        self.assertEqual((self.src / "index.html").read_text(encoding="utf-8"), "<html>v2</html>")
        # 作業用フォルダーが残らない
        self.assertEqual(self.tmp_leftovers(), [])
        # 復元した版自体は変更されていない
        self.assertTrue(mk.verify_version(self.dest, self.key, a)["ok"])

    # 8
    def test_sha256_verification_detects_tampering_and_blocks_restore(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2</html>")
        self.update()
        before = snapshot_tree(self.target())
        write(self.vdir(a) / "index.html", "<html>TAMPERED</html>")
        self.assertFalse(mk.verify_version(self.dest, self.key, a)["ok"])
        with self.assertRaises(IOError) as ctx:
            mk.restore_version(self.dest, self.key, a)
        # 展開の前（手順2）で止まっていること
        self.assertIn("選択した保存版のSHA-256検証に失敗", str(ctx.exception))
        self.assertEqual(snapshot_tree(self.target()), before)  # ミラーは無傷
        self.assertEqual(self.tmp_leftovers(), [])

    def test_extra_file_in_version_is_detected(self):
        a = self.update()["versionId"]
        write(self.vdir(a) / "intruder.txt", "x")
        result = mk.verify_version(self.dest, self.key, a)
        self.assertFalse(result["ok"])
        self.assertIn("intruder.txt", result["extras"])

    # 9
    def test_failed_save_leaves_no_incomplete_version(self):
        self.update()
        existing = [v["id"] for v in self.versions()]
        write(self.src / "index.html", "<html>v2</html>")
        calls = {"n": 0}
        real = shutil.copy2

        def flaky(src, dst, *a, **k):
            if str(dst).find(".tmp-") != -1:
                calls["n"] += 1
                if calls["n"] == 2:
                    raise OSError("disk error (simulated)")
            return real(src, dst, *a, **k)

        with mock.patch.object(mk.shutil, "copy2", flaky):
            r = self.update()
        self.assertIsNotNone(r["versionError"])
        self.assertIsNone(r["versionId"])
        self.assertEqual([v["id"] for v in self.versions()], existing)  # 新しい保存版は登録されない
        self.assertEqual(self.tmp_leftovers(), [])  # 不完全な作業フォルダーも残らない
        # ミラー更新自体は完了している
        self.assertEqual(snapshot_tree(self.target())["index.html"], "<html>v2</html>")

    def test_failed_post_save_verification_is_not_registered(self):
        self.update()
        existing = [v["id"] for v in self.versions()]
        with mock.patch.object(mk, "verify_project", return_value={"ok": False, "checked": 1, "errors": ["x"], "extras": []}):
            with self.assertRaises(IOError):
                mk.save_version(self.dest, self.key)
        self.assertEqual([v["id"] for v in self.versions()], existing)
        self.assertEqual(self.tmp_leftovers(), [])

    # 10
    def test_existing_diff_backup_still_works(self):
        self.update()
        write(self.src / "index.html", "<html>v2</html>")
        (self.src / "old.txt").unlink()
        self.update()
        self.assertEqual(snapshot_tree(self.target())["index.html"], "<html>v2</html>")
        backup_dir = mk.restore_latest(self.dest, self.key)
        self.assertTrue((backup_dir / "backup-manifest.json").is_file())
        restored = snapshot_tree(self.target())
        self.assertEqual(restored["index.html"], "<html>v1</html>")
        self.assertIn("old.txt", restored)
        self.assertTrue(mk.verify_project(self.target())["ok"])

    # 11
    def test_existing_update_project_unchanged_behaviour(self):
        r1 = mk.update_project(self.src, self.dest)
        self.assertEqual((r1["added"], r1["changed"], r1["deleted"], r1["unchanged"]), (3, 0, 0, 0))
        self.assertFalse((self.dest / mk.VERSION_ROOT).exists())  # 単体呼び出しでは保存版を作らない
        write(self.src / "index.html", "<html>v2</html>")
        (self.src / "old.txt").unlink()
        write(self.src / "added.txt", "a")
        r2 = mk.update_project(self.src, self.dest)
        self.assertEqual((r2["added"], r2["changed"], r2["deleted"], r2["unchanged"]), (1, 1, 1, 1))
        self.assertTrue(mk.verify_project(self.target())["ok"])
        self.assertFalse((self.target() / ".env").exists())  # 秘密情報は除外のまま
        self.assertTrue((self.dest / mk.BACKUP_ROOT / self.key).is_dir())

    # 12
    def test_nothing_is_ever_auto_deleted(self):
        ids = [self.update()["versionId"]]
        for i in range(2, 6):
            write(self.src / "index.html", f"<html>v{i}</html>")
            ids.append(self.update()["versionId"])
        mk.restore_version(self.dest, self.key, ids[1])
        mk.restore_version(self.dest, self.key, ids[0])
        for vid in ids:
            self.assertTrue(self.vdir(vid).is_dir(), vid)
        self.assertEqual(len(self.versions()), 5 + 2)  # 5更新 + 2回の復元前保存

    def test_low_disk_space_only_suggests_candidates(self):
        a = self.update()["versionId"]
        b = self.update()["versionId"]
        usage = shutil.disk_usage(self.dest)
        tiny = type(usage)(usage.total, usage.total, 0)
        with mock.patch.object(mk.shutil, "disk_usage", return_value=tiny):
            r = self.update()
        self.assertIn("空き容量", r["versionError"])
        # 候補は古い順で、最新版は含めない（提示のみ）
        self.assertEqual([c["id"] for c in r["versionCandidates"]], [a])
        self.assertNotIn(b, [c["id"] for c in r["versionCandidates"]])
        self.assertTrue(self.vdir(a).is_dir() and self.vdir(b).is_dir())
        self.assertEqual(self.tmp_leftovers(), [])

    def test_restore_rolls_back_when_switch_fails(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2</html>")
        self.update()
        before = snapshot_tree(self.target())
        real_replace = os.replace

        def failing(src, dst, *args, **kwargs):
            if ".tmp-restore-" in str(src) and Path(dst) == self.target():
                raise OSError("switch failed (simulated)")
            return real_replace(src, dst, *args, **kwargs)

        with mock.patch.object(mk.os, "replace", failing):
            with self.assertRaises(OSError):
                mk.restore_version(self.dest, self.key, a)
        self.assertEqual(snapshot_tree(self.target()), before)  # 元の状態へ戻っている
        self.assertTrue(mk.verify_project(self.target())["ok"])
        self.assertEqual(self.tmp_leftovers(), [])
        self.assertTrue(mk.verify_version(self.dest, self.key, a)["ok"])

    def test_restore_when_current_mirror_is_damaged_still_protects_it(self):
        a = self.update()["versionId"]
        write(self.target() / "index.html", "<html>DAMAGED</html>")  # マニフェストと不一致
        result = mk.restore_version(self.dest, self.key, a)
        pre = self.vdir(result["preRestoreVersion"])
        self.assertEqual((pre / "index.html").read_text(encoding="utf-8"), "<html>DAMAGED</html>")
        self.assertEqual(snapshot_tree(self.target())["index.html"], "<html>v1</html>")

    def test_unsafe_version_ids_are_rejected(self):
        self.update()
        for bad in ("..", "../x", "20260101-000000-000000-zzzzzz", "", "a/b"):
            with self.assertRaises(ValueError):
                mk.restore_version(self.dest, self.key, bad)
            with self.assertRaises(ValueError):
                mk.verify_version(self.dest, self.key, bad)

    def test_version_manifest_is_valid_mirror_manifest_with_metadata(self):
        a = self.update()["versionId"]
        m = json.loads((self.vdir(a) / mk.MANIFEST).read_text(encoding="utf-8"))
        self.assertEqual(m["format"], "mirror-keep-v2")
        self.assertEqual(m["version"]["id"], a)
        self.assertEqual(m["version"]["projectKey"], self.key)
        self.assertEqual(m["fileCount"], len(m["files"]))


class BundleTests(Base):
    """書き出し（iPhone持ち運び用バンドル）のテスト。"""

    def out_dir(self):
        d = self.tmp / "out"
        d.mkdir(exist_ok=True)
        return d

    def export(self, vid, name=None):
        out = self.out_dir() / (name or mk.default_bundle_name("demo-app", vid))
        return mk.export_version_bundle(self.dest, self.key, vid, out), out

    def test_export_roundtrip_matches_version_contents(self):
        a = self.update()["versionId"]
        result, out = self.export(a)
        self.assertEqual(result["files"], 3)
        self.assertTrue(mk.verify_bundle(out)["ok"])
        bundle = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(bundle["format"], mk.BUNDLE_FORMAT)
        self.assertEqual(bundle["version"]["id"], a)
        self.assertEqual(bundle["projectKey"], self.key)
        import base64
        decoded = {f["path"]: base64.b64decode(f["data"]).decode("utf-8") for f in bundle["files"]}
        self.assertEqual(decoded, snapshot_tree(self.vdir(a)))
        self.assertNotIn(".env", decoded)  # 除外された秘密情報は含まれない

    def test_export_is_read_only_for_versions_and_mirror(self):
        a = self.update()["versionId"]
        before_v, before_m = snapshot_tree(self.vdir(a)), snapshot_tree(self.target())
        count = len(self.versions())
        self.export(a)
        self.assertEqual(snapshot_tree(self.vdir(a)), before_v)
        self.assertEqual(snapshot_tree(self.target()), before_m)
        self.assertEqual(len(self.versions()), count)  # 書き出しで保存版は増えない
        self.assertTrue(mk.verify_version(self.dest, self.key, a)["ok"])
        self.assertTrue(mk.verify_project(self.target())["ok"])

    def test_old_version_can_be_exported(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2</html>")
        self.update()
        _, out = self.export(a)
        import base64
        bundle = json.loads(out.read_text(encoding="utf-8"))
        index = next(f for f in bundle["files"] if f["path"] == "index.html")
        self.assertEqual(base64.b64decode(index["data"]).decode("utf-8"), "<html>v1</html>")

    def test_japanese_and_binary_files_survive(self):
        write(self.src / "日本語.txt", "こんにちは")
        (self.src / "bin.dat").write_bytes(bytes(range(256)) * 3)
        a = self.update()["versionId"]
        _, out = self.export(a)
        self.assertTrue(mk.verify_bundle(out)["ok"])
        import base64
        bundle = json.loads(out.read_text(encoding="utf-8"))
        by = {f["path"]: base64.b64decode(f["data"]) for f in bundle["files"]}
        self.assertEqual(by["日本語.txt"].decode("utf-8"), "こんにちは")
        self.assertEqual(by["bin.dat"], bytes(range(256)) * 3)

    def test_tampered_content_is_detected(self):
        a = self.update()["versionId"]
        _, out = self.export(a)
        bundle = json.loads(out.read_text(encoding="utf-8"))
        import base64
        bundle["files"][0]["data"] = base64.b64encode(b"tampered").decode("ascii")
        out.write_text(json.dumps(bundle), encoding="utf-8")
        result = mk.verify_bundle(out)
        self.assertFalse(result["ok"])
        self.assertTrue(any("mismatch" in e for e in result["errors"]))

    def test_missing_or_extra_file_in_bundle_is_detected(self):
        a = self.update()["versionId"]
        _, out = self.export(a)
        base = json.loads(out.read_text(encoding="utf-8"))
        missing = dict(base, files=base["files"][1:])
        out.write_text(json.dumps(missing), encoding="utf-8")
        self.assertFalse(mk.verify_bundle(out)["ok"])
        import copy
        extra = copy.deepcopy(base)
        extra["files"].append(dict(extra["files"][0], path="evil.txt"))
        out.write_text(json.dumps(extra), encoding="utf-8")
        self.assertFalse(mk.verify_bundle(out)["ok"])  # filesSha256 / fileCount が合わない

    def test_renamed_path_is_caught_only_by_files_digest(self):
        # 内容・サイズ・件数が同じでパス名だけ入れ替えた場合は、filesSha256 だけが検出できる
        a = self.update()["versionId"]
        _, out = self.export(a)
        bundle = json.loads(out.read_text(encoding="utf-8"))
        bundle["files"][0]["path"] = "renamed-" + bundle["files"][0]["path"].replace("/", "-")
        out.write_text(json.dumps(bundle), encoding="utf-8")
        result = mk.verify_bundle(out)
        self.assertFalse(result["ok"])
        self.assertEqual(result["errors"], ["filesSha256 mismatch"])

    def test_unsafe_path_is_rejected_even_with_consistent_digest(self):
        # パス以外をすべて矛盾なく作り直しても、危険なパス自体が拒否されること
        a = self.update()["versionId"]
        _, out = self.export(a)
        bundle = json.loads(out.read_text(encoding="utf-8"))
        bundle["files"][0]["path"] = "../escape.txt"
        bundle["filesSha256"] = mk.bundle_files_digest((f["path"], f["sha256"]) for f in bundle["files"])
        out.write_text(json.dumps(bundle), encoding="utf-8")
        result = mk.verify_bundle(out)
        self.assertFalse(result["ok"])
        self.assertTrue(any("invalid entry" in e for e in result["errors"]))

    def _tamper_consistent(self, mutate):
        a = self.update()["versionId"]
        _, out = self.export(a)
        bundle = json.loads(out.read_text(encoding="utf-8"))
        mutate(bundle)
        bundle["filesSha256"] = mk.bundle_files_digest((f["path"], f["sha256"]) for f in bundle["files"])
        out.write_text(json.dumps(bundle), encoding="utf-8")
        return mk.verify_bundle(out)

    def test_bundle_paths_follow_the_same_strict_rule_as_iphone(self):
        # iPhone版は「\\」「//」「./」を拒否する。PC版の検証も同じ基準にそろえる
        for bad in ("a\\b.txt", "dir//x.txt", "./x.txt", "dir/./x.txt", "/abs.txt", "x\0y"):
            with self.subTest(path=bad):
                result = self._tamper_consistent(lambda b, bad=bad: b["files"][0].__setitem__("path", bad))
                self.assertFalse(result["ok"])

    def test_bundle_key_and_version_id_are_checked(self):
        r1 = self._tamper_consistent(lambda b: b.__setitem__("projectKey", "../evil"))
        self.assertIn("projectKey が不正です", r1["errors"])
        r2 = self._tamper_consistent(lambda b: b["version"].__setitem__("id", "x"))
        self.assertIn("version.id が不正です", r2["errors"])

    def test_bundle_sha256_must_be_lowercase_hex(self):
        r = self._tamper_consistent(lambda b: b["files"][0].__setitem__("sha256", b["files"][0]["sha256"].upper()))
        self.assertFalse(r["ok"])

    def test_unsafe_paths_and_garbage_are_rejected(self):
        a = self.update()["versionId"]
        _, out = self.export(a)
        bundle = json.loads(out.read_text(encoding="utf-8"))
        bundle["files"][0]["path"] = "../escape.txt"
        out.write_text(json.dumps(bundle), encoding="utf-8")
        self.assertFalse(mk.verify_bundle(out)["ok"])
        out.write_text("not json", encoding="utf-8")
        self.assertFalse(mk.verify_bundle(out)["ok"])
        out.write_text(json.dumps({"format": "other"}), encoding="utf-8")
        self.assertFalse(mk.verify_bundle(out)["ok"])

    def test_tampered_version_is_not_exported(self):
        a = self.update()["versionId"]
        write(self.vdir(a) / "index.html", "<html>TAMPERED</html>")
        out = self.out_dir() / mk.default_bundle_name("demo-app", a)
        with self.assertRaises(IOError) as ctx:
            mk.export_version_bundle(self.dest, self.key, a, out)
        # 読み出し段階ではなく、最初の保存版検証（手順の先頭）で止まっていること
        self.assertIn("保存版のSHA-256検証に失敗", str(ctx.exception))
        self.assertFalse(out.exists())
        self.assertEqual([p.name for p in self.out_dir().iterdir()], [])  # 一時ファイルも残らない

    def test_existing_file_is_never_overwritten(self):
        a = self.update()["versionId"]
        out = self.out_dir() / mk.default_bundle_name("demo-app", a)
        out.write_text("precious", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            mk.export_version_bundle(self.dest, self.key, a, out)
        self.assertEqual(out.read_text(encoding="utf-8"), "precious")

    def test_output_inside_managed_folders_is_refused(self):
        a = self.update()["versionId"]
        for inside in (self.target(), mk.versions_root(self.dest, self.key), self.vdir(a), self.dest / mk.BACKUP_ROOT):
            inside.mkdir(parents=True, exist_ok=True)
            with self.assertRaises(ValueError):
                mk.export_version_bundle(self.dest, self.key, a, inside / ("x" + mk.BUNDLE_SUFFIX))
        self.assertTrue(mk.verify_version(self.dest, self.key, a)["ok"])  # 検証が崩れていない
        self.assertTrue(mk.verify_project(self.target())["ok"])

    def test_bad_name_and_bad_id_are_rejected(self):
        a = self.update()["versionId"]
        with self.assertRaises(ValueError):
            mk.export_version_bundle(self.dest, self.key, a, self.out_dir() / "x.zip")
        with self.assertRaises(ValueError):
            mk.export_version_bundle(self.dest, self.key, "../x", self.out_dir() / ("x" + mk.BUNDLE_SUFFIX))
        with self.assertRaises(ValueError):
            mk.export_version_bundle(self.dest, self.key, a, self.tmp / "no-such-dir" / ("x" + mk.BUNDLE_SUFFIX))

    def test_size_limit_stops_export(self):
        a = self.update()["versionId"]
        out = self.out_dir() / mk.default_bundle_name("demo-app", a)
        with mock.patch.object(mk, "BUNDLE_MAX_BYTES", 10):
            with self.assertRaises(ValueError):
                mk.export_version_bundle(self.dest, self.key, a, out)
        self.assertFalse(out.exists())

    def test_failed_write_leaves_no_partial_file(self):
        a = self.update()["versionId"]
        out = self.out_dir() / mk.default_bundle_name("demo-app", a)
        with mock.patch.object(mk, "verify_bundle", return_value={"ok": False, "checked": 0, "errors": ["x"]}):
            with self.assertRaises(IOError):
                mk.export_version_bundle(self.dest, self.key, a, out)
        self.assertEqual([p.name for p in self.out_dir().iterdir()], [])

    def test_digest_format_is_simple_and_reproducible(self):
        # iPhone側(JavaScript)が同じ手順で再計算できる形式であること: "path\tsha256" を改行で連結 → SHA-256
        import hashlib
        pairs = [("b.txt", "22"), ("a.txt", "11")]
        expected = hashlib.sha256("a.txt\t11\nb.txt\t22".encode("utf-8")).hexdigest()
        self.assertEqual(mk.bundle_files_digest(pairs), expected)


class BatchExportTests(Base):
    """「今日の分を一括で書き出し」。一時フォルダーだけを使う。"""

    def make_second_app(self):
        src2 = self.tmp / "voice-pad"
        write(src2 / "index.html", "voice v1")
        return src2

    def test_batch_updates_versions_and_exports_every_app(self):
        src2 = self.make_second_app()
        out = self.tmp / "outbatch"
        out.mkdir()
        results = mk.update_and_export_all([self.src, src2], self.dest, out)
        self.assertEqual([r["ok"] for r in results], [True, True])
        for r in results:
            self.assertTrue(mk.verify_bundle(r["path"])["ok"])
            self.assertEqual(Path(r["path"]).parent, out)
        self.assertEqual(len(self.versions()), 1)  # 元アプリには保存版が1つできた

    def test_one_failure_does_not_stop_the_others_or_touch_sources(self):
        src2 = self.make_second_app()
        out = self.tmp / "outbatch"
        out.mkdir()
        missing = self.tmp / "no-such-app"
        before = snapshot_tree(self.src)
        results = mk.update_and_export_all([missing, self.src, src2], self.dest, out)
        self.assertEqual([r["ok"] for r in results], [False, True, True])
        self.assertIn("元フォルダーがありません", results[0]["error"])
        self.assertEqual(snapshot_tree(self.src), before)

    def test_export_failure_is_reported_and_existing_files_are_not_overwritten(self):
        out = self.tmp / "no-such-out-dir"  # 書き出し先が無い → 書き出しだけ失敗、保存版は残る
        results = mk.update_and_export_all([self.src], self.dest, out)
        self.assertFalse(results[0]["ok"])
        self.assertIsNotNone(results[0]["versionId"])
        self.assertEqual(len(self.versions()), 1)

    def test_no_bundle_is_exported_when_the_version_could_not_be_saved(self):
        out = self.tmp / "outbatch"
        out.mkdir()
        with mock.patch.object(mk, "save_version", side_effect=OSError("disk full")):
            results = mk.update_and_export_all([self.src], self.dest, out)
        self.assertFalse(results[0]["ok"])
        self.assertIn("保存版を作れなかった", results[0]["error"])
        self.assertEqual(list(out.iterdir()), [])

    def test_nothing_is_deleted_by_batch(self):
        self.update()
        existing = [v["id"] for v in self.versions()]
        out = self.tmp / "outbatch"
        out.mkdir()
        mk.update_and_export_all([self.src], self.dest, out)
        now = [v["id"] for v in self.versions()]
        self.assertTrue(set(existing) <= set(now))
        self.assertEqual(len(now), len(existing) + 1)


class RegistrationAndIcloudTests(Base):
    """登録の保存・登録を外す・iCloud書き出し先の検出。実際のホームには触れない。"""

    def test_config_roundtrip_and_missing_file(self):
        home = self.tmp / "home"
        self.assertEqual(mk.load_config(home), {"destination": "", "projects": []})
        projects = [{"path": Path("C:/a/table-pad"), "selected": True}, {"path": Path("C:/a/voice-pad"), "selected": False}]
        mk.save_config("D:/mirror", projects, home)
        got = mk.load_config(home)
        self.assertEqual(got["destination"], "D:/mirror")
        self.assertEqual([(x["path"], x["selected"]) for x in got["projects"]], [(x["path"], x["selected"]) for x in projects])

    def test_broken_config_is_kept_aside_not_deleted(self):
        home = self.tmp / "home"
        path = mk.config_path(home)
        path.parent.mkdir(parents=True)
        path.write_text("{ broken", encoding="utf-8")
        self.assertEqual(mk.load_config(home)["projects"], [])
        self.assertEqual(path.with_name(path.name + ".broken").read_text(encoding="utf-8"), "{ broken")

    def test_save_config_touches_only_the_config_file(self):
        home = self.tmp / "home"
        app = self.tmp / "app"
        app.mkdir()
        (app / "a.txt").write_text("x", encoding="utf-8")
        mk.save_config("", [{"path": app, "selected": True}], home)
        self.assertEqual((app / "a.txt").read_text(encoding="utf-8"), "x")
        self.assertEqual(sorted(p.name for p in mk.config_path(home).parent.iterdir()), [mk.CONFIG_NAME])

    def test_split_unselected_keeps_only_checked(self):
        ps = [{"path": Path("a"), "selected": True}, {"path": Path("b"), "selected": False}, {"path": Path("c"), "selected": False}]
        keep, drop = mk.split_unselected(ps)
        self.assertEqual([x["path"].name for x in keep], ["a"])
        self.assertEqual([x["path"].name for x in drop], ["b", "c"])

    def test_icloud_not_found_returns_none_and_creates_nothing(self):
        home = self.tmp / "nohome"
        home.mkdir()
        self.assertIsNone(mk.icloud_export_path("demo", "20260101-000000-000000-abcdef", home))
        self.assertEqual(list(home.iterdir()), [])

    def test_icloud_export_path_uses_mkexport_folder(self):
        home = self.tmp / "h2"
        (home / "iCloudDrive").mkdir(parents=True)
        out = mk.icloud_export_path("demo-app", "20260101-000000-000000-abcdef", home)
        self.assertEqual(out.parent, home / "iCloudDrive" / "MKExport")
        self.assertTrue(out.name.endswith(mk.BUNDLE_SUFFIX))
        self.assertTrue(out.parent.is_dir())

    def test_export_into_icloud_folder_is_verified_and_does_not_overwrite(self):
        a = self.update()["versionId"]
        home = self.tmp / "h3"
        (home / "iCloudDrive").mkdir(parents=True)
        out = mk.icloud_export_path("demo-app", a, home)
        mk.export_version_bundle(self.dest, self.key, a, out)
        self.assertTrue(mk.verify_bundle(out)["ok"])
        with self.assertRaises(Exception):
            mk.export_version_bundle(self.dest, self.key, a, out)


@unittest.skipUnless(FAKE_TK, "実Tkがある環境ではGUIスモークテストを行わない（ヘッドレス用スタブ専用）")
class DialogSmokeTests(Base):
    """GUIの実描画は確認できないため、ダイアログの操作ロジックのみをスタブで確認する。"""

    def make_dialog(self):
        messages = []
        for name in ("showinfo", "showwarning", "showerror"):
            setattr(mk.messagebox, name, lambda *a, _n=name, **k: messages.append((_n, a)))
        mk.messagebox.askyesno = lambda *a, **k: True
        dlg = mk.VersionDialog(_FakeWidget(), self.dest, self.key, "demo-app")
        return dlg, messages

    def test_list_verify_restore_flow(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2</html>")
        b = self.update()["versionId"]
        dlg, messages = self.make_dialog()
        self.assertEqual(list(dlg.tree.items), [b, a])  # 新しい順
        self.assertIn("最新", dlg.tree.items[b][0])
        self.assertEqual(dlg.tree.items[a][4], "保存時OK")

        dlg.tree.selection_set(a)
        dlg.verify_selected()
        self.assertTrue(dlg.tree.items[a][4].startswith("検証OK"))

        dlg.restore_selected()
        self.assertEqual(snapshot_tree(self.target())["index.html"], "<html>v1</html>")
        self.assertEqual(len(dlg.tree.items), 3)  # 復元前保存版が増える
        self.assertEqual(messages[-1][0], "showinfo")

    def test_restore_declined_changes_nothing(self):
        a = self.update()["versionId"]
        write(self.src / "index.html", "<html>v2</html>")
        self.update()
        dlg, messages = self.make_dialog()
        mk.messagebox.askyesno = lambda *a, **k: False
        dlg.tree.selection_set(a)
        dlg.restore_selected()
        self.assertEqual(snapshot_tree(self.target())["index.html"], "<html>v2</html>")
        self.assertEqual(len(self.versions()), 2)

    def test_no_selection_shows_error(self):
        self.update()
        dlg, messages = self.make_dialog()
        dlg.restore_selected()
        self.assertEqual(messages[-1][0], "showerror")

    def test_icloud_export_button_flow(self):
        a = self.update()["versionId"]
        dlg, messages = self.make_dialog()
        home = self.tmp / "ichome"
        (home / "iCloudDrive").mkdir(parents=True)
        real = mk.icloud_export_path
        mk.icloud_export_path = lambda name, vid, home_=None: real(name, vid, home)
        try:
            dlg.tree.selection_set(a)
            dlg.export_icloud()
            self.assertEqual(messages[-1][0], "showinfo")
            out = home / "iCloudDrive" / "MKExport" / mk.default_bundle_name("demo-app", a)
            self.assertTrue(mk.verify_bundle(out)["ok"])
            # iCloudが無い場合は、案内を出して何も作らない
            mk.icloud_export_path = lambda *args, **kwargs: None
            before = len(list((home / "iCloudDrive" / "MKExport").iterdir()))
            dlg.export_icloud()
            self.assertEqual(messages[-1][0], "showinfo")
            self.assertEqual(len(list((home / "iCloudDrive" / "MKExport").iterdir())), before)
        finally:
            mk.icloud_export_path = real

    def test_export_flow(self):
        a = self.update()["versionId"]
        dlg, messages = self.make_dialog()
        out_dir = self.tmp / "out"
        out_dir.mkdir()
        target = out_dir / mk.default_bundle_name("demo-app", a)
        mk.filedialog.asksaveasfilename = lambda *args, **kwargs: str(target)
        dlg.tree.selection_set(a)
        dlg.export_selected()
        self.assertEqual(messages[-1][0], "showinfo")
        self.assertTrue(mk.verify_bundle(target)["ok"])
        # キャンセル時は何もしない
        before = len(messages)
        mk.filedialog.asksaveasfilename = lambda *args, **kwargs: ""
        dlg.export_selected()
        self.assertEqual(len(messages), before)
        # 同名が既にあれば上書きせずエラー
        mk.filedialog.asksaveasfilename = lambda *args, **kwargs: str(target)
        dlg.export_selected()
        self.assertEqual(messages[-1][0], "showerror")


if __name__ == "__main__":
    unittest.main(verbosity=2)
