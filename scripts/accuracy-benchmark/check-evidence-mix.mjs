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
  
  // Filter to before cutoff
  const beforeCutoff = evidence.filter(e => e.date < company.cutoff);
  
  // Group by category
  const byCategory = {};
  beforeCutoff.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${company.name} — Evidence before ${company.cutoff}`);
  console.log(`${'='.repeat(80)}`);
  
  Object.keys(byCategory).sort().forEach(category => {
    const items = byCategory[category];
    const sorted = items.sort((a, b) => b.date.localeCompare(a.date));
    
    console.log(`\n${category} (${items.length} items, most recent: ${sorted[0].date}):`);
    
    // Show most recent 2-3 items
    sorted.slice(0, 3).forEach(e => {
      const desc = e.description.substring(0, 100);
      console.log(`  [${e.date}] ${desc}${e.description.length > 100 ? '...' : ''}`);
    });
  });
}
