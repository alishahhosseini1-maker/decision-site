# Primary + Secondary Weighting Formula - Parameter Basis

## Summary

Deterministic formula for combining primary round and secondary market evidence in base case calculations. Implemented to replace inconsistent AI-based weighting.

**Validation status:** Parameters calibrated from n=1 (Anthropic only). Requires re-validation.

---

## Formula

```typescript
// 1. Apply illiquidity discount to secondary
adjustedSecondary = secondaryValue × (1 - ILLIQUIDITY_DISCOUNT)

// 2. Calculate relative staleness
relativeWeight = monthsSincePrimary / (monthsSincePrimary + monthsSinceSecondary + 1)

// 3. Apply absolute staleness factor (prevents fresh primaries from high weights)
absoluteFactor = min(1.0, monthsSincePrimary / STALENESS_THRESHOLD)
stalnessWeight = relativeWeight × absoluteFactor

// 4. Apply credibility multiplier
credibilityMultiplier = (sourceCredibility / BASELINE_CREDIBILITY) × namedSourceBonus × verifiedBonus
credibilityMultiplier = clamp(credibilityMultiplier, 0.5, MAX_CREDIBILITY_MULTIPLIER)

// 5. Calculate final weight
finalWeight = clamp(stalnessWeight × credibilityMultiplier, MIN_SECONDARY_WEIGHT, MAX_SECONDARY_WEIGHT)

// 6. Weighted base case
baseCase = (1 - finalWeight) × primaryValue + finalWeight × adjustedSecondary
```

---

## Parameters & Basis

### ILLIQUIDITY_DISCOUNT = 15%
**Basis:** **Principled guess** (not validated)

**Reasoning:** Secondary markets for private companies are known to trade at premiums due to:
- Limited supply (employees/early investors restricted from selling)
- Selection bias (only most desirable companies have active secondaries)
- Speculative premiums in bull markets

**Literature suggests:** 10-25% discounts are common for illiquid securities.

**Confidence:** Low - needs empirical validation from realized secondary → primary round spreads.

**TODO:** Collect data on secondary market quotes vs next primary round prices to validate discount magnitude.

---

### STALENESS_THRESHOLD = 20 months
**Basis:** **Grounded in session findings** (Aug 2026)

**Source:** Staleness analysis from accuracy benchmark session identified >20 months as the threshold where:
- Confidence scores drop materially
- Extrapolation errors increase
- Evidence is flagged as "stale" in valuation prompts

**Evidence:**
- Anduril benchmark: 20mo stale primary → 32% overestimate
- SpaceX/Databricks/Chime: 23-59mo stale → severe underestimates
- System explicitly warns on >20mo staleness

**Confidence:** Medium - empirically observed threshold, but only from n=5 benchmark cases.

**Related code:** `app/lib/valuation.ts` staleness warning at 20 months.

---

### MIN_SECONDARY_WEIGHT = 10%
**Basis:** **Design choice** (not validated)

**Reasoning:** Even when primary is very fresh, well-sourced secondary evidence should have *some* influence (floor prevents complete drowning out).

**Confidence:** Low - arbitrary floor, no empirical basis.

---

### MAX_SECONDARY_WEIGHT = 70%
**Basis:** **Design choice** (not validated)

**Reasoning:** Even when primary is very stale, it should retain *some* influence (cap prevents complete replacement by potentially thin-liquidity secondary data).

70% chosen to allow substantial weight shift but maintain primary as partial anchor.

**Confidence:** Low - arbitrary ceiling, no empirical basis.

---

### NAMED_SOURCE_BONUS = 1.15 (+15%)
**Basis:** **Educated guess** (not validated)

**Reasoning:** Named sources (e.g., "Caplight CEO Javier Avalos quoted") are more credible than anonymous "three sources familiar" because:
- Accountability (source's reputation at stake)
- Verifiability (statements can be fact-checked)
- Less prone to rumor/speculation

15% boost reflects modest but meaningful credibility improvement.

**Confidence:** Very low - no empirical basis for specific magnitude.

---

### VERIFIED_BONUS = 1.10 (+10%)
**Basis:** **Educated guess** (not validated)

**Reasoning:** Evidence verified by human contributors with track records should receive higher weight than pending/unverified.

10% boost is conservative (less than named source bonus) because verification confirms evidence exists, but doesn't validate the valuation figure itself.

**Confidence:** Very low - no empirical basis for specific magnitude.

---

### MAX_CREDIBILITY_MULTIPLIER = 1.5
**Basis:** **Design choice** (not validated)

**Reasoning:** Prevents credibility from overwhelming staleness signal. Even the best-sourced secondary shouldn't get >150% of base weight.

**Confidence:** Low - arbitrary ceiling.

---

### BASELINE_CREDIBILITY = 75 (Industry Research)
**Basis:** **Inherits from existing CONFIDENCE_MAP**

**Reasoning:** Industry Research (e.g., Crunchbase, PitchBook) is the baseline credibility tier in the existing evidence ledger system. Credibility multiplier normalizes to 1.0 at this tier.

**Confidence:** Medium - consistent with existing system design.

---

## Validation Status

### Current State (August 2026)
- **Companies with both evidence types:** N=1 (Anthropic only)
- **SpaceX excluded:** Went public June 2026, no longer valid test case
- **Cannot validate parameters with N=1**

### Test Results (Anthropic)
- Primary: $965B (2.7mo old)
- Secondary: $1200B (1.3mo old, well-sourced, named sources)
- **Formula output:** $971B (10.5% secondary weight)
- **Current AI output:** $1050B (inconsistent between runs)

Formula anchors close to primary ($965B) with small secondary bump - defensible for fresh evidence.

---

## Re-Validation Trigger

**EXPLICIT TRIGGER:** Re-validate ALL parameters when **N≥5 companies have both primary and secondary evidence**.

**Steps when triggered:**
1. Run formula against all N companies
2. Compare formula outputs to current AI outputs (document inconsistencies)
3. If possible, compare to known ground truth (next primary rounds)
4. Adjust parameters based on:
   - Empirical secondary → primary spreads (illiquidity discount)
   - Weight distribution that matches expert judgment on test cases
   - Credibility bonus validation from source quality correlations
5. Update this document with new basis and confidence levels

**Who triggers:** Next developer working on valuation logic should check company count and trigger if N≥5.

**Tracking:** Add TODO comment in code pointing to this document.

---

## Known Limitations

1. **N=1 calibration:** All parameters except staleness threshold are educated guesses, not validated
2. **Illiquidity discount:** 15% has no empirical basis from this dataset
3. **Credibility bonuses:** 15%/10% are arbitrary, not measured against outcomes
4. **Weight bounds:** 10%-70% are design choices, not optimized
5. **Single test case:** Anthropic is only company with both evidence types

**Mitigation:** Formula is still better than inconsistent AI judgment (which produced different weightings on different runs for same evidence). Conservative defaults are defensible until more data enables validation.

---

## References

- Session: Anduril investigation & confidence scoring overhaul (Aug 16-17, 2026)
- Related fix: Formulaic confidence scoring (Issue 3)
- Staleness threshold: `app/lib/valuation.ts` lines ~387-395
- Confidence map: `app/lib/lumen.ts` CONFIDENCE_MAP
