# Vercel Deployment Guide

## Prerequisites

- A Vercel account ([vercel.com](https://vercel.com))
- Your project on GitHub (recommended) or deployed directly from the CLI
- All environment variables ready (see [env-vars.md](env-vars.md))

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial BankScope Intelligence MVP"
git remote add origin https://github.com/yourusername/bankscope-intelligence.git
git push -u origin main
```

## Step 2 — Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `bankscope-intelligence` repository
4. Framework preset will auto-detect as **Next.js**
5. Do NOT deploy yet — add environment variables first

## Step 3 — Add environment variables in Vercel

In the Vercel import screen (or later in **Project Settings → Environment Variables**), add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `OPENAI_API_KEY` | Your OpenAI key |
| `COMPANIES_HOUSE_API_KEY` | Your Companies House key |
| `CRON_SECRET` | Your generated secret |
| `ADMIN_SECRET` | Your generated secret |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL (e.g. `https://bankscope.vercel.app`) |

Set all variables for **Production**, **Preview**, and **Development** environments.

## Step 4 — Deploy

Click **Deploy**. Vercel will build and deploy your app. First deployment takes ~2-3 minutes.

## Step 5 — Verify cron job

1. In Vercel dashboard, go to your project → **Settings** → **Cron Jobs**
2. You should see one job: `GET /api/cron/daily` — `0 6 * * *` (daily at 06:00 UTC)
3. You can trigger it manually here for testing

## Step 6 — Connect a custom domain

1. In Vercel → your project → **Settings** → **Domains**
2. Add your domain (e.g. `intelligence.yourdomain.com`)
3. In your DNS provider, add a CNAME record:
   - Name: `intelligence`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (usually 5-30 minutes)
5. Vercel will automatically provision an SSL certificate

## Step 7 — Test the deployment

```bash
# Test the dashboard
curl https://your-domain.com/api/intelligence

# Test manual ingestion (replace YOUR_ADMIN_SECRET)
curl -X POST https://your-domain.com/api/ingest \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"

# Test AI summarisation
curl -X POST https://your-domain.com/api/summarise \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 5}'
```

## Vercel Plan Notes

The **Hobby (free) tier** supports:
- 1 cron job ✅
- 100GB bandwidth ✅
- Serverless functions up to 10s (upgrade to Pro for 5-minute limit)

For production use, upgrade to **Vercel Pro** ($20/month) to enable:
- 300-second function timeout (needed for large ingestion batches)
- Better cron reliability

## WordPress Embedding / Linking

### Option A — Full iframe embed (simple)

Add to any WordPress page or template:

```html
<iframe 
  src="https://your-bankscope-domain.com/dashboard" 
  width="100%" 
  height="900px" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>
```

### Option B — Link to the app (recommended)

Add a button or menu item in WordPress:

```html
<a href="https://your-bankscope-domain.com/dashboard" 
   target="_blank" 
   class="your-wp-button-class">
  Open Intelligence Dashboard →
</a>
```

### Option C — Subdomain setup (cleanest)

1. Add a subdomain to your WordPress domain: `intelligence.yoursite.com`
2. Point it at Vercel as described in Step 6
3. The BankScope app lives at `intelligence.yoursite.com`
4. WordPress links to it as an external URL

This is the cleanest approach — WordPress handles marketing, BankScope handles the product.

### Option D — Vercel Rewrites (advanced)

In your `next.config.ts`, add rewrites to serve from a path like `/intelligence/*`:

```typescript
async rewrites() {
  return [
    {
      source: '/intelligence/:path*',
      destination: 'https://your-bankscope.vercel.app/:path*',
    },
  ]
}
```

This requires the WordPress site to also be on Next.js or a proxy-capable host.
