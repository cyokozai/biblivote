/**
 * src/validate.js
 * バリデーション関数群。Jest (Node.js) とブラウザの両環境で動作する。
 */

const VALID_GENRES = [
  'インフラ / クラウド',
  'コンテナ / Kubernetes',
  'プログラミング言語',
  'アーキテクチャ / 設計',
  'SRE / 運用 / 監視',
  'セキュリティ',
  'AI / 機械学習',
  'マネジメント / 組織',
  'その他',
];

const VALID_FORMATS = ['紙派', '電子派', '両方使い分ける'];

/**
 * Q1: ジャンル選択バリデーション
 * @param {string[]} genres
 * @returns {string|null} エラーメッセージ or null
 */
function validateGenres(genres) {
  if (!genres || genres.length === 0) {
    return '1つ以上選択してください';
  }
  const invalid = genres.filter((g) => !VALID_GENRES.includes(g));
  if (invalid.length > 0) {
    return '無効なジャンルが含まれています';
  }
  return null;
}

/**
 * Q2: 読書媒体バリデーション
 * @param {string|null} format
 * @returns {string|null}
 */
function validateFormat(format) {
  if (!format || !VALID_FORMATS.includes(format)) {
    return '読書媒体を選択してください';
  }
  return null;
}

/**
 * Q3: 月間読書数バリデーション
 * @param {number|string} value
 * @returns {string|null}
 */
function validateBooksPerMonth(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || isNaN(num)) {
    return '整数で入力してください';
  }
  if (num < 0 || num > 99) {
    return '0〜99の範囲で入力してください';
  }
  return null;
}

/**
 * Q4/Q5: 書籍タイトルバリデーション（必須、1〜50文字）
 * @param {string|null} title
 * @returns {string|null}
 */
function validateBookTitle(title) {
  if (!title || title.length === 0) {
    return '書籍タイトルを入力してください';
  }
  if (title.length > 100) {
    return '100文字以内で入力してください';
  }
  return null;
}

/**
 * Q4/Q5: ISBNバリデーション（任意、10桁または13桁の数字）
 * @param {string|null} isbn
 * @returns {string|null}
 */
function validateIsbn(isbn) {
  if (isbn == null || isbn === '') return null;
  if (!/^\d{10}$|^\d{13}$/.test(isbn)) {
    return 'ISBNは10桁または13桁の数字で入力してください';
  }
  return null;
}

/**
 * ハニーポット検出（非表示フィールドに値があればボット判定）
 * @param {string|undefined} value
 * @returns {boolean}
 */
function detectHoneypot(value) {
  return !!value;
}

// UMD export: Jest (Node.js) とブラウザの両方で動作
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VALID_GENRES,
    VALID_FORMATS,
    validateGenres,
    validateFormat,
    validateBooksPerMonth,
    validateBookTitle,
    validateIsbn,
    detectHoneypot,
  };
}
