/**
 * GAS バックエンドの統合テスト
 * t_wada TDD: Red → Green
 *
 * gas-mock-globals v2.x は CacheService がシングルトンでなく、
 * SpreadsheetApp.openById が未実装のため、必要な GAS グローバルを
 * Jest 手動モックで補完する。
 */

// ── GAS グローバルのセットアップ（Code.gs require より前に定義必須）──

// CacheService: シングルトンの共有ストアを持つ実装
const _cacheStore = {};
global.CacheService = {
  getScriptCache: () => ({
    put: (k, v) => { _cacheStore[k] = v; },
    get: (k) => _cacheStore[k] ?? null,
    remove: (k) => { delete _cacheStore[k]; },
  }),
};

// SpreadsheetApp: openById + シート操作のミニマルモック
const _mockSheet = {
  getLastRow: jest.fn().mockReturnValue(0),
  getRange: jest.fn().mockReturnValue({ getValues: jest.fn().mockReturnValue([]) }),
  appendRow: jest.fn(),
};
const _mockSS = {
  getSheetByName: jest.fn().mockReturnValue(null),
  insertSheet: jest.fn().mockReturnValue(_mockSheet),
};
global.SpreadsheetApp = {
  openById: jest.fn().mockReturnValue(_mockSS),
};

// PropertiesService: SPREADSHEET_ID を返すミニマルモック
const _propertiesStore = { SPREADSHEET_ID: 'test-id' };
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => _propertiesStore[key] ?? null,
    setProperty: (k, v) => { _propertiesStore[k] = v; },
  }),
};

// その他 GAS グローバル（Code.gs で参照される可能性があるもの）
global.UrlFetchApp = { fetch: jest.fn() };
global.Logger = { log: jest.fn() };
global.Utilities = { getUuid: jest.fn().mockReturnValue('mock-uuid') };
global.LockService = {
  getScriptLock: () => ({
    waitLock: jest.fn(),
    releaseLock: jest.fn(),
  }),
};
global.ContentService = {
  createTextOutput: jest.fn().mockReturnValue({
    setMimeType: jest.fn().mockReturnValue({}),
  }),
  MimeType: { JSON: 'application/json' },
};

// ── モック設定後に Code.gs を読み込む ──
const { _validate, _verifyCsrf, _isDuplicate } = require('../gas/Code.gs');

// ===== _validate =====
describe('_validate', () => {
  const validBody = {
    q1_genres: ['インフラ / クラウド'],
    q2_format: '電子派',
    q3_books_per_month: 3,
    q4_best_book: 'Kubernetes完全ガイド',
    q4_isbn: '',
    q5_recommendation: '入門 監視',
    q5_isbn: '',
    q6_registered: true,
  };

  test('正常なデータはnullを返す', () => {
    expect(_validate(validBody)).toBeNull();
  });

  test('q1_genres が空配列はエラー', () => {
    expect(_validate({ ...validBody, q1_genres: [] }))
      .toMatchObject({ field: 'q1_genres' });
  });

  test('q1_genres にホワイトリスト外の値はエラー', () => {
    expect(_validate({ ...validBody, q1_genres: ['不正なジャンル'] }))
      .toMatchObject({ field: 'q1_genres' });
  });

  test('q2_format が無効な値はエラー', () => {
    expect(_validate({ ...validBody, q2_format: 'その他' }))
      .toMatchObject({ field: 'q2_format' });
  });

  test('q3_books_per_month が -1 はエラー', () => {
    expect(_validate({ ...validBody, q3_books_per_month: -1 }))
      .toMatchObject({ field: 'q3_books_per_month' });
  });

  test('q3_books_per_month が 100 はエラー', () => {
    expect(_validate({ ...validBody, q3_books_per_month: 100 }))
      .toMatchObject({ field: 'q3_books_per_month' });
  });

  test('q4_best_book が空文字はエラー', () => {
    expect(_validate({ ...validBody, q4_best_book: '' }))
      .toMatchObject({ field: 'q4_best_book' });
  });

  test('q4_best_book が101文字はエラー', () => {
    expect(_validate({ ...validBody, q4_best_book: 'a'.repeat(101) }))
      .toMatchObject({ field: 'q4_best_book' });
  });

  test('q4_isbn が12桁はエラー', () => {
    expect(_validate({ ...validBody, q4_isbn: '978487311932' }))
      .toMatchObject({ field: 'q4_isbn' });
  });

  test('q4_isbn が13桁の数字はOK', () => {
    expect(_validate({ ...validBody, q4_isbn: '9784873119328' })).toBeNull();
  });

  test('q5_recommendation が空文字はエラー', () => {
    expect(_validate({ ...validBody, q5_recommendation: '' }))
      .toMatchObject({ field: 'q5_recommendation' });
  });

  test('q6_registered が文字列はエラー', () => {
    expect(_validate({ ...validBody, q6_registered: 'true' }))
      .toMatchObject({ field: 'q6_registered' });
  });

  test('q6_registered が false はOK', () => {
    expect(_validate({ ...validBody, q6_registered: false })).toBeNull();
  });
});

// ===== _verifyCsrf =====
describe('_verifyCsrf', () => {
  beforeEach(() => {
    // テスト間でキャッシュをリセット
    Object.keys(_cacheStore).forEach((k) => delete _cacheStore[k]);
  });

  test('nullトークンはfalse', () => {
    expect(_verifyCsrf(null)).toBe(false);
  });

  test('undefinedトークンはfalse', () => {
    expect(_verifyCsrf(undefined)).toBe(false);
  });

  test('キャッシュにないトークンはfalse', () => {
    expect(_verifyCsrf('nonexistent-token')).toBe(false);
  });

  test('キャッシュに存在するトークンはtrue（ワンタイム）', () => {
    const token = 'test-csrf-token-123';
    // テスト側から共有ストアに直接セット
    _cacheStore['csrf_' + token] = '1';

    expect(_verifyCsrf(token)).toBe(true);

    // ワンタイム: 2回目は false
    expect(_verifyCsrf(token)).toBe(false);
  });
});

// ===== _isDuplicate =====
describe('_isDuplicate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _mockSS.getSheetByName.mockReturnValue(null);
    // プロパティストアもリセット
    Object.keys(_propertiesStore).forEach(k => {
      if (k !== 'SPREADSHEET_ID') delete _propertiesStore[k];
    });
    // キャッシュもリセット
    Object.keys(_cacheStore).forEach(k => delete _cacheStore[k]);
  });

  test('logsシートが存在しない場合は重複なし', () => {
    _mockSS.getSheetByName.mockReturnValue(null);
    expect(_isDuplicate('some-fingerprint')).toBe(false);
  });

  test('logsシートが空（行数1: ヘッダーのみ）の場合は重複なし', () => {
    const emptySheet = {
      getLastRow: jest.fn().mockReturnValue(1),
      getRange: jest.fn().mockReturnValue({ getValues: jest.fn().mockReturnValue([]) }),
    };
    _mockSS.getSheetByName.mockReturnValue(emptySheet);
    expect(_isDuplicate('fp-abc')).toBe(false);
  });

  test('同一フィンガープリントが存在する場合は重複あり', () => {
    const fp = 'fingerprint-xyz';
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockReturnValue({
        getValues: jest.fn().mockReturnValue([[fp]]),
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(sheet);
    expect(_isDuplicate(fp)).toBe(true);
  });

  test('異なるフィンガープリントは重複なし', () => {
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockReturnValue({
        getValues: jest.fn().mockReturnValue([['other-fp']]),
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(sheet);
    expect(_isDuplicate('new-fp')).toBe(false);
  });
});
