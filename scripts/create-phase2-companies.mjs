#!/usr/bin/env node
import { readFileSync } from 'fs';

// Phase 2 companies: Build full pages before adding NPM prices
const companies = [
  { name: 'Glean', contributor: 'manual-verification' },
  { name: 'Harvey', contributor: 'manual-verification' },
  { name: 'PsiQuantum', contributor: 'manual-verification' }
];

async function createCompany(name, contributor) {
  console.log(`\n📊 Creating ${name}...`);

  const response = await fetch('http://localhost:3001/api/lumen/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, contributor }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create ${name}: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ ${name} created successfully`);
  console.log(`   Slug: ${data.company.slug}`);
  console.log(`   Sector: ${data.company.sector || 'N/A'}`);
  console.log(`   Symbol: ${data.company.symbol}`);
  console.log(`   Last Round: $${data.company.last_round_value}B (${data.company.last_round_date || 'N/A'})`);
  console.log(`   AI Valuation: $${data.company.valuation?.base_case?.toFixed(1) || 'N/A'}B (confidence: ${data.company.valuation?.confidence_score || 'N/A'}%)`);

  return data.company;
}

async function main() {
  console.log('=== PHASE 2: Creating Full Company Pages ===');
  console.log('Building Glean, Harvey, PsiQuantum with Perplexity research\n');

  const created = [];

  for (const company of companies) {
    try {
      const result = await createCompany(company.name, company.contributor);
      created.push(result);

      // Wait 2 seconds between companies to avoid rate limiting
      if (companies.indexOf(company) < companies.length - 1) {
        console.log('⏳ Waiting 2s before next company...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Error creating ${company.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`✅ Successfully created ${created.length} companies:`);
  created.forEach(c => {
    console.log(`   - ${c.name} (/${c.slug})`);
  });
  console.log('\nNext: Verify pages in browser before adding NPM prices');
}

main();
