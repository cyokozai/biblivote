/** @type {import('jest').Config} */
module.exports = {
  // ブラウザ側JSのユニットテスト用（DOM操作・バリデーション関数など）
  testEnvironment: "jsdom",

  // テスト対象: src/__tests__/ または *.test.js / *.spec.js
  testMatch: ["**/__tests__/**/*.js", "**/*.{test,spec}.js"],

  // Playwright の E2E テストは除外（playwright.config.js で管理）
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],

  // カバレッジ設定
  // app.js (Alpine.js) と fingerprint.js (FingerprintJS/WebCrypto) は
  // ブラウザ専用のため Jest 計測から除外する
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/app.js",
    "!src/fingerprint.js",
    "!**/*.spec.js",
  ],
  coverageThreshold: {
    global: {
      lines: 70,
    },
  },
};
