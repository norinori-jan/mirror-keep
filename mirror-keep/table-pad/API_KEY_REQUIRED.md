# APIキーが必要なため初期実装から除外した情報源

この更新は「表作成に役立つ公開ドキュメント・学習ページへのリンク集」です。ページを開くリンク集なので、以下のAPIは呼び出さず、APIキーも収集・保存しません。

| 情報源 | 用途 | APIキー要否 | 公式情報・申請先 | 初期実装での扱い |
|---|---|---|---|---|
| NewsAPI | ニュース記事の検索・取得 | 必要 | https://newsapi.org/docs/authentication | ニュース自動取得は未接続。APIキー申請後に別途実装 |
| Alpha Vantage | 株価・金融時系列データ | 必要（API key） | https://www.alphavantage.co/support/#api-key | API呼び出しは未接続。APIキー申請後に別途実装 |
| Google Sheets API | Google Sheets のプログラム経由読み書き | 認証方式・操作によって必要 | https://developers.google.com/sheets/api/guides/authorizing | API連携は未接続。公開ヘルプへのリンクのみ利用 |
| Airtable Web API | Airtable のデータ取得・更新 | Personal Access Token 等の認証が必要 | https://airtable.com/developers/web/api/introduction | API連携は未接続。公開ヘルプへのリンクのみ利用 |

## 注意
- 上記は今回の「情報源リンク集」には接続していません。
- 表内の公式ページは申請・認証仕様の確認用リンクです。申請やキー発行は行っていません。
- 初期実装ではAPIキー不要の公開ドキュメントをブラウザーで開くだけで、外部APIへのデータ送信はしません。
