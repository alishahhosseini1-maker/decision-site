#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== DATABASE-WIDE FABRICATION AUDIT ===');
console.log('Checking all companies for confidence > 0 with insufficient evidence\n');

// Get all companies with valuations
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name, slug');

const { data: allValuations } = await supabase
  .from('lumen_valuations')
  .select('*');

const valByCompany = new Map(allValuations.map(v => [v.company_id, v]));

const fabricatedCompanies = [];
const thinEvidenceCompanies = [];
const healthyCompanies = [];

for (const company of companies) {
  const valuation = valByCompany.get(company.id);

  // Get all evidence excluding Marketplace Price (which we added recently)
  const { data: allEvidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id);

  const realEvidence = allEvidence.filter(e => e.category !== 'Marketplace Price');
  const fundingEvidence = realEvidence.filter(e => e.category === 'Funding');

  // Check for fabrication signatures
  const hasFabrication = valuation && valuation.confidence_score > 0 && (
    realEvidence.length < 2 || fundingEvidence.length === 0
  );

  const hasThinEvidence = valuation && valuation.confidence_score > 0 && (
    realEvidence.length === 2 || realEvidence.length === 3
  );

  if (hasFabrication) {
    fabricatedCompanies.push({
      name: company.name,
      slug: company.slug,
      evidenceCount: realEvidence.length,
      fundingCount: fundingEvidence.length,
      baseCase: valuation.base_case,
      confidence: valuation.confidence_score,
    });
  } else if (hasThinEvidence) {
    thinEvidenceCompanies.push({
      name: company.name,
      slug: company.slug,
      evidenceCount: realEvidence.length,
      fundingCount: fundingEvidence.length,
      baseCase: valuation.base_case,
      confidence: valuation.confidence_score,
    });
  } else if (valuation && valuation.confidence_score > 0) {
    healthyCompanies.push({
      name: company.name,
      evidenceCount: realEvidence.length,
      fundingCount: fundingEvidence.length,
    });
  }
}

// Report fabricated companies (same signature as PsiQuantum)
console.log('🚨 FABRICATED COMPANIES (confidence > 0, <2 evidence OR 0 funding):');
console.log('═'.repeat(80));
if (fabricatedCompanies.length === 0) {
  console.log('✅ None found (all companies have sufficient evidence or 0% confidence)\n');
} else {
  fabricatedCompanies.forEach(c => {
    console.log(`❌ ${c.name} (/${c.slug})`);
    console.log(`   Evidence: ${c.evidenceCount} items (${c.fundingCount} funding)`);
    console.log(`   Valuation: $${c.baseCase}B @ ${c.confidence}% confidence`);
    console.log(`   VERDICT: FABRICATED - would regenerate as "insufficient evidence"`);
    console.log('');
  });
}

// Report thin evidence companies (might be legitimate but worth flagging)
console.log('⚠️  THIN EVIDENCE COMPANIES (2-3 evidence items, passes threshold):');
console.log('═'.repeat(80));
if (thinEvidenceCompanies.length === 0) {
  console.log('None found\n');
} else {
  thinEvidenceCompanies.forEach(c => {
    console.log(`⚠️  ${c.name} (/${c.slug})`);
    console.log(`   Evidence: ${c.evidenceCount} items (${c.fundingCount} funding)`);
    console.log(`   Valuation: $${c.baseCase}B @ ${c.confidence}% confidence`);
    console.log(`   VERDICT: PASSES threshold but thin - may have low confidence`);
    console.log('');
  });
}

// Summary
console.log('📊 SUMMARY:');
console.log('═'.repeat(80));
console.log(`Total companies with valuations: ${companies.length}`);
console.log(`Fabricated (would fail new threshold): ${fabricatedCompanies.length}`);
console.log(`Thin evidence (2-3 items, passes threshold): ${thinEvidenceCompanies.length}`);
console.log(`Healthy (≥4 evidence items): ${healthyCompanies.length}`);
console.log('');

if (fabricatedCompanies.length > 0) {
  console.log('🔧 ACTION REQUIRED:');
  console.log(`${fabricatedCompanies.length} companies need valuation regeneration to apply fixes.`);
  console.log('Run: node scripts/regen-all-fabricated.mjs');
} else {
  console.log('✅ No action required - all companies have sufficient evidence.');
}
