// @ts-check
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "html" : "list",

  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },

  // E2E 実行前に静的ファイルサーバーを起動する
  webServer: {
    command: "npx serve . -p 8080 --no-clipboard",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    // クロスブラウザ: Chrome / Firefox / Safari（ADR-001 対応）
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // スマートフォン（モバイルファースト要件）
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
});
