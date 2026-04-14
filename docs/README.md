# BankScope Intelligence

**AI-assisted regulatory and market intelligence for UK retail financial services.**

BankScope Intelligence automatically monitors the FCA, PRA, Bank of England, ICO, HM Treasury, and Companies House, then uses AI to produce plain-English summaries tagged by urgency, audience, and topic — updated daily.

## Quick Start

1. Clone or download this project
2. Install dependencies: `npm install`
3. Copy `.env.example` → `.env.local` and fill in your keys (see [docs/env-vars.md](docs/env-vars.md))
4. Run the Supabase schema: copy `lib/db/schema.sql` into your Supabase SQL editor and execute
5. Seed sample data: `npm run seed`
6. Start locally: `npm run dev`
7. Visit `http://localhost:3000`

## Documentation

| File | Purpose |
|---|---|
| [docs/setup.md](docs/setup.md) | Local setup walkthrough |
| [docs/deployment.md](docs/deployment.md) | Vercel deployment guide |
| [docs/env-vars.md](docs/env-vars.md) | All environment variables |
| [docs/data-sources.md](docs/data-sources.md) | Data sources and ingestion |

## Project Structure

```
bankscope-intelligence/
├── app/                  # Next.js App Router pages and API routes
├── components/           # React components
├── lib/                  # Shared utilities
│   ├── types/            # TypeScript types
│   ├── db/               # Database client and queries
│   ├── sources/          # Data source connectors
│   └── ai/               # AI summarisation pipeline
├── scripts/              # CLI scripts for ingestion and seeding
└── docs/                 # Documentation
```

## Technology Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Scheduling**: Vercel Cron (daily at 06:00 UTC)
- **Deployment**: Vercel

## Data Sources (MVP)

- FCA (4 feeds: news, press releases, publications, speeches)
- PRA (Bank of England prudential regulation feed)
- Bank of England publications
- ICO (enforcement and news)
- HM Treasury (GOV.UK Atom feed, filtered for financial services)
- Companies House (REST API — significant filings for financial services firms)

## Legal Notice

BankScope Intelligence aggregates publicly available information from official government and regulatory sources. This platform is for informational purposes only. Always verify regulatory items with official sources before taking action. This is not legal or regulatory advice.
