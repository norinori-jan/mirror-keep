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

## 使い方
1. 保存先を選びます（元アプリのフォルダーの内側・外側には置かないでください）。
2. 「アプリを追加」で `table-pad`、`voice-pad`、その他のアプリのフォルダーを登録します。
3. 今回更新する行の「✓」をクリックして選択します。週ごとに対象アプリを切り替えられます。
4. 「構成を調査」でファイル数、サイズ、ローカル参照候補、外部ホスト、未解決候補を確認します。
5. 「差分更新」を押します。初回は全コピー、次回からSHA-256で変更・追加・削除を判定します。
6. 「SHA-256検証」でミラーを確認します。
7. 問題があれば「最新バックアップを復元」で直前更新前の状態に戻します。

アプリの一部機能だけを試す場合は、その機能フォルダーを別プロジェクトとして登録できます。ただし依存ファイルを静的解析で完全に特定できないため、通常はアプリ全体をミラーする方法を推奨します。

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
