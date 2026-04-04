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
    // フォールバック: localStorage に安定した識別子を保存して再利用する（ADR-004）
    // Date.now() や Math.random() を含めると毎回異なる fingerprint になるため除外する
    let fallbackId = localStorage.getItem('biblivote_fallback_id');
    if (!fallbackId) {
      const stableInput = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ].join('|');
      fallbackId = await _fallbackHash(stableInput);
      localStorage.setItem('biblivote_fallback_id', fallbackId);
    }
    return fallbackId;
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
