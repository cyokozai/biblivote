# ===== Base =====
FROM node:22-slim AS base
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates \
    && update-ca-certificates \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# ===== Development (Jest + clasp + local server) =====
FROM base AS dev
# node_modules は名前付きボリュームで管理するため COPY package.json のみ
COPY package*.json ./
# package-lock.json が未生成の場合は npm install、存在すれば npm ci に切り替え可
RUN npm install
# clasp はグローバルインストールして PATH に入れる
RUN npm install -g @google/clasp serve
# コンテナ起動後もユーザーとして実行（rootを避ける）
USER node
CMD ["bash"]

# ===== E2E (Playwright) =====
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS e2e
WORKDIR /workspace
COPY package*.json ./
RUN npm install
CMD ["npx", "playwright", "test"]
