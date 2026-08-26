# OwnMars.lol

Viral pay-to-claim map of 50 named Martian territories.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Without payment keys, use **Dev: simulate payment** locally. Card/crypto buttons stay disabled until Paddle / Cryptomus env vars are set.

## Supabase

Run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor. Enable Realtime replication for table `plots`. Put URL + anon + service role keys in `.env.local`.

Until Supabase is configured, plots persist in `data/plots.json`.

## Deploy

`Dockerfile` + `railway.toml` (not Vercel). Cloudflare in front of `ownmars.lol` before launch.

### Branches

| Branch | Railway environment | Domain |
|---|---|---|
| `staging` | Staging | `staging.ownmars.lol` (or Railway `*.up.railway.app`) |
| `main` | Production | `ownmars.lol` |

Flow: feature branch → `staging` (test) → merge to `main` (prod).

### Railway environments

One Railway project, two environments. Connect the GitHub repo, then:

1. **Production** — watch `main`
2. **Staging** — duplicate env (or add Staging), watch `staging`

Do **not** share a Supabase project or live Paddle/Cryptomus keys between staging and prod.

| Variable | Staging | Production |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | staging URL | `https://ownmars.lol` |
| Paddle | sandbox | live |
| Cryptomus | sandbox/test | live |
| Supabase | separate project | production project |
| DataFast | skip or separate website id | `ownmars.lol` |

Webhook URLs (each domain):

- Paddle: `{APP_URL}/api/webhooks/paddle`
- Cryptomus: `{APP_URL}/api/webhooks/cryptomus`

Put secrets in Railway Variables, not in git. `NODE_ENV=production` on both deploys — the local **Dev: simulate payment** button stays off.

### First-time GitHub + Railway

GitHub CLI is not logged in on this machine yet. After you authenticate:

```bash
gh auth login
railway login
./scripts/bootstrap-github-railway.sh ownmars
```

That creates a **private** `ownmars` repo, pushes `main` and `staging`, then prints Railway dashboard steps.

### First-time Railway setup

```bash
brew install railway
railway login
railway init
railway environment production   # or create Staging in the dashboard
railway variables                # paste from .env.example (sandbox vs live)
```

In the dashboard: GitHub repo → Production branch `main`, Staging branch `staging`. Custom domains via Cloudflare.
