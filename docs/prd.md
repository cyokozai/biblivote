# PRD: Biblivote — クラウドネイティブ書店 投票システム

**バージョン**: 0.2
**作成日**: 2026-03-27
**ステータス**: Review
**オーナー**: 井上裕介（cyokozai）
**元資料**: docs/tmp.md

---

## 1. エグゼクティブサマリー

Biblivote は、クラウドネイティブ会議 2026（2026/5/14-15、名古屋）の「書店コーナー」企画として技術書の投票を収集・可視化するWebアプリケーションである。

参加者・非参加者を問わず広く投票を募ることでイベントのプロモーション効果を高め、同時に未申し込みユーザーへの参加登録導線を設けることで集客施策にも機能する。投票結果はGrafanaダッシュボードでリアルタイム公開し、クロージングセッションで集計結果を発表する。

**なぜ今やるか:**
投票開始目標は2026-04-15（イベント約1ヶ月前）。本日2026-03-27から逆算すると実質3週間の開発期間しかなく、スコープを絞ったMVPに集中する必要がある。ゼロコスト・ゼロインフラ運用（GitHub Pages + GAS + スプレッドシート）の構成にすることで準備コストを最小化する。

---

## 2. 目標と成功指標

### ビジネス目標

| 目標 | 指標 (KPI) | 目標値 | 期限 |
|------|-----------|--------|------|
| 投票数の獲得 | 総投票数 | 200票以上 | 2026-05-15 |
| プロモーション効果 | SNSシェア数 | 50件以上 | 2026-05-15 |
| 申し込み促進 | Q6 No からの登録リンククリック率 | 10%以上 | 2026-05-15 |

### 技術目標

| 目標 | 指標 | 目標値 |
|------|------|--------|
| 書籍検索レスポンス | P95 レイテンシ | < 1,000ms |
| 投票送信レスポンス | P95 レイテンシ | < 3,000ms |
| 可用性 | 投票期間中アップタイム | 99.5%以上 |
| デプロイ頻度 | deploy/week（開発中） | ≥ 3 |
| 不正投票率 | 重複投票の割合 | < 1% |

---

## 3. スコープ

### In Scope (MVP)

- [ ] ウィザード形式6質問の投票フォーム（TOP + Q1〜Q6 + 完了画面）
- [ ] Google Books APIを使った書籍検索サジェスト（Q4・Q5）
- [ ] Google Apps Script (GAS) による投票受付・スプレッドシート書き込み
- [ ] FingerprintJS による重複投票防止（ブラウザ識別）
- [ ] reCAPTCHA v3 によるボット対策
- [ ] CSRF トークンによるリクエスト検証
- [ ] Grafana ダッシュボード（8パネル）
- [ ] SNSシェアボタン（投票完了画面）
- [ ] 参加登録未申込ユーザーへの登録リンク誘導

### Out of Scope (明示的に除外)

- ユーザーアカウント・ログイン機能: 匿名投票のみ
- 投票の修正・取り消し機能: 1投票1回限り
- メール通知: 運用コスト対効果が低い
- 管理者画面: スプレッドシートを直接操作
- 多言語対応: 日本語のみ

### 将来フェーズ (Phase 2+)

- 会場端末からの追加投票機能（管理者モード）: 来場者数に応じて検討
- 過去イベントの集計アーカイブ: イベント終了後のデータ活用

---

## 4. ユーザーストーリー

### ペルソナ

**Persona A — 一般投票者（非参加者含む）**: SNSでリンクを見つけてスマホで投票する技術者。フォームは2分以内に終えたい。書名が正確に打ちにくい場合もある。

**Persona B — カンファレンス参加申込済み参加者**: QRコードや案内からアクセスし、会場での書店コーナーを楽しみにしている。

**Persona C — 未申込の潜在参加者**: 投票フォームを通じてイベントの存在を知り、申し込みを検討する可能性がある。

### ストーリーマップ

| Epic | ユーザーストーリー | 受け入れ条件 | 優先度 |
|------|-----------------|------------|--------|
| 投票 | As a 投票者, I want to select my favorite tech book genres so that I can share my reading preferences | ・1つ以上選択しないと次へ進めない<br>・最大9ジャンルをチェックボックスで選択できる | Must |
| 投票 | As a 投票者, I want to search for a book by title so that I don't have to type the exact title manually | ・3文字以上入力で検索開始（デバウンス300ms）<br>・候補を最大5件表示（書影・タイトル・著者）<br>・選択すると入力欄に自動入力される | Must |
| 投票 | As a 投票者, I want to see my progress through the survey so that I know how much is left | ・画面上部に「Q2/6」形式のプログレスバー表示<br>・前の画面に戻って回答を修正できる | Must |
| 完了 | As a 投票者, I want to share my vote on SNS so that I can promote the event | ・完了画面でX(Twitter)シェアボタンが表示される<br>・シェアテキストに `#cloudnativekaigi` が含まれる | Must |
| 完了 | As a 投票者, I want to see voting results after voting so that I can see trends | ・完了画面にGrafanaダッシュボードへのリンクがある | Should |
| 集客 | As a 未申込ユーザー, I want to see an event registration link so that I can sign up if interested | ・Q6でNo選択時に登録リンクボタンが表示される<br>・リンクは新しいタブで開く | Must |
| 不正対策 | As a オペレーター, I want duplicate votes to be blocked so that the results are reliable | ・同一ブラウザからの2回目送信は409で拒否<br>・localStorageに投票済みフラグを保持 | Must |

---

## 5. 機能要件

### 5-1. フロントエンド（投票フォーム）

**概要**: 静的HTML + Vanilla JS（またはAlpine.js）のシングルページアプリ。ウィザード形式で1質問ずつ表示する。

**詳細要件:**

- FR-001: TOP画面にタイトル「クラウドネイティブ書店 アンケート」と趣旨説明（2〜3行）、「はじめる」ボタンを表示する
- FR-002: 画面上部に常時プログレスバーを表示する（Q1/6 形式）
- FR-003: 各画面に「戻る」ボタンを表示し、前の回答を修正できる
- FR-004: 画面遷移にスライドアニメーションを適用する（CSS transition）
- FR-005: 最大幅480pxで中央揃えのレスポンシブレイアウト
- FR-006: 本文フォントサイズ18px以上、質問タイトル24px以上
- FR-007: ボタン最小サイズ48×48px（推奨高さ56px）
- FR-008: 選択肢間の最小マージン12px（誤タップ防止）
- FR-009: フォーム送信前に全必須項目を検証し、エラーメッセージをインライン表示する
- FR-010: 投票済みユーザーがアクセスした場合、「既に回答済みです」のメッセージを表示しフォームを非表示にする

**Q1 — 技術書ジャンル（複数選択）:**

- FR-011: チェックボックス形式で以下9ジャンルを表示する
  - インフラ / クラウド
  - コンテナ / Kubernetes
  - プログラミング言語
  - アーキテクチャ / 設計
  - SRE / 運用 / 監視
  - セキュリティ
  - AI / 機械学習
  - マネジメント / 組織
  - その他
- FR-012: 1つ以上選択しなければ「次へ」ボタンを活性化しない

**Q2 — 読書媒体（単一選択）:**

- FR-013: カード型ボタン3択で表示する（紙派 / 電子派 / 両方使い分ける）
- FR-014: 選択するとカードにハイライトを付け、即座に次へ進む（自動遷移）

**Q3 — 月間読書数（数値入力）:**

- FR-015: `inputmode="numeric"` の数値入力フィールドを表示する
- FR-016: ＋/− ステッパーボタンで 0〜99 の範囲で増減できる
- FR-017: 範囲外の値入力時にバリデーションエラーを表示する

**Q4 — 最もお世話になった本（書籍検索）:**

- FR-018: テキスト入力欄に3文字以上入力後、300msデバウンスでGoogle Books APIを呼び出す
- FR-019: 検索候補を最大5件リスト表示する（書影40×56px + タイトル + 著者名）
- FR-020: 候補選択時、入力欄にタイトルを自動入力し、書影を拡大表示する（120×170px）
- FR-021: 候補を選ばずに手動入力も許容する（50文字以内）
- FR-022: プレースホルダー「例: Kubernetes完全ガイド」を表示する
- FR-023: 書影URLをHTTPSに変換して表示する（Google Books APIはHTTPで返すため）

**Q5 — イチオシ技術書（書籍検索）:**

- FR-024: Q4と同仕様。プレースホルダーは「例: 入門 監視」

**Q6 — 参加申込確認（単一選択）:**

- FR-025: カード型ボタン2択で表示する（はい / まだです）
- FR-026: 「はい」選択時、「当日、現地会場ではクラウドネイティブ書店を開催します！ぜひ現地に足を運んだ際はお立ち寄りください！」を表示する
- FR-027: 「まだです」選択時、「もしよければ参加登録しませんか？」と参加登録リンクボタン（別タブで開く）を表示する
- FR-028: 分岐メッセージ表示後、「送信する」ボタンを表示する

**完了画面:**

- FR-029: 「回答ありがとうございました！」のメッセージを表示する
- FR-030: Grafanaダッシュボードへのリンクボタンを表示する
- FR-031: Xシェアボタンを表示する（テキスト: 「技術書投票に参加しました！ #cloudnativekaigi」）

---

### 5-2. 書籍検索（Google Books API連携）

**概要**: フロントエンドからGoogle Books APIに直接リクエストを送り、書籍候補をリアルタイム表示する。

**詳細要件:**

- FR-040: エンドポイント `https://www.googleapis.com/books/v1/volumes` を使用する
- FR-041: クエリパラメータ: `q=intitle:{入力値}&langRestrict=ja&maxResults=5&fields=items(id,volumeInfo(title,authors,imageLinks,industryIdentifiers))`
- FR-042: レスポンスから `title`, `authors[0]`, `imageLinks.smallThumbnail`, ISBN-13 を取得する
- FR-043: 書影URLの `http://` を `https://` に置換して表示する
- FR-044: APIエラー時（ネットワーク障害・レート制限）はサジェストを非表示にし、手動入力を促すメッセージを表示する
- FR-045: キャッシュ戦略: 同一クエリ文字列のレスポンスをセッション中メモリキャッシュする（Map型）

---

### 5-3. バックエンド（Google Apps Script）

**概要**: GAS Web App として `doPost()` / `doGet()` を公開する。投票の受付・バリデーション・スプレッドシート書き込みを担う。

**doGet() 仕様:**

- FR-050: クエリパラメータ `action=token` の場合、CSRFトークン（UUIDv4相当）を生成してキャッシュに保存し、JSONで返す
  ```json
  { "csrfToken": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
  ```
- FR-051: クエリパラメータ `action=results` の場合、集計結果をJSONで返す（Grafana連携は別途スプレッドシートプラグイン経由のため、このエンドポイントは補助的）

**doPost() 処理フロー:**

- FR-052: リクエストボディを以下のスキーマで受け付ける
  ```json
  {
    "q1_genres": ["インフラ / クラウド", "コンテナ / Kubernetes"],
    "q2_format": "紙派",
    "q3_books_per_month": 3,
    "q4_best_book": "Kubernetes完全ガイド",
    "q4_isbn": "9784295009795",
    "q5_recommendation": "入門 監視",
    "q5_isbn": "9784873118642",
    "q6_registered": true,
    "fingerprint": "abc123...",
    "captchaToken": "03AGdBq24...",
    "csrfToken": "xyz789..."
  }
  ```
- FR-053: 処理順序（いずれかで失敗したら即座にエラーレスポンスを返す）
  1. CSRFトークン検証 → 不一致: `403 Forbidden` `{"error":"invalid_csrf"}`
  2. reCAPTCHA v3検証 → スコア < 0.5: `403 Forbidden` `{"error":"captcha_failed"}`
  3. フィンガープリント重複チェック（logsシート検索）→ 既存: `409 Conflict` `{"error":"already_voted"}`
  4. 入力バリデーション（下記）→ 不正: `400 Bad Request` `{"error":"validation_error","field":"..."}`
  5. votesシートに書き込み
  6. logsシートに書き込み
  7. `200 OK` `{"status":"ok"}`

**バリデーション仕様:**

| フィールド | ルール |
|-----------|--------|
| `q1_genres` | 配列・1要素以上・各値が9ジャンルのホワイトリスト内 |
| `q2_format` | `"紙派"` / `"電子派"` / `"両方使い分ける"` のいずれか |
| `q3_books_per_month` | 整数・0以上99以下 |
| `q4_best_book` | 文字列・1文字以上50文字以下 |
| `q4_isbn` | 任意。存在する場合は数字のみ10桁または13桁 |
| `q5_recommendation` | 文字列・1文字以上50文字以下 |
| `q5_isbn` | `q4_isbn` と同ルール |
| `q6_registered` | boolean |
| `fingerprint` | 文字列・1文字以上100文字以下 |

---

### 5-4. スプレッドシート設計

**votesシート（列定義）:**

| 列 | 名前 | 型 | 例 |
|----|------|----|----|
| A | timestamp | ISO 8601文字列 | 2026-04-20T10:30:00+09:00 |
| B | q1_genres | カンマ区切り文字列 | インフラ / クラウド,コンテナ / Kubernetes |
| C | q2_format | 文字列 | 紙派 |
| D | q3_books_per_month | 数値 | 3 |
| E | q4_best_book | 文字列 | Kubernetes完全ガイド |
| F | q4_isbn | 文字列（任意） | 9784295009795 |
| G | q5_recommendation | 文字列 | 入門 監視 |
| H | q5_isbn | 文字列（任意） | 9784873118642 |
| I | q6_registered | TRUE/FALSE | TRUE |

**logsシート（列定義）:**

| 列 | 名前 | 型 | 例 |
|----|------|----|----|
| A | timestamp | ISO 8601文字列 | 2026-04-20T10:30:00+09:00 |
| B | fingerprint | 文字列 | abc123... |
| C | user_agent | 文字列 | Mozilla/5.0... |
| D | result | `success` / `rejected_duplicate` / `rejected_captcha` / `error` | success |

---

### 5-5. Grafanaダッシュボード

**パネル一覧:**

| # | タイトル | パネルタイプ | データソース |
|---|---------|------------|-------------|
| 1 | 総投票数 | Stat | votesシート 行数カウント |
| 2 | ジャンル別人気度 | Bar chart | q1_genres カンマ分割集計 |
| 3 | 紙 vs 電子 | Pie chart | q2_format 値別カウント |
| 4 | 月間読書数分布 | Histogram | q3_books_per_month |
| 5 | お世話になった本 TOP10 | Table | q4_best_book 出現頻度TOP10 |
| 6 | イチオシ技術書 TOP10 | Table | q5_recommendation 出現頻度TOP10 |
| 7 | 参加登録率 | Gauge | q6_registered が TRUE の割合 |
| 8 | 投票推移 | Time series | timestamp 日別カウント |

- FR-070: 匿名アクセス（閲覧のみ）を有効化する
- FR-071: 自動リフレッシュを5分ごとに設定する

---

## 6. 非機能要件

| カテゴリ | 要件 | 測定方法 |
|---------|------|---------|
| 可用性 | 投票期間中（2026-04-15〜05-15）99.5%以上 | GitHub Pages / Cloudflare Pages 標準SLA |
| 書籍検索レイテンシ | P95 < 1,000ms | ブラウザDevTools Network |
| 投票送信レイテンシ | P95 < 3,000ms | GASのexecution logで計測 |
| 同時アクセス | 最大100人/分（GAS 無料枠：6分/分の実行時間制限） | GAS使用状況ダッシュボード |
| 対応ブラウザ | Chrome, Safari, Firefox（最新2バージョン） | BrowserStack / 手動テスト |
| 対応デバイス | スマートフォン、タブレット、PC | レスポンシブテスト |
| アクセシビリティ | キーボード操作対応、適切なaria属性 | axe DevTools |
| セキュリティ | XSS: innerHTML禁止、textContentのみ使用 | コードレビュー |
| セキュリティ | CSPヘッダー適用（後述） | SecurityHeaders.com |
| データ保持期間 | イベント終了後1ヶ月（2026-06-15まで） | スプレッドシート手動削除 |

**CSPヘッダー（Cloudflare Pages / GitHub Pages の設定ファイルで指定）:**

```
default-src 'self';
script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://cdn.jsdelivr.net;
connect-src 'self' https://www.googleapis.com https://script.google.com;
img-src 'self' https://books.google.com http://books.google.com data:;
style-src 'self' 'unsafe-inline';
frame-src https://www.google.com/recaptcha/;
```

---

## 7. 外部依存・インテグレーション

| システム | 役割 | 通信方向 | SLA依存度 | 障害時の挙動 |
|---------|------|---------|---------|-----------|
| Google Books API | 書籍検索サジェスト | Frontend → API | Low | サジェスト非表示、手動入力にフォールバック |
| Google Apps Script | 投票受付・DB書き込み | Frontend → GAS | High | 送信ボタンをdisabledにし「しばらく後でお試しください」を表示 |
| Google Spreadsheet | 投票データストア | GAS → Sheets | High | GAS経由のため同上 |
| FingerprintJS (CDN) | ブラウザ識別 | Frontend → CDN | Medium | FP取得失敗時は空文字で送信（GAS側でバリデーション通過させる） |
| reCAPTCHA v3 | ボット判定 | Frontend → Google | Medium | トークン取得失敗時は送信をブロックし、エラーメッセージを表示 |
| Grafana | 結果可視化 | Sheets → Grafana | Low | 完了画面のリンクは維持する（Grafana側のSLA依存） |
| GitHub Pages / Cloudflare Pages | フロントエンドホスティング | ユーザー → CDN | High | CDNの99.9%+ SLAに依存 |

---

## 8. セキュリティ設計

### 必須対策

| 脅威 | 対策 | 実装場所 |
|------|------|---------|
| XSS | `textContent` のみ使用。`innerHTML` 禁止 | Frontend全体 |
| XSS | CSPヘッダー設定 | Cloudflare Pages headers.json / `_headers` ファイル |
| 不正入力 | リクエストボディのスキーマ検証（ホワイトリスト） | GAS doPost() |
| 連続投票 | FingerprintJS + logsシートでの重複チェック | GAS + Frontend |
| 連続投票 | localStorage に `biblivote_voted=true` を保存 | Frontend |
| CSRF | ワンタイムトークン発行・検証 | GAS doGet() + doPost() |

### 推奨対策

| 脅威 | 対策 | 実装場所 |
|------|------|---------|
| ボット | reCAPTCHA v3（スコア0.5以上のみ通過） | Frontend + GAS |
| ボット | ハニーポットフィールド（非表示input、ボットが自動入力したら拒否） | Frontend + GAS |
| データ改ざん | スプレッドシート保護 + 変更履歴有効化 | Spreadsheet設定 |
| GAS URL漏洩 | 書き込みフィールドのホワイトリスト化（上記バリデーションで対応） | GAS |

---

## 9. タイムライン・マイルストーン

本日: 2026-03-27

| マイルストーン | 内容 | 目標日 |
|-------------|------|--------|
| M1: 要件定義完了 | PRD承認・ADR策定 | 2026-03-28 |
| M2: Phase 1 完了 | フロントエンドプロトタイプ + GAS基本実装 | 2026-04-03 |
| M3: Phase 2 完了 | FingerprintJS / reCAPTCHA / CSRFトークン実装 | 2026-04-07 |
| M4: Phase 3 完了 | カンファレンスデザイン適用 | 2026-04-10 |
| M5: Phase 4 完了 | Grafanaダッシュボード構築 | 2026-04-13 |
| M6: Phase 5 完了 | E2E / セキュリティ / 負荷テスト | 2026-04-15 |
| **M7: 投票開始** | **本番デプロイ・SNS告知** | **2026-04-15** |
| M8: 投票終了 | フォーム受付停止 | 2026-05-15 午後 |
| M9: 結果発表 | クロージングセッションでGrafana公開 | 2026-05-15 |
| M10: データ削除 | スプレッドシート削除 | 2026-06-15 |

### Phase 別タスク詳細

**Phase 1（〜2026-04-03）: プロトタイプ**
- [ ] リポジトリ初期化（GitHub Pages or Cloudflare Pages設定）
- [ ] HTMLウィザードフレームワーク実装（画面遷移・プログレスバー・戻るボタン）
- [ ] Q1〜Q6 フォーム画面実装（モックデータで動作確認）
- [ ] Google Books API 検索サジェスト実装（Q4・Q5）
- [ ] GAS doPost() 基本実装（バリデーション + スプレッドシート書き込み）
- [ ] GAS doGet() CSRFトークン発行実装

**Phase 2（〜2026-04-07）: セキュリティ**
- [ ] FingerprintJS CDN導入・fingerprint取得実装
- [ ] reCAPTCHA v3 サイトキー取得・フロントエンド実装
- [ ] GAS reCAPTCHA検証API呼び出し実装
- [ ] CSRFトークンフロー実装（取得 → 送信 → 検証）
- [ ] CSPヘッダー設定（`_headers` ファイル）
- [ ] ハニーポットフィールド実装

**Phase 3（〜2026-04-10）: デザイン適用**
- [ ] カンファレンスロゴ・配色・フォント適用（デザインアセット受け取り後）
- [ ] レスポンシブ調整（スマートフォン・タブレット・PC）
- [ ] アクセシビリティ対応（aria属性・キーボード操作）

**Phase 4（〜2026-04-13）: Grafana**
- [ ] Grafana インスタンス準備（新規 or 既存確認）
- [ ] スプレッドシートプラグイン設定
- [ ] 8パネルダッシュボード構築
- [ ] 匿名アクセス有効化

**Phase 5（〜2026-04-15）: テスト**
- [ ] E2Eテスト（投票フロー全画面）
- [ ] セキュリティテスト（XSS・重複投票・CSRF）
- [ ] 負荷テスト（100人/分を想定したGAS実行時間確認）
- [ ] クロスブラウザテスト（Chrome・Safari・Firefox）

---

## 10. テスト戦略（TDD アプローチ）

t_wada流 Red-Green-Refactor サイクルを採用する。

### テストピラミッド

```
        /E2E\        (10%) — Playwright: 投票完了フローのみ
       /------\
      /  統合   \     (20%) — GASテスト: doPost() バリデーション・DB書き込み
     /----------\
    /  ユニット    \   (70%) — Jest(or Vitest): バリデーション関数・書籍検索ロジック
   /--------------\
```

### ユニットテスト対象

| テスト対象 | テストケース例 |
|-----------|-------------|
| フィールドバリデーション関数 | q1_genres が空配列 → エラー |
| フィールドバリデーション関数 | q3_books_per_month が -1 → エラー |
| フィールドバリデーション関数 | q4_best_book が51文字 → エラー |
| フィールドバリデーション関数 | q4_isbn が12桁 → エラー |
| 書影URL変換 | `http://` → `https://` に変換される |
| 書籍検索デバウンス | 300ms以内の連続入力は1回のみAPIコール |
| ハニーポット検出 | 非表示フィールドに値があれば送信をブロック |

### 統合テスト対象（GAS）

| テストケース | 期待結果 |
|------------|---------|
| 正常な投票データを送信 | 200 OK、votesシートに1行追加 |
| 同一フィンガープリントで2回送信 | 409 Conflict |
| 無効なCSRFトークンで送信 | 403 Forbidden |
| q1_genres にホワイトリスト外の値 | 400 Bad Request |
| ハニーポットフィールドに値あり | 400 Bad Request |

---

## 11. 未解決事項・決定待ち

| ID | 内容 | 決定者 | 期限 |
|----|------|--------|------|
| TBD-001 | Q1選択肢の最終確定（カンファレンステーマへの調整） | イベント運営 | 2026-04-01 |
| TBD-002 | Google Books APIレート制限の実測確認（GCPキー取得要否） | 開発者 | 2026-04-03 |
| TBD-003 | Grafanaインスタンスの新規 or 既存利用 | イベント運営 | 2026-04-01 |
| TBD-004 | ドメイン/URL確定（`cloudnativedays.jp/bookstore-survey` 等） | イベント運営 | 2026-04-07 |
| TBD-005 | デザインアセット受け渡し（ロゴ・配色・フォント） | デザイン担当 | 2026-04-07 |
| TBD-006 | 参加登録リンクURL（Q6 Noの場合のリンク先） | イベント運営 | 2026-04-01 |
| TBD-007 | 会場端末での追加投票機能の有無 | イベント運営 | 2026-04-10 |
| TBD-008 | reCAPTCHA v3 サイトキー発行（Googleアカウント確認） | 開発者 | 2026-03-31 |

---

## Appendix: 用語集

| 用語 | 定義 |
|------|------|
| GAS | Google Apps Script。Googleサービスを操作できるサーバーレス実行環境 |
| FingerprintJS | ブラウザのフィンガープリント（固有識別子）を生成するJSライブラリ |
| reCAPTCHA v3 | Googleのボット判定API。スコア0〜1で人間らしさを判定する |
| CSRFトークン | クロスサイトリクエストフォージェリ対策のワンタイムトークン |
| ウィザード形式 | 複数ステップの入力フォームを1画面ずつ表示するUI設計パターン |
| デバウンス | 連続したイベント発火を一定時間待ってから1回だけ処理するテクニック |
