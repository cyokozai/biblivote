/**
 * gas/Code.gs
 * Biblivote バックエンド: 投票受付 → Spreadsheet 書き込み
 *
 * スクリプトプロパティ（スクリプトエディタ > プロジェクトの設定 で設定）:
 *   SPREADSHEET_ID  : 対象スプレッドシートの ID
 *   RECAPTCHA_SECRET: reCAPTCHA v3 シークレットキー
 */

var VALID_GENRES = [
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

var VALID_FORMATS = ['紙派', '電子派', '両方使い分ける'];

// ===== エントリーポイント =====

/**
 * doGet: CSRFトークン発行（action=token）
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;

  if (action === 'token') {
    var token = Utilities.getUuid();
    CacheService.getScriptCache().put('csrf_' + token, '1', 3600);
    return _json({ csrfToken: token });
  }

  return _json({ error: 'unknown_action' }, 400);
}

/**
 * doPost: 投票受付
 * 処理順序: CSRF → reCAPTCHA → 重複チェック → バリデーション → 書き込み
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var body = JSON.parse(e.postData.contents);

    // 0. ハニーポット検証（ADR-004: 多層防御）
    var website = body && body.website;
    if ((typeof website === 'string' && website.trim() !== '') ||
        (typeof website !== 'string' && website)) {
      _writeLog(body.fingerprint, 'rejected_honeypot');
      return _json({ error: 'invalid_request' }, 400);
    }

    // 1. CSRF トークン検証（FR-053-1）
    if (!_verifyCsrf(body.csrfToken)) {
      _writeLog(body.fingerprint, 'rejected_csrf');
      return _json({ error: 'invalid_csrf' }, 403);
    }

    // 2. reCAPTCHA v3 検証（FR-053-2）
    var secret = PropertiesService.getScriptProperties()
      .getProperty('RECAPTCHA_SECRET');
    if (secret && !_verifyCaptcha(body.captchaToken, secret)) {
      _writeLog(body.fingerprint, 'rejected_captcha');
      return _json({ error: 'captcha_failed' }, 403);
    }

    // 3. フィンガープリント重複チェック（FR-053-3）
    if (body.fingerprint && _isDuplicate(body.fingerprint)) {
      _writeLog(body.fingerprint, 'rejected_duplicate');
      return _json({ error: 'already_voted' }, 409);
    }

    // 4. 入力バリデーション（FR-053-4）
    var validationErr = _validate(body);
    if (validationErr) {
      return _json(validationErr, 400);
    }

    // 5-6. Spreadsheet 書き込み（FR-053-5,6）
    _writeVote(body);
    _writeLog(body.fingerprint, 'success');

    return _json({ status: 'ok' });
  } catch (err) {
    Logger.log(err.toString());
    return _json({ error: 'internal_error' }, 500);
  } finally {
    lock.releaseLock();
  }
}

// ===== 内部関数 =====

function _verifyCsrf(token) {
  if (!token) return false;
  var cache = CacheService.getScriptCache();
  var hit = cache.get('csrf_' + token);
  if (!hit) return false;
  cache.remove('csrf_' + token); // ワンタイムトークン: 使用後に削除
  return true;
}

function _verifyCaptcha(token, secret) {
  if (!token) return false;
  var res = UrlFetchApp.fetch(
    'https://www.google.com/recaptcha/api/siteverify',
    { method: 'post', payload: { secret: secret, response: token } }
  );
  var result = JSON.parse(res.getContentText());
  return result.success === true && result.score >= 0.5;
}

function _duplicateFingerprintKey_(fingerprint) {
  return 'dup_fp_' + fingerprint;
}

function _syncDuplicateIndex_(sheet, properties, cache) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    properties.setProperty('dup_indexed_last_row', '1');
    return;
  }

  var indexedLastRow = parseInt(properties.getProperty('dup_indexed_last_row') || '1', 10);
  if (isNaN(indexedLastRow) || indexedLastRow < 1) indexedLastRow = 1;
  if (indexedLastRow >= lastRow) return;

  var startRow = Math.max(2, indexedLastRow + 1);
  var numRows = lastRow - startRow + 1;
  if (numRows <= 0) {
    properties.setProperty('dup_indexed_last_row', String(lastRow));
    return;
  }

  var fps = sheet.getRange(startRow, 2, numRows, 1).getValues();
  for (var i = 0; i < fps.length; i++) {
    var fp = fps[i][0];
    if (!fp) continue;
    var key = _duplicateFingerprintKey_(fp);
    properties.setProperty(key, '1');
    cache.put(key, '1', 21600);
  }

  properties.setProperty('dup_indexed_last_row', String(lastRow));
}

function _isDuplicate(fingerprint) {
  if (!fingerprint) return false;

  var key = _duplicateFingerprintKey_(fingerprint);
  var cache = CacheService.getScriptCache();
  if (cache.get(key) === '1') return true;

  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(key) === '1') {
    cache.put(key, '1', 21600);
    return true;
  }

  var ss = _getSpreadsheet();
  var sheet = ss.getSheetByName('logs');
  if (!sheet || sheet.getLastRow() < 2) return false;

  _syncDuplicateIndex_(sheet, properties, cache);

  var hit = properties.getProperty(key) === '1';
  if (hit) cache.put(key, '1', 21600);
  return hit;
}

function _validate(body) {
  // q1_genres
  if (!Array.isArray(body.q1_genres) || body.q1_genres.length === 0) {
    return { error: 'validation_error', field: 'q1_genres' };
  }
  for (var i = 0; i < body.q1_genres.length; i++) {
    if (VALID_GENRES.indexOf(body.q1_genres[i]) === -1) {
      return { error: 'validation_error', field: 'q1_genres' };
    }
  }

  // q2_format
  if (VALID_FORMATS.indexOf(body.q2_format) === -1) {
    return { error: 'validation_error', field: 'q2_format' };
  }

  // q3_books_per_month
  var bpm = Number(body.q3_books_per_month);
  if (!Number.isInteger(bpm) || bpm < 0 || bpm > 99) {
    return { error: 'validation_error', field: 'q3_books_per_month' };
  }

  // q4_best_book
  if (!body.q4_best_book ||
      body.q4_best_book.length < 1 ||
      body.q4_best_book.length > 100) {
    return { error: 'validation_error', field: 'q4_best_book' };
  }

  // q4_isbn（任意）
  if (body.q4_isbn && !/^\d{10}$|^\d{13}$/.test(body.q4_isbn)) {
    return { error: 'validation_error', field: 'q4_isbn' };
  }

  // q5_recommendation
  if (!body.q5_recommendation ||
      body.q5_recommendation.length < 1 ||
      body.q5_recommendation.length > 100) {
    return { error: 'validation_error', field: 'q5_recommendation' };
  }

  // q5_isbn（任意）
  if (body.q5_isbn && !/^\d{10}$|^\d{13}$/.test(body.q5_isbn)) {
    return { error: 'validation_error', field: 'q5_isbn' };
  }

  // q6_registered
  if (typeof body.q6_registered !== 'boolean') {
    return { error: 'validation_error', field: 'q6_registered' };
  }

  return null;
}

function _writeVote(body) {
  var sheet = _getOrCreateSheet('votes');
  sheet.appendRow([
    new Date().toISOString(),
    body.q1_genres.join(','),
    body.q2_format,
    Number(body.q3_books_per_month),
    body.q4_best_book,
    body.q4_isbn || '',
    body.q5_recommendation,
    body.q5_isbn || '',
    body.q6_registered,
  ]);
}

function _writeLog(fingerprint, result) {
  var sheet = _getOrCreateSheet('logs');
  sheet.appendRow([
    new Date().toISOString(),
    fingerprint || '',
    result,
  ]);
}

function _getSpreadsheet() {
  var id = PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}

function _getOrCreateSheet(name) {
  var ss = _getSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function _json(data, status) {
  var normalizedStatus = status || 200;
  var payload = {};

  if (data !== null && typeof data === 'object') {
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        payload[key] = data[key];
      }
    }
  } else {
    payload.data = data;
  }

  if (typeof payload.status === 'undefined') {
    payload.status = normalizedStatus;
  }
  if (typeof payload.ok === 'undefined') {
    payload.ok = normalizedStatus < 400;
  }
  if (!payload.ok && typeof payload.error === 'undefined') {
    payload.error = 'request_failed';
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Jest テスト用エクスポート（GAS 環境では無視される） =====
if (typeof module !== 'undefined') {
  module.exports = { _validate, _verifyCsrf, _isDuplicate, _writeVote, _writeLog };
}
