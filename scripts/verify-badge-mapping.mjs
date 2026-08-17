#!/usr/bin/env node

// Test cases: companies whose tier changed
const testCases = [
  { name: 'Stripe', oldScore: 42, newScore: 12, oldTier: 'Low (40-59)', newTier: 'Very Low (<30)' },
  { name: 'Polymarket', oldScore: 42, newScore: 66, oldTier: 'Low (40-59)', newTier: 'Medium (50-69)' },
  { name: 'Anthropic', oldScore: 62, newScore: 91, oldTier: 'Medium (60-79)', newTier: 'High (70+)' },
];

// Old badge logic (80/60/40 boundaries)
function getOldBadge(score) {
  if (score < 40) return { badge: 'LOW CONFIDENCE', color: 'red' };
  if (score < 60) return { badge: 'UNCERTAIN', color: 'amber' };
  return { badge: null };
}

// New badge logic (70/50/30 boundaries)
function getNewBadge(score) {
  if (score < 30) return { badge: 'LOW CONFIDENCE', color: 'red' };
  if (score < 50) return { badge: 'UNCERTAIN', color: 'amber' };
  return { badge: null };
}

// Old visual style (80/60/40)
function getOldVisualStyle(score) {
  if (score >= 80) return { size: '56px', opacity: 1.0, desc: 'Full prominence' };
  if (score >= 60) return { size: '56px', opacity: 0.85, desc: 'Slightly muted' };
  if (score >= 40) return { size: '48px', opacity: 0.75, desc: 'Muted, smaller' };
  return { size: '42px', opacity: 0.65, desc: 'Heavily muted, smallest' };
}

// New visual style (70/50/30)
function getNewVisualStyle(score) {
  if (score >= 70) return { size: '56px', opacity: 1.0, desc: 'Full prominence' };
  if (score >= 50) return { size: '56px', opacity: 0.85, desc: 'Slightly muted' };
  if (score >= 30) return { size: '48px', opacity: 0.75, desc: 'Muted, smaller' };
  return { size: '42px', opacity: 0.65, desc: 'Heavily muted, smallest' };
}

console.log('='.repeat(100));
console.log('BADGE/VISUAL TIER VERIFICATION');
console.log('='.repeat(100));
console.log();

testCases.forEach(tc => {
  console.log(`${tc.name}:`);
  console.log(`  Score: ${tc.oldScore} → ${tc.newScore}`);
  console.log(`  Tier: ${tc.oldTier} → ${tc.newTier}`);
  console.log();
  
  const oldBadge = getOldBadge(tc.oldScore);
  const newBadgeOld = getNewBadge(tc.oldScore);
  const newBadgeNew = getNewBadge(tc.newScore);
  
  console.log(`  Old logic on old score (${tc.oldScore}):`);
  console.log(`    Badge: ${oldBadge.badge || 'none'} ${oldBadge.color || ''}`);
  console.log(`    Visual: ${getOldVisualStyle(tc.oldScore).desc}`);
  console.log();
  
  console.log(`  New logic on old score (${tc.oldScore}) - if not updated:`);
  console.log(`    Badge: ${newBadgeOld.badge || 'none'} ${newBadgeOld.color || ''}`);
  console.log(`    Visual: ${getNewVisualStyle(tc.oldScore).desc}`);
  console.log();
  
  console.log(`  New logic on new score (${tc.newScore}) - after update:`);
  console.log(`    Badge: ${newBadgeNew.badge || 'none'} ${newBadgeNew.color || ''}`);
  console.log(`    Visual: ${getNewVisualStyle(tc.newScore).desc}`);
  
  // Check if correct
  const correct = (tc.newScore < 30 && newBadgeNew.badge === 'LOW CONFIDENCE') ||
                  (tc.newScore >= 30 && tc.newScore < 50 && newBadgeNew.badge === 'UNCERTAIN') ||
                  (tc.newScore >= 50 && newBadgeNew.badge === null);
  
  console.log(`    ✓ Correct badge for new score: ${correct ? 'YES' : 'NO'}`);
  console.log();
});

console.log('='.repeat(100));
console.log('BOUNDARY UPDATE SUMMARY');
console.log('='.repeat(100));
console.log();
console.log('Changes needed in SimpleValuation.tsx:');
console.log();
console.log('1. getConfidenceStyle() thresholds:');
console.log('   OLD: if (confidence >= 80) ... else if (>= 60) ... else if (>= 40)');
console.log('   NEW: if (confidence >= 70) ... else if (>= 50) ... else if (>= 30)');
console.log();
console.log('2. getConfidenceBadge() thresholds:');
console.log('   OLD: if (confidence < 40) "LOW CONFIDENCE" ... else if (< 60) "UNCERTAIN"');
console.log('   NEW: if (confidence < 30) "LOW CONFIDENCE" ... else if (< 50) "UNCERTAIN"');
console.log();
console.log('3. getContainerStyle() threshold:');
console.log('   OLD: if (confidence >= 60) gold gradient ... else gray gradient');
console.log('   NEW: if (confidence >= 50) gold gradient ... else gray gradient');
console.log();
