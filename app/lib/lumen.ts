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
  'Secondary market',
  'Headcount',
  'Retention',
  'Comparable',
  'Rumor',
];

export const AI_RESEARCH_SOURCE_TYPE = 'AI Research';
export const AI_RESEARCH_CONTRIBUTOR = 'perplexity-research';
export const AI_RESEARCH_CONFIRMATIONS_NEEDED = 1;

// Source types a human can pick when manually submitting evidence.
// "AI Research" is reserved for entries inserted by the Perplexity research route.
export const MANUAL_SOURCE_TYPES = Object.keys(CONFIDENCE_MAP).filter((s) => s !== AI_RESEARCH_SOURCE_TYPE);

export const CONFIRMATIONS_NEEDED = 2;

export function confirmationsNeededFor(sourceType: string) {
  return sourceType === AI_RESEARCH_SOURCE_TYPE ? AI_RESEARCH_CONFIRMATIONS_NEEDED : CONFIRMATIONS_NEEDED;
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
};

export type Company = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  sector: string | null;
  last_round_value: number | null;
  last_round_date: string | null;
  last_round_confirmed: boolean;
  secondary_value: number | null;
  secondary_date: string | null;
  secondary_confirmed: boolean;
  created_by: string | null;
  created_at: string;
};

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
