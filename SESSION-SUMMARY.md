# Decision Site - Session Summary (Aug 2026)

## Completed Work

### 1. Secondary Evidence Category
**Status:** ✅ Complete

- Added "Secondary" category for publicly-sourced secondary market data
- Schema-level date requirement via CHECK constraint (prevents undated bugs)
- Migrated 3 existing "Secondary market" → "Secondary" items
- All legacy items had dates (no undated data to clean up)

**Files:**
- `app/lib/lumen.ts` - CATEGORIES array
- `app/lib/valuation.ts` - References updated (4 occurrences)
- `app/page.tsx` - Comment updated
- `app/api/lumen/companies/route.ts` - Comment updated
- `scripts/add-secondary-date-constraint.sql` - CHECK constraint (manual execution required)
- `scripts/migrate-secondary-category.mjs` - Migration script

### 2. Anthropic Citation Fix
**Status:** ✅ Complete

Corrected Anthropic secondary evidence (July 9, 2026):
- **Value:** "$1.5T" → "$1.2T secondary market valuation"
- **Date:** "2026-08-13" → "2026-07-09" (actual article date)
- **Citation:** Added working URL to Qz article
- **Source label:** "Business Insider" → "Business Insider (via Qz)"
- **Description:** Added named sources (Caplight Securities CEO, Rainmaker Securities CEO)

**Impact:** Valuation regenerated, $1.5T no longer appears in output.

### 3. Anduril Investigation (Series H)
**Status:** ✅ Complete

Added Series H funding round evidence:
- **Value:** $38B post-money (Feb 2026)
- **Sources:** 2 Reputable Publication items (Bloomberg, Reuters)
- Added as fresh anchor to replace stale 2022 data
- Validated against Perplexity research (matching figures)

### 4. Formulaic Confidence Scoring
**Status:** ✅ Complete (from earlier session)

Replaced AI-generated confidence scores with deterministic formula:
- **Staleness penalty:** -0.5pts/month (max -50)
- **Verification penalty:** -30pts for 100% unverified
- **Momentum penalty:** -15pts if no momentum evidence
- **Source credibility:** ±10pts based on source quality

**Result:** Eliminates clustering at arbitrary thresholds (50, 60, 70), properly differentiates verified vs pending.

### 5. Primary + Secondary Weighting Formula
**Status:** ✅ Complete (n=1 validation)

Replaced inconsistent AI weighting with deterministic formula for combining primary rounds and secondary market evidence.

**Problem identified:**
- SpaceX: 78% secondary weight (AI judgment)
- Anthropic: 36% secondary weight (AI judgment)
- Same evidence pattern, different methodologies → inconsistency bug

**Solution implemented:**
```typescript
// Relative × absolute staleness
relativeWeight = monthsSincePrimary / (monthsSincePrimary + monthsSinceSecondary + 1)
absoluteFactor = min(1.0, monthsSincePrimary / 20)  // Prevents fresh primaries from high weights
stalnessWeight = relativeWeight × absoluteFactor

// Credibility scaling
credibilityMultiplier = (sourceCredibility / 75) × namedSourceBonus × verifiedBonus

// Final weight (bounded)
finalWeight = clamp(stalnessWeight × credibilityMultiplier, 0.10, 0.70)

// Illiquidity discount
adjustedSecondaryValue = secondaryValue × 0.85

// Weighted base case
baseCase = (1 - finalWeight) × primaryValue + finalWeight × adjustedSecondaryValue
```

**Test result (Anthropic):**
- Primary: $965B (2.7mo old)
- Secondary: $1200B (1.3mo old, well-sourced)
- Formula: **$971B** (10.5% secondary weight)
- AI output: $1050B (inconsistent)
- **✅ Verified in production:** Database saved $971B, formula correctly wired

**Files:**
- `app/lib/valuation.ts` - Formula implementation (lines 313-462, 627-655)
- `scripts/primary-secondary-parameters-basis.md` - Parameter documentation

---

## Near-Term Follow-Up

### Formula Explanation Generation (Structural Fix)

**Current state (temporary patch):**
- Formula correctly calculates base case ($971B for Anthropic)
- Explanation appended to AI-generated text documenting the weighting
- **Problem:** AI generates explanation first (referencing $1.05T), then formula overrides base case to $971B, then explanation appended as correction

**Issue:**
This creates explanations with internal contradictions until the appended paragraph corrects them. Will recur on every company where formula applies.

**Temporary patch location:**
- `app/lib/valuation.ts:645-690` (appends formula explanation after AI generation)
- Code comment flags this as temporary: "TODO: STRUCTURAL FIX NEEDED (near-term)"

**Real fix (Option C):**
Regenerate explanation AFTER formula override, or reorder generation so AI knows the final base case before writing the explanation. Options:
1. Call AI twice: once for bear/bull/drivers, second time for explanation with final base case
2. Prompt AI to generate explanation template, then fill in final base case
3. Generate explanation separately via structured prompt after all calculations

**Priority:** Near-term (not urgent, but will compound on every company with both evidence types)

**Tracking:** Code comment at line 645 in valuation.ts

---

## Deferred Work

### ⚠️ High Priority - Blocks Core Product Thesis

#### 1. Legal Consult: Human-Contribution Data Solicitation
**Context:** Crowdsourcing mechanism is the core untested product thesis. Before soliciting funding/momentum data from employees/investors, need legal review of what categories can be collected.

**Issue:** Currently have no legal guidance on:
- Which data categories are safe to solicit from insiders (employees, investors)
- Material non-public information (MNPI) boundaries
- Disclosure/consent requirements
- Potential liability for contributors or platform

**Current state:**
- System has evidence submission flow
- Categories defined (Funding, Revenue, Contracts, Secondary, Headcount, etc.)
- No active solicitation to insiders yet
- No legal review completed

**Why this matters:** Unlike the other deferred items (which are safe to wait indefinitely), this **gates the crowdsourcing mechanism**. Without it:
- Cannot safely solicit contributions from employees/investors
- Cannot activate the core value proposition (crowd-verified private market data)
- Product remains a research-tool demo, not a real crowdsourced platform

**Action required:** **Schedule an actual legal consultation** (not a code condition to check)
- Securities counsel with private-market expertise
- Focus: what data can legally be solicited, what disclosures/consent needed
- Output: approved category list + contributor flow requirements

**Trigger:** None (manual action item, not automated)

**Priority:** **Highest** - this is the only deferred item that blocks product viability. The others (sandbox, public company exclusion, parameter re-validation) are engineering polish.

**Tracking:** Noted in this document. Owner should schedule consult before launching any insider solicitation.

---

### Known, Accepted, Not Blocking

#### 2. Isolated Sandbox Environment
**Context:** Mentioned in earlier session, deferred for resource constraints.

**Issue:** Evidence collection and valuation generation run in main environment, not isolated sandbox.

**Risk:** Low (current operations are read/write to DB, API calls to Perplexity/Anthropic).

**When to revisit:** If adding capabilities that execute arbitrary code, shell commands, or untrusted inputs.

**Tracking:** Noted in this document. No active trigger.

---

#### 3. Public Company Exclusion
**Context:** SpaceX went public June 2026, discovered during formula validation.

**Issue:** No schema flag (`is_public` / `ipo_date`) or filtering logic for public companies.

**Current state:**
- SpaceX remains in database with 2019 primary data
- Still generates valuations ($650B as of Aug 17)
- Listed on main page as "private company"

**Current impact:** Low
- SpaceX has no secondary evidence (won't trigger formula)
- No other known IPO transitions in dataset

**Future impact:** **High**
- Next company that IPOs will have same issue
- Public companies have real-time market prices, don't need estimates
- Confusing to users if public companies appear in private-market tracker

**Solution options:**
1. Add `is_public` boolean to schema + filter in GET /companies and valuation generation
2. Add `ipo_date` field (more nuanced, preserves "was private" history)
3. Delete public companies manually as they transition (not scalable)

**Recommendation:** Option 1 or 2 when next IPO transition occurs.

**Re-validation trigger:** Next time a company in the dataset goes public, implement exclusion mechanism.

**Tracking:** Noted in this document.

---

#### 4. Primary + Secondary Weighting Re-Validation
**Context:** Formula implemented with n=1 (Anthropic only). SpaceX excluded (public), no other companies have both evidence types.

**Issue:** Cannot validate parameters with single data point.

**Parameters needing validation:**
- **Grounded (do NOT change without evidence):**
  - `STALENESS_THRESHOLD = 20mo` (from session staleness analysis)
  - `BASELINE_CREDIBILITY = 75` (inherits from CONFIDENCE_MAP)

- **Principled guesses (validate when N≥5):**
  - `ILLIQUIDITY_DISCOUNT = 15%` (literature: 10-25%, no empirical basis from our data)
  - `NAMED_SOURCE_BONUS = 15%` (educated guess, not measured)
  - `VERIFIED_BONUS = 10%` (educated guess, not measured)
  - `MIN_SECONDARY_WEIGHT = 10%` (design choice, arbitrary floor)
  - `MAX_SECONDARY_WEIGHT = 70%` (design choice, arbitrary ceiling)
  - `MAX_CREDIBILITY_MULTIPLIER = 1.5` (design choice, prevents credibility overwhelming staleness)

**Mitigation:** Formula still better than inconsistent AI judgment. Conservative defaults defensible.

**Re-validation trigger:** **Explicit threshold: N≥5 companies with both primary and secondary evidence**

**Steps when triggered:**
1. Run formula against all N companies
2. Compare formula outputs to AI outputs (document inconsistencies)
3. If possible, compare to ground truth (next primary rounds that followed secondary quotes)
4. Adjust parameters based on empirical secondary → primary spreads
5. Update `scripts/primary-secondary-parameters-basis.md` with new confidence levels

**Tracking:** 
- Code comment in `app/lib/valuation.ts:318-320`
- Parameter basis doc: `scripts/primary-secondary-parameters-basis.md:156-171`
- This document

**Current status:** Formula live in production, wired correctly, producing expected output ($971B for Anthropic).

---

## Active Investigations

(None currently)

---

## Parameter Documentation

### Confidence Scoring Formula
**File:** `app/lib/valuation.ts:266-311`

**Status:** Validated, in production.

**Parameters:**
- Staleness: -0.5 pts/month (max -50)
- Verification: -30 pts at 100% unverified
- Momentum: -15 pts if no momentum evidence
- Source credibility: ±10 pts (based on CONFIDENCE_MAP)

---

### Primary + Secondary Weighting Formula
**File:** `app/lib/valuation.ts:313-462`

**Status:** Live in production, validated with n=1.

**See:** `scripts/primary-secondary-parameters-basis.md` for full parameter justification and re-validation trigger.

**Quick reference:**
- Illiquidity discount: 15%
- Staleness threshold: 20 months
- Weight bounds: 10%-70%
- Named source bonus: +15%
- Verified bonus: +10%
- Credibility multiplier cap: 1.5x

---

## Evidence Categories

**Active categories** (as of Aug 2026):
- Funding
- Revenue
- Contracts
- **Secondary** (added this session)
- Headcount
- Retention
- Comparable
- Rumor

**Schema constraint:** Secondary evidence MUST have a date (CHECK constraint at DB level).

---

## Known Data Issues

### Duplicate Company Entries
**Example:** Anthropic appears twice in database:
- `anthropic` (lowercase, ID: 3c82d4f9...) - old 2023 data
- `Anthropic` (capitalized, ID: 9bc85cca...) - current data

**Impact:** Low (queries use case-insensitive `.ilike()`)

**Cleanup:** Deferred (not blocking functionality)

---

## Session Timeline

**Aug 16-17, 2026:**
1. ✅ Added Secondary evidence category with schema-level date requirement
2. ✅ Fixed Anthropic citation ($1.5T → $1.2T, added sources)
3. ✅ Added Anduril Series H evidence (fresh anchor)
4. ✅ Implemented formulaic confidence scoring (replaced AI-generated scores)
5. ✅ Implemented primary+secondary weighting formula (replaced AI judgment)
6. ✅ Verified formula in production (Anthropic: $971B as expected)
7. 📋 Documented deferred work (sandbox, public company exclusion, n≥5 re-validation)

---

## Repository State

**Branch:** `claude/decision-site-connection-pfxoiu`  
**Main branch:** `main`  
**Git user:** Ali Shahhosseini  

**Recent commits:**
- cc01de7: Restore credibility tiers, contributor weighting, and comps
- 0d79c60: Add Perplexity-powered company research
- 55cf7cf: Rank by corroboration, show own multiple, auto-run and surface comps
- 9488130: Rank by credibility, weight by contributor track record, add comps
- 50297d3: Derive Last round / Secondary implied from actual evidence

**Status:** Clean working tree (as of session start)

---

## Next Session Checklist

If continuing this work:

1. **Check deferred items:**
   - Has another company gone public? → Implement public company exclusion
   - Do N≥5 companies now have both primary+secondary evidence? → Trigger re-validation
   - Is isolated sandbox needed for new features? → Revisit architecture

2. **Data quality:**
   - Clean up duplicate Anthropic entries if impacting functionality
   - Verify no undated secondary evidence (constraint should prevent)

3. **Formula monitoring:**
   - Spot-check primary+secondary weights on new companies
   - Watch for edge cases (very stale primary, very fresh secondary, etc.)
   - Document any cases where formula produces surprising output

---

## Contact / Handoff

**Primary contributor:** Ali Shahhosseini (alishahhosseini1@gmail.com)  
**AI assistant:** Claude Code (Sonnet 4.5)  
**Session dates:** 2026-08-15 to 2026-08-17

**Key decisions made:**
- Path B (proceed with n=1 formula implementation) over Path A (wait for more data)
- Conservative parameter defaults over aggressive tuning
- Deterministic formulas over AI judgment for reproducibility

**Architecture philosophy:**
- Evidence-first (never show unsourced numbers)
- Deterministic over AI judgment (when inconsistency detected)
- Explicit triggers over "flag for later" (N≥5, not "someday")

---

*Last updated: 2026-08-17*
