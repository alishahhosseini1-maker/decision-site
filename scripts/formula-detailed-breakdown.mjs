#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('PRIMARY + SECONDARY WEIGHTING - PROPOSED FORMULA');
console.log('='.repeat(80));
console.log();
console.log('FORMULA COMPONENTS:');
console.log('  1. Illiquidity discount: 15% (always applied to secondary)');
console.log('  2. Staleness weight = monthsSincePrimary / (monthsSincePrimary + monthsSinceSecondary + 1)');
console.log('  3. Credibility multiplier = (sourceCredibility/75) × namedBonus × verifiedBonus');
console.log('  4. Final weight = min(0.70, max(0.10, stalnessWeight × credibilityMultiplier))');
console.log('  5. Base = (1 - weight) × primary + weight × adjustedSecondary');
console.log();
console.log('='.repeat(80));
console.log();

// SpaceX
console.log('SPACEX');
console.log('-'.repeat(80));
console.log('Current AI: $650B');
console.log();
console.log('Step 1 - Inputs:');
console.log('  Primary: $137B (2023-01-03) → 44.1 months old');
console.log('  Secondary: $800B (2025-12-13) → 8.2 months old');
console.log('  Source: Reputable Publication (85), verified, no named sources in desc');
console.log();
console.log('Step 2 - Illiquidity discount:');
console.log('  $800B × 0.85 = $680B');
console.log();
console.log('Step 3 - Staleness weight:');
console.log('  44.1 / (44.1 + 8.2 + 1) = 44.1 / 53.3 = 0.827 → capped at 0.700');
console.log();
console.log('Step 4 - Credibility multiplier:');
console.log('  (85/75) × 1.0 × 1.10 = 1.133 × 1.10 = 1.247');
console.log();
console.log('Step 5 - Final weight:');
console.log('  0.700 × 1.247 = 0.873 → capped at 0.700');
console.log();
console.log('Step 6 - Base case:');
console.log('  (1 - 0.700) × $137B + 0.700 × $680B');
console.log('  = 0.300 × $137B + 0.700 × $680B');
console.log('  = $41B + $476B');
console.log('  = $517B');
console.log();
console.log('Formula output: $517B (vs AI: $650B, difference: -$133B)');
console.log();
console.log('='.repeat(80));
console.log();

// Anthropic
console.log('ANTHROPIC');
console.log('-'.repeat(80));
console.log('Current AI: $1050B');
console.log();
console.log('Step 1 - Inputs:');
console.log('  Primary: $965B (2026-05-28) → 2.7 months old');
console.log('  Secondary: $1200B (2026-07-09) → 1.3 months old');
console.log('  Source: Reputable Publication (85), verified, HAS named sources (Caplight, Rainmaker CEOs)');
console.log();
console.log('Step 2 - Illiquidity discount:');
console.log('  $1200B × 0.85 = $1020B');
console.log();
console.log('Step 3 - Staleness weight:');
console.log('  2.7 / (2.7 + 1.3 + 1) = 2.7 / 5.0 = 0.540');
console.log();
console.log('Step 4 - Credibility multiplier:');
console.log('  (85/75) × 1.15 × 1.10 = 1.133 × 1.15 × 1.10 = 1.435');
console.log();
console.log('Step 5 - Final weight:');
console.log('  0.540 × 1.435 = 0.775 → capped at 0.700');
console.log();
console.log('Step 6 - Base case:');
console.log('  (1 - 0.700) × $965B + 0.700 × $1020B');
console.log('  = 0.300 × $965B + 0.700 × $1020B');
console.log('  = $290B + $714B');
console.log('  = $1004B');
console.log();
console.log('Formula output: $1004B (vs AI: $1050B, difference: -$46B)');
console.log();
console.log('='.repeat(80));
console.log();
console.log('ISSUE IDENTIFIED:');
console.log('  Anthropic credibility multiplier (1.435) pushes weight to 77%, capped at 70%');
console.log('  Even with BOTH evidence types being fresh (2.7mo and 1.3mo), secondary gets 70% weight');
console.log('  This seems high - when both are fresh, should weight be closer to 50/50?');
console.log();
console.log('PROPOSED ADJUSTMENT:');
console.log('  Cap credibility multiplier at 1.2 instead of 1.5');
console.log('  This prevents well-sourced secondary from dominating when both are fresh');
console.log('  Recompute: 0.540 × 1.2 = 0.648 (65% weight instead of 70%)');
console.log('  New Anthropic base: 0.352 × $965B + 0.648 × $1020B = $340B + $661B = $1001B');
