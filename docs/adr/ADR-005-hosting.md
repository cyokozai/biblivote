# ADR-005: フロントエンドホスティング選定

**ステータス**: Proposed
**日付**: 2026-03-27
**決定者**: 井上裕介（cyokozai）
**レビュアー**: -

---

## コンテキスト

静的HTML/CSS/JSをホスティングする環境が必要。要件は以下の通り。

- 無料
- HTTPS対応
- カスタムドメイン対応（`cloudnativedays.jp/` サブパスまたはサブドメインの可能性あり）
- CSPヘッダーの設定が可能
- `git push` でデプロイできること

## 検討した選択肢

### 選択肢 A: GitHub Pages
**概要**: GitHubリポジトリから静的ファイルを公開する標準機能。
**メリット**:
- コードリポジトリと同一場所で管理
- 設定が最もシンプル
- カスタムドメイン対応（CNAME）
**デメリット**:
- CSPヘッダーのカスタム設定が不可（`_headers` ファイル非対応）
- カスタムHTTPヘッダーを追加できない
**コスト概算**: $0

### 選択肢 B: Cloudflare Pages
**概要**: CloudflareのCDNを使った静的サイトホスティング。
**メリット**:
- `_headers` ファイルでCSPヘッダーを柔軟に設定可能
- CDNが世界中にエッジを持ちロードが高速
- カスタムドメイン対応
- 無料枠: 500ビルド/月、無制限帯域
**デメリット**:
- GitHub Pagesより設定が1ステップ多い（Cloudflareアカウント必要）
**コスト概算**: $0

## 決定

**選択肢 B（Cloudflare Pages）を採用する。**

### 理由

CSPヘッダーの設定（ADR-004の不正対策に必須）はCloudflare Pagesの `_headers` ファイルで実現できる。GitHub Pagesは`meta`タグでCSPを設定する回避策があるが、HTTPヘッダーとして設定するCloudflare Pagesの方がセキュリティ的に確実。ロードも高速なのでモバイルユーザーの体験が向上する。

ただし、最終的なドメイン（TBD-004）がGitHub Pagesドメインで問題ない場合はGitHub Pagesへの変更も検討する。

### 前提条件

- Cloudflareアカウントを保有していること（または新規作成）
- カスタムドメインのDNS設定をCloudflareに向けられること（TBD-004の決定後）

## 影響・結果

**ポジティブな影響**:
- CSPヘッダーをHTTPヘッダーとして設定できる
- CDNによるロード高速化

**ネガティブな影響・受け入れるリスク**:
- Cloudflareアカウント設定が必要（30分程度）
- TBD-004のドメイン確定次第でDNS設定変更が必要

**やること (Action Items)**:
- [ ] Cloudflare Pagesプロジェクト作成 — 担当: 開発者 期限: 2026-03-31
- [ ] `_headers` ファイルにCSPヘッダー記述 — 担当: 開発者 期限: 2026-04-07
- [ ] TBD-004確定後にカスタムドメイン設定 — 担当: 開発者 期限: TBD-004の決定後

## 参考資料
- [Cloudflare Pages カスタムヘッダー](https://developers.cloudflare.com/pages/configuration/headers/)
- [GitHub Pages カスタムドメイン](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
