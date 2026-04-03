/**
 * src/books.js
 * Google Books API 連携・デバウンス処理。
 * Jest (Node.js) とブラウザの両環境で動作する。
 */

/** セッション内メモリキャッシュ（同一クエリの重複 API コールを防ぐ） */
const _cache = new Map();

/**
 * 書影 URL の http:// を https:// に変換する（FR-043）
 * @param {string|null|undefined} url
 * @returns {string|null|undefined}
 */
function toHttps(url) {
  if (url == null) return url;
  return url.replace(/^http:\/\//, 'https://');
}

/**
 * デバウンス関数を生成する
 * 300ms 以内の連続呼び出しは最後の1回のみ実行される（FR-018）
 * @param {Function} fn
 * @param {number} delay ミリ秒
 * @returns {Function}
 */
function createDebounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Google Books API で書籍を検索する（FR-040〜FR-044）
 * @param {string} query 検索クエリ（3文字以上）
 * @returns {Promise<Array<{id, title, author, thumbnail, isbn}>>}
 */
async function searchBooks(query) {
  if (!query || query.length < 3) return [];

  if (_cache.has(query)) return _cache.get(query);
const params = new URLSearchParams({
  q: `intitle:${query}`,
  langRestrict: 'ja',
  maxResults: '5',
  fields: 'items(id,volumeInfo(title,authors,imageLinks,industryIdentifiers))',
});

const apiKey =
  typeof window !== 'undefined' ? window.GOOGLE_BOOKS_API_KEY : '';
if (apiKey) params.set('key', apiKey);

const res = await fetch(
  `https://www.googleapis.com/books/v1/volumes?${params}`
);
if (!res.ok) throw new Error(`Books API error: ${res.status}`);

  const data = await res.json();
  if (!data.items) return [];

  const results = data.items.map((item) => {
    const info = item.volumeInfo;
    const isbn13 =
      info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')
        ?.identifier ?? '';
    return {
      id: item.id,
      title: info.title ?? '',
      author: info.authors?.[0] ?? '',
      thumbnail: toHttps(info.imageLinks?.smallThumbnail ?? null),
      isbn: isbn13,
    };
  });

  _cache.set(query, results);
  return results;
}

// UMD export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { toHttps, createDebounce, searchBooks };
}
