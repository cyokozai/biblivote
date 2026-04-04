const {
  validateGenres,
  validateFormat,
  validateBooksPerMonth,
  validateBookTitle,
  validateIsbn,
  detectHoneypot,
} = require('../src/validate');

// ===== validateGenres =====
describe('validateGenres', () => {
  test('空配列はエラー', () => {
    expect(validateGenres([])).not.toBeNull();
  });

  test('nullはエラー', () => {
    expect(validateGenres(null)).not.toBeNull();
  });

  test('1つ選択済みはOK', () => {
    expect(validateGenres(['インフラ / クラウド'])).toBeNull();
  });

  test('複数選択済みはOK', () => {
    expect(validateGenres(['インフラ / クラウド', 'セキュリティ'])).toBeNull();
  });

  test('ホワイトリスト外の値はエラー', () => {
    expect(validateGenres(['不正なジャンル'])).not.toBeNull();
  });

  test('正規値と不正値の混在はエラー', () => {
    expect(validateGenres(['インフラ / クラウド', '不正なジャンル'])).not.toBeNull();
  });
});

// ===== validateFormat =====
describe('validateFormat', () => {
  test('"紙派" はOK', () => {
    expect(validateFormat('紙派')).toBeNull();
  });

  test('"電子派" はOK', () => {
    expect(validateFormat('電子派')).toBeNull();
  });

  test('"両方使い分ける" はOK', () => {
    expect(validateFormat('両方使い分ける')).toBeNull();
  });

  test('ホワイトリスト外はエラー', () => {
    expect(validateFormat('その他')).not.toBeNull();
  });

  test('nullはエラー', () => {
    expect(validateFormat(null)).not.toBeNull();
  });
});

// ===== validateBooksPerMonth =====
describe('validateBooksPerMonth', () => {
  test('-1はエラー', () => {
    expect(validateBooksPerMonth(-1)).not.toBeNull();
  });

  test('0はOK', () => {
    expect(validateBooksPerMonth(0)).toBeNull();
  });

  test('99はOK', () => {
    expect(validateBooksPerMonth(99)).toBeNull();
  });

  test('100はエラー', () => {
    expect(validateBooksPerMonth(100)).not.toBeNull();
  });

  test('文字列 "abc" はエラー', () => {
    expect(validateBooksPerMonth('abc')).not.toBeNull();
  });

  test('小数はエラー', () => {
    expect(validateBooksPerMonth(1.5)).not.toBeNull();
  });
});

// ===== validateBookTitle =====
describe('validateBookTitle', () => {
  test('1文字はOK', () => {
    expect(validateBookTitle('a')).toBeNull();
  });

  test('50文字はOK', () => {
    expect(validateBookTitle('a'.repeat(50))).toBeNull();
  });

  test('51文字はエラー', () => {
    expect(validateBookTitle('a'.repeat(51))).not.toBeNull();
  });

  test('空文字はエラー（必須項目）', () => {
    expect(validateBookTitle('')).not.toBeNull();
  });

  test('nullはエラー', () => {
    expect(validateBookTitle(null)).not.toBeNull();
  });
});

// ===== validateIsbn =====
describe('validateIsbn', () => {
  test('空文字はOK（任意項目）', () => {
    expect(validateIsbn('')).toBeNull();
  });

  test('nullはOK（任意項目）', () => {
    expect(validateIsbn(null)).toBeNull();
  });

  test('13桁の数字はOK', () => {
    expect(validateIsbn('9784873119328')).toBeNull();
  });

  test('10桁の数字はOK', () => {
    expect(validateIsbn('4873119324')).toBeNull();
  });

  test('12桁はエラー', () => {
    expect(validateIsbn('978487311932')).not.toBeNull();
  });

  test('数字以外を含む文字列はエラー', () => {
    expect(validateIsbn('978487311932X')).not.toBeNull();
  });
});

// ===== detectHoneypot =====
describe('detectHoneypot', () => {
  test('空文字はセーフ（人間）', () => {
    expect(detectHoneypot('')).toBe(false);
  });

  test('値ありはスパム判定（ボット）', () => {
    expect(detectHoneypot('bot-value')).toBe(true);
  });

  test('undefinedはセーフ', () => {
    expect(detectHoneypot(undefined)).toBe(false);
  });
});
