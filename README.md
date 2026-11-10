# Mirror Keep — Windows / macOS

## 起動

### Windows
Python 3.10 以降（Tkinter付き）をインストールし、`Start-Mirror-Keep.bat` をダブルクリックします。

PowerShell:
```powershell
Set-Location "$HOME\Downloads\Mirror-Keep-Integrated"
py -3 .\mirror-keep\mirror_keep.py
```

### macOS
Python 3.10 以降（Tkinter付き）を用意し、Finderから `mirror-keep/Start-Mirror-Keep.command` を実行します。初回にブロックされた場合は右クリック→開くを選びます。

ターミナル:
```bash
cd ~/Downloads/Mirror-Keep-Integrated
python3 mirror-keep/mirror_keep.py
```

## 使い方（毎日の運用）
- 「今日使いたい」と思ったアプリは、「アプリを追加」で登録しておきます。登録と保存先は、閉じても覚えています（ユーザーフォルダーの `.mirror-keep\mirror-keep-config.json`。アプリの中身は含みません）。
- 「⑥ 今日の分を書き出し」は、✓の付いたアプリすべてを、差分更新 → 保存版の作成 → 書き出しまで、1回で行います。書き出し先は iCloud Drive の `MKExport`（無ければフォルダーを選びます）。1つ失敗しても残りは続け、結果を一覧で表示します。元アプリは変更せず、保存版は削除しません。
- 使わなくなった登録は、「選んだ行の登録を外す」または「対象外の登録をまとめて外す」（✓の無い行を全部）で外せます。**外すのは一覧への登録だけです。** 元アプリのフォルダー、ミラー、保存版、バックアップは削除されません。
- 一覧のミラーと保存版は、不要になっても自動では消えません。必要なら、保存先のフォルダーをご自身で削除してください。

1. 保存先を選びます（元アプリのフォルダーの内側・外側には置かないでください）。
2. 「アプリを追加」で `table-pad`、`voice-pad`、その他のアプリのフォルダーを登録します。
3. 今回更新する行の「✓」をクリックして選択します。週ごとに対象アプリを切り替えられます。
4. 「構成を調査」でファイル数、サイズ、ローカル参照候補、外部ホスト、未解決候補を確認します。
5. 「差分更新」を押します。初回は全コピー、次回からSHA-256で変更・追加・削除を判定します。
6. 「SHA-256検証」でミラーを確認します。
7. 問題があれば「最新バックアップを復元」で直前更新前の状態に戻します。

アプリの一部機能だけを試す場合は、その機能フォルダーを別プロジェクトとして登録できます。ただし依存ファイルを静的解析で完全に特定できないため、通常はアプリ全体をミラーする方法を推奨します。

## バージョン管理（追加機能）
「② 差分更新」を実行するたびに、その時点のアプリ全体の**完全な保存版**を作ります。④の差分バックアップとは別機能で、どちらも従来どおり使えます。

### 操作
1. アプリ一覧の行をクリックして選び、「⑤ バージョン管理…」を押します。
2. 一覧に、版・保存日時・ファイル数・合計容量・検証状態・種別（更新 / 復元前）が表示されます。古い版も選べます。
3. 「選択版を検証」で、保存版の全ファイルをSHA-256で確認します。
4. 「選択版に復元…」を押すと確認画面が出ます（既定は「いいえ」）。
5. 「保存場所を開く」で、保存版のフォルダーを開きます。

### 復元の流れ
1. 現在のミラーの状態を、先に「復元前」の保存版として完全保存します。
2. 選択した保存版のSHA-256を確認します。
3. 一時フォルダーへ展開し、展開後もSHA-256を確認します。
4. 問題がなければ切り替えます。途中で失敗した場合は元の状態へ戻ります。
5. 保存済みの過去の版は変更しません。

### 注意
- 復元されるのは保存先の**ミラーフォルダー**です。元アプリのフォルダーは変更されません。復元後に「② 差分更新」を実行すると、元アプリの現在の内容へ再同期され、新しい保存版ができます。
- 版を復元した後は「④ 最新バックアップを復元」を使わないでください。④は直前の差分更新を基準にしており、切り替えた後の状態とは対応しません。戻したいときは⑤で別の版を選びます。
- 更新のたびに完全なコピーを作るため、保存先の容量が増えます。内容が同じでも毎回作成します。
- **保存版は自動では削除されません。** 空き容量が足りないときは保存を中止し、古い順に削除候補を表示するだけです。不要な版は、ご自身で判断してフォルダーごと削除してください。
- 保存中の強制終了などで `.tmp-` で始まる作業フォルダーが残ることがあります。正式な保存版ではなく一覧にも出ません。不要なら手動で削除できます。
- バージョン管理はWindows / macOSのPC版の機能です。iPhone版（Mirror Keep Phone）は、PC版が書き出した `.mkbundle.json` を取り込み、検証・保管・選択・書き出し・端末内での分離実行ができます。PC版とiPhone版は同じバンドル形式（`mirror-keep-bundle-v1`）と同じ検証手順で、互いのファイルを読み書きできます。iPhone版の取り込み上限は300MB、PC版の書き出し上限は200MBです。

### 書き出し（iPhoneなどへ持ち運ぶ）
「⑤ バージョン管理…」で版を選び、「選択版を書き出し…」を押すと、その版を**1つのファイル**（`〜.mkbundle.json`）にまとめます。サーバーも通信も不要です。このファイルをiPhoneへ移し（AirDrop、ファイルアプリ、iCloud Drive、外付けストレージなど、手段は自由）、iPhone版で取り込みます。

- 書き出しは**読み取りだけ**です。保存版・ミラー・元アプリのフォルダーは変更されません。
- 書き出す前に保存版のSHA-256を確認し、書き出した直後にもファイルを読み直して全件確認します。壊れた版は書き出しません。
- 既存のファイルは上書きしません。保存先フォルダー（ミラー、保存版、バックアップ）の内側には書き出せません。
- 元ファイルの合計が200MBを超える版は、iPhoneで扱えないため書き出しません。
- ファイルはbase64で入るため、元サイズの約1.4倍になります。
- 秘密情報などの除外済みファイルは、もともと保存版に入っていないので、バンドルにも含まれません。

#### iPhoneへ渡す方法
- **iCloud Drive（Windows）:** 「iCloud Driveへ書き出し」を押すと、iCloud for Windows の同期フォルダー（ユーザーフォルダーの `iCloudDrive`）の `MKExport` に、検証済みのファイルを入れます。同期後、iPhoneのファイルアプリの「iCloud Drive」→「MKExport」に出ます。iPhoneの設定で iCloud Drive がオンである必要があります。iCloud Driveが見つからない場合は、案内を出すだけで何も作りません。
- **AirDrop:** WindowsにはAirDropがありません（Apple端末同士の機能）。Windowsでは使えないため、ボタンはありません。Macで使う場合は、書き出したファイルをFinderからAirDropで送れます。
- **その他:** 「選択版を書き出し…」で好きな場所へ書き出し、USB・外付けストレージ・クラウド等で移せます。
- 作った書き出しファイルは通信なしで作られます。iCloud経由で移す場合だけ、Appleのサーバーを通ります。

#### バンドルの形式（iPhone版の実装用）
```text
{
  "format": "mirror-keep-bundle-v1",
  "created": "ISO日時",
  "appName": "アプリ名",
  "projectKey": "アプリキー",
  "version": { "id": "...", "created": "...", "kind": "update|pre-restore", "note": "..." },
  "fileCount": 件数,
  "totalBytes": 元ファイルの合計バイト数,
  "filesSha256": "下記の手順で作る、ファイル一覧全体のSHA-256",
  "files": [
    { "path": "js/app.js", "sha256": "...", "bytes": 14, "encoding": "base64", "data": "..." }
  ]
}
```
取り込み時の検証手順（Python側 `verify_bundle` と同じ）:
1. `format` が `mirror-keep-bundle-v1` であること。
2. 各ファイルの `path` が安全であること（絶対パス、空、`.`、`..` を含まない。区切りは `/`）。
3. `data` をbase64デコードし、SHA-256が `sha256` と、長さが `bytes` と一致すること。
4. `fileCount` と `totalBytes` が実際と一致すること。
5. 全ファイルを `path` の昇順に並べ、`path` + タブ + `sha256` を改行で連結した文字列（UTF-8）のSHA-256が `filesSha256` と一致すること。

1つでも不一致なら、取り込まずに中止します。

### テスト
一時フォルダーだけを使い、実際のアプリデータには触れません。
```powershell
Set-Location "C:\Users\norin\mirror-keep"
py -3 -m unittest discover -s mirror-keep/tests -v
```

## 保存先の構造
```text
保存先/
  table-pad-<識別子>/
    .mirror-keep-manifest.json
    index.html
    ...
  voice-pad-<識別子>/
    .mirror-keep-manifest.json
    ...
  .mirror-keep-backups/
    <プロジェクト識別子>/
      <更新日時>/
        backup-manifest.json
        files/...
  .mirror-keep-versions/
    <プロジェクト識別子>/
      <日時>-<識別子>/
        .mirror-keep-manifest.json
        index.html
        ...
```

## 除外対象
`.git`、`.wrangler`、`node_modules`、ビルド/キャッシュ、`.env`、認証トークン・APIキー・秘密鍵に該当するファイル名、証明書、バックアップ類などを除外します。ミラー対象に秘密情報を置かないでください。

## オフライン利用の注意
- `table-pad` と `voice-pad` はHTTPSまたはlocalhostで配信してください。`file://` で開くとService Workerは動きません。
- Windows:
  ```powershell
  Set-Location "D:\path\to\table-pad"
  py -m http.server 8000
  ```
- macOS:
  ```bash
  cd /path/to/table-pad
  python3 -m http.server 8000
  ```
  ブラウザーで `http://localhost:8000/` を開きます。
- `voice-pad` の録音保持と `table-pad` の表データはブラウザー内ストレージです。Mirror Keepはアプリのファイルをミラーしますが、ブラウザーのIndexedDB/localStorageを自動コピーするものではありません。各アプリ内のJSONバックアップも定期的に保存してください。
- AI、文字起こし、外部データ、Worker同期はネット接続とサービス側の認証/APIキーが必要です。

## sync-worker のデプロイ
`sync-worker/wrangler.toml` のKV namespace bindingがCloudflare側の対象namespaceと一致することを確認してから、Cloudflare Wranglerで実行します。

```powershell
Set-Location "D:\path\to\sync-worker"
npx wrangler secret put SECRET_TOKEN
npx wrangler secret put GEMINI_API_KEY
# 必要な場合のみ
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

APIキーやトークンを `worker.js`、`wrangler.toml`、HTML、ZIPに書かないでください。`SECRET_TOKEN` は新しいランダム値にして、voice-pad / table-pad / 他クライアントの設定も同じ値へ更新します。`AUTH_TOKEN.local.txt` はアップロードZIPから除外してください。

## 限界
静的依存解析はHTML/CSS/JSに書かれたローカル参照を中心に調べます。動的import、実行時に生成されるファイル名、サーバーAPI、認証、外部サービスの内部処理までは複製できません。Mirror Keepのハッシュ検証はミラー内のファイル整合性を確認しますが、アプリ全機能のオフライン動作を保証するものではありません。

監査結果と未実施テストは `MIRROR-KEEP-REVIEW.md` を参照してください。


`sync-worker/index.incomplete.txt` はアップロード時点で途中切れのHTMLだったため、実行ファイルとして扱わず参考用に隔離しています。Workerのデプロイ対象は `worker.js` と `wrangler.toml` です。


## iPhoneホーム画面用（追加）

`iphone-home/` は voice-pad / table-pad をiPhoneから開くためのホーム画面ランチャーです。HTTPSでサイト公開した後、iPhoneのSafariで `.../iphone-home/` を開き、共有 →「ホーム画面に追加」を選びます。

注意: `mirror-keep/mirror_keep.py` はWindows/macOS用Tkinterデスクトップアプリです。この追加分はそのファイル同期エンジンをiPhoneへ移植するものではありません。iPhone上でファイルシステム全体のミラーやSHA-256復元を行う機能は別途サーバー/API化が必要です。voice-pad / table-pad はそれぞれ独立したPWAとしてもホーム画面に追加できます。
