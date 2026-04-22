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
const {
  _validate,
  _verifyCsrf,
  _isDuplicate,
  _isWithinStoreHours,
  _findRowByVoteId,
  _handleCheckTicket,
  _handleRedeem,
  _writeVote,
} = require('../gas/Code.gs');

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

// ===== _isWithinStoreHours =====
describe('_isWithinStoreHours', () => {
  beforeEach(() => {
    // STORE_OPEN_ISO / STORE_CLOSE_ISO をリセット
    delete _propertiesStore['STORE_OPEN_ISO'];
    delete _propertiesStore['STORE_CLOSE_ISO'];
  });

  test('プロパティ未設定の場合は true（開発フォールバック）', () => {
    expect(_isWithinStoreHours()).toBe(true);
  });

  test('STORE_OPEN_ISO のみ設定の場合は true', () => {
    _propertiesStore['STORE_OPEN_ISO'] = '2026-05-14T10:00:00+09:00';
    expect(_isWithinStoreHours()).toBe(true);
  });

  test('現在時刻が開閉店時間内の場合は true', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const future = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    _propertiesStore['STORE_OPEN_ISO'] = past;
    _propertiesStore['STORE_CLOSE_ISO'] = future;
    expect(_isWithinStoreHours()).toBe(true);
  });

  test('現在時刻が開店前の場合は false', () => {
    const now = new Date();
    const future1 = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const future2 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    _propertiesStore['STORE_OPEN_ISO'] = future1;
    _propertiesStore['STORE_CLOSE_ISO'] = future2;
    expect(_isWithinStoreHours()).toBe(false);
  });

  test('現在時刻が閉店後の場合は false', () => {
    const now = new Date();
    const past2 = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const past1 = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    _propertiesStore['STORE_OPEN_ISO'] = past2;
    _propertiesStore['STORE_CLOSE_ISO'] = past1;
    expect(_isWithinStoreHours()).toBe(false);
  });
});

// ===== _findRowByVoteId =====
describe('_findRowByVoteId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('votesシートが空（1行以下）の場合は -1', () => {
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(1),
      getDataRange: jest.fn().mockReturnValue({
        getValues: jest.fn().mockReturnValue([['header']]),
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    expect(_findRowByVoteId('any-id')).toBe(-1);
  });

  test('対応する voteId が存在する場合は行番号（1-indexed）を返す', () => {
    const voteId = 'test-uuid-001';
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(3),
      getRange: jest.fn().mockReturnValue({
        getValues: jest.fn().mockReturnValue([[voteId], ['other-uuid']]),
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    expect(_findRowByVoteId(voteId)).toBe(2); // 2行目 → 1-indexed で 2
  });

  test('対応する voteId が存在しない場合は -1', () => {
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockReturnValue({
        getValues: jest.fn().mockReturnValue([['other-uuid']]),
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    expect(_findRowByVoteId('nonexistent-uuid')).toBe(-1);
  });
});

// ===== _writeVote (voteId 返却) =====
describe('_writeVote の voteId 返却', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(_mockSheet);
    global.Utilities.getUuid.mockReturnValue('generated-vote-id');
  });

  const validBody = {
    q1_genres: ['インフラ / クラウド'],
    q2_format: '電子派',
    q3_books_per_month: 2,
    q4_best_book: 'テスト書籍',
    q4_isbn: '',
    q5_recommendation: '推薦書籍',
    q5_isbn: '',
    q6_registered: true,
  };

  test('_writeVote は生成した voteId を返す', () => {
    const result = _writeVote(validBody);
    expect(result).toBe('generated-vote-id');
  });

  test('appendRow に voteId と redeemed=false が含まれる', () => {
    _writeVote(validBody);
    const row = _mockSheet.appendRow.mock.calls[0][0];
    expect(row[9]).toBe('generated-vote-id'); // 列J: voteId
    expect(row[10]).toBe(false);              // 列K: redeemed
  });
});

// ===== _handleCheckTicket =====
describe('_handleCheckTicket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete _propertiesStore['STORE_OPEN_ISO'];
    delete _propertiesStore['STORE_CLOSE_ISO'];
  });

  test('voteId が未指定の場合は { exists: false }', () => {
    _handleCheckTicket(undefined);
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ exists: false });
  });

  test('voteId が存在しない場合は { exists: false }', () => {
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(1),
      getDataRange: jest.fn().mockReturnValue({
        getValues: jest.fn().mockReturnValue([['header']]),
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleCheckTicket('nonexistent-uuid');
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ exists: false });
  });

  test('voteId が存在し未交換の場合は { exists: true, redeemed: false, withinHours: true }', () => {
    const voteId = 'found-uuid';
    const mockGetValue = jest.fn().mockReturnValue(false); // redeemed = false
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      // getRange の呼び出しパターンで分岐:
      //   4引数 (2,10,n,1) → _findRowByVoteId 用: getValues() を返す
      //   2引数 (row,11)   → redeemed 列の getValue/setValue 用
      getRange: jest.fn().mockImplementation((...args) => {
        if (args.length === 4) return { getValues: jest.fn().mockReturnValue([[voteId]]) };
        return { getValue: mockGetValue };
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleCheckTicket(voteId);
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ exists: true, redeemed: false, withinHours: true });
  });

  test('redeemed=true の場合は { exists: true, redeemed: true }', () => {
    const voteId = 'redeemed-uuid';
    const mockGetValue = jest.fn().mockReturnValue(true); // redeemed = true
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockImplementation((...args) => {
        if (args.length === 4) return { getValues: jest.fn().mockReturnValue([[voteId]]) };
        return { getValue: mockGetValue };
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleCheckTicket(voteId);
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ exists: true, redeemed: true });
  });
});

// ===== _handleRedeem =====
describe('_handleRedeem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete _propertiesStore['STORE_OPEN_ISO'];
    delete _propertiesStore['STORE_CLOSE_ISO'];
  });

  test('開店時間外の場合は 403 outside_hours', () => {
    const now = new Date();
    _propertiesStore['STORE_OPEN_ISO'] = new Date(now.getTime() + 3600000).toISOString();
    _propertiesStore['STORE_CLOSE_ISO'] = new Date(now.getTime() + 7200000).toISOString();
    _handleRedeem({ action: 'redeem', voteId: 'some-id' });
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ error: 'outside_hours' });
  });

  test('voteId が存在しない場合は 404 not_found', () => {
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(1),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleRedeem({ action: 'redeem', voteId: 'ghost-uuid' });
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ error: 'not_found' });
  });

  test('redeemed が既に true の場合は already_redeemed', () => {
    const voteId = 'already-done';
    const mockGetValue = jest.fn().mockReturnValue(true);
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockImplementation((...args) => {
        if (args.length === 4) return { getValues: jest.fn().mockReturnValue([[voteId]]) };
        return { getValue: mockGetValue, setValue: jest.fn() };
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleRedeem({ action: 'redeem', voteId });
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ status: 'already_redeemed' });
  });

  test('正常な引換は redeemed を true に更新して status: redeemed を返す', () => {
    const voteId = 'fresh-uuid';
    const mockSetValue = jest.fn();
    const mockGetValue = jest.fn().mockReturnValue(false);
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockImplementation((...args) => {
        if (args.length === 4) return { getValues: jest.fn().mockReturnValue([[voteId]]) };
        return { getValue: mockGetValue, setValue: mockSetValue };
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleRedeem({ action: 'redeem', voteId });
    const call = global.ContentService.createTextOutput.mock.calls[0][0];
    expect(JSON.parse(call)).toMatchObject({ status: 'redeemed' });
    expect(mockSetValue).toHaveBeenCalledWith(true);
  });

  test('true → false の逆方向更新は action=redeem では実装しない（仕様確認）', () => {
    // action=redeem のみが存在し、逆方向エンドポイントは実装しないことを確認
    // _handleRedeem は false → true のみ行う
    const voteId = 'one-way-uuid';
    const mockSetValue = jest.fn();
    const sheet = {
      getLastRow: jest.fn().mockReturnValue(2),
      getRange: jest.fn().mockImplementation((...args) => {
        if (args.length === 4) return { getValues: jest.fn().mockReturnValue([[voteId]]) };
        return { getValue: jest.fn().mockReturnValue(false), setValue: mockSetValue };
      }),
    };
    _mockSS.getSheetByName.mockReturnValue(null);
    _mockSS.insertSheet.mockReturnValue(sheet);
    _handleRedeem({ action: 'redeem', voteId });
    // setValue は必ず true で呼ばれる（false に戻す呼び出しはない）
    expect(mockSetValue).toHaveBeenCalledWith(true);
    expect(mockSetValue).not.toHaveBeenCalledWith(false);
  });
});
