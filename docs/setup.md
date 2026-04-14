# Local Setup Guide

## Prerequisites

- Node.js 18 or higher
- npm 9+
- A Supabase account (free tier works)
- An OpenAI account (pay-per-use)
- A Companies House developer account (free)

## Step 1 — Install dependencies

```bash
npm install
```

## Step 2 — Create your Supabase project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New project**
3. Name it `bankscope-intelligence`
4. Choose a region (recommend `eu-west-2` for UK data)
5. Set a secure database password (save it)
6. Wait for the project to provision (~2 minutes)

## Step 3 — Run the database schema

1. In your Supabase dashboard, click **SQL Editor** → **New query**
2. Open `lib/db/schema.sql` from this project
3. Paste the entire contents into the SQL editor
4. Click **Run**
5. You should see: "Success. No rows returned."

## Step 4 — Get your Supabase keys

1. In Supabase, go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Never expose the `service_role` key on the client side.

## Step 5 — Get your OpenAI key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy it → `OPENAI_API_KEY`
4. Add at least $5 credit to your account

## Step 6 — Get your Companies House key

1. Go to [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk)
2. Register for a free account
3. Create an application (type: **Web Application**)
4. Create a **live** API key
5. Copy it → `COMPANIES_HOUSE_API_KEY`

## Step 7 — Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values. Also generate secrets:

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Generate ADMIN_SECRET
openssl rand -base64 32
```

## Step 8 — Seed sample data

```bash
npm run seed
```

This adds 6 sample intelligence items so the dashboard shows data immediately.

## Step 9 — Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 10 — Run ingestion manually

```bash
# Ingest all sources
npm run ingest

# Ingest a specific source
npm run ingest -- --source="FCA"

# Ingest and run AI summarisation
npm run ingest -- --summarise
```

## Troubleshooting

**"Missing Supabase environment variables"** — Check that `.env.local` exists and contains valid values.

**"OPENAI_API_KEY not set"** — Summarisation will be skipped. Add the key to `.env.local`.

**RSS feeds returning 0 items** — The FCA/BoE feeds may be temporarily unavailable. Check the source URL in a browser. The app logs errors gracefully.

**Companies House 401 error** — Your API key is invalid or has not been activated. Check the developer portal.
