# Data Sources

## Active Sources (MVP)

### FCA — Financial Conduct Authority
- **Type**: Regulator
- **Feeds**:
  - `https://www.fca.org.uk/news/rss.xml` — General news
  - `https://www.fca.org.uk/news/press-releases/rss.xml` — Press releases
  - `https://www.fca.org.uk/publications/rss.xml` — Publications
  - `https://www.fca.org.uk/news/speeches/rss.xml` — Speeches
- **Connector**: `lib/sources/fca.ts`
- **Notes**: Covers policy statements, consultation papers, enforcement notices, Dear CEO letters, guidance, and speeches. Categorised automatically.

### PRA — Prudential Regulation Authority
- **Type**: Regulator
- **Feed**: `https://www.bankofengland.co.uk/prudential-regulation/news-rss`
- **Connector**: `lib/sources/pra.ts`
- **Notes**: Covers supervisory statements, policy statements, Dear CEO letters, and consultations for deposit takers.

### Bank of England
- **Type**: Regulator / Central Bank
- **Feed**: `https://www.bankofengland.co.uk/rss/publications`
- **Connector**: `lib/sources/boe.ts`
- **Notes**: Covers Financial Stability Reports, Monetary Policy Committee statements, working papers, and Quarterly Bulletins relevant to retail banking.

### ICO — Information Commissioner's Office
- **Type**: Regulator
- **Feed**: `https://ico.org.uk/feed/`
- **Connector**: `lib/sources/ico.ts`
- **Notes**: Covers enforcement actions (fines, reprimands), guidance on GDPR/data protection, and consultations relevant to financial services firms.

### HM Treasury
- **Type**: Government
- **Feed**: `https://www.gov.uk/government/organisations/hm-treasury.atom`
- **Connector**: `lib/sources/hmt.ts`
- **Notes**: All Treasury publications are fetched, then filtered using keywords to retain only items relevant to retail financial services (banking, credit, payments, regulation, savings etc.).

### Companies House
- **Type**: Government / Company Registry
- **API**: `https://api.company-information.service.gov.uk`
- **Connector**: `lib/sources/companies-house.ts`
- **Notes**: Queries the Companies House API for recent significant filings (appointments, resignations, accounts, liquidations) from active financial services companies filtered by SIC code. Requires a free API key.

## Deferred Sources (planned for V2)

| Source | Reason deferred | Planned approach |
|---|---|---|
| FCA Complaints Dataset | Biannual CSV release, not real-time | Scheduled download + CSV processing |
| Financial Ombudsman Service | No stable API; HTML scraping needed | Cheerio scraper against decisions page |
| PSR (Payment Systems Regulator) | Low volume; covered partially via HMT | Add dedicated RSS if feed stabilises |
| FCA Register changes | No public RSS; scraping complex | Webhook or periodic diff of register download |
| Branch closure notices | Fragmented sources | Multi-source aggregation |
| Martin Lewis / MoneySavingExpert | Consumer signals | RSS feed + relevance filtering |
| UK Finance | Press releases | RSS (when available) |
| Building Societies Association | Publications | RSS or HTML scrape |

## Adding a New Source

1. Create a new file in `lib/sources/` (e.g. `lib/sources/psr.ts`)
2. Export an `ingestPSR()` function matching the `SourceResult & { items: RawSourceItem[] }` return type
3. Import and register it in `lib/sources/index.ts`
4. Add a seed row to `data_sources` table in Supabase
5. Run `npm run ingest -- --source="PSR"` to test
