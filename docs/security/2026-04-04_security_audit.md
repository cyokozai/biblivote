# セキュリティ脆弱性診断レポート

- **診断日時**: 2026-04-04 (DevContainer: `vsc-biblivote` 内で実行)
- **対象プロジェクト**: Biblivote — クラウドネイティブ技術書アンケート 2026
- **特定された技術スタック**: Vanilla JS / Alpine.js (CDN) / Google Apps Script / Node.js (devDependency)
- **総合セキュリティ評価**: 4 / 5

---

## 1. エグゼクティブサマリー

総合評価は **4（軽微な懸念）** 。致命的・高リスクの本番脆弱性は存在しない。
High 評価の依存脆弱性（`lodash.set` のプロトタイプ汚染）は **devDependency（テスト専用）** であり、本番ビルドには含まれない。
セキュリティヘッダーは充実しており、GAS バックエンドの多層防御（CSRF・reCAPTCHA・ハニーポット・重複チェック）も適切に実装されている。
改善推奨事項は3点（`credentials.json` の管理・CSP の `unsafe-inline` 制約・HSTS の明示設定）。

---

## 2. 依存関係の脆弱性 (SCA) — 評価: 4 / 5

- **使用ツール**: `npm audit --json` (コンテナ内実行)
- **Critical**: 0件 / **High**: 2件 / **Moderate**: 0件 / **Low**: 4件 / **Total**: 6件

> **重要**: High 2件はいずれも `devDependencies` のみに存在し、本番ビルド・デプロイ物には含まれない。

| パッケージ | 影響度 | 内容 | 影響範囲 | 対応バージョン |
|:---|:---:|:---|:---|:---|
| `lodash.set` | **High** | プロトタイプ汚染 (GHSA-p6mc-m468-83gw / CVSS 7.4) | `gas-mock-globals` 経由 (devOnly) | **修正版なし** |
| `gas-mock-globals` | **High** | `lodash.set` に起因 | devOnly | **修正版なし** |
| `@tootallnate/once` | Low | 不正な制御フロースコープ (GHSA-vpq2-c234-7xj6 / CVSS 3.3) | `jest-environment-jsdom` 経由 (devOnly) | `jest-environment-jsdom@30` (メジャー更新) |
| `http-proxy-agent` | Low | `@tootallnate/once` 経由 | devOnly | 同上 |
| `jest-environment-jsdom` | Low | 同上 | devOnly | `@30.3.0` |
| `jsdom` | Low | 同上 | devOnly | 同上 |

**補足**:
- `gas-mock-globals` の `lodash.set` High 脆弱性は upstream で修正版が未リリース。本番コードへの影響はないが、CI 環境でのプロトタイプ汚染リスクとして認識しておく。
- Low 4件は `jest-environment-jsdom` をメジャーアップデート（v29 → v30）することで解消可能。ただし jest v29 との互換性確認が必要。

---

## 3. 静的解析結果 (SAST) — 評価: 4 / 5

### 3-1. シークレット管理

| 項目 | 結果 |
|:---|:---|
| ソースコード内ハードコードシークレット | **なし** — `window.GAS_ENDPOINT` 等はすべて空文字で初期化、実値は `inject-env.js` がビルド時に注入 |
| `credentials.json` の存在 | **⚠️ 要確認** — プロジェクトルートに `credentials.json` が存在する（HARD RULE により内容は非確認）。`.gitignore` への追加と git 履歴からの削除を確認すること |

### 3-2. 危険なコードパターン

| パターン | 結果 |
|:---|:---|
| `eval()` / `Function()` / `document.write()` | **なし** |
| `innerHTML` / `outerHTML` への非サニタイズ代入 | **なし** — Alpine.js の `x-text` / `x-html` は使用箇所を確認済み。`x-html` の使用なし |
| `dangerouslySetInnerHTML` | **なし**（Alpine.js 環境のため対象外）|

### 3-3. セキュリティ設定

| 項目 | 状態 | 詳細 |
|:---|:---:|:---|
| CSP (Content-Security-Policy) | ✅ | `default-src 'self'` ベース、外部ドメインを明示的に許可リスト化 |
| `script-src 'unsafe-inline'` | ⚠️ | Alpine.js のインラインイベントハンドラー対応のため必要だが XSS 緩和策を弱める |
| X-Content-Type-Options | ✅ | `nosniff` 設定済み |
| X-Frame-Options | ✅ | `DENY` 設定済み |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` 設定済み |
| Permissions-Policy | ✅ | `geolocation=(), microphone=(), camera=()` |
| Strict-Transport-Security (HSTS) | ⚠️ | `_headers` に明示設定なし（Cloudflare が自動付与する可能性があるが要確認）|
| GAS CORS | ✅ | ワイルドカード設定なし。GAS Web App 側の公開設定（「全員」）は仕様通り |
| GAS デバッグログ | ✅ | `Logger.log` はエラー時のみ、GAS 実行ログに閉じており外部露出なし |
| CSRF 対策 | ✅ | ワンタイムトークン実装（`CacheService` + 使用後削除）|
| ハニーポット | ✅ | `website` フィールドで実装、人間には非表示 |
| reCAPTCHA v3 | ✅ | スコア 0.5 以上で通過 |
| 重複チェック | ✅ | FingerprintJS + ScriptProperties + CacheService の 3 層 |
| 入力バリデーション | ✅ | GAS 側でジャンル・フォーマット・文字数・ISBN 形式を検証 |
| HTTP（非暗号化）外部通信 | ✅ | `books.js` で `http://` → `https://` 変換処理を実装 |

---

## 4. 動的検証結果 (DAST) — 評価: 4 / 5

- **実行環境**: DevContainer (`vsc-biblivote`) 内
- **実行コマンド**: `npm test`（ユニットテスト 61件 / 全 PASS）
- **本格 DAST（ブラウザ起動）**: `.env` が未設定（`GAS_ENDPOINT` 等が空）のため `npm run build:local` は実行せず。静的確認のみ。

| 確認項目 | 結果 |
|:---|:---|
| ユニットテスト (61件) | ✅ 全 PASS |
| `console.log` / デバッグ出力（`src/*.js`）| ✅ なし |
| HTTP 非暗号化通信 | ✅ `http://` は `https://` 変換で対処済み |
| Node.js 非推奨警告 (`punycode` モジュール) | ⚠️ テスト実行時に `[DEP0040]` 警告あり（Node.js 内部の推移的依存。直接修正不可）|

---

## 5. 推奨対応策 (Remediation)

### 優先度: High（リリース前に確認必須）

**1. `credentials.json` の管理確認**

プロジェクトルートに `credentials.json` が存在する。GCP/Google API の認証情報が含まれる可能性がある。

```bash
# .gitignore に追加されているか確認
grep credentials.json .gitignore

# git 追跡対象になっていないか確認
git ls-files credentials.json
```

もし追跡されている場合は即座に git 履歴から削除する。

---

### 優先度: Medium（リリース後でも可）

**2. HSTS ヘッダーの明示設定**

Cloudflare Pages が自動付与しているか確認し、していない場合は `_headers` に追記する。

```
# _headers に追加
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**3. CSP の `unsafe-inline` 制限（Alpine.js 対応版）**

現状の `script-src 'unsafe-inline'` は XSS 緩和を弱める。Alpine.js v3 は CSP nonce に対応しているため、ビルドプロセスを導入できる場合は nonce 方式への移行を検討する。
ビルドステップなしの現構成では `unsafe-inline` は許容範囲内だが、将来的な改善項目として認識しておく。

**4. `jest-environment-jsdom` のアップデート（Low 4件解消）**

devDependency のみの対応。本番影響はないが CI 環境のクリーンアップとして推奨。

```bash
# jest v30 互換性確認後
npm install --save-dev jest-environment-jsdom@30
```
