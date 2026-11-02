# sync-worker: セキュリティとデプロイ

## 必須
この版は `SECRET_TOKEN` または `AUTH_TOKEN` が未設定の場合、OPTIONS以外のAPI要求を503で拒否します。Cloudflare Worker Secretsに `SECRET_TOKEN` を登録してください。

```bash
npx wrangler secret put SECRET_TOKEN
npx wrangler secret put GEMINI_API_KEY
# /ai で使うproviderに応じて必要なものだけ登録
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

`wrangler.toml` はKV binding名 `SYNC_KV` とnamespace IDを定義します。Cloudflare側のnamespaceが一致していることを確認してください。

## /inbox の再送
POST JSONに `clientId` を含めると、SHA-256由来の安定IDと90日間の冪等性キーを使います。同じclientIdの再送は同じ要求として扱われます。`clientId` のない旧クライアントは従来方式です。

Cloudflare KVはトランザクションDBではないため、厳密なexactly-once処理は保証しません。高い整合性が必要な用途はD1の一意制約またはDurable Objectを検討してください。

## 秘密情報
APIキーと認証トークンをソースコード・wrangler.toml・HTMLへ記載しないでください。`AUTH_TOKEN.local.txt`、`.wrangler`、`.git` は共有ZIPに含めないでください。
