const { toHttps, createDebounce } = require('../src/books');

// ===== toHttps =====
describe('toHttps', () => {
  test('http:// を https:// に変換する', () => {
    expect(toHttps('http://books.google.com/image.jpg')).toBe(
      'https://books.google.com/image.jpg'
    );
  });

  test('https:// はそのまま変換しない', () => {
    expect(toHttps('https://books.google.com/image.jpg')).toBe(
      'https://books.google.com/image.jpg'
    );
  });

  test('nullはnullを返す', () => {
    expect(toHttps(null)).toBeNull();
  });

  test('undefinedはundefinedを返す', () => {
    expect(toHttps(undefined)).toBeUndefined();
  });

  test('空文字は空文字を返す', () => {
    expect(toHttps('')).toBe('');
  });
});

// ===== createDebounce =====
describe('createDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('300ms以内の連続呼び出しは最後の1回のみ実行される', () => {
    const fn = jest.fn();
    const debounced = createDebounce(fn, 300);

    debounced('a');
    debounced('ab');
    debounced('abc');

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('abc');
  });

  test('300ms経過後は別の呼び出しとして実行される', () => {
    const fn = jest.fn();
    const debounced = createDebounce(fn, 300);

    debounced('first');
    jest.advanceTimersByTime(300);

    debounced('second');
    jest.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'second');
  });

  test('200ms後に再入力するとタイマーがリセットされる', () => {
    const fn = jest.fn();
    const debounced = createDebounce(fn, 300);

    debounced('a');
    jest.advanceTimersByTime(200);
    debounced('ab'); // リセット: ここから300ms

    jest.advanceTimersByTime(200); // 合計400ms経過、まだ発火しない
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100); // 合計500ms、ab入力から300ms
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('ab');
  });

  test('遅延前に呼ばれない', () => {
    const fn = jest.fn();
    const debounced = createDebounce(fn, 300);

    debounced('test');
    jest.advanceTimersByTime(299);

    expect(fn).not.toHaveBeenCalled();
  });
});
