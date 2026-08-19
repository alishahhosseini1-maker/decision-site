// Fixed sector taxonomy to prevent fragmentation
export const SECTORS = [
  'Artificial Intelligence',
  'Enterprise Software',
  'Fintech',
  'Healthcare Tech',
  'Developer Tools',
  'E-commerce & Marketplace',
  'Infrastructure & Cloud',
  'Social & Communications',
  'Hardware & Manufacturing',
  'Cybersecurity',
  'Aerospace & Defense',
  'Gaming & Entertainment',
  'Consumer Apps',
  'Energy & Climate Tech',
] as const;

export type Sector = typeof SECTORS[number];

export const CONFIDENCE_MAP: Record<string, number> = {
  'SEC / Government Filing': 100,
  'Company Announcement': 95,
  'Verified Transaction': 95,
  'Investor Document': 90,
  'Reputable Publication': 90,
  'Industry Research': 75,
  'AI Research': 65,
  'Verified Employee': 60,
  'Anonymous Tip': 25,
};

export const CATEGORIES = [
  'Funding',
  'Revenue',
  'Contracts',
  'Secondary',
  'Marketplace Price',
  'Headcount',
  'Retention',
  'Comparable',
  'Rumor',
];

// "AI Research" is a fallback source_type only — used when the research
// route can't classify a finding into one of the real credibility tiers
// above (e.g. an aggregated database summary with no clear publication).
// Whenever it can, it classifies into the real tier instead (a Reuters
// story becomes "Reputable Publication", a company blog post becomes
// "Company Announcement", etc.), so credibility ranking reflects the
// actual source, not just "an AI found this".
export const AI_RESEARCH_SOURCE_TYPE = 'AI Research';
export const AI_RESEARCH_CONTRIBUTOR = 'perplexity-research';
export const AI_RESEARCH_CONFIRMATIONS_NEEDED = 1;

// Source types a human can pick when manually submitting evidence.
// "AI Research" is reserved for entries inserted by the Perplexity research route.
export const MANUAL_SOURCE_TYPES = Object.keys(CONFIDENCE_MAP).filter((s) => s !== AI_RESEARCH_SOURCE_TYPE);

export const CONFIRMATIONS_NEEDED = 2;

// How many confirmations an evidence item needs depends on who submitted it,
// not how credible its underlying source is — those are separate axes. The
// AI research bot's findings need only 1 confirmation (a human checking the
// citation isn't fabricated), regardless of which credibility tier the
// source classified into; a human's own submission always needs 2, even a
// "SEC / Government Filing" one, since nobody else has corroborated *that
// specific claim* yet.
export function confirmationsNeededFor(contributor: string) {
  return contributor === AI_RESEARCH_CONTRIBUTOR ? AI_RESEARCH_CONFIRMATIONS_NEEDED : CONFIRMATIONS_NEEDED;
}

export function confidenceColor(score: number) {
  if (score >= 85) return '#3FBF7F';
  if (score >= 60) return '#C9A227';
  return '#8B95A1';
}

export function fmtB(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `$${num.toFixed(1)}B`;
}

export type EvidenceStatus = 'pending' | 'verified' | 'disputed' | 'rejected';

export type Evidence = {
  id: string;
  company_id: string;
  category: string;
  description: string;
  value: string | null;
  source_type: string;
  source_label: string;
  date: string;
  contributor: string;
  status: EvidenceStatus;
  verified_by: string[];
  dispute_note: string | null;
  created_at: string;
  affiliation_disclosed: boolean;
  affiliation_type: string | null;
  citation_url: string | null;
};

export type Company = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  sector: string | null; // Primary sector
  secondary_sectors: string[]; // Optional secondary sectors (e.g., ['Infrastructure & Cloud', 'Developer Tools'])
  last_round_value: number | null;
  last_round_raised: number | null;
  last_round_date: string | null;
  last_round_confirmed: boolean;
  secondary_value: number | null;
  secondary_date: string | null;
  secondary_confirmed: boolean;
  secondary_price_per_share: number | null; // Price per share on secondary markets (e.g., $721.85)
  created_by: string | null;
  created_at: string;
  last_researched_at: string | null;
  last_valuation_at: string | null;
};

export type ContributorStats = { name: string; total: number; verified: number; rejected: number; accuracy: number | null };

// Shared by the contributors leaderboard and the valuation weighting, so
// "accuracy" means the same thing in both places: share of a contributor's
// submissions that ended up verified vs. rejected (excluding still-pending
// or disputed-but-unresolved ones, and null — "new" — if they have no
// decided submissions yet).
export function computeContributorStats(evidence: { contributor: string; status: string }[]): Map<string, ContributorStats> {
  const stats = new Map<string, ContributorStats>();
  for (const e of evidence) {
    const s = stats.get(e.contributor) || { name: e.contributor, total: 0, verified: 0, rejected: 0, accuracy: null };
    s.total += 1;
    if (e.status === 'verified') s.verified += 1;
    if (e.status === 'rejected') s.rejected += 1;
    stats.set(e.contributor, s);
  }
  Array.from(stats.values()).forEach((s) => {
    const decided = s.verified + s.rejected;
    s.accuracy = decided > 0 ? Math.round((s.verified / decided) * 100) : null;
  });
  return stats;
}

export type Valuation = {
  company_id: string;
  bear_case: number;
  base_case: number;
  bull_case: number;
  confidence_score: number;
  key_drivers: { label: string; impact: '+' | '-'; note: string }[];
  explanation: string;
  generated_at: string;
};

export type Comp = {
  company_id: string;
  comp_type: 'private' | 'public';
  comp_name: string;
  comp_slug: string;
  comp_ticker: string | null;
  comp_valuation: number | null;
  comp_revenue: number | null;
  comp_revenue_multiple: number | null;
  sector: string | null;
  similarity_score: number;
  match_type: 'exact' | 'related'; // Whether this is an exact sector match or related-sector fallback
  computed_at: string;
};

export type ValuationHistory = {
  id: string;
  company_id: string;
  valuation_type: 'last_round' | 'secondary' | 'ai_estimated';
  value: number;
  date: string;
  source: string | null;
  created_at: string;
};
