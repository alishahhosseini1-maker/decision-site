import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 0; // Disable all caching
// RLS disabled 2026-08-16 - force redeploy

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Look up company by slug OR UUID
    console.log('[funding-rounds] Looking up company:', params.id);

    // Try by slug first, then by UUID
    let { data: company, error: companyError } = await supabase
      .from('lumen_companies')
      .select('id')
      .eq('slug', params.id)
      .maybeSingle();

    // If not found by slug, try by UUID
    if (!company) {
      const result = await supabase
        .from('lumen_companies')
        .select('id')
        .eq('id', params.id)
        .maybeSingle();

      company = result.data;
      companyError = result.error;
    }

    console.log('[funding-rounds] Company lookup result:', { company, error: companyError });

    if (companyError || !company) {
      console.log('[funding-rounds] Company not found, returning empty');
      return NextResponse.json({
        rounds: [],
        debug: {
          error: 'Company not found',
          lookupParam: params.id,
          companyError: companyError?.message
        }
      });
    }

    // TypeScript type guard - company is definitely not null here
    const companyId = company.id;
    console.log('[funding-rounds] Found company UUID:', companyId);

    // Fetch all VERIFIED Funding evidence for this company (exclude pending/disputed)
    const { data: allFundingEvidence, error } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('category', 'Funding')
      .eq('status', 'verified')
      .order('date', { ascending: true });

    if (error) throw error;

    // Filter to this company using the UUID
    console.log('[funding-rounds] Total Funding evidence:', allFundingEvidence?.length || 0);
    console.log('[funding-rounds] Looking for companyId:', companyId, 'type:', typeof companyId);

    if (allFundingEvidence && allFundingEvidence.length > 0) {
      console.log('[funding-rounds] Sample evidence company_id:', allFundingEvidence[0].company_id, 'type:', typeof allFundingEvidence[0].company_id);
    }

    // Log ALL company_ids in evidence for debugging
    if (allFundingEvidence && allFundingEvidence.length > 0) {
      console.log('[funding-rounds] Company IDs in evidence:', allFundingEvidence.slice(0, 3).map(e => e.company_id));
    }

    const fundingEvidence = (allFundingEvidence || []).filter(e => e.company_id === companyId);
    console.log('[funding-rounds] Filtered to company:', fundingEvidence.length);

    if (fundingEvidence.length === 0) {
      console.log('[funding-rounds] No evidence found for this company');
      return NextResponse.json({
        rounds: [],
        debug: {
          error: 'No funding evidence for this company',
          companyId,
          totalFundingEvidence: allFundingEvidence?.length || 0,
          filteredToCompany: 0
        }
      });
    }

    // Group by valuation amount to handle multiple sources reporting same round
    // (Same valuation = same round, even if reported on different dates)
    const roundGroups: Record<string, typeof fundingEvidence> = {};

    for (const evidence of fundingEvidence) {
      // Create a key from the valuation amount (in billions)
      const valuationKey = evidence.value || 'unknown';
      if (!roundGroups[valuationKey]) {
        roundGroups[valuationKey] = [];
      }
      roundGroups[valuationKey].push(evidence);
    }

    // For each valuation group, pick the most credible evidence with earliest date
    const rounds = Object.values(roundGroups).map(group => {
      // Sort by credibility first, then by date (earliest)
      const sorted = group.sort((a, b) => {
        // Verified beats pending
        if (a.status === 'verified' && b.status !== 'verified') return -1;
        if (b.status === 'verified' && a.status !== 'verified') return 1;

        // If both same status, prefer earlier date (first reported)
        return a.date.localeCompare(b.date);
      });

      const best = sorted[0];

      // Parse valuation from evidence.value field (which is stored in billions as a string)
      const valuationBillions = best.value ? parseFloat(best.value) : 0;

      // Use the actual funding_amount field (amount raised in this round)
      const amountRaisedBillions = best.funding_amount ? parseFloat(best.funding_amount.toString()) : null;

      return {
        id: best.id,
        date: best.date,
        value: valuationBillions, // Post-money valuation in billions
        round_type: best.round_type,
        funding_amount: amountRaisedBillions ? `$${amountRaisedBillions}B` : null, // Amount raised (display format)
        source_label: best.source_label,
        description: best.description,
        status: best.status,
        evidence_count: group.length, // How many sources reported this round
      };
    });

    // Sort by date
    rounds.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      rounds,
      debug: {
        companyId,
        totalFundingEvidence: allFundingEvidence?.length || 0,
        filteredToCompany: fundingEvidence.length,
        roundsReturned: rounds.length
      }
    });
  } catch (err: any) {
    console.error('[lumen/funding-rounds] error:', err);
    return NextResponse.json({ error: 'Failed to fetch funding rounds' }, { status: 500 });
  }
}

