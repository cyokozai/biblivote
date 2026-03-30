/**
 * src/fingerprint.js
 * FingerprintJS OSS v3 を使ったブラウザフィンガープリント生成。
 * CDN 読み込み失敗時は WebCrypto API のシンプルハッシュにフォールバックする（ADR-004）。
 */

/**
 * ブラウザフィンガープリントを取得する
 * @returns {Promise<string>} 32文字の識別子
 */
async function getFingerprint() {
  try {
    // FingerprintJS は index.html で CDN から読み込む
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch {
    // フォールバック: UA + 現在時刻の SHA-256 ハッシュ（先頭32文字）
    return _fallbackHash(navigator.userAgent + Date.now());
  }
}

/**
 * WebCrypto API で文字列の SHA-256 ハッシュを計算する
 * @param {string} str
 * @returns {Promise<string>}
 */
async function _fallbackHash(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

// UMD export（Jest テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getFingerprint, _fallbackHash };
}
