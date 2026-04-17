# Afrika Haberleri

Turkish-language Africa news aggregator. Scrapes full articles from BBC Africa and The Conversation Africa, translates to Turkish via Claude Haiku API, and serves them via Next.js on Vercel.

## Tech Stack

- **Frontend:** Next.js 14 App Router, TypeScript (strict), Tailwind CSS
- **Database:** Supabase (Postgres + Storage + Auth)
- **Scraper:** Scrapy, trafilatura, bleach
- **Translation:** Claude Haiku API (`claude-haiku-4-5-20251001`)
- **Automation:** n8n cron + GitHub Actions
- **Hosting:** Vercel

## Project Structure

```
frontend/        Next.js app
scraper/         Scrapy project
supabase/
  migrations/    SQL migration files
n8n/
  workflows/     n8n workflow definitions
.github/
  workflows/     GitHub Actions
```

## Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Supabase project (get URL + keys from dashboard)
- Anthropic API key

### Frontend

```bash
cd frontend
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

### Scraper

```bash
cd scraper
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, SCRAPER_WEBHOOK_SECRET
pip install -r requirements.txt
bash run.sh
```

### Database

Apply migrations in order via Supabase CLI or the SQL editor:

```bash
supabase db push
```

## Environment Variables

### Vercel (frontend)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Scraper / GitHub Actions

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (write access) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Haiku |
| `SCRAPER_WEBHOOK_SECRET` | Shared secret for n8n -> GitHub Actions webhook |

## Automation

The scraper runs daily at 05:00 Europe/Istanbul via:

`n8n Schedule` -> `GitHub Actions workflow_dispatch` -> `scraper/run.sh`

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`.
