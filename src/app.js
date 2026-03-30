/**
 * src/app.js
 * Alpine.js コンポーネント定義。
 * <script defer src="alpinejs"> より前に読み込む。
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('voteApp', () => ({
    // ウィザードのステップ: 0=TOP, 1〜6=Q1〜Q6, 7=Complete
    step: 0,
    // アニメーション方向: 1=前進, -1=後退
    direction: 1,

    hasVoted: false,
    submitting: false,
    submitError: null,

    // ===== 定数 =====
    GENRES: [
      'インフラ / クラウド',
      'コンテナ / Kubernetes',
      'プログラミング言語',
      'アーキテクチャ / 設計',
      'SRE / 運用 / 監視',
      'セキュリティ',
      'AI / 機械学習',
      'マネジメント / 組織',
      'その他',
    ],
    FORMATS: [
      { value: '紙派', icon: '📕' },
      { value: '電子派', icon: '📱' },
      { value: '両方使い分ける', icon: '🔄' },
    ],

    // ===== フォームデータ =====
    form: {
      q1_genres: [],
      q2_format: null,
      q3_books_per_month: 0,
      q4_best_book: '',
      q4_isbn: '',
      q4_thumbnail: '',
      q5_recommendation: '',
      q5_isbn: '',
      q5_thumbnail: '',
      q6_registered: null,
      honeypot: '', // ボット対策ハニーポット
    },

    // ===== 書籍検索の状態 =====
    bs: {
      q4: { results: [], loading: false, error: false },
      q5: { results: [], loading: false, error: false },
    },

    errors: {},

    // デバウンス済み検索関数（init()で設定）
    _debQ4: null,
    _debQ5: null,

    // ===== 外部設定値（index.html で window.* に設定） =====
    REGISTER_URL: '',
    GRAFANA_URL: '',
    SHARE_TEXT: '',

    // ===== ライフサイクル =====
    init() {
      if (localStorage.getItem('biblivote_voted')) {
        this.hasVoted = true;
      }

      this.REGISTER_URL = window.REGISTER_URL || '';
      this.GRAFANA_URL = window.GRAFANA_URL || '';
      this.SHARE_TEXT = window.SHARE_TEXT || '';

      this._debQ4 = createDebounce((q) => this._doSearch('q4', q), 300);
      this._debQ5 = createDebounce((q) => this._doSearch('q5', q), 300);

      // reCAPTCHA v3: サイトキーが設定されている場合のみ動的に読み込む
      if (window.RECAPTCHA_SITE_KEY) {
        const s = document.createElement('script');
        s.src = `https://www.google.com/recaptcha/api.js?render=${window.RECAPTCHA_SITE_KEY}`;
        document.head.appendChild(s);
      }
    },

    // ===== ナビゲーション =====
    goNext() {
      if (!this._validate()) return;
      this.direction = 1;
      this.step++;
    },

    goBack() {
      this.errors = {};
      this.direction = -1;
      this.step--;
    },

    /** Q2: カード選択で即座に次へ進む（FR-014） */
    selectFormat(value) {
      this.form.q2_format = value;
      this.direction = 1;
      this.step++;
    },

    // ===== Q3 ステッパー =====
    increment() {
      if (this.form.q3_books_per_month < 99) this.form.q3_books_per_month++;
    },
    decrement() {
      if (this.form.q3_books_per_month > 0) this.form.q3_books_per_month--;
    },

    // ===== 書籍検索 =====
    onQ4Input(q) {
      // 手動入力時は選択済み書影をリセット
      this.form.q4_isbn = '';
      this.form.q4_thumbnail = '';
      this._debQ4(q);
    },

    onQ5Input(q) {
      this.form.q5_isbn = '';
      this.form.q5_thumbnail = '';
      this._debQ5(q);
    },

    selectBook(field, book) {
      if (field === 'q4') {
        this.form.q4_best_book = book.title;
        this.form.q4_isbn = book.isbn;
        this.form.q4_thumbnail = book.thumbnail;
      } else {
        this.form.q5_recommendation = book.title;
        this.form.q5_isbn = book.isbn;
        this.form.q5_thumbnail = book.thumbnail;
      }
      this.bs[field].results = [];
    },

    closeDropdown(field) {
      this.bs[field].results = [];
    },

    async _doSearch(field, query) {
      if (!query || query.length < 3) {
        this.bs[field].results = [];
        return;
      }
      this.bs[field].loading = true;
      this.bs[field].error = false;
      try {
        this.bs[field].results = await searchBooks(query);
      } catch {
        this.bs[field].error = true;
        this.bs[field].results = [];
      } finally {
        this.bs[field].loading = false;
      }
    },

    // ===== バリデーション =====
    _validate() {
      this.errors = {};

      switch (this.step) {
        case 1: {
          const err = validateGenres(this.form.q1_genres);
          if (err) { this.errors.q1_genres = err; return false; }
          break;
        }
        case 3: {
          const err = validateBooksPerMonth(this.form.q3_books_per_month);
          if (err) { this.errors.q3_books_per_month = err; return false; }
          break;
        }
        case 4: {
          const err = validateBookTitle(this.form.q4_best_book);
          if (err) { this.errors.q4_best_book = err; return false; }
          break;
        }
        case 5: {
          const err = validateBookTitle(this.form.q5_recommendation);
          if (err) { this.errors.q5_recommendation = err; return false; }
          break;
        }
      }

      return true;
    },

    // ===== 送信 =====
    async submit() {
      // ハニーポット検出
      if (detectHoneypot(this.form.honeypot)) return;

      if (this.form.q6_registered === null) {
        this.errors.q6_registered = '選択してください';
        return;
      }

      this.submitting = true;
      this.submitError = null;

      try {
        const endpoint = window.GAS_ENDPOINT;

        if (endpoint) {
          // CSRF トークン取得
          const tokenRes = await fetch(`${endpoint}?action=token`);
          const { csrfToken } = await tokenRes.json();

          // フィンガープリント取得（失敗しても投票は継続）
          let fingerprint = '';
          try { fingerprint = await getFingerprint(); } catch { /* noop */ }

          // reCAPTCHA v3 トークン取得（サイトキー未設定時はスキップ）
          let captchaToken = '';
          if (window.RECAPTCHA_SITE_KEY && window.grecaptcha) {
            try {
              captchaToken = await new Promise((resolve, reject) => {
                grecaptcha.ready(() => {
                  grecaptcha
                    .execute(window.RECAPTCHA_SITE_KEY, { action: 'vote' })
                    .then(resolve)
                    .catch(reject);
                });
              });
            } catch { /* noop */ }
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q1_genres: this.form.q1_genres,
              q2_format: this.form.q2_format,
              q3_books_per_month: this.form.q3_books_per_month,
              q4_best_book: this.form.q4_best_book,
              q4_isbn: this.form.q4_isbn,
              q5_recommendation: this.form.q5_recommendation,
              q5_isbn: this.form.q5_isbn,
              q6_registered: this.form.q6_registered,
              fingerprint,
              captchaToken,
              csrfToken,
            }),
          });

          if (res.status === 409) {
            // 重複投票: ローカルにもフラグを立てて完了画面へ
            localStorage.setItem('biblivote_voted', '1');
            this.hasVoted = true;
            return;
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          // Dev モード: GAS エンドポイント未設定の場合は成功をシミュレート
          await new Promise((r) => setTimeout(r, 600));
        }

        localStorage.setItem('biblivote_voted', '1');
        this.direction = 1;
        this.step = 7;
      } catch {
        this.submitError =
          '送信に失敗しました。時間をおいて再度お試しください。';
      } finally {
        this.submitting = false;
      }
    },
  }));
});
