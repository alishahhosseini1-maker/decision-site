#!/usr/bin/env node

const SITE_URL = 'https://decisionlayer.dev';

const res = await fetch(`${SITE_URL}/api/lumen/companies`);
const data = await res.json();
const lumen = data.companies?.find(c => c.name.toLowerCase().includes('anduril'));

if (!lumen) {
  console.log('Anduril not found');
  process.exit(1);
}

const evidenceRes = await fetch(`${SITE_URL}/api/lumen/companies/${lumen.id}`);
const evidenceData = await evidenceRes.json();
const evidence = evidenceData.evidence || [];

const cutoff = '2024-08-01';
const beforeCutoff = evidence.filter(e => e.date < cutoff);

// Group by category
const byCategory = {};
beforeCutoff.forEach(e => {
  if (!byCategory[e.category]) byCategory[e.category] = [];
  byCategory[e.category].push(e);
});

console.log(`Anduril — Evidence BEFORE ${cutoff} (0% error, 20 months staleness)`);
console.log(`${'='.repeat(80)}\n`);

Object.keys(byCategory).sort().forEach(category => {
  const items = byCategory[category];
  const sorted = items.sort((a, b) => b.date.localeCompare(a.date));
  
  console.log(`${category} (${items.length} items, most recent: ${sorted[0].date}):`);
  sorted.forEach(e => {
    const desc = e.description.substring(0, 90);
    console.log(`  [${e.date}] ${desc}${e.description.length > 90 ? '...' : ''}`);
  });
  console.log();
});
