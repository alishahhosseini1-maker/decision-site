#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const syntheticIds = [
  '5b7230d6-6ca4-46f1-bb0a-d73e770fdbc9',  // Multiply Labs Revenue (synthetic)
  'aa0030f8-064a-4452-9bac-8e019be511de',  // Multiply Labs Contracts (synthetic)
  '8d48e7d2-25de-4b51-9d42-e1102cbcd916',  // Baseten Revenue (synthetic)
  '4d1d5c2f-99cf-4a45-a73a-08ae581e45fa',  // Baseten Headcount (synthetic)
];

console.log('========================================');
console.log('DELETING SYNTHETIC EVIDENCE ENTRIES');
console.log('========================================\n');

for (const id of syntheticIds) {
  const { data, error } = await supabase
    .from('lumen_evidence')
    .delete()
    .eq('id', id)
    .select();

  if (error) {
    console.log(`❌ Failed to delete ${id}: ${error.message}`);
  } else if (data && data.length > 0) {
    console.log(`✓ Deleted: ${id}`);
    console.log(`  Category: ${data[0].category}`);
    console.log(`  Description: ${data[0].description.substring(0, 60)}...`);
    console.log(`  Company: ${data[0].company_id}`);
  } else {
    console.log(`⚠️  Not found: ${id} (may have been already deleted)`);
  }
  console.log();
}

console.log('✅ Deletion complete\n');

// Verify cleanup
console.log('========================================');
console.log('VERIFYING CLEANUP');
console.log('========================================\n');

const multiplyId = '050ccde8-a630-4fe3-b965-eaac69942ecc';
const basetenId = '62b1273f-9b59-449b-8190-795b3a5c0324';

for (const [name, companyId] of [['Multiply Labs', multiplyId], ['Baseten', basetenId]]) {
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('category')
    .eq('company_id', companyId);

  const byCat = {};
  evidence?.forEach(e => {
    byCat[e.category] = (byCat[e.category] || 0) + 1;
  });

  console.log(`${name} evidence:`);
  console.log(`  Total: ${evidence?.length || 0} items`);
  Object.keys(byCat).sort().forEach(cat => {
    console.log(`  ${cat}: ${byCat[cat]} items`);
  });
  console.log();
}
