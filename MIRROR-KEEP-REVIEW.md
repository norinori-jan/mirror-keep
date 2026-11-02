# Mirror Keep / アプリ監査レポート

作成日: 2026-10-31  
対象: アップロードされた `table-pad.zip` / `voice-pad.zip` / `sync-worker.zip`

## 今回の修正

### table-pad
- `sw.js` に Git のマージ競合マーカー（`<<<<<<<` / `=======` / `>>>>>>>`）が残っており、Service Worker が JavaScript として解析できない状態でした。
- upstream 側の公式データ連携スクリプト群と、stash 側のニュース軽量スクリプトを両方残す形で `tp-cache-v24` に統合しました。
- オフライン時にキャッシュ済みの `index.html` を返す処理を統合しました。
- キャッシュ削除を `tp-cache-*` に限定しました。他アプリの CacheStorage を消さないためです。
- `news-compare.js` は元ファイル自体に複数の JavaScript 構文エラーがありました。元内容は `news-compare.js.disabled.txt` として保全し、壊れたコードが Service Worker から注入されないようにしました。ニュース比較機能はこの版では有効化していません。
- `localStorage` 保存失敗を握りつぶさず、容量不足時に画面へ警告するようにしました。
- 既存の全表JSON入出力ダイアログに JSON ファイル保存ボタンを追加しました。

### voice-pad
- IndexedDB (`voice-pad`, store `rec`) を使う既存保存方式は維持しました。
- 録音Blobを含む端末データをJSONに書き出し、JSONから既存データへ追加・同一ID上書きで復元するUIを追加しました。
- `/inbox` へのメモ・表・フロー送信に安定した `clientId` を付け、通信応答が失われて再送した場合の重複を抑制します。
- Service Worker のキャッシュ削除を `voice-pad-*` に限定し、オフライン時のトップ画面フォールバックを追加しました。
- localhost（`http://localhost` / `127.0.0.1`）でも Service Worker を登録できるようにしました。

### sync-worker
- 認証トークンが未設定の場合、従来は `/attachments` と通常同期ルートが認証なしで利用できる可能性がありました。すべてのデータルートでトークン未設定を `503` として拒否する fail-closed 動作に変更しました（OPTIONSプリフライトは除く）。
- `/inbox` は `clientId` がある場合、SHA-256由来の安定IDと90日TTLの冪等性記録を使います。ACK後に同じ要求が再送されても、配達済み項目を再作成しません。
- `clientId` のない既存クライアントは従来どおりランダムIDで動作します。
- Cloudflare KV はトランザクションDBではありません。今回の変更で通常の再送重複は抑制しますが、KVの結果整合性・並行実行の制約まで含めた厳密なexactly-once保証ではありません。
- `sync-worker/index` はWorkerの `main = "worker.js"` とは別のHTMLファイルですが、末尾が省略プレースホルダーで途切れ、script閉じタグもありません。`index.incomplete.txt` として隔離し、Worker本体には組み込んでいません。対応する `manifest.json` 等もZIP内にありません。

## 保存方式とオフライン範囲

| アプリ | 端末内保存 | オフラインでできること | オンラインが必要なこと |
|---|---|---|---|
| table-pad | localStorage (`tp_tables_v1`, `tp_cur` 等) | 保存済み表・画面、CSV等のローカル処理 | 外部公式データ取得、Worker同期・受信 |
| voice-pad | IndexedDB (`voice-pad` / `rec`) | 録音の保持、保存済みテキストの閲覧・編集、JSONバックアップ | `/transcribe`、`/ai`、`/inbox` 送信 |
| sync-worker | Cloudflare KV | なし（サーバー側） | すべてのAPI |

- table-pad の全表JSONバックアップはアプリ内ダイアログからファイル保存できます。
- voice-pad は設定・APIトークンをバックアップJSONに含めません。録音・文字起こしレコードのみです。
- Service Worker は HTTPS 配信、またはブラウザーが許可する localhost で動きます。`file://` で直接開く方法では動きません。
- ブラウザーのストレージはOSの通常ファイルとは別です。ブラウザーのサイトデータ削除、プロファイル削除、端末故障に備えてJSONバックアップを別媒体にも保存してください。
- 外部API、AI、認証、Cloudflare Worker、KVはアプリファイルをコピーしてもローカル化されません。

## Mirror Keep 本体

`mirror-keep/mirror_keep.py` は Windows / macOS 用の Tkinter GUI です。

- 複数アプリのフォルダーを登録し、今回更新するアプリをチェックで選択できます。
- 初回は全対象ファイルをコピーし、2回目以降はSHA-256で変更・追加・削除を判定して差分だけ更新します。
- 上書き・削除対象の旧ファイルをタイムスタンプ付きバックアップへ保存します。
- 最新バックアップから復元できます。
- SHA-256検証、ローカル参照候補、外部ホスト、未解決参照候補を表示します。
- `.git`、`.wrangler`、`node_modules`、ビルドキャッシュ、`.env`、認証トークン名・APIキー名・秘密鍵などはコピー対象から除外します。
- 静的解析では動的import、実行時に組み立てるURL、サーバー側依存を完全には検出できません。依存関係を完全に証明するものではありません。

## 検証結果

実行した検査:
- table-pad / voice-pad のインラインJavaScript構文チェック
- 配布対象の `.js` ファイル構文チェック
- Worker ES module 構文チェック
- table-pad Service Worker の precache 対象ファイル存在確認
- Worker のローカルモック試験: トークン未設定時の拒否、clientId再送の同一ID化、ACK後の再送で再作成しないこと
- Mirror Keep の一時フォルダー統合試験: 初回コピー、差分更新、削除バックアップ、SHA-256検証、最新バックアップ復元、秘密ファイル除外

未実施:
- 実際のブラウザー（Chrome / Safari）での画面操作・録音・PWAインストール試験
- 実際のCloudflareアカウント/KVでのデプロイ試験
- Windows実機・macOS実機でのGUI起動試験
- 実データを使ったバックアップ復元試験

したがって、構文・ローカルロジックの検査は通過していますが、実機での完全動作確認済みとはしていません。

## セキュリティ注意（重要）

アップロードされた `sync-worker.zip` には、ファイル名が `AUTH_TOKEN.local.txt` のローカルトークンファイルと `.wrangler` のローカル状態が含まれていました。これらの内容はレポートにも配布ZIPにも含めていません。Git履歴も配布ZIPから除外しました。

このトークンが実際に使用中のWorker認証トークンである可能性を考慮し、Cloudflare側の `SECRET_TOKEN`（または `AUTH_TOKEN`）を新しい値にローテーションし、ローカルのトークンファイルを通常のソース共有ZIPへ入れない運用にしてください。APIキーも `wrangler secret put` で登録し、ソースファイルやZIPに書かないでください。
