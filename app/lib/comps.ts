import type { SupabaseClient } from '@supabase/supabase-js';
import type { Company, Comp } from './lumen';

// Finds and caches comparable companies based on sector and business model
export async function computeComparables(
  supabase: SupabaseClient,
  company: Company
): Promise<Comp[]> {
  // Get the company's revenue for multiple calculation
  const { data: revenueEvidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .eq('category', 'Revenue')
    .eq('status', 'verified')
    .order('date', { ascending: false })
    .limit(1);

  const hasRevenue = revenueEvidence && revenueEvidence.length > 0;

  // If no revenue, can't compute meaningful revenue multiples
  // But we can still find sector peers for context
  if (!hasRevenue && !company.sector) {
    return [];
  }

  // Find other companies in same sector with valuations
  const { data: sectorPeers } = await supabase
    .from('lumen_companies')
    .select('*')
    .neq('id', company.id)
    .order('last_researched_at', { ascending: false, nullsFirst: false })
    .limit(50); // Get top 50 recently researched companies

  if (!sectorPeers || sectorPeers.length === 0) {
    return [];
  }

  // Score similarity and compute multiples
  const comps: Comp[] = [];

  for (const peer of sectorPeers) {
    let similarityScore = 0;

    // Sector match (most important)
    if (company.sector && peer.sector && company.sector === peer.sector) {
      similarityScore += 60;
    } else if (company.sector && peer.sector) {
      // Partial match for related sectors (e.g., "AI" and "Enterprise Software")
      const sectors = [company.sector.toLowerCase(), peer.sector.toLowerCase()];
      if (sectors.some(s => s.includes('ai')) && sectors.every(s => s.includes('ai') || s.includes('software'))) {
        similarityScore += 30;
      }
    }

    // Has valuation data
    const peerValuation = peer.secondary_value || peer.last_round_value;
    if (peerValuation) {
      similarityScore += 20;
    }

    // Has revenue data (for multiple calculation)
    const { data: peerRevenue } = await supabase
      .from('lumen_evidence')
      .select('value')
      .eq('company_id', peer.id)
      .eq('category', 'Revenue')
      .eq('status', 'verified')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (peerRevenue) {
      similarityScore += 20;
    }

    // Only include if similarity score meets threshold
    if (similarityScore < 40) continue;

    // Extract revenue value
    const revenueValue = peerRevenue?.value
      ? parseFloat(peerRevenue.value.replace(/[^0-9.]/g, ''))
      : null;

    // Compute revenue multiple if both valuation and revenue exist
    const revenueMultiple = peerValuation && revenueValue && revenueValue > 0
      ? peerValuation / revenueValue
      : null;

    comps.push({
      company_id: company.id,
      comp_name: peer.name,
      comp_slug: peer.slug,
      comp_valuation: peerValuation,
      comp_revenue: revenueValue,
      comp_revenue_multiple: revenueMultiple,
      sector: peer.sector,
      similarity_score: similarityScore,
      computed_at: new Date().toISOString(),
    });
  }

  // Sort by similarity score descending, take top 5
  const topComps = comps
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5);

  // Cache in database
  if (topComps.length > 0) {
    // Delete old comps
    await supabase
      .from('lumen_comps')
      .delete()
      .eq('company_id', company.id);

    // Insert new comps
    await supabase
      .from('lumen_comps')
      .insert(topComps);
  }

  return topComps;
}

// Computes delta/trend statistics for a company
export async function computeDelta(
  supabase: SupabaseClient,
  company: Company
): Promise<{
  lastRoundToCurrentPct: number | null;
  yoyPct: number | null;
  vsPeerAvgPct: number | null;
}> {
  const currentEstimate = company.secondary_value || company.last_round_value;

  if (!currentEstimate) {
    return { lastRoundToCurrentPct: null, yoyPct: null, vsPeerAvgPct: null };
  }

  // Last round → Current
  const lastRoundToCurrentPct = company.last_round_value && company.secondary_value
    ? ((company.secondary_value - company.last_round_value) / company.last_round_value) * 100
    : null;

  // YoY change (get valuation from ~1 year ago)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

  const { data: historicalVal } = await supabase
    .from('lumen_valuation_history')
    .select('*')
    .eq('company_id', company.id)
    .lte('date', oneYearAgoStr)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const yoyPct = historicalVal
    ? ((currentEstimate - historicalVal.value) / historicalVal.value) * 100
    : null;

  // vs Peer Average (from cached comps)
  const { data: comps } = await supabase
    .from('lumen_comps')
    .select('*')
    .eq('company_id', company.id)
    .not('comp_revenue_multiple', 'is', null);

  if (!comps || comps.length === 0) {
    return { lastRoundToCurrentPct, yoyPct, vsPeerAvgPct: null };
  }

  // Get this company's revenue
  const { data: revenueEvidence } = await supabase
    .from('lumen_evidence')
    .select('value')
    .eq('company_id', company.id)
    .eq('category', 'Revenue')
    .eq('status', 'verified')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!revenueEvidence?.value) {
    return { lastRoundToCurrentPct, yoyPct, vsPeerAvgPct: null };
  }

  const revenue = parseFloat(revenueEvidence.value.replace(/[^0-9.]/g, ''));
  if (!revenue || revenue === 0) {
    return { lastRoundToCurrentPct, yoyPct, vsPeerAvgPct: null };
  }

  const ourMultiple = currentEstimate / revenue;

  const peerMultiples = comps
    .map(c => c.comp_revenue_multiple)
    .filter((m): m is number => m !== null);

  if (peerMultiples.length === 0) {
    return { lastRoundToCurrentPct, yoyPct, vsPeerAvgPct: null };
  }

  const peerAvgMultiple = peerMultiples.reduce((a, b) => a + b, 0) / peerMultiples.length;
  const vsPeerAvgPct = ((ourMultiple - peerAvgMultiple) / peerAvgMultiple) * 100;

  return { lastRoundToCurrentPct, yoyPct, vsPeerAvgPct };
}
