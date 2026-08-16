import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pickMostCredible } from '@/app/lib/valuation';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all Funding evidence for this company
    const { data: allFundingEvidence, error } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('category', 'Funding')
      .order('date', { ascending: true });

    if (error) throw error;

    // Filter to this company in JS (workaround for .eq() bug)
    const fundingEvidence = (allFundingEvidence || []).filter(e => e.company_id === params.id);

    if (fundingEvidence.length === 0) {
      return NextResponse.json({ rounds: [] });
    }

    // Group by date + round_type to handle multiple sources reporting same round
    // Use credibility-weighted tie-breaking (same as pickMostCredible)
    const roundGroups: Record<string, typeof fundingEvidence> = {};

    for (const evidence of fundingEvidence) {
      // Create a key combining date and round_type
      const key = `${evidence.date}-${evidence.round_type || 'unspecified'}`;
      if (!roundGroups[key]) {
        roundGroups[key] = [];
      }
      roundGroups[key].push(evidence);
    }

    // For each group, pick the most credible evidence
    const rounds = Object.values(roundGroups).map(group => {
      // Use pickMostCredible logic but for a specific date/round combo
      // Sort by credibility (verified > pending, higher source confidence)
      const sorted = group.sort((a, b) => {
        // Verified beats pending
        if (a.status === 'verified' && b.status !== 'verified') return -1;
        if (b.status === 'verified' && a.status !== 'verified') return 1;

        // If both same status, prefer higher source type confidence
        // (This is simplified - full logic is in pickMostCredible)
        return 0;
      });

      const best = sorted[0];

      // Extract funding amount from description if present
      // Look for patterns like "$110B", "$40 billion", etc.
      let fundingAmount: string | null = null;
      const amountMatch = best.description.match(/\$[\d.]+\s*(?:billion|B|million|M)/i);
      if (amountMatch) {
        fundingAmount = amountMatch[0];
      }

      return {
        id: best.id,
        date: best.date,
        value: parseValuationFromEvidence(best),
        round_type: best.round_type,
        funding_amount: best.value || fundingAmount, // Use evidence.value if set, otherwise parse
        source_label: best.source_label,
        description: best.description,
        status: best.status,
        evidence_count: group.length, // How many sources reported this round
      };
    });

    // Sort by date
    rounds.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ rounds });
  } catch (err: any) {
    console.error('[lumen/funding-rounds] error:', err);
    return NextResponse.json({ error: 'Failed to fetch funding rounds' }, { status: 500 });
  }
}

/**
 * Extracts valuation in billions from evidence.
 * Tries: description mentions, value field.
 */
function parseValuationFromEvidence(evidence: any): number {
  // Look for valuation mentions in description
  // Patterns: "at a $852 billion valuation", "valued at $300B", etc.
  const desc = evidence.description || '';

  // Try to find "valued at $X billion" or "valuation of $X billion"
  const valuationMatch = desc.match(/valuation.*?\$?([\d.]+)\s*(?:billion|B)/i);
  if (valuationMatch) {
    return parseFloat(valuationMatch[1]);
  }

  // Try "at $X billion" or "at a $X billion valuation"
  const atMatch = desc.match(/at.*?\$?([\d.]+)\s*(?:billion|B)/i);
  if (atMatch) {
    return parseFloat(atMatch[1]);
  }

  // Fallback: return 0 (will need to be handled in UI)
  return 0;
}
