# BankScope Intelligence

A production-grade regulatory intelligence platform for UK financial services. Real-time aggregation, AI analysis, and actionable insights on FCA, Bank of England, PRA, and government policy changes.

## Features

- **Multi-Source Aggregation**: Automatically ingests RSS feeds from FCA, Bank of England, PRA, HM Treasury, Companies House, and more
- **AI-Powered Analysis**: Claude 3.5 Sonnet analyzes regulatory items to extract impact, urgency, affected audiences, and suggested actions
- **Real-Time Alerts**: Continuously monitor regulatory changes via Vercel Crons
- **Full-Text Search**: Search across all regulatory announcements and policy documents
- **Dashboard**: Interactive interface to browse, filter, and explore intelligence items
- **RESTful API**: Machine-readable access to all intelligence data
- **Admin Panel**: Monitor ingestion runs, system health, and statistics

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: OpenAI API (Claude 3.5 Sonnet)
- **Data Sources**: RSS Parser, Companies House API
- **Deployment**: Vercel with Cron Jobs
- **Infrastructure**: Supabase for database and auth

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (https://app.supabase.com)
- OpenAI API key (https://platform.openai.com)
- Companies House API key (https://developer.company-information.service.gov.uk)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials, OpenAI API key, and other secrets.

3. Set up the database:

Log into Supabase dashboard, go to SQL Editor, and run the SQL from `lib/db/schema.sql`.

Alternatively, you can apply the migration through the Supabase CLI:

```bash
supabase db push
```

4. Seed initial data:

```bash
npm run seed
```

### Running Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run ingest` - Manually trigger RSS ingestion
- `npm run seed` - Seed database with initial data sources

## API Endpoints

### Intelligence Items

```http
GET /api/intelligence?search=consumer+duty&page=1&limit=20
```

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "FCA Updates Consumer Duty Expectations",
      "source_name": "FCA",
      "urgency": "high",
      "priority_score": 8,
      "ai_summary": "...",
      "category_tags": ["consumer duty", "compliance"],
      ...
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "has_more": true
}
```

### Newsletter Signup

```http
POST /api/newsletter
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Manual Ingestion

```http
POST /api/ingest
Authorization: Bearer CRON_SECRET

```

Response:

```json
{
  "success": true,
  "run_id": "uuid",
  "items_fetched": 245,
  "items_new": 42,
  "items_skipped": 203,
  "errors": []
}
```

### AI Summarization

```http
POST /api/summarise
Authorization: Bearer ADMIN_SECRET
```

## Project Structure

```
bankscope-intelligence/
├── app/                           # Next.js app directory
│   ├── api/                       # API routes
│   │   ├── intelligence/          # Intelligence item queries
│   │   ├── ingest/                # Manual/scheduled ingestion trigger
│   │   ├── summarise/             # AI summarization trigger
│   │   ├── newsletter/            # Email signup
│   │   └── cron/daily/            # Daily automated pipeline
│   ├── dashboard/                 # Intelligence dashboard
│   │   ├── page.tsx               # Main dashboard
│   │   └── [id]/                  # Item detail page
│   ├── admin/                     # Admin panel
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
├── lib/
│   ├── types/                     # TypeScript type definitions
│   ├── db/
│   │   ├── client.ts              # Supabase client initialization
│   │   ├── intelligence.ts        # Intelligence item queries & mutations
│   │   └── schema.sql             # Database schema
│   ├── ai/
│   │   └── summarizer.ts          # Claude AI summarization logic
│   └── sources/
│       ├── rss-fetcher.ts         # RSS feed parsing
│       └── companies-house.ts     # Companies House API integration
├── scripts/
│   ├── ingest.ts                  # Standalone ingestion script
│   └── seed.ts                    # Database seeding script
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── vercel.json                    # Vercel Cron configuration
└── .env.example                   # Environment variable template
```

## Data Flow

1. **Ingestion** (Daily 6 AM UTC via Vercel Cron):
   - Fetch latest regulatory items from 9+ RSS feeds and APIs
   - Deduplicate by source_id (URL hash)
   - Store raw items in `intelligence_items` table with `is_processed=false`

2. **AI Analysis**:
   - Claude 3.5 Sonnet analyzes unprocessed items
   - Generates: summary, urgency, affected audiences, priority score, category tags, suggested actions
   - Updates item with AI results, sets `is_processed=true` and `confidence_status='ai-generated'`

3. **Display**:
   - Dashboard queries `intelligence_items` table
   - Filters, searches, and paginates results
   - Users can explore, drill down, or export results

## Security

- **Row Level Security**: All tables have RLS policies. Public read access; writes restricted to service role
- **API Authentication**: Cron and admin endpoints require secret headers
- **Environment Variables**: Secrets stored in `.env.local` (never committed)
- **HTTPS Only**: All external APIs require HTTPS
- **Rate Limiting**: Built-in delays in RSS fetching and Companies House API calls

## Database

The schema includes:

- `intelligence_items` — Core store of all regulatory items
- `data_sources` — Registry of RSS feeds and data sources
- `ingestion_runs` — Audit log of every ingestion attempt
- `email_signups` — Landing page newsletter subscribers

All tables have:
- Full-text search indexes
- Time-based indexes for efficient filtering
- Auto-updated `updated_at` timestamps

## Deployment

### Vercel

```bash
vercel deploy
```

The app will be deployed with:
- Automatic preview deployments on pull requests
- Production deployment on merge to main
- Environment variables synced from `.env.local`
- Vercel Cron jobs configured in `vercel.json` for automatic daily ingestion

### Supabase

Create a project at https://app.supabase.com and run the SQL from `lib/db/schema.sql`.

## Performance

- **API Response Time**: Sub-100ms for paginated queries (cached for 60s)
- **Search**: PostgreSQL full-text search index on title + summary + excerpt
- **Ingestion**: Completes in ~30-60 seconds for 200+ items
- **AI Analysis**: ~10-15 seconds per item (rate-limited to respect API usage)

## Monitoring

Visit `/admin` to view:
- System statistics (total items, unprocessed count, today's additions)
- Recent ingestion runs with timing and error logs
- Instructions for manual runs

## Contributing

PRs welcome. Please follow the existing code style and test before submitting.

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
# BankScope
