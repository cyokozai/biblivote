# ===== Base =====
FROM node:22-slim AS base
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ===== Development (Jest + clasp + local server) =====
FROM base AS dev
# node_modules は名前付きボリュームで管理するため COPY package.json のみ
COPY package*.json ./
RUN npm ci
# clasp はグローバルインストールして PATH に入れる
RUN npm install -g @google/clasp serve
# コンテナ起動後もユーザーとして実行（rootを避ける）
USER node
CMD ["bash"]

# ===== E2E (Playwright) =====
FROM mcr.microsoft.com/playwright:v1.52.0-noble AS e2e
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
CMD ["npx", "playwright", "test"]
