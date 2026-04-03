# Biblivote — CloudNative Kaigi 2026 書店コーナー投票システム

Biblivote は、[CloudNative Kaigi 2026](https://cloudnativedays.jp/archives/cloudnativekaigi2026/)（2026/5/14-15、名古屋 / Nagoya）の「書店コーナー」企画として、技術書の投票を収集・可視化するWebアプリケーションです。

## 🚀 アプリの概要
参加者がお気に入りの技術書に投票し、その結果をリアルタイムで Grafana ダッシュボードに反映します。
ウィザード形式の直感的な UI で、Google Books API を活用した書籍検索サジェスト機能を備えています。

## 🛠 使用リソース・技術スタック

| 役割 | 技術 / サービス | 理由 |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JS / CSS / HTML | 軽量・高速な動作とメンテナンス性の両立 |
| **Backend** | Google Apps Script (GAS) | サーバー管理不要、Google サービスとの親和性 |
| **Database** | Google Spreadsheet | データの視認性が高く、編集・管理が容易 |
| **Hosting** | GitHub Pages / Cloudflare Pages | 静的サイトとしてのゼロコスト運用 |
| **API (Search)** | Google Books API | 膨大な技術書データベースからの検索サジェスト |
| **Security** | reCAPTCHA v3 / FingerprintJS | ボット対策および重複投票の防止 |
| **Visualization**| Grafana | 投票結果のリアルタイム集計・可視化 |

## 📦 開発・起動方法

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env` を作成し、必要な値を記入してください。
```bash
cp .env.example .env
```

### 3. ローカル起動
環境変数を `index.html` に注入し、ローカルサーバーを起動します。
```bash
npm run build:local
npm run serve
```
ブラウザで `http://localhost:8080` を開きます。

## 🔑 クレデンシャルの登録

以下の環境変数を `.env` および GAS の「スクリプトプロパティ」に設定する必要があります。

### フロントエンド用 (.env)
- `GAS_ENDPOINT`: デプロイした GAS Web App の URL
- `RECAPTCHA_SITE_KEY`: Google reCAPTCHA v3 のサイトキー
- `GOOGLE_BOOKS_API_KEY`: Google Books API キー（オプション）
- `GRAFANA_URL`: 結果表示用ダッシュボードの URL

### バックエンド用 (GAS スクリプトプロパティ)
- `RECAPTCHA_SECRET`: Google reCAPTCHA v3 のシークレットキー
- `SPREADSHEET_ID`: 投票データを保存するスプレッドシートの ID

## 🌐 デプロイと構成

### デプロイ先
- **フロントエンド**: GitHub Pages または Cloudflare Pages
- **バックエンド**: Google Apps Script (Web App として公開)

### なぜこの構成か？
- **コストゼロ**: すべて無料枠の範囲内で運用可能。
- **インフラ管理不要**: サーバーのパッチ当てやスケーリングの心配がありません。
- **迅速な開発**: プロトタイプから本番投入までを短期間で完結させるため。

## 🧪 テスト

### ユニット / 統合テスト (Jest)
```bash
npm test
```

### E2E テスト (Playwright)
```bash
npm run test:e2e
```

## 📂 ディレクトリ構造
- `src/`: フロントエンドのソースコード (Logic, Style)
- `gas/`: Google Apps Script のバックエンドコード
- `__tests__/`: Jest によるユニット・統合テスト
- `e2e/`: Playwright によるエンドツーエンドテスト
- `docs/`: PRD, ADR などの設計ドキュメント
- `scripts/`: 環境変数注入用スクリプト

---
© 2026 [cyokozai](https://github.com/cyokozai) / CloudNative Days Tokyo
