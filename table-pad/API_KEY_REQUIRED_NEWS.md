# API_KEY_REQUIRED.md — ニュース・金融データ連携（未接続一覧）

この一覧のサービスは**情報源として案内するだけで、今回の実装ではAPIを呼び出しません**。情報源タブからは各公式サイトへ移動でき、対応ページにはGoogle翻訳リンクも表示します。リンクを開くだけなら、以下のAPIキーは不要です。

## APIキー／認証が必要なサービス（実装対象から除外・未接続）

| サービス | 用途 | 認証 | 公式情報 | 状態 |
|---|---|---|---|---|
| The Guardian Open Platform | Guardianの記事検索・メタデータ取得 | APIキーが必要 | https://open-platform.theguardian.com/documentation/ | 未接続。今後の自動集約候補 |
| The New York Times Developer API | NYTの記事検索・記事メタデータ | APIキー／利用条件の確認が必要 | https://developer.nytimes.com/ | 未接続。記事本文の再配信・翻訳利用は別途確認 |
| NewsAPI | 複数媒体の記事検索・トップニュース | APIキーが必要 | https://newsapi.org/docs/authentication | 未接続。無料枠・商用利用条件を要確認 |
| Alpha Vantage News & Sentiment | 銘柄・市場テーマに関するニュースとセンチメント | APIキーが必要。一部機能は有料プラン条件あり | https://www.alphavantage.co/documentation/#news-sentiment | 未接続 |
| Alpha Vantage Stock APIs | 株価・金融時系列 | APIキーが必要。一部データはプラン／市場データ条件あり | https://www.alphavantage.co/documentation/ | 未接続 |

## APIキーなしで使える可能性があるリンク・フィード

- The GuardianのRSSは個人・非商用利用向けに案内されています。利用条件を確認してください: https://www.theguardian.com/help/feeds
- ニュースサイトの通常のウェブページは、サイト閲覧の範囲でAPIキー不要です。ただし購読記事は契約が必要な場合があります。
- Google Newsの検索／RSSは、内容・利用可能性・配信仕様が変更される場合があります。安定したプログラム連携の保証とはみなさないでください。

## 翻訳・要約・本文取り込みに関する注意

- 今回は原文サイトと翻訳リンクを開く機能のみです。記事本文を自動取得、保存、再配信、翻訳、要約する機能は実装していません。
- 記事の全文取り込み・翻訳・要約をアプリ内で自動化する場合、媒体ごとのAPI利用規約、著作権、購読制限、翻訳サービスの利用条件を確認する必要があります。
- APIキーを `index.html` やGitHubの公開リポジトリに直接埋め込まないでください。自動集約を実装する場合は、サーバー側のプロキシ／環境変数などで秘密情報を保護する設計が必要です。

## 今回の実装範囲

- 世界・株式・金融ニュース媒体へのリンクを追加
- キーワードを入力し、Google News、New York Times、The Guardian、Reuters、CNBC、Yahoo Financeで検索できるようにする
- 情報源カードに原文リンクと日本語翻訳リンクを表示
- リンクの複数選択、一括コピーに対応
- 上記APIサービスへの接続、APIキーの取得・保存、記事本文の自動翻訳・要約は行わない
