#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('AUDITING FOR TEST/SYNTHETIC DATA');
console.log('========================================\n');

// 1. Check for suspicious contributor names
console.log('1. Checking for test contributor patterns...\n');

const { data: allEvidence } = await supabase
  .from('lumen_evidence')
  .select('id, contributor, company_id, category, description, created_at');

const testPatterns = ['test', 'synthetic', 'fake', 'demo', 'sample', 'manual-test', 'human-reviewer'];
const suspiciousEvidence = allEvidence?.filter(e =>
  testPatterns.some(pattern => e.contributor?.toLowerCase().includes(pattern))
) || [];

if (suspiciousEvidence.length > 0) {
  console.log(`❌ Found ${suspiciousEvidence.length} evidence items with test-pattern contributors:\n`);
  suspiciousEvidence.forEach(e => {
    console.log(`  ID: ${e.id}`);
    console.log(`  Contributor: ${e.contributor}`);
    console.log(`  Category: ${e.category}`);
    console.log(`  Description: ${e.description.substring(0, 60)}...`);
    console.log(`  Created: ${e.created_at}`);
    console.log();
  });
} else {
  console.log('✓ No evidence with test-pattern contributors found\n');
}

// 2. Verify benchmark companies have legitimate sources
console.log('2. Auditing benchmark companies for data provenance...\n');

const benchmarkCompanies = [
  'Anthropic',
  'OpenAI',
  'Stripe',
  'Plaid',
  'Anduril',
  'Notion',
  'Faire',
  'Rippling',
  'SpaceX',
  'Databricks',
  'Chime'
];

const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name');

for (const companyName of benchmarkCompanies) {
  const company = companies?.find(c =>
    c.name.toLowerCase().includes(companyName.toLowerCase())
  );

  if (!company) {
    console.log(`⚠️  ${companyName}: Not found in database`);
    continue;
  }

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('contributor, source_type, source_label, category, created_at')
    .eq('company_id', company.id);

  const contributors = new Set(evidence?.map(e => e.contributor) || []);
  const sources = new Set(evidence?.map(e => e.source_label) || []);

  // Flag if ANY evidence is from test contributors
  const hasTestContributor = Array.from(contributors).some(c =>
    testPatterns.some(pattern => c?.toLowerCase().includes(pattern))
  );

  if (hasTestContributor) {
    console.log(`❌ ${companyName}:`);
    console.log(`  Has test contributor evidence!`);
    const testEvidence = evidence?.filter(e =>
      testPatterns.some(pattern => e.contributor?.toLowerCase().includes(pattern))
    ) || [];
    testEvidence.forEach(e => {
      console.log(`    - ${e.category} from ${e.contributor} (${e.created_at})`);
    });
  } else {
    console.log(`✓ ${companyName}: ${evidence?.length || 0} items, all from legitimate contributors`);
    console.log(`  Contributors: ${Array.from(contributors).join(', ')}`);
  }
  console.log();
}

console.log('========================================');
console.log('AUDIT COMPLETE');
console.log('========================================');
