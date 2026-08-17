#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get companies with zero evidence
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name, created_at, last_researched_at');

const zeroEvidenceCompanies = [];
for (const company of companies || []) {
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('id')
    .eq('company_id', company.id);

  if ((evidence?.length || 0) === 0) {
    zeroEvidenceCompanies.push(company);
  }
}

console.log(`Companies with Zero Evidence (${zeroEvidenceCompanies.length}):`);
console.log('='.repeat(80));
console.log();

zeroEvidenceCompanies.forEach(c => {
  const createdDate = new Date(c.created_at).toISOString().split('T')[0];
  const researchedAt = c.last_researched_at ? new Date(c.last_researched_at).toISOString().split('T')[0] : 'NEVER';
  console.log(`${c.name}`);
  console.log(`  Created: ${createdDate}`);
  console.log(`  Last researched: ${researchedAt}`);
  console.log(`  Status: ${researchedAt === 'NEVER' ? '❌ Auto-trigger FAILED or never ran' : '⚠️ Research ran but found nothing'}`);
  console.log();
});

console.log('='.repeat(80));
console.log();
console.log('DIAGNOSIS:');
if (zeroEvidenceCompanies.every(c => !c.last_researched_at)) {
  console.log('❌ AUTO-TRIGGER BROKEN: All zero-evidence companies have last_researched_at = NULL');
  console.log('   Research is NOT running on company creation');
} else if (zeroEvidenceCompanies.every(c => c.last_researched_at)) {
  console.log('⚠️ AUTO-TRIGGER WORKS but research found nothing');
  console.log('   These companies may be too obscure or misspelled');
} else {
  console.log('⚠️ MIXED: Some companies researched, some not');
  const neverResearched = zeroEvidenceCompanies.filter(c => !c.last_researched_at).length;
  const researchedButEmpty = zeroEvidenceCompanies.filter(c => c.last_researched_at).length;
  console.log(`   Never researched: ${neverResearched}`);
  console.log(`   Researched but found nothing: ${researchedButEmpty}`);
}
