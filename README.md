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
- バージョン管理はWindows / macOSのPC版の機能です。iPhone版は別途設計します。

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
