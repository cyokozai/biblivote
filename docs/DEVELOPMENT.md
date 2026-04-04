# Development Guide — Biblivote

This guide provides instructions for local development, testing, and deployment of the Biblivote system.

## 1. Local Development

### Prerequisites

- **Node.js**: v20 or higher (required for `--env-file` flag support).
- **clasp**: For managing Google Apps Script projects.

### Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env   # Then edit .env with your local keys
```

### Running the Local Server

```bash
# Build with local environment variables injected
npm run build:local

# Start a local static server
npm run serve          # Available at http://localhost:8080
```

---

## 2. Testing

A comprehensive test suite is included to ensure system reliability.

```bash
# Unit Tests (Jest)
npm test

# Watch Mode (TDD)
npm run test:watch

# Code Coverage
npm run test:coverage

# E2E Tests (Playwright)
npm run test:e2e
```

---

## 3. Deployment

### Frontend (Cloudflare Pages / GitHub Pages)

The frontend is a static site. Configuration values are injected during the build process.

```bash
# Inject environment variables and generate index.html
npm run build

# Commit and push to main for automatic deployment
git add index.html
git commit -m "docs: build index.html for production"
git push origin main
```

**Cloudflare Pages Configuration**:
- **Build command**: `npm run build`
- **Build output directory**: `/`
- **Root directory**: (Leave blank)

### Backend (Google Apps Script)

1.  **Preparation**:
    -   Create a new Google Spreadsheet and set up sheets named `votes` and `logs`.
    -   Set script properties in the GAS editor: `SPREADSHEET_ID` and `RECAPTCHA_SECRET`.
2.  **Deployment**:
    ```bash
    # Push code to GAS
    npx @google/clasp push

    # Deploy as Web App
    npx @google/clasp deploy --description "v1.0.0"
    ```
3.  **URL Update**:
    Copy the Web App URL and set it as `GAS_ENDPOINT` in your environment variables.

---

## 4. Pre-Deployment Checklist

Before going live, ensure the following are confirmed:

-   **GAS_ENDPOINT**: Points to the correct production Web App.
-   **RECAPTCHA_SITE_KEY**: Valid reCAPTCHA v3 site key is set.
-   **GRAFANA_URL**: Correct dashboard link is provided in the completed screen.
-   **Security Headers**: Verify `_headers` are applied by checking response headers in the production environment.
-   **No Secrets**: Ensure `credentials.json` or other sensitive files are not in the git repository.

---

## 5. Operations & Monitoring

-   **GAS Logs**: Check the "Executions" tab in the GAS editor daily for errors.
-   **Spreadsheet Logs**: Monitor the `logs` sheet for failed attempts or unusually high volume (possible bot activity).
-   **Grafana Dashboard**: Ensure the dashboard is refreshing correctly (every 5 minutes).
