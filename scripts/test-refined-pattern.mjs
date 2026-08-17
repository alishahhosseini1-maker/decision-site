const mar10 = {
  value: "Revenue exceeded $5 billion to date",
  description: "Reuters reported that Anthropic Chief Financial Officer Krishna Rao said in a court filing that revenue has exceeded $5 billion to date, while Reuters' analysis noted the company's run-rate claims had been much higher earlier in 2026."
};

const feb13 = {
  value: "$14B run-rate revenue; Claude Code >$2.5B run-rate",
  description: "Reuters reported that Anthropic said its current run-rate revenue had reached $14 billion, and that revenue from Claude Code alone had grown to more than $2.5 billion run-rate, more than doubling since the beginning of 2026."
};

function getPriority(e) {
  const text = `${e.value} ${e.description}`.toLowerCase();

  // Highest priority: run-rate STATED with a number
  if (/\$?\d+[\d.,]*\s*[btm]?\s*(run-rate|annualized)/i.test(text)) return 3;
  if (/\b(run-rate|annualized)\s+(revenue|sales)\s+(of\s+)?\$?\d/i.test(text)) return 3;

  // High priority: current/actual/TTM
  if (/\b(current|actual|ttm|trailing)\b/i.test(text)) return 2;

  // Projected
  if (/\b(project|forecast|expect|target|by 20(2[7-9]|3[0-9]))\b/i.test(text)) return 0;

  return 1;
}

console.log('Testing refined pattern:\n');
console.log('Mar 10 ($5B to date, mentions "run-rate claims"):');
console.log(`  Priority: ${getPriority(mar10)}`);
console.log(`  Pattern 1 match: ${/\$?\d+[\d.,]*\s*[btm]?\s*(run-rate|annualized)/i.test(`${mar10.value} ${mar10.description}`.toLowerCase())}`);
console.log(`  Pattern 2 match: ${/\b(run-rate|annualized)\s+(revenue|sales)\s+(of\s+)?\$?\d/i.test(`${mar10.value} ${mar10.description}`.toLowerCase())}`);
console.log();
console.log('Feb 13 ($14B run-rate revenue):');
console.log(`  Priority: ${getPriority(feb13)}`);
console.log(`  Pattern 1 match: ${/\$?\d+[\d.,]*\s*[btm]?\s*(run-rate|annualized)/i.test(`${feb13.value} ${feb13.description}`.toLowerCase())}`);
console.log(`  Pattern 2 match: ${/\b(run-rate|annualized)\s+(revenue|sales)\s+(of\s+)?\$?\d/i.test(`${feb13.value} ${feb13.description}`.toLowerCase())}`);
console.log();
console.log(`Expected: Feb 13 priority 3, Mar 10 priority 1 or 2`);
console.log(`Result: ${getPriority(feb13) === 3 && getPriority(mar10) < 3 ? '✅ CORRECT' : '❌ WRONG'}`);
