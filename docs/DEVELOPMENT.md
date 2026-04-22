# Development Guide — Biblivote

ローカル開発・テスト・デプロイの手順書です。

---

## 1. ローカル開発

### 前提条件

- VS Code + Dev Containers 拡張機能
- Docker Desktop

DevContainer を起動するとすべての依存関係（Node.js 20, clasp, Playwright など）が自動インストールされます。

```
コマンドパレット → "Dev Containers: Reopen in Container"
```

### セットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env   # .env を編集して各値を入力
```

### 開発サーバー起動

```bash
# .env の値を index.html に注入してローカルサーバーを起動
npm run build:local
npm run serve          # http://localhost:8080 で確認
```

---

## 2. テスト

t_wada 流 **Red → Green → Refactor** を厳守。

```bash
# ユニットテスト（Jest）
npm test

# ウォッチモード（TDD 用）
npm run test:watch

# カバレッジ計測（70% ライン閾値）
npm run test:coverage

# E2E テスト（Playwright）
npm run test:e2e
```

### テストカバレッジ対象

| ファイル | 内容 |
|---|---|
| `src/validate.js` | フォームバリデーション関数 |
| `src/books.js` | Google Books API・デバウンス |
| `gas/Code.gs` | GAS バックエンド（モック使用）|

---

## 3. デプロイ

### フロントエンド（GitHub Actions → GHCR Docker）

GitHub Release を作成するだけで自動ビルド・プッシュされます。

```
GitHub → Releases → "Draft a new release"
→ タグ v1.x.x を作成 → Publish
```

Actions が実行され以下のタグで GHCR にプッシュされます：
- `ghcr.io/cyokozai/biblivote:v1.x.x`
- `ghcr.io/cyokozai/biblivote:latest`

**手動トリガー**:

```
GitHub → Actions → "release" → "Run workflow" → tag を入力 → Run
```

**Docker コンテナ起動（本番）**:

```bash
docker run -p 80:80 \
  -e GAS_ENDPOINT="https://script.google.com/macros/s/xxxx/exec" \
  -e GRAFANA_URL="https://grafana.example.com/d/xxxx" \
  -e RECAPTCHA_SITE_KEY="6Lxxxxx" \
  -e GOOGLE_BOOKS_API_KEY="AIzaxxxxx" \
  ghcr.io/cyokozai/biblivote:latest
```

> `entrypoint.sh` が起動時に `index.html` の `window.*` を書き換えます。同一イメージを環境ごとに使い回せます。

---

### バックエンド（Google Apps Script）

#### clasp 認証（DevContainer 必須手順）

DevContainer 内では clasp の認証ファイルが `~/.clasprc.json` ではなく  
`/workspace/.clasprc.json` に配置されるため、**以下の手順が必須**です。

**① 環境変数を永続化する（初回のみ）**

```bash
echo 'export clasp_config_auth=/workspace/.clasprc.json' >> ~/.bashrc
source ~/.bashrc
```

**② ログイン（初回・トークン失効時）**

> Google の OOB フロー廃止により `--no-localhost` は使用不可。  
> VS Code のポートフォワード経由でブラウザ認証を行う。

```bash
# VS Code の「ポート」タブで 3000 番が自動フォワードされることを確認してから実行
clasp_config_auth=/workspace/.clasprc.json npx clasp login --creds /workspace/credentials.json
```

ブラウザが `http://localhost:3000` に自動オープンされます。  
Google アカウントで認証・権限を許可すると `/workspace/.clasprc.json` が更新されます。

ポート 3000 が自動フォワードされない場合:

```
VS Code → ターミナル横「ポート」タブ → 「ポートの転送」→ 3000 を追加
```

**③ ログイン確認**

```bash
clasp_config_auth=/workspace/.clasprc.json npx clasp list
# プロジェクト一覧が表示されれば認証完了
```

---

#### GAS コードのプッシュ・デプロイ

**コードのプッシュ**:

```bash
cd /workspace
clasp_config_auth=/workspace/.clasprc.json npx clasp push
```

**Web App としてデプロイ（GAS エディタ）**:

```
GAS エディタ → 右上「デプロイ」→「デプロイを管理」
→「新しいデプロイ」→ 種類: ウェブアプリ
→ 実行ユーザー: 自分 / アクセス: 全員（匿名を含む）
→「デプロイ」→ Web App URL をコピー
```

コピーした URL を `.env` の `GAS_ENDPOINT` に設定します。

---

#### スクリプトプロパティの設定

```
GAS エディタ → 「プロジェクトの設定」→「スクリプトプロパティ」
```

| プロパティ名 | 値の例 | 備考 |
|---|---|---|
| `SPREADSHEET_ID` | `1BxiM...` | SpreadsheetのURL末尾のID |
| `RECAPTCHA_SECRET` | `6Lxxxxx` | **サーバー専用・絶対に外に出さない** |
| `STORE_OPEN_ISO` | `2026-05-14T10:00:00+09:00` | 書店コーナー開店時刻 |
| `STORE_CLOSE_ISO` | `2026-05-15T18:00:00+09:00` | 書店コーナー閉店時刻 |

---

#### votes シートの準備

既存の votes シートに列ヘッダーを追加（新規投票から自動記録）:

```
列J: voteId    列K: redeemed
```

> 既存行（voteId なし）はチケット対象外として扱います。

---

#### 動作確認

```bash
# check_ticket エンドポイントの疎通確認
curl "https://script.google.com/.../exec?action=check_ticket&voteId=test"
# 期待値: {"exists":false,"status":200,"ok":true}

# CSRF トークン取得確認
curl "https://script.google.com/.../exec?action=token"
# 期待値: {"csrfToken":"xxxx-xxxx-...","status":200,"ok":true}
```

---

## 4. デプロイ前チェックリスト

| 項目 | 確認内容 |
|---|---|
| `GAS_ENDPOINT` | 本番 Web App URL が設定されているか |
| `RECAPTCHA_SITE_KEY` | 有効な reCAPTCHA v3 サイトキーが設定されているか |
| `SPREADSHEET_ID` | GAS スクリプトプロパティに設定されているか |
| `STORE_OPEN_ISO` / `STORE_CLOSE_ISO` | 開閉店時刻が JST ISO 形式で設定されているか |
| votes シート | 列J（voteId）・列K（redeemed）ヘッダーが追加されているか |
| `credentials.json` | `.gitignore` に含まれ、リポジトリに含まれていないか |
| セキュリティヘッダー | `_headers` ファイルの CSP 等が本番で適用されているか |

---

## 5. 運用・監視

| 監視対象 | 方法 |
|---|---|
| GAS エラー | GAS エディタ「実行数」タブで毎日確認 |
| 不正投票 | `logs` シートで rejected_* 件数を確認 |
| チケット引換状況 | `votes` シートの `redeemed` カラムを確認 |
| Grafana | ダッシュボードが5分ごとに更新されているか確認 |
