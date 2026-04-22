# Biblivote

<p align="center">
	<img src="image/biblivote-icon.png" width="200" height="200" alt="Biblivote Icon">
</p>

Biblivote is a technical book voting and visualization web application designed for the "Bookstore Corner" at [CloudNative Kaigi 2026](https://cloudnativedays.jp/archives/cloudnativekaigi2026/) (May 14-15, 2026, Nagoya).

## 🚀 Quick Start

To get started with local development:

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env   # Then edit .env

# 3. Build and Serve
npm run build:local
npm run serve          # Open http://localhost:8080
```

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

-   **[System Specification (docs/SYSTEM.md)](./docs/SYSTEM.md)**: Technical overview, architecture, requirements, and SLO.
-   **[Development Guide (docs/DEVELOPMENT.md)](./docs/DEVELOPMENT.md)**: In-depth setup, testing, and deployment instructions.
-   **[Security Audit](./docs/security/2026-04-04_security_audit.md)**: Latest security review findings.

---

## 🛠 Tech Stack

-   **Frontend**: Alpine.js (CDN), Vanilla JS
-   **Backend**: Google Apps Script (GAS)
-   **Database**: Google Spreadsheet
-   **Hosting**: Cloudflare Pages / GitHub Pages
-   **Visualization**: Grafana

---

## 🧪 Testing

```bash
npm test                # Unit Tests (Jest)
npm run test:e2e        # E2E Tests (Playwright)
```

---

© 2026 [cyokozai](https://github.com/cyokozai) / CloudNative Days
