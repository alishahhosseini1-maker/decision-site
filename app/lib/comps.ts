import type { SupabaseClient } from '@supabase/supabase-js';
import type { Company, Comp } from './lumen';

const PRIVATE_PEER_THRESHOLD = 3; // Minimum private peers before showing prominently

// Sector similarity mapping for fallback when exact match is sparse
// Maps primary sector → related sectors that are acceptable fallback matches
const RELATED_SECTORS: Record<string, string[]> = {
  'Artificial Intelligence': ['Infrastructure & Cloud', 'Enterprise Software', 'Developer Tools'],
  'Enterprise Software': ['Infrastructure & Cloud', 'Developer Tools', 'Artificial Intelligence'],
  'Fintech': ['Infrastructure & Cloud', 'Developer Tools', 'Enterprise Software'],
  'Healthcare Tech': ['Enterprise Software', 'Artificial Intelligence'],
  'Developer Tools': ['Infrastructure & Cloud', 'Enterprise Software', 'Artificial Intelligence'],
  'E-commerce & Marketplace': ['Consumer Apps', 'Social & Communications'],
  'Infrastructure & Cloud': ['Enterprise Software', 'Developer Tools', 'Artificial Intelligence'],
  'Social & Communications': ['Consumer Apps', 'E-commerce & Marketplace'],
  'Hardware & Manufacturing': ['Aerospace & Defense', 'Infrastructure & Cloud'],
  'Cybersecurity': ['Enterprise Software', 'Infrastructure & Cloud'],
  'Aerospace & Defense': ['Hardware & Manufacturing'],
  'Gaming & Entertainment': ['Consumer Apps', 'Social & Communications'],
  'Consumer Apps': ['Social & Communications', 'E-commerce & Marketplace'],
  'Energy & Climate Tech': ['Hardware & Manufacturing', 'Infrastructure & Cloud'],
};

function getRelatedSectors(sector: string | null): string[] {
  if (!sector) return [];
  const related = RELATED_SECTORS[sector] || [];
  return related; // Don't include the primary sector itself
}

// Helper to check if a peer matches the target company's sectors
function matchesSector(
  targetSector: string | null,
  targetSecondarySectors: string[],
  peerSector: string | null,
  peerSecondarySectors: string[]
): { matches: boolean; isExact: boolean; score: number } {
  // Direct primary match (exact, strongest signal)
  if (targetSector && peerSector && targetSector === peerSector) {
    return { matches: true, isExact: true, score: 60 };
  }
  // Target's primary matches peer's secondary (exact)
  if (targetSector && peerSecondarySectors?.includes(targetSector)) {
    return { matches: true, isExact: true, score: 50 };
  }
  // Target's secondary matches peer's primary (exact)
  if (peerSector && targetSecondarySectors?.includes(peerSector)) {
    return { matches: true, isExact: true, score: 50 };
  }
  // Target's secondary matches peer's secondary (exact)
  if (targetSecondarySectors?.some(s => peerSecondarySectors?.includes(s))) {
    return { matches: true, isExact: true, score: 40 };
  }

  return { matches: false, isExact: false, score: 0 };
}

// Finds and caches PRIVATE sector peers from lumen_companies
// Implements fallback to related sectors if <3 exact matches found
export async function computePrivatePeers(
  supabase: SupabaseClient,
  company: Company
): Promise<Comp[]> {
  if (!company.sector) {
    return [];
  }

  // Get all companies except this one
  const { data: allCompanies } = await supabase
    .from('lumen_companies')
    .select('*')
    .neq('id', company.id)
    .order('last_researched_at', { ascending: false, nullsFirst: false })
    .limit(50);

  if (!allCompanies || allCompanies.length === 0) {
    return [];
  }

  // First pass: find exact sector matches
  const exactMatches: Array<{ peer: typeof allCompanies[0]; score: number }> = [];
  const relatedSectors = getRelatedSectors(company.sector);

  for (const peer of allCompanies) {
    const match = matchesSector(
      company.sector,
      company.secondary_sectors || [],
      peer.sector,
      peer.secondary_sectors || []
    );

    if (match.matches && match.isExact) {
      exactMatches.push({ peer, score: match.score });
    }
  }

  // If we have ≥3 exact matches, use only those
  // Otherwise, add related-sector fallback matches
  let finalPeers: Array<{ peer: typeof allCompanies[0]; score: number; matchType: 'exact' | 'related' }> = [];

  if (exactMatches.length >= PRIVATE_PEER_THRESHOLD) {
    finalPeers = exactMatches.map(m => ({ ...m, matchType: 'exact' as const }));
  } else {
    // Add exact matches first
    finalPeers = exactMatches.map(m => ({ ...m, matchType: 'exact' as const }));

    // Add related-sector matches to reach threshold
    for (const peer of allCompanies) {
      // Skip if already in exact matches
      if (exactMatches.some(m => m.peer.id === peer.id)) continue;

      // Check if peer is in a related sector
      const isRelated =
        (peer.sector && relatedSectors.includes(peer.sector)) ||
        peer.secondary_sectors?.some((s: string) => relatedSectors.includes(s));

      if (isRelated) {
        finalPeers.push({ peer, score: 30, matchType: 'related' }); // Lower score for related matches
      }
    }
  }

  // Convert to Comp objects with revenue multiples
  const comps: Comp[] = [];

  for (const { peer, score, matchType } of finalPeers) {
    const peerValuation = peer.secondary_value || peer.last_round_value;
    if (!peerValuation) continue;

    // Get revenue data for multiple calculation
    const { data: peerRevenue } = await supabase
      .from('lumen_evidence')
      .select('value')
      .eq('company_id', peer.id)
      .eq('category', 'Revenue')
      .eq('status', 'verified')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Extract revenue value
    const revenueValue = peerRevenue?.value
      ? parseFloat(peerRevenue.value.replace(/[^0-9.]/g, ''))
      : null;

    // Compute revenue multiple if both valuation and revenue exist
    const revenueMultiple = peerValuation && revenueValue && revenueValue > 0
      ? peerValuation / revenueValue
      : null;

    // Boost score if has revenue data
    let finalScore = score;
    if (peerRevenue) finalScore += 20;

    comps.push({
      company_id: company.id,
      comp_type: 'private',
      comp_name: peer.name,
      comp_slug: peer.slug,
      comp_ticker: null,
      comp_valuation: peerValuation,
      comp_revenue: revenueValue,
      comp_revenue_multiple: revenueMultiple,
      sector: peer.sector,
      similarity_score: finalScore,
      match_type: matchType,
      computed_at: new Date().toISOString(),
    });
  }

  // Sort by similarity score descending, take top 5
  const topComps = comps
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5);

  // Cache in database
  if (topComps.length > 0) {
    // Delete old private comps (keep public comps)
    await supabase
      .from('lumen_comps')
      .delete()
      .eq('company_id', company.id)
      .eq('comp_type', 'private');

    // Insert new comps
    await supabase
      .from('lumen_comps')
      .insert(topComps);
  }

  return topComps;
}

// Finds and caches PUBLIC comparable companies via Perplexity
export async function computePublicComps(
  supabase: SupabaseClient,
  company: Company
): Promise<Comp[]> {
  // Dynamic import to avoid circular dependency
  const { findComps } = await import('./perplexity');
  const { extractRevenueBillions, pickMostCredible } = await import('./valuation');

  // Get revenue evidence to compute multiples
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id);

  const revenueEvidence = pickMostCredible(evidence || [], 'Revenue');
  if (!revenueEvidence) {
    // No revenue evidence = can't compute meaningful public comps
    return [];
  }

  const revenueBillions = await extractRevenueBillions(revenueEvidence.description, revenueEvidence.value);
  if (revenueBillions === null || revenueBillions === 0) {
    return [];
  }

  // Call Perplexity to find public company comps
  const publicComps = await findComps(company.name, company.sector);
  if (publicComps.length === 0) {
    return [];
  }

  // Convert to Comp type and add metadata
  const comps: Comp[] = publicComps.map((c) => ({
    company_id: company.id,
    comp_type: 'public',
    comp_name: c.name,
    comp_slug: c.ticker.toLowerCase(), // Use ticker as slug for public companies
    comp_ticker: c.ticker,
    comp_valuation: Math.round(revenueBillions * c.multiple * 10) / 10, // Implied valuation
    comp_revenue: revenueBillions, // All share same target company revenue
    comp_revenue_multiple: c.multiple,
    sector: company.sector,
    similarity_score: 80, // Public comps from Perplexity are already vetted as close matches
    match_type: 'exact', // Public comps are always exact matches (Perplexity-selected)
    computed_at: new Date().toISOString(),
  }));

  // Cache in database
  if (comps.length > 0) {
    // Delete old public comps (keep private comps)
    await supabase
      .from('lumen_comps')
      .delete()
      .eq('company_id', company.id)
      .eq('comp_type', 'public');

    // Insert new public comps
    await supabase
      .from('lumen_comps')
      .insert(comps);
  }

  return comps;
}

// Main function that computes both private and public comps
export async function computeComparables(
  supabase: SupabaseClient,
  company: Company
): Promise<{ private: Comp[]; public: Comp[] }> {
  const privateComps = await computePrivatePeers(supabase, company);
  const publicComps = await computePublicComps(supabase, company);

  return { private: privateComps, public: publicComps };
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
