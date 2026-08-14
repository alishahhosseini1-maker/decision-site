export const CONFIDENCE_MAP: Record<string, number> = {
  'SEC / Government Filing': 100,
  'Company Announcement': 95,
  'Verified Transaction': 95,
  'Investor Document': 90,
  'Reputable Publication': 90,
  'Industry Research': 75,
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

export const CONFIRMATIONS_NEEDED = 2;

export function confidenceColor(score: number) {
  if (score >= 85) return '#3FBF7F';
  if (score >= 60) return '#C9A227';
  return '#8B95A1';
}

export function fmtB(n: number | string | null | undefined) {
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
  secondary_value: number | null;
  secondary_date: string | null;
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
