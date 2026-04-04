#!/bin/bash
set -e

echo "==> [postCreate] Starting devcontainer setup..."

# ── 1. CA 証明書の更新は Dockerfile で実施済みのためスキップ ────────
# （postCreateCommand は remoteUser=node 権限で動作するため apt-get は実行不可）
echo "==> [postCreate] CA certificates updated in image build (skipped here)."

# ── 2. 依存インストール ──────────────────────────────────
echo "==> [postCreate] Installing npm dependencies..."
npm install

echo ""
echo "==> [postCreate] Setup complete."

# ── 3. GitHub CLI 認証（HTTP・毎回実行・最後に配置） ──────────
# 認証失敗でもそれ以前のセットアップに影響しないよう || true でガード
gh auth login --web || true
gh config set editor "code --wait" || true
git remote set-url origin "$(git remote get-url origin | sed 's|git@github.com:|https://github.com/|')" || true
gh auth setup-git || true
