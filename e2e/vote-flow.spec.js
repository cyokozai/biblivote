// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * E2E: 投票完了フロー
 * テストピラミッド 10% 枠 — Playwright (FR-029〜031 の受け入れ条件を検証)
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 投票済みフラグをクリアして毎回 TOP から開始
  await page.evaluate(() => localStorage.removeItem('biblivote_voted'));
  await page.reload();
});

// ===== ハッピーパス =====

test('TOP → Q1〜Q6 → 完了画面まで正常に通過できる', async ({ page }) => {
  // TOP
  await expect(page.getByText('クラウドネイティブ書店')).toBeVisible();
  await page.getByRole('button', { name: /はじめる/ }).click();

  // Q1: ジャンル選択
  await expect(page.getByText('興味のある技術書ジャンルは？')).toBeVisible();
  await page.getByText('コンテナ / Kubernetes').click();
  await page.getByText('インフラ / クラウド').click();
  await page.getByRole('button', { name: /次へ/ }).click();

  // Q2: 読書媒体（クリックで自動遷移）
  await expect(page.getByText('どちらで読むことが多いですか')).toBeVisible();
  await page.getByRole('button', { name: /電子派/ }).click();

  // Q3: 月間読書数
  await expect(page.getByText('月に何冊くらい')).toBeVisible();
  await page.getByRole('button', { name: '＋' }).click(); // 0 → 1
  await page.getByRole('button', { name: /次へ/ }).click();

  // Q4: 最もお世話になった本（手動入力）
  await expect(page.getByText('最もお世話になった技術書は？')).toBeVisible();
  await page.getByPlaceholder('例: Kubernetes完全ガイド').fill('Kubernetes完全ガイド');
  await page.getByRole('button', { name: /次へ/ }).click();

  // Q5: イチオシ技術書
  await expect(page.getByText('イチオシの技術書を教えてください')).toBeVisible();
  await page.getByPlaceholder('例: 入門 監視').fill('入門 監視');
  await page.getByRole('button', { name: /次へ/ }).click();

  // Q6: 参加申込確認
  await expect(page.getByText('クラウドネイティブ会議 2026 に申し込みましたか')).toBeVisible();
  await page.getByRole('button', { name: /はい、申し込みました/ }).click();

  // 送信（Dev モード: GAS_ENDPOINT 未設定のため成功シミュレート）
  await page.getByRole('button', { name: /送信する/ }).click();

  // 完了画面（FR-029）
  await expect(page.getByText('回答ありがとうございました！')).toBeVisible({ timeout: 5000 });

  // SNS シェアボタン（FR-031）
  await expect(page.getByText('𝕏 でシェアする')).toBeVisible();

  // Grafana リンクボタン（FR-030）
  await expect(page.getByText('投票結果を見る')).toBeVisible();
});

test('戻るボタンで前のステップに戻れる', async ({ page }) => {
  await page.getByRole('button', { name: /はじめる/ }).click();

  // Q1 で1ジャンル選択 → 次へ
  await page.getByText('コンテナ / Kubernetes').click();
  await page.getByRole('button', { name: /次へ/ }).click();

  // Q2 が表示されている
  await expect(page.getByText('どちらで読むことが多いですか')).toBeVisible();

  // 戻る
  await page.getByRole('button', { name: /戻る/ }).click();

  // Q1 に戻り、選択状態が保持されている
  await expect(page.getByText('興味のある技術書ジャンルは？')).toBeVisible();
  const checkbox = page.getByText('コンテナ / Kubernetes');
  await expect(checkbox.locator('..').locator('input')).toBeChecked();
});

// ===== バリデーション =====

test('Q1: ジャンル未選択では次へボタンが非活性', async ({ page }) => {
  await page.getByRole('button', { name: /はじめる/ }).click();
  await expect(page.getByRole('button', { name: /次へ/ })).toBeDisabled();
});

test('Q3: 月間読書数 100 を入力するとエラーメッセージが表示される', async ({ page }) => {
  await page.getByRole('button', { name: /はじめる/ }).click();
  await page.getByText('コンテナ / Kubernetes').click();
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.getByRole('button', { name: /電子派/ }).click();

  // 数値フィールドに 100 を入力して次へ
  await page.locator('input[type="number"]').fill('100');
  await page.getByRole('button', { name: /次へ/ }).click();

  await expect(page.getByText('0〜99の範囲')).toBeVisible();
});

test('Q4: 書籍タイトル未入力で次へを押すとエラーが表示される', async ({ page }) => {
  await page.getByRole('button', { name: /はじめる/ }).click();
  await page.getByText('コンテナ / Kubernetes').click();
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.getByRole('button', { name: /電子派/ }).click();
  await page.getByRole('button', { name: /次へ/ }).click(); // Q3
  await page.getByRole('button', { name: /次へ/ }).click(); // Q4（空）

  await expect(page.getByText('書籍タイトルを入力してください')).toBeVisible();
});

// ===== 不正対策 =====

test('投票済みユーザーがアクセスすると「回答済み」メッセージが表示される（FR-010）', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('biblivote_voted', '1'));
  await page.reload();
  await expect(page.getByText('回答済みです')).toBeVisible();
  // フォームは非表示
  await expect(page.getByRole('button', { name: /はじめる/ })).not.toBeVisible();
});

// ===== Q6 分岐メッセージ =====

test('Q6: "はい" を選択すると会場来訪メッセージが表示される（FR-026）', async ({ page }) => {
  // Q1〜Q5 を高速に通過
  await page.getByRole('button', { name: /はじめる/ }).click();
  await page.getByText('コンテナ / Kubernetes').click();
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.getByRole('button', { name: /紙派/ }).click();
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.locator('input[type="text"]').first().fill('テスト書籍');
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.locator('input[type="text"]').first().fill('テスト書籍2');
  await page.getByRole('button', { name: /次へ/ }).click();

  await page.getByRole('button', { name: /はい、申し込みました/ }).click();
  await expect(page.getByText('クラウドネイティブ書店を開催します')).toBeVisible();
});

test('Q6: "まだです" を選択すると参加登録リンクが表示される（FR-027）', async ({ page }) => {
  await page.getByRole('button', { name: /はじめる/ }).click();
  await page.getByText('コンテナ / Kubernetes').click();
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.getByRole('button', { name: /紙派/ }).click();
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.locator('input[type="text"]').first().fill('テスト書籍');
  await page.getByRole('button', { name: /次へ/ }).click();
  await page.locator('input[type="text"]').first().fill('テスト書籍2');
  await page.getByRole('button', { name: /次へ/ }).click();

  await page.getByRole('button', { name: /まだです/ }).click();
  await expect(page.getByText('参加登録する')).toBeVisible();
});
