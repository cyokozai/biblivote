# 実装ガイド — Biblivote

**バージョン**: 1.0
**作成日**: 2026-03-28
**対象**: 開発者（井上裕介）

---

## 1. 実装済み内容

### 1-1. ディレクトリ構成

```
biblivote/
├── index.html              ← メイン UI（Alpine.js ウィザード、8 画面）
├── src/
│   ├── validate.js         ← バリデーション関数（Jest + ブラウザ共用）
│   ├── books.js            ← Google Books API 呼び出し・デバウンス
│   ├── fingerprint.js      ← FingerprintJS OSS 連携（フォールバック付き）
│   ├── app.js              ← Alpine.js コンポーネント定義
│   └── style.css           ← スタイル（mobile-first、最大幅 480px）
├── gas/
│   ├── Code.gs             ← doGet / doPost メインロジック
│   └── appsscript.json     ← GAS マニフェスト（V8、ANYONE_ANONYMOUS）
├── e2e/
│   └── vote-flow.spec.js   ← Playwright E2E テスト（7 シナリオ）
├── __tests__/
│   ├── validate.test.js    ← Jest: バリデーション 27 ケース
│   ├── books.test.js       ← Jest: toHttps + debounce 9 ケース
│   └── gas.test.js         ← Jest: GAS バリデーション・CSRF 統合テスト
├── .devcontainer/          ← DevContainer 設定（Node 22 + clasp + Playwright）
├── _headers                ← Cloudflare Pages CSP ヘッダー
├── package.json
├── jest.config.js
└── playwright.config.js
```

### 1-2. フロントエンド（完了）

| 機能 | ファイル | 備考 |
|------|---------|------|
| ウィザード UI（8 画面）| `index.html` + `src/app.js` | Alpine.js CDN |
| バリデーション | `src/validate.js` | Jest テスト済み |
| 書籍検索 | `src/books.js` | Google Books API・デバウンス 300ms・メモリキャッシュ・API キー対応 |
| フィンガープリント | `src/fingerprint.js` | FingerprintJS v3 OSS + WebCrypto フォールバック |
| ハニーポット | `index.html` | `name="website"` 非表示フィールド |
| localStorage 重複チェック | `src/app.js` | `biblivote_voted` キー |
| reCAPTCHA v3 | `src/app.js` | `RECAPTCHA_SITE_KEY` 設定時に動的ロード・投票送信前に execute |

### 1-3. バックエンド GAS（完了）

| 機能 | 実装場所 |
|------|---------|
| CSRF トークン発行（`doGet?action=token`）| `gas/Code.gs` |
| CSRF トークン検証（CacheService ワンタイム）| `gas/Code.gs` |
| reCAPTCHA v3 検証（スコア ≥ 0.5）| `gas/Code.gs` |
| フィンガープリント重複チェック（logs シート）| `gas/Code.gs` |
| 入力バリデーション（全フィールド）| `gas/Code.gs` |
| votes シート書き込み | `gas/Code.gs` |
| logs シート書き込み | `gas/Code.gs` |

---

## 2. ローカル動作検証

### 2-1. DevContainer 起動

```bash
# VS Code コマンドパレット
Dev Containers: Reopen in Container
```

初回は `post_create.sh` が実行され `npm install` が走ります。

### 2-2. ユニットテスト実行

```bash
# コンテナ内ターミナルで実行
npm test

# ウォッチモード（TDD Red-Green-Refactor）
npm run test:watch

# カバレッジ計測
npm run test:coverage
```

**期待結果:**
```
Test Suites: 3 passed
Tests:       validate(27) + books(9) + gas(14) = 50 passed
```

### 2-3. 静的サーバー起動 → ブラウザ確認

```bash
# コンテナ内で実行（ポート 8080 が自動フォワードされる）
npm run serve
```

ブラウザで `http://localhost:8080` を開く。

**Dev モード動作:**
- `window.GAS_ENDPOINT = ''` の状態では送信ボタンが成功をシミュレート（600ms 待機後に完了画面）
- FingerprintJS CDN が取得できない場合は WebCrypto フォールバックを使用

### 2-4. E2E テスト実行

```bash
# Playwright（コンテナ内、サーバーは自動起動）
npm run test:e2e

# ヘッドフルモード（デバッグ用）
npx playwright test --headed

# 特定テストのみ
npx playwright test --grep "ハッピーパス"
```

---

## 3. GAS デプロイ手順

### 3-1. 前提条件

- Google アカウントでホストの `clasp login` 実行済み（`~/.clasprc.json` 存在）
- GAS プロジェクトとスプレッドシートが作成済み

### 3-2. スプレッドシートの準備

1. Google スプレッドシートを新規作成
2. シート名を `votes`、`logs` に変更（または Code.gs が自動作成）
3. スプレッドシートの URL から ID を取得
   例: `https://docs.google.com/spreadsheets/d/**{SPREADSHEET_ID}**/edit`

### 3-3. clasp セットアップ

```bash
# ホストのターミナルで実行（コンテナ外）

# GAS プロジェクト作成（初回のみ）
npx @google/clasp create --title "Biblivote" --type webapp

# または既存プロジェクトにリンク
npx @google/clasp clone {SCRIPT_ID}
```

`.clasp.json` が生成されます（`gas/` ディレクトリで実行または `rootDir` を指定）。

### 3-4. スクリプトプロパティの設定

GAS スクリプトエディタ → **プロジェクトの設定** → **スクリプト プロパティ**:

| プロパティ名 | 値 |
|------------|---|
| `SPREADSHEET_ID` | スプレッドシートの ID |
| `RECAPTCHA_SECRET` | reCAPTCHA v3 シークレットキー（TBD-008 確定後） |

### 3-5. GAS プッシュ & デプロイ

```bash
# コンテナ内で実行
npx clasp push

# Web App としてデプロイ（スクリプトエディタからも可）
npx clasp deploy --description "v1.0.0"
```

デプロイ後、**ウェブアプリ URL** を取得して `index.html` に設定:

```js
// index.html の設定箇所
window.GAS_ENDPOINT = 'https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec';
```

---

## 4. Cloudflare Pages デプロイ手順

### 4-1. 前提条件

- Cloudflare アカウント（無料）
- GitHub リポジトリに push 済み

### 4-2. Cloudflare Pages プロジェクト作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. GitHub リポジトリ `biblivote` を選択
4. ビルド設定:

| 項目 | 値 |
|------|---|
| Framework preset | None |
| Build command | （空欄） |
| Build output directory | `/` |
| Root directory | （空欄） |

5. **Save and Deploy** をクリック

### 4-3. 環境変数（不要）

このプロジェクトはビルドステップなし（Vanilla JS）のため、サーバーサイドの環境変数は不要です。
GAS エンドポイント URL など機密ではない設定値は `index.html` 内の `window.*` に直接記述します。

### 4-4. CSP ヘッダーの確認

`_headers` ファイルがリポジトリに含まれているため、Cloudflare Pages は自動的に CSP ヘッダーを適用します。
デプロイ後にブラウザの DevTools → Network タブでレスポンスヘッダーを確認:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

### 4-5. カスタムドメイン設定（TBD-004 確定後）

1. Cloudflare Pages のプロジェクト → **Custom domains** → **Set up a custom domain**
2. ドメインを入力（例: `vote.cloudnativedays.jp`）
3. DNS レコードの確認・追加

### 4-6. 継続的デプロイ

```bash
# main ブランチへの push で自動デプロイ
git push origin main

# プレビューデプロイ（PR 作成時に自動生成）
# 例: https://abc123.biblivote.pages.dev
```

---

## 5. 本番デプロイ前チェックリスト

### フロントエンド

- [ ] `window.GAS_ENDPOINT` に GAS Web App URL を設定
- [ ] `window.GRAFANA_URL` に Grafana ダッシュボード URL を設定（TBD-003）
- [ ] `window.REGISTER_URL` に参加登録 URL を設定（TBD-006）
- [ ] reCAPTCHA v3 サイトキーを取得・実装（TBD-008）
- [ ] クロスブラウザ動作確認（Chrome / Safari / Firefox / iOS Safari / Android Chrome）

### GAS バックエンド

- [ ] `SPREADSHEET_ID` スクリプトプロパティを設定
- [ ] `RECAPTCHA_SECRET` スクリプトプロパティを設定
- [ ] doPost のレスポンスタイムを実測（目標: P95 < 3,000ms）
- [ ] 重複投票チェックの動作確認（同一フィンガープリントで 409 が返ること）

### Cloudflare Pages

- [ ] CSP ヘッダーが正しく配信されているか確認
- [ ] カスタムドメイン設定（TBD-004 確定後）
- [ ] HTTPS リダイレクトが有効か確認

---

## 6. 未実装の後続タスク

| タスク | 優先度 | 対応する ADR/TBD |
|--------|--------|-----------------|
| reCAPTCHA v3 統合 | 高 | ADR-004, TBD-008 |
| Grafana ダッシュボード 8 パネル作成 | 中 | TBD-003 |
| カスタムドメイン設定 | 中 | TBD-004 |
| 参加登録リンク URL 差し替え | 中 | TBD-006 |
| GCP API キー取得（Google Books レート上限対応）| 低 | ADR-003, TBD-002 |
| 負荷テスト（100人/分 GAS 実行時間確認）| 低 | Phase 5 |
