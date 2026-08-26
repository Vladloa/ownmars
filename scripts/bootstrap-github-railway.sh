#!/usr/bin/env bash
# Run after: gh auth login && railway login
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

REPO_NAME="${1:-ownmars}"

gh auth status
git checkout main
if git remote get-url origin >/dev/null 2>&1; then
  echo "origin already set: $(git remote get-url origin)"
else
  gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
fi
git push -u origin main
git checkout staging
git push -u origin staging
git checkout main

echo
echo "Railway (dashboard):"
echo "  1. New project → Deploy from GitHub → $REPO_NAME"
echo "  2. Production environment: branch main, domain ownmars.lol"
echo "  3. Staging environment: branch staging, domain staging.ownmars.lol"
echo "  4. Separate Variables per env (see README). Separate Supabase projects."
echo "  5. Webhooks: {APP_URL}/api/webhooks/paddle and /api/webhooks/cryptomus"
