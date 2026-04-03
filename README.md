# Biblivote

<p align="center">
	<img src="image/biblivote-icon.png" width="200" height="200" alt="Biblivote Icon">
</p>

[CloudNative Kaigi 2026](https://cloudnativedays.jp/archives/cloudnativekaigi2026/)（2026/5/14-15、名古屋）の書店コーナー向け技術書投票 Web アプリ。

## 技術スタック

| レイヤ | 技術 |
| :--- | :--- |
| Frontend | Vanilla JS / Alpine.js (CDN) |
| Backend | Google Apps Script (GAS) |
| Database | Google Spreadsheet |
| Hosting | GitHub Pages / Cloudflare Pages |
| 書籍検索 | Google Books API |
| セキュリティ | reCAPTCHA v3 / FingerprintJS |
| 可視化 | Grafana |

---

## ローカル開発

- **Node.js**: v20 以上推奨（`--env-file` フラグを使用するため）

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env   # → .env を編集

# ローカルサーバー起動
npm run build:local
npm run serve          # http://localhost:8080
```

---

## クレデンシャル設定

### `.env`（フロントエンド）

| キー | 説明 |
| :--- | :--- |
| `GAS_ENDPOINT` | デプロイ済み GAS Web App の URL |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA v3 サイトキー |
| `GOOGLE_BOOKS_API_KEY` | Google Books API キー（省略可） |
| `GRAFANA_URL` | 結果表示ダッシュボード URL |

### GAS スクリプトプロパティ（バックエンド）

| キー | 説明 |
| :--- | :--- |
| `RECAPTCHA_SECRET` | reCAPTCHA v3 シークレットキー |
| `SPREADSHEET_ID` | 投票データ保存先スプレッドシート ID |

> GAS スクリプトプロパティは、GAS エディタの「プロジェクトの設定 → スクリプトプロパティ」から設定します。

---

## デプロイ

### フロントエンド（GitHub Pages / Cloudflare Pages）

環境変数を `index.html` に注入してからプッシュします。

```bash
# 環境変数を shell または .env から読み込んで index.html を生成
# CI の場合は環境変数を設定してください
npm run build

# 変更をコミットしてプッシュ
git add index.html
git commit -m "docs: build index.html with production environment variables"
git push origin main
```

GitHub Pages は `Settings → Pages` でブランチを `main` に設定してください。

### バックエンド（GAS）

```bash
# clasp 初回認証（ホスト側で実行）
npx @google/clasp login

# GAS にプッシュ
npx @google/clasp push
```

プッシュ後、GAS エディタから「デプロイ → 新しいデプロイ」で **Web App** として公開し、取得した URL を `GAS_ENDPOINT` に設定します。

---

## テスト

```bash
npm test                # ユニットテスト (Jest)
npm run test:watch      # ウォッチモード
npm run test:coverage   # カバレッジ計測
npm run test:e2e        # E2E テスト (Playwright)
```

---

## ディレクトリ構成

```
biblivote/
├── index.html        # メイン HTML
├── src/              # バリデーション・書籍検索・フィンガープリント
├── gas/              # GAS バックエンド (Code.gs)
├── scripts/          # 環境変数注入スクリプト
├── __tests__/        # Jest ユニットテスト
├── e2e/              # Playwright E2E テスト
└── docs/             # PRD / ADR / SLO
```

---

© 2026 [cyokozai](https://github.com/cyokozai) / CloudNative Days
