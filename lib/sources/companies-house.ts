import { createHash } from 'crypto'
import type { RawSourceItem, SourceResult } from '../types'

const BASE_URL = 'https://api.company-information.service.gov.uk'

// SIC codes relevant to retail financial services in the UK
const FINANCIAL_SERVICES_SIC_CODES = [
  '64110', // Central banking
  '64191', // Banks
  '64192', // Building societies
  '64201', // Activities of financial holding companies
  '64205', // Activities of financial services holding companies
  '64910', // Financial leasing
  '64921', // Credit granting by non-deposit taking finance houses and other specialist consumer credit grantors
  '64922', // Activities of mortgage finance companies
  '64929', // Other credit granting
  '64991', // Security dealing on own account
  '64999', // Financial service activities, except insurance and pension funding
  '65110', // Life insurance
  '65120', // Non-life insurance
  '65201', // Life reinsurance
  '65202', // Non-life reinsurance
  '65300', // Pension funding
]

interface CompaniesHouseSearchResult {
  company_number: string
  title: string
  date_of_creation?: string
  company_status?: string
  company_type?: string
  registered_office_address?: {
    address_line_1?: string
    locality?: string
    postal_code?: string
  }
}

interface CompaniesHouseFilingResult {
  transaction_id: string
  type: string
  date: string
  description?: string
  links?: { document_metadata?: string }
}

async function companiesHouseFetch<T>(
  path: string,
  apiKey: string
): Promise<T | null> {
  try {
    const credentials = Buffer.from(`${apiKey}:`).toString('base64')
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'User-Agent': 'BankScope-Intelligence/1.0',
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limited by Companies House API')
      if (response.status === 401) throw new Error('Invalid Companies House API key')
      return null
    }

    return response.json() as T
  } catch (err) {
    throw err
  }
}

function generateSourceId(companyNumber: string, filingId: string): string {
  return createHash('sha256')
    .update(`companies-house::${companyNumber}::${filingId}`)
    .digest('hex')
    .slice(0, 32)
}

// Filing types we consider significant for intelligence purposes
const SIGNIFICANT_FILING_TYPES = new Set([
  'DISS40',    // Compulsory strike off action
  'DISS16(SOAS)',
  'MR01',      // Mortgage / charge
  'MR04',      // Charge satisfied
  'AP01',      // Director appointment
  'TM01',      // Director termination
  'SH01',      // Return of allotment of shares
  'CS01',      // Confirmation statement
  'AA',        // Annual accounts
  'ADMIN2',    // Administration
  'LQDR',      // Liquidation
  'RM02',      // Change of registered office
])

export async function ingestCompaniesHouse(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  const errors: string[] = []
  const items: RawSourceItem[] = []

  if (!apiKey) {
    return {
      source_name: 'Companies House',
      items_fetched: 0,
      items_new: 0,
      errors: ['COMPANIES_HOUSE_API_KEY not set — skipping Companies House ingestion'],
      items: [],
    }
  }

  // Search for recently changed financial services companies
  const sicCode = FINANCIAL_SERVICES_SIC_CODES[1] // Banks (64191) as primary example

  try {
    const searchResult = await companiesHouseFetch<{
      items?: CompaniesHouseSearchResult[]
      total_results?: number
    }>(
      `/advanced-search/companies?sic_codes=${sicCode}&company_status=active&size=20`,
      apiKey
    )

    if (!searchResult?.items) {
      errors.push('Companies House: no results returned from advanced search')
      return { source_name: 'Companies House', items_fetched: 0, items_new: 0, errors, items }
    }

    // For each company, get recent filings
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    for (const company of searchResult.items.slice(0, 5)) {
      // Rate limiting: Companies House allows 600 requests per 5 minutes
      await new Promise((resolve) => setTimeout(resolve, 100))

      try {
        const filings = await companiesHouseFetch<{
          items?: CompaniesHouseFilingResult[]
        }>(
          `/company/${company.company_number}/filing-history?items_per_page=10`,
          apiKey
        )

        if (!filings?.items) continue

        for (const filing of filings.items) {
          if (!SIGNIFICANT_FILING_TYPES.has(filing.type)) continue

          const filingDate = new Date(filing.date)
          if (filingDate < thirtyDaysAgo) continue

          const sourceId = generateSourceId(company.company_number, filing.transaction_id)
          const description = filing.description || filing.type

          items.push({
            source_id: sourceId,
            title: `${company.title}: ${description} (${filing.type})`,
            source_name: 'Companies House',
            source_type: 'government',
            content_type: 'data',
            publish_date: new Date(filing.date).toISOString(),
            source_url: `https://find-and-update.company-information.service.gov.uk/company/${company.company_number}/filing-history`,
            raw_excerpt: `Company: ${company.title} (${company.company_number}). Filing type: ${filing.type}. Date: ${filing.date}. ${description}`,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Companies House filing fetch error for ${company.company_number}: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Companies House search error: ${msg}`)
  }

  return {
    source_name: 'Companies House',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
