# Decision Site - Session Summary (Aug 2026)

## Completed Work

### 0. August 17, 2026 Session — Layout Fixes + Evidence Deduplication + Comparables Panel
**Status:** ✅ Complete

Implemented revised Anthropic/company page layout per mockup, fixed duplicate evidence root cause, and corrected comparables panel revenue selection.

#### Layout & Visual Fixes

**Four priority changes:**

1. **"In one line" panel** (after bear/base/bull range)
   - One-sentence takeaway dynamically generated from formula
   - Formula chip row showing weight split (e.g., "89% primary + 11% secondary = $971B")
   - Dynamic from formula inputs, adapts for primary-only companies
   - Visual polish matched to reference mockup (spacing, sizing, borders)

2. **Collapsed methodology section**
   - Moved "How we calculated this" → "Full methodology & key drivers"
   - Collapsed by default, expandable

3. **Evidence ledger tagging**
   - "◆ ANCHOR" gold badge on anchor evidence
   - Contribution notes on formula-used items (e.g., "11% of base case, 15% discount")
   - Dynamic from formula output

4. **Funding chart**
   - Label anchor bar with "◆ anchor"
   - Displays POST-MONEY VALUATION per round (not amount raised)
   - Initially implemented as amount-raised extraction, reverted per user clarification
   - Bars show: $60B / $183B / $380B / $965B (deduplicated values)

**Bug fixes:**
- **Double-dollar-sign bug:** Fixed `$$965.0B` → `$965.0B` (fmtB already adds $)
- **SECONDARY IMPLIED showing "—":** Now derives from evidence on-the-fly instead of DB field
- **Visual styling:** Tightened spacing/sizing to match mockup exactly

**Files:**
- `app/page.tsx` - All four layout features + bug fixes
- `app/lib/formula.ts` - Created as shared module (prevents duplication)

#### Evidence Deduplication — Root Cause Fixed

**Problem:** researchCompanyEvidence() was inserting blindly without checking for existing equivalent evidence. Every research re-run (manual button, cron job) created duplicates.

**Prevention fix:**
- Added equivalence-check logic before insert (app/lib/perplexity.ts:90-146)
- Checks: same category, similar date (±7 days), similar value (±5%)
- Skips duplicates, only inserts new items
- Covers ALL categories (Funding, Revenue, Secondary, Contracts, etc.)

**Cleanup fix:**
- Extended scripts/deduplicate-evidence.mjs to all categories (was Funding/Secondary only)
- Removed 71 duplicate evidence items across 20 companies:
  - Anthropic: 8 duplicates (5 Funding, 3 Revenue)
  - OpenAI: 8 duplicates (worst offender: 6× for single round)
  - Faire: 9 duplicates
  - Notion: 8 duplicates
  - 16 other companies: 38 duplicates total

**Selection quality verified:**
- Spot-checked OpenAI (6× → 1) and Faire (5× → 1)
- Kept records are verified, high-quality sources, correct values

#### Comparables Panel — Revenue Selection Fixed

**Problem:** Panel was using PROJECTED 2028 revenue ($190B) instead of CURRENT run-rate ($14B), creating unrealistic implied valuation range ($604.5B–$11,758.5B).

**Root cause:** pickMostCredible() sorted by date (newest wins), so Aug 2026 "projected 2028" beat Feb 2026 "run-rate".

**Solution — 4-tier revenue prioritization:**
1. **Priority 3:** Run-rate STATED with number ("$14B run-rate", not just "run-rate claims")
2. **Priority 2:** Current/actual/TTM indicators
3. **Priority 1:** Ambiguous or "to date" (cumulative, not annual)
4. **Priority 0:** Projected/forecast/target

**Pattern robustness:**
- Distinguishes "$14B run-rate revenue" (priority 3) from "run-rate claims" (priority 1)
- Tested on Anthropic: correctly selects Feb 13 $14B run-rate over Mar 10 ">$5B to date"
- Handles variations: "run-rate revenue of $X", "annualized revenue $X in 2026"

**Fallback disclaimer:**
- When only projected revenue exists: "⚠️ Based on projected revenue — implied valuations may not reflect current multiples"
- Anthropic shows no disclaimer (using current run-rate)

**Impact:**
- Before: $190B projected → $604.5B–$11,758.5B range (unrealistic)
- After: $14B run-rate → ~$45B–$870B range (realistic)
- Anthropic's own multiple: ~69x ($971B / $14B)

**Isolation verified:**
- Comps route READS base_case ($971B) but never WRITES it
- Revenue selection affects ONLY comps panel display
- Base valuation unchanged, fully isolated

**Files:**
- `app/api/lumen/companies/[id]/comps/route.ts` - Revenue selection logic
- `app/page.tsx` - Disclaimer display

---

### 1. August 18, 2026 Session — Complete Layout Rebuild + Funding Chart Root Cause Fix
**Status:** ✅ Complete

Full reset of page structure to match mockup exactly, with funding chart bug root-caused and permanently fixed with safeguards.

#### Layout Rebuild — From Mockup Reference

**Problem:** Initial implementation layered new centered hero card ON TOP of existing three-column strip instead of replacing it. Evidence ledger compressed into too-narrow column.

**Solution:** Complete rebuild from mockup (anthropic-layout-v2.html):

**New page structure (top to bottom):**
1. Header (company name, ticker, sector) — unchanged
2. **ONE centered hero card** — "$971.0B" with confidence badge, range bar, share price
3. Disclaimer line
4. "In one line" panel — takeaway + formula chips (gold=primary, blue=secondary)
5. Collapsed "Full methodology & key drivers"
6. **Funding History chart** — full-width before grid (not in sidebar)
7. **Two-column grid (1.4fr / 1fr):**
   - Left (60%): Evidence Ledger at full readable width
   - Right (40%): Comparables + Contributors stacked

**Removed:**
- Three-column strip (Last Round / Secondary Implied / AI Community Fair Value) — completely deleted
- Duplicate hero card sections
- Duplicate funding chart in sidebar

**Readability polish applied:**
- Bear/Bull labels: increased contrast (#B5BDC6, was #9A9A9F)
- Spacing: added 4px margin after share-price line
- Formula chips: gold (#C9A227) for primary, blue (#5AA9E6) for secondary
- Hover states: "see methodology" buttons turn gold on hover
- Line-height: 1.6 in "In one line" paragraph

#### Funding Chart — Root Cause Fix

**Problem:** Chart broke 3 separate times during session, each time reported "fixed" but kept failing.

**Root cause identified:** During layout rebuild (moving chart from sidebar to full-width), safety filters were accidentally dropped:

```diff
Old (sidebar):
- .filter((e) => e.category === 'Funding' && e.value && e.date && e.status === 'verified')

New (broken):
+ .filter((e) => e.category === 'Funding' && e.status === 'verified')
```

**Missing guards:** `&& e.value && e.date` prevent null/empty evidence from reaching `parseValuation()`, which would crash or display incorrect data.

**Permanent fix:**
1. Restored complete filter with all safety checks
2. Added warning comment in code:
   ```
   WARNING: This chart has broken 3+ times from unrelated changes.
   Critical filters: e.value && e.date prevent null values from breaking parseValuation().
   Manual re-check required after any changes to evidence loading or this component.
   ```

**Verified working (screenshot confirmed):**
- 4 bars: $60.0B / $183.0B / $380.0B / $965.0B ✓
- Anchor labeled correctly: "$965.0B" with ◆ marker ✓
- Caption: "Based on 4 known funding rounds" ✓

**Files:**
- `app/page.tsx` — Complete layout restructure + funding chart fix with warning
- `app/api/lumen/companies/[id]/funding-rounds/route.ts` — Verified filter (unchanged)

**Commits:**
- `6375dc6` — Initial centered hero-card attempt (layered instead of replaced)
- `42a6a65` — WIP: Remove three-column strip, move hero to top
- `8173f9e` — Complete rebuild, remove all duplicates
- `e2e02a0` — Fix funding chart filters + add warning comment (FINAL)
- `scripts/deduplicate-evidence.mjs` - Extended to all categories
- `scripts/test-revenue-selection.mjs` - Cross-company validation

**Commits:**
- `fb61330` - Layout bugs + visual polish
- `0344cd1` - Dedup root cause + funding chart metric fix
- `28d7a60` - Regex hardening + dedup verification
- `ec20a4e` - Revert funding chart to valuation metric
- `fc10c57` - Comparables panel revenue selection fix

---

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
