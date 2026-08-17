/**
 * SEC EDGAR Form D Integration
 *
 * Fetches Form D filings to corroborate/supplement funding evidence.
 * Form D reliably provides: amount raised, filing date, offering details.
 * Form D does NOT provide: post-money valuation, employee counts, momentum data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type FormDFiling = {
  filingDate: string;        // YYYY-MM-DD
  amountSold: number;        // In USD (not billions)
  totalOffering: number;     // In USD
  offeringType: string;      // e.g., "Equity", "Debt"
  accessionNumber: string;   // SEC filing ID
  cik: string;               // Company CIK number
};

/**
 * Search for a company's CIK number by name
 * Uses SEC EDGAR company tickers JSON (updated daily)
 */
async function findCompanyCIK(companyName: string): Promise<string | null> {
  try {
    // SEC company tickers JSON (updated nightly)
    const response = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      {
        headers: {
          'User-Agent': 'Lumen Private Market Evidence Ledger research@decisionlayer.dev',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // data is {0: {cik_str, ticker, title}, 1: {...}, ...}
    const companies = Object.values(data) as Array<{cik_str: number, ticker: string, title: string}>;

    // Try exact match first
    const exactMatch = companies.find(c =>
      c.title.toLowerCase() === companyName.toLowerCase()
    );

    if (exactMatch) return exactMatch.cik_str.toString();

    // Try fuzzy match (company name contains search term or vice versa)
    const fuzzyMatch = companies.find(c =>
      c.title.toLowerCase().includes(companyName.toLowerCase()) ||
      companyName.toLowerCase().includes(c.title.toLowerCase())
    );

    if (fuzzyMatch) return fuzzyMatch.cik_str.toString();

    return null;

  } catch (err) {
    console.error('[sec-edgar] CIK lookup failed:', err);
    return null;
  }
}

/**
 * Fetch Form D filings for a company
 * Returns parsed filing data
 *
 * NOTE: This is a simplified implementation that captures filing dates and
 * references but does NOT extract detailed amounts (would require XML parsing).
 * For MVP, we create evidence items noting the Form D exists as corroboration.
 */
export async function fetchFormDFilings(companyName: string): Promise<FormDFiling[]> {
  try {
    // Step 1: Find company CIK
    const cik = await findCompanyCIK(companyName);
    if (!cik) {
      console.log(`[sec-edgar] No CIK found for ${companyName}`);
      return [];
    }

    console.log(`[sec-edgar] Found CIK ${cik} for ${companyName}`);

    // Step 2: Fetch company submissions (all filings)
    const paddedCIK = cik.padStart(10, '0');
    const response = await fetch(
      `https://data.sec.gov/submissions/CIK${paddedCIK}.json`,
      {
        headers: {
          'User-Agent': 'Lumen Private Market Evidence Ledger research@decisionlayer.dev',
        },
      }
    );

    if (!response.ok) {
      console.error(`[sec-edgar] Failed to fetch submissions: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const filings: FormDFiling[] = [];

    // Step 3: Filter for Form D filings
    const recentFilings = data.filings?.recent;
    if (!recentFilings) {
      console.log(`[sec-edgar] No filings found for CIK ${cik}`);
      return [];
    }

    for (let i = 0; i < recentFilings.form.length; i++) {
      const form = recentFilings.form[i];

      // Look for Form D or D/A (amendments)
      if (form === 'D' || form === 'D/A') {
        const filingDate = recentFilings.filingDate[i];
        const accessionNumber = recentFilings.accessionNumber[i];

        // For MVP: create placeholder filing (detailed parsing would require XML fetch)
        filings.push({
          filingDate,
          amountSold: 0, // Would need to parse XML to get actual amount
          totalOffering: 0,
          offeringType: 'Form D Filing',
          accessionNumber,
          cik: paddedCIK,
        });
      }
    }

    console.log(`[sec-edgar] Found ${filings.length} Form D filings for ${companyName}`);
    return filings;

  } catch (err) {
    console.error('[sec-edgar] Form D fetch failed:', err);
    return [];
  }
}

/**
 * Add Form D filings as evidence to the ledger
 * Corroborates existing evidence and adds new rounds
 */
export async function addFormDEvidence(
  supabase: SupabaseClient,
  companyId: string,
  companyName: string
): Promise<number> {
  const filings = await fetchFormDFilings(companyName);

  if (filings.length === 0) {
    return 0;
  }

  let addedCount = 0;

  for (const filing of filings) {
    try {
      // Check if we already have evidence for this filing
      const { data: existing } = await supabase
        .from('lumen_evidence')
        .select('id')
        .eq('company_id', companyId)
        .eq('category', 'Funding')
        .gte('date', filing.filingDate)
        .lte('date', new Date(new Date(filing.filingDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Within 30 days
        .maybeSingle();

      if (existing) {
        console.log(`[sec-edgar] Skipping duplicate filing for ${filing.filingDate}`);
        continue;
      }

      // Add as new evidence (noting Form D exists for corroboration)
      // TODO: Parse XML to extract exact amounts - for MVP we note filing exists
      const description = `${companyName} filed SEC Form D (securities offering registration) on ${filing.filingDate}. Filing indicates exempt offering activity (amount details require XML parsing - not yet implemented).`;

      const { error } = await supabase
        .from('lumen_evidence')
        .insert({
          company_id: companyId,
          category: 'Funding',
          description,
          value: null, // Would need XML parsing to extract amount
          source_type: 'SEC / Government Filing',
          source_label: 'SEC Form D',
          date: filing.filingDate,
          citation_url: `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${filing.cik}&accession_number=${filing.accessionNumber}`,
          contributor: 'sec-edgar-integration',
          status: 'verified', // SEC filings are inherently verified
          verified_by: ['sec-edgar-integration'],
          affiliation_disclosed: false,
        });

      if (error) {
        console.error(`[sec-edgar] Failed to insert evidence:`, error);
      } else {
        console.log(`[sec-edgar] Added Form D evidence for ${filing.filingDate}: $${amountBillions}B`);
        addedCount++;
      }

    } catch (err) {
      console.error(`[sec-edgar] Failed to process filing:`, err);
    }
  }

  return addedCount;
}
