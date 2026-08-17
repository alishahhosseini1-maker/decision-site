#!/usr/bin/env node

const SITE_URL = 'https://decisionlayer.dev';

// Companies to check with their cutoffs
const companies = [
  { name: 'SpaceX', cutoff: '2024-12-01', actual: 350, estimate: 150, error: 57 },
  { name: 'Databricks', cutoff: '2024-09-01', actual: 62, estimate: 7.5, error: 88 },
  { name: 'Chime', cutoff: '2025-03-01', actual: 25, estimate: 15, error: 40 },
  { name: 'Anduril', cutoff: '2024-08-01', actual: 14, estimate: 14, error: 0 }
];

for (const company of companies) {
  const res = await fetch(`${SITE_URL}/api/lumen/companies`);
  const data = await res.json();
  const lumen = data.companies?.find(c => c.name.toLowerCase().includes(company.name.toLowerCase()));
  
  if (!lumen) {
    console.log(`❌ ${company.name} not found`);
    continue;
  }

  const evidenceRes = await fetch(`${SITE_URL}/api/lumen/companies/${lumen.id}`);
  const evidenceData = await evidenceRes.json();
  const funding = evidenceData.evidence?.filter(e => e.category === 'Funding') || [];
  
  if (funding.length === 0) {
    console.log(`\n${company.name}: NO FUNDING EVIDENCE`);
    continue;
  }

  const sorted = funding.map(e => e.date).sort();
  const mostRecent = sorted[sorted.length - 1];
  
  const cutoffTime = new Date(company.cutoff).getTime();
  const recentTime = new Date(mostRecent).getTime();
  const gapDays = Math.round((cutoffTime - recentTime) / (1000 * 60 * 60 * 24));
  const gapMonths = Math.round(gapDays / 30);

  console.log(`\n${company.name} (${company.error}% ${company.estimate > company.actual ? 'over' : 'under'}):`);
  console.log(`  Most recent evidence: ${mostRecent}`);
  console.log(`  Cutoff: ${company.cutoff}`);
  console.log(`  Gap: ${gapDays} days (${gapMonths} months) ${gapDays > 365 ? '⚠️ STALE' : '✅ fresh'}`);
}
