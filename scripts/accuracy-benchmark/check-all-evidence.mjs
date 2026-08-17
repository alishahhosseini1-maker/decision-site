#!/usr/bin/env node

const SITE_URL = 'https://decisionlayer.dev';

const companies = [
  { name: 'SpaceX', cutoff: '2024-12-01' },
  { name: 'Databricks', cutoff: '2024-09-01' }
];

for (const company of companies) {
  const res = await fetch(`${SITE_URL}/api/lumen/companies`);
  const data = await res.json();
  const lumen = data.companies?.find(c => c.name.toLowerCase().includes(company.name.toLowerCase()));
  
  if (!lumen) continue;

  const evidenceRes = await fetch(`${SITE_URL}/api/lumen/companies/${lumen.id}`);
  const evidenceData = await evidenceRes.json();
  const evidence = evidenceData.evidence || [];
  
  // Group ALL evidence by category
  const byCategory = {};
  evidence.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${company.name} — ALL evidence (cutoff was ${company.cutoff})`);
  console.log(`${'='.repeat(80)}`);
  
  Object.keys(byCategory).sort().forEach(category => {
    const items = byCategory[category];
    const beforeCutoff = items.filter(e => e.date < company.cutoff);
    const afterCutoff = items.filter(e => e.date >= company.cutoff);
    
    console.log(`\n${category}:`);
    console.log(`  Total: ${items.length} (${beforeCutoff.length} before cutoff, ${afterCutoff.length} after)`);
    
    if (beforeCutoff.length > 0) {
      const mostRecent = beforeCutoff.sort((a, b) => b.date.localeCompare(a.date))[0];
      const desc = mostRecent.description.substring(0, 80);
      console.log(`  Most recent BEFORE cutoff: [${mostRecent.date}] ${desc}...`);
    }
    
    if (afterCutoff.length > 0) {
      const earliest = afterCutoff.sort((a, b) => a.date.localeCompare(b.date))[0];
      const desc = earliest.description.substring(0, 80);
      console.log(`  Earliest AFTER cutoff: [${earliest.date}] ${desc}...`);
    }
  });
}
