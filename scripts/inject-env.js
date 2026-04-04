/**
 * scripts/inject-env.js
 * 環境変数を index.html の window.* 設定値に注入するビルドスクリプト。
 *
 * 使用方法:
 *   # ローカル（Node 20+ の --env-file を利用）
 *   node --env-file=.env scripts/inject-env.js
 *
 *   # CI / Cloudflare Pages（環境変数がすでに process.env に存在する場合）
 *   node scripts/inject-env.js
 *
 * Cloudflare Pages のビルド設定:
 *   Build command     : node scripts/inject-env.js
 *   Build output dir  : /
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');

/**
 * index.html 内の `window.KEY = '既存値'` を env の値で置き換える。
 * 環境変数が未設定（空文字 / undefined）の場合は変更しない。
 */
function injectWindowVar(html, key, value) {
  // 未設定の場合は置換せずそのまま返す
  if (value == null || value === '') return html;
  const serializedValue = JSON.stringify(value);
  // 開始クォートと終了クォートを同一種類に揃えるためバックリファレンスを使用
  return html.replace(
    new RegExp(`(window\\.${key}\\s*=\\s*)(['"])(?:\\\\.|(?!\\2)[^\\\\\\r\\n])*\\2`, 'g'),
    (_, assignmentPrefix, quote) => `${assignmentPrefix}${serializedValue}`,
  );
}

let html = fs.readFileSync(HTML_PATH, 'utf8');

const vars = {
  GAS_ENDPOINT: process.env.GAS_ENDPOINT,
  GRAFANA_URL: process.env.GRAFANA_URL,
  RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
  GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
};

for (const [key, value] of Object.entries(vars)) {
  if (value == null || value === '') {
    console.log(`  - ${key} skipped (not set)`);
  } else {
    html = injectWindowVar(html, key, value);
    console.log(`  ✓ ${key} injected`);
  }
}

fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log('inject-env: done.');
