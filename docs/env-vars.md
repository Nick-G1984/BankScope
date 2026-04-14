# Environment Variables Reference

| Variable | Required | Description | Where to get it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (admin) | Supabase → Project Settings → API |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI summarisation | platform.openai.com/api-keys |
| `COMPANIES_HOUSE_API_KEY` | ⚠️ Optional | Companies House REST API key | developer.company-information.service.gov.uk |
| `CRON_SECRET` | ✅ | Secret used by Vercel to authenticate cron calls | Generate: `openssl rand -base64 32` |
| `ADMIN_SECRET` | ✅ | Secret used to authorise admin panel actions | Generate: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Optional | Public URL of the deployed app | Your Vercel URL or custom domain |

## Where each variable is used

| Variable | Files |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/db/client.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/db/client.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/db/client.ts` → `createAdminClient()` |
| `OPENAI_API_KEY` | `lib/ai/summarise.ts` |
| `COMPANIES_HOUSE_API_KEY` | `lib/sources/companies-house.ts` |
| `CRON_SECRET` | `app/api/cron/daily/route.ts` |
| `ADMIN_SECRET` | `app/api/ingest/route.ts`, `app/api/summarise/route.ts` |
| `NEXT_PUBLIC_APP_URL` | Available for use in `app/layout.tsx` metadata if needed |

## Security Notes

- Never commit `.env.local` to version control (it is in `.gitignore`)
- The `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to the browser — only use it in server-side code
- The `CRON_SECRET` must match exactly what Vercel sends in the `Authorization: Bearer` header
- Rotate `ADMIN_SECRET` if you suspect it has been compromised — update in Vercel dashboard and redeploy

## Cost Estimates (per month, low volume)

| Service | Estimated cost |
|---|---|
| Supabase Free tier | £0 (up to 500MB DB, 2GB bandwidth) |
| OpenAI GPT-4o-mini (~50 items/day × 30 days × ~800 tokens) | ~£1–3 |
| Vercel Hobby tier | £0 |
| Companies House API | £0 (free) |
| **Total** | **~£1–3/month** |
