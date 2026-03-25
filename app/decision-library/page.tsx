// ✅ Only change: add "Private Review" to the top nav (same as the other pages)

'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

type DecisionEntry = {
  id: string;
  title: string;
  decision: string;
  context: string[];
  keyAssumption: string;
  primaryRisk: string;
  sizingApproach: string;
  tags: string[];
  usePrompt: string;
};

export default function DecisionLibraryPage() {
  const entries: DecisionEntry[] = [
    {
      id: 'dl-001',
      title: 'RSU concentration + single-stock exposure',
      decision:
        'Increase single-stock exposure while already holding a large RSU position in the same name.',
      context: [
        'Public tech company; comp is RSU-heavy',
        '24–48 month horizon',
        'Avoiding forced selling; protecting downside behavior',
        'Career risk is correlated with stock drawdown',
      ],
      keyAssumption:
        'The volatility you’re accepting is not a proxy for permanent impairment over the horizon.',
      primaryRisk:
        'Correlated drawdown (portfolio + career) forces a bad sale at the wrong time.',
      sizingApproach:
        'Incremental adds only; pre-commit a max exposure cap and a drawdown-based pause rule.',
      tags: ['RSUs', 'Concentration', 'Correlation'],
      usePrompt: `Use this decision frame.

DECISION:
Increase single-stock exposure while already concentrated via RSUs in the same company.

CONTEXT (fill):
- Current exposure (% of liquid net worth): 
- RSU schedule / vest cadence:
- Drawdown tolerance (behavioral + financial):
- Liquidity needs (taxes, life, timeline):
- Horizon:

WHAT HAS TO BE TRUE (assumptions):
1) I can hold through a drawdown without forced selling.
2) The thesis survives a 30–50% drawdown without changing my behavior.
3) Total exposure stays within a hard cap that I pre-commit.

PRIMARY RISK / FAILURE MODE:
Correlation spikes when I least want it (income + RSUs + portfolio). I am forced to sell.

SIZING / TRIGGERS:
- Max total exposure cap:
- Add plan (conditions, not vibes):
- Pause rule (drawdown / thesis break):
- Sell/trim triggers (not price anchoring):

Now pressure-test: where does this break? What evidence changes my mind?`,
    },
    {
      id: 'dl-002',
      title: 'Private investment with long lockup',
      decision:
        'Commit capital to an alternative/private investment with multi-year illiquidity.',
      context: [
        'Liquidity needs uncertain (taxes, life events)',
        'No visibility into interim marks',
        'Hard to reverse; governance matters',
      ],
      keyAssumption:
        'Illiquidity is compensated with a structural edge (terms, access, or underwriting), not a story.',
      primaryRisk:
        'Liquidity mismatch forces you to fund obligations elsewhere at the worst time.',
      sizingApproach:
        'Size as if the capital is gone; commit only after a “liquidity stress” pass.',
      tags: ['Alternatives', 'Illiquidity', 'Lockup'],
      usePrompt: `Use this decision frame.

DECISION:
Commit to a private deal with multi-year illiquidity.

CONTEXT (fill):
- Amount:
- Lockup:
- Capital calls / distributions:
- Liquidity runway (months):
- Near-term obligations (taxes, housing, family):
- Alternative sources of liquidity:

WHAT HAS TO BE TRUE (assumptions):
1) There is a real structural edge (not just access).
2) I can survive the lockup without changing life behavior.
3) Terms protect me (fees, governance, alignment).

PRIMARY RISK / FAILURE MODE:
I need liquidity during stress and take a worse path elsewhere (debt, forced sale, bad trade-offs).

SIZING / TRIGGERS:
- “Capital is gone” sizing:
- Minimum runway requirement:
- Walk-away terms:
- Evidence required before funding:

Now pressure-test: what would make this a mistake even if returns look good later?`,
    },
    {
      id: 'dl-003',
      title: 'Leaving a role for a higher-upside opportunity',
      decision:
        'Leave a stable role for a higher-upside opportunity with ambiguous execution risk.',
      context: [
        'Opportunity cost includes reputation and time',
        'Path dependency compounds quickly',
        'Downside includes months of rebuild time',
      ],
      keyAssumption:
        'You can sustain execution cadence long enough to reach a proof point.',
      primaryRisk:
        'Execution gap: momentum dies before the first credible milestone.',
      sizingApproach:
        'Stage the leap: secure a proof milestone before burning the bridge where possible.',
      tags: ['Career', 'Risk', 'Reputation'],
      usePrompt: `Use this decision frame.

DECISION:
Leave a stable role for a higher-upside opportunity.

CONTEXT (fill):
- Runway (months) + obligations:
- Current role leverage (growth, comp, brand):
- New opportunity path to proof (timeline):
- Reversibility (can I go back / pivot?):
- Hidden costs (stress, relationships, identity):

WHAT HAS TO BE TRUE (assumptions):
1) I can hit a credible milestone by a date.
2) The opportunity is not just “more exciting,” it’s structurally better.
3) I can maintain cadence under uncertainty.

PRIMARY RISK / FAILURE MODE:
I burn the bridge without reaching proof; I lose time + reputation and restart weaker.

SIZING / TRIGGERS:
- Proof milestone + deadline:
- Minimum runway:
- What would cause me to stop / revert:

Now pressure-test: what’s the fastest falsification test?`,
    },
    {
      id: 'dl-004',
      title: 'Buying a home vs. staying liquid',
      decision: 'Buy a home now versus staying liquid and waiting for better terms.',
      context: [
        'High impact on flexibility and monthly burn',
        'Rate sensitivity; market uncertainty',
        'Non-financial utility matters',
      ],
      keyAssumption:
        'The home’s utility and stability are worth the flexibility you give up.',
      primaryRisk:
        'You lock in a burn rate that narrows future options and raises stress.',
      sizingApproach:
        'Set a “sleep well” payment threshold; if above it, wait or reduce scope.',
      tags: ['Personal finance', 'Liquidity', 'Lifestyle'],
      usePrompt: `Use this decision frame.

DECISION:
Buy a home now vs stay liquid.

CONTEXT (fill):
- Payment all-in (PITI + maintenance) as % of take-home:
- Job stability:
- Down payment impact on runway:
- Lifestyle utility (schools, commute, stability):
- Reversibility / exit costs:

WHAT HAS TO BE TRUE (assumptions):
1) Payment stays under my “sleep well” threshold.
2) I won’t regret lost flexibility if opportunities change.
3) My downside scenario still works (job loss, rates, repairs).

PRIMARY RISK / FAILURE MODE:
Burn rate becomes the cage; I narrow my future options.

SIZING / TRIGGERS:
- Max payment threshold:
- Minimum cash runway after purchase:
- What would make me wait:

Now pressure-test: what is the downside scenario and can I live through it?`,
    },
    {
      id: 'dl-005',
      title: 'Sell vs. hold after a big run-up',
      decision:
        'Decide whether to trim a position after a large gain without anchoring to price or regret.',
      context: [
        'Position is now outsized vs original intent',
        'Tax impact and concentration both matter',
        'Opportunity cost: what would you buy instead?',
      ],
      keyAssumption:
        'Your edge is still present; the thesis remains true at the new price and size.',
      primaryRisk:
        'You confuse “up a lot” with “overvalued” or “safe.”',
      sizingApproach:
        'Trim to a pre-committed max exposure band; keep a core only if thesis triggers still intact.',
      tags: ['Concentration', 'Taxes', 'Regret'],
      usePrompt: `Use this decision frame.

DECISION:
Trim or hold after a big run-up.

CONTEXT (fill):
- Current position size vs original intent:
- Taxes (short/long term):
- Alternative use of proceeds:
- Thesis status (what changed / what didn’t):

WHAT HAS TO BE TRUE (assumptions):
1) I’m not anchoring to price or P/L.
2) Thesis still holds AND size is still survivable.

PRIMARY RISK / FAILURE MODE:
I turn risk management into performance chasing (or I let greed override sizing).

SIZING / TRIGGERS:
- Max exposure band:
- Trim plan (if above band):
- Hold plan (if within band):
- Thesis-break triggers:

Now pressure-test: if I were entering today at this size, would I do it?`,
    },
    {
      id: 'dl-006',
      title: 'Start a position vs. wait for a better entry',
      decision:
        'Start a position now versus waiting for a better price while avoiding paralysis.',
      context: ['Conviction exists but uncertainty is non-trivial', 'FOMO present', 'Averaging plan is possible'],
      keyAssumption:
        'Time-in-position matters more than perfect entry if sizing is disciplined.',
      primaryRisk:
        'You delay indefinitely and then chase at a worse level.',
      sizingApproach:
        'Starter position + scale plan: add only on defined conditions, not emotions.',
      tags: ['Timing', 'Scaling', 'Discipline'],
      usePrompt: `Use this decision frame.

DECISION:
Start now vs wait for a better entry.

CONTEXT (fill):
- Conviction level:
- Uncertainty source:
- Max loss / drawdown tolerance:
- Scaling ability:

WHAT HAS TO BE TRUE (assumptions):
1) I can start small without letting it grow emotionally.
2) I have a real scaling plan.

PRIMARY RISK / FAILURE MODE:
I wait forever, then chase; or I start too big and panic.

SIZING / TRIGGERS:
- Starter size:
- Add conditions:
- Stop/exit conditions:
- What would change my mind:

Now pressure-test: what condition would justify waiting?`,
    },
    {
      id: 'dl-007',
      title: 'Options vs. equity for expressing a view',
      decision:
        'Choose between options (defined risk) and equity (open-ended horizon) for the same thesis.',
      context: ['Need to define max loss and time horizon', 'Volatility/IV can dominate outcomes', 'Exit mechanics differ'],
      keyAssumption:
        'Your thesis has a timeframe; the payoff profile matches what you actually believe.',
      primaryRisk:
        'You buy time decay and call it conviction.',
      sizingApproach:
        'Size options by max loss; keep loss tolerable without changing life behavior.',
      tags: ['Options', 'Convexity', 'Time'],
      usePrompt: `Use this decision frame.

DECISION:
Options vs equity for the same thesis.

CONTEXT (fill):
- Thesis horizon (months):
- Max acceptable loss:
- Need for convexity vs patience:
- IV/vol environment:

WHAT HAS TO BE TRUE (assumptions):
1) Thesis timing is real (not vague).
2) I won’t confuse leverage with conviction.

PRIMARY RISK / FAILURE MODE:
Time decay eats me while I pretend I’m “right.”

SIZING / TRIGGERS:
- Max loss sizing (options):
- Roll/exit rules:
- If equity: position cap + hold rules:

Now pressure-test: what timeline do I actually believe?`,
    },
    {
      id: 'dl-008',
      title: 'Concentrated bet vs. diversified approach',
      decision:
        'Decide whether to concentrate into a top idea or spread risk across multiple exposures.',
      context: ['Portfolio already has correlated exposures', 'Career + portfolio risk may overlap', 'Downside tolerance is finite'],
      keyAssumption:
        'You can survive being wrong without forced selling or identity damage.',
      primaryRisk:
        'Correlation spikes when you need diversification most.',
      sizingApproach:
        'Cap any single theme + single name; require explicit downside scenario plan.',
      tags: ['Diversification', 'Correlation', 'Risk'],
      usePrompt: `Use this decision frame.

DECISION:
Concentrate or diversify.

CONTEXT (fill):
- Existing exposures + correlations:
- Income/career correlation:
- Downside tolerance (financial + behavioral):
- Time horizon:

WHAT HAS TO BE TRUE (assumptions):
1) I can survive being wrong without forced selling.
2) Concentration improves expected value meaningfully.

PRIMARY RISK / FAILURE MODE:
I bet the same driver everywhere and call it diversification.

SIZING / TRIGGERS:
- Driver-level caps:
- Single-name cap:
- What would cause de-risking:

Now pressure-test: what happens in the worst 10% scenario?`,
    },
    {
      id: 'dl-009',
      title: 'Emergency fund sizing (cash vs. invested)',
      decision:
        'Choose how much cash to hold versus investing more while maintaining resilience.',
      context: ['Income stability uncertain', 'Large planned expenses possible', 'Psychological “sleep well” threshold matters'],
      keyAssumption:
        'The marginal return of investing cash exceeds the resilience cost.',
      primaryRisk:
        'You create fragility and are forced to sell during stress.',
      sizingApproach:
        'Set a minimum runway; invest only above the runway and only if drawdown plan exists.',
      tags: ['Liquidity', 'Resilience', 'Cash'],
      usePrompt: `Use this decision frame.

DECISION:
How much cash to hold vs invest.

CONTEXT (fill):
- Monthly burn:
- Income stability:
- Next 12 months obligations:
- Drawdown plan:

WHAT HAS TO BE TRUE (assumptions):
1) I won’t be forced to sell in stress.
2) Cash below runway doesn’t change behavior.

PRIMARY RISK / FAILURE MODE:
Fragility. I’m forced into bad sales or debt.

SIZING / TRIGGERS:
- Minimum runway (months):
- Invest-only-above rule:
- What would make me raise cash:

Now pressure-test: what happens if income drops tomorrow?`,
    },
    {
      id: 'dl-010',
      title: 'Join a startup vs. stay at big tech',
      decision:
        'Choose a high-variance career move with unclear payoff and reputation risk.',
      context: ['Comp structure changes (equity vs cash)', 'Execution risk is real', 'Time cost is irreversible'],
      keyAssumption:
        'The team + market + your role can reach proof in a defined time.',
      primaryRisk:
        'You trade stability for a story without a path to proof.',
      sizingApproach:
        'Define a proof milestone + timeline; commit only if the downside is survivable.',
      tags: ['Career', 'Variance', 'Equity'],
      usePrompt: `Use this decision frame.

DECISION:
Join a startup vs stay at big tech.

CONTEXT (fill):
- Cash comp delta:
- Equity terms:
- Runway:
- Role clarity + leverage:
- Proof milestone + time:

WHAT HAS TO BE TRUE (assumptions):
1) I can get to proof by a date.
2) The downside is survivable.
3) This is not “variance for variance’s sake.”

PRIMARY RISK / FAILURE MODE:
I buy a story, not a proof path.

SIZING / TRIGGERS:
- Proof milestone:
- Deadline:
- Stop conditions:

Now pressure-test: what would make this clearly wrong?`,
    },
    {
      id: 'dl-011',
      title: 'Relocate for quality of life vs. career leverage',
      decision:
        'Move locations to optimize lifestyle without accidentally sacrificing long-term leverage.',
      context: ['Family and lifestyle utility is meaningful', 'Career growth might slow or change trajectory', 'Cost-of-living and taxes matter'],
      keyAssumption:
        'The move improves life meaningfully and doesn’t destroy future options.',
      primaryRisk:
        'You underestimate second-order career and network effects.',
      sizingApproach:
        'Run a reversibility test: ensure you can undo the move without major loss if wrong.',
      tags: ['Lifestyle', 'Reversibility', 'Career'],
      usePrompt: `Use this decision frame.

DECISION:
Relocate for lifestyle vs keep career leverage.

CONTEXT (fill):
- Why now:
- Reversibility:
- Network effects:
- Costs (tax, COL, time):
- Family utility:

WHAT HAS TO BE TRUE (assumptions):
1) Utility gain is durable.
2) I’m not cutting off my best future options.

PRIMARY RISK / FAILURE MODE:
Second-order effects: network + trajectory weaken quietly.

SIZING / TRIGGERS:
- Reversibility plan:
- Minimum career/network threshold:
- What would make me revert:

Now pressure-test: what options do I lose?`,
    },
    {
      id: 'dl-012',
      title: 'Take profits to pay taxes vs. keep exposure',
      decision:
        'Sell assets to cover upcoming taxes while trying not to damage the core thesis.',
      context: ['Tax bill is known or highly likely', 'Liquidity sources vary in cost', 'Selling may change future upside'],
      keyAssumption:
        'Reducing exposure now is cheaper than risking a forced sale later.',
      primaryRisk:
        'You keep exposure and end up selling at the worst time due to obligation.',
      sizingApproach:
        'Ring-fence the tax bill early; treat it as non-negotiable liability.',
      tags: ['Taxes', 'Liquidity', 'Planning'],
      usePrompt: `Use this decision frame.

DECISION:
Sell to cover taxes vs keep exposure.

CONTEXT (fill):
- Tax bill amount + date:
- Other liquidity sources:
- Core thesis status:
- Position concentration:

WHAT HAS TO BE TRUE (assumptions):
1) The tax liability is non-negotiable.
2) The cost of selling now is lower than forced selling later.

PRIMARY RISK / FAILURE MODE:
I gamble with a liability and lose at the worst time.

SIZING / TRIGGERS:
- Ring-fence cash by date:
- What I will sell (order of operations):
- What I will NOT do (borrow / risk):

Now pressure-test: what happens if the market drops 20% next month?`,
    },
    {
      id: 'dl-013',
      title: 'Over-concentration in a single sector/theme',
      decision:
        'Reduce thematic exposure without turning risk management into performance chasing.',
      context: ['Holdings share common drivers', 'Drawdowns tend to cluster', 'You want the best idea, not the whole basket'],
      keyAssumption:
        'Your future returns do not require maximal exposure to the same driver.',
      primaryRisk:
        'A single macro shock hits everything you own at once.',
      sizingApproach:
        'Set driver-level caps (not just ticker caps); rotate only with explicit thesis changes.',
      tags: ['Theme', 'Correlation', 'Risk'],
      usePrompt: `Use this decision frame.

DECISION:
Reduce thematic exposure without performance chasing.

CONTEXT (fill):
- Common drivers:
- Current driver-level exposure:
- What you want to keep:
- Downside tolerance:

WHAT HAS TO BE TRUE (assumptions):
1) I’m reducing fragility, not “calling the top.”
2) The driver can shock all holdings simultaneously.

PRIMARY RISK / FAILURE MODE:
I keep the same driver everywhere and get hit at once.

SIZING / TRIGGERS:
- Driver-level caps:
- What stays / what goes:
- Thesis-change criteria:

Now pressure-test: what single event breaks multiple holdings?`,
    },
    {
      id: 'dl-014',
      title: 'Spend vs. invest decision (lifestyle upgrade)',
      decision:
        'Make a lifestyle upgrade without undermining future optionality and freedom.',
      context: ['Upgrade is recurring (burn rate) vs one-time', 'Income stability uncertain', 'Utility is real but hard to quantify'],
      keyAssumption:
        'The utility gain is durable and worth the opportunity cost.',
      primaryRisk:
        'You lock in a burn rate that narrows future choices.',
      sizingApproach:
        'Define a “never cross” savings rate; only upgrade if you remain above it.',
      tags: ['Lifestyle', 'Burn rate', 'Opportunity cost'],
      usePrompt: `Use this decision frame.

DECISION:
Lifestyle upgrade vs keep optionality.

CONTEXT (fill):
- Recurring cost:
- One-time cost:
- Savings rate impact:
- Income stability:
- Utility gain (what changes day-to-day):

WHAT HAS TO BE TRUE (assumptions):
1) Utility gain is durable.
2) I won’t regret lost optionality.

PRIMARY RISK / FAILURE MODE:
Recurring burn rate becomes the cage.

SIZING / TRIGGERS:
- Never-cross savings rate:
- Payment threshold:
- What would make me reverse:

Now pressure-test: what future option does this kill?`,
    },
    {
      id: 'dl-015',
      title: 'Private deal: invest now vs. wait for better terms',
      decision:
        'Decide whether to commit to a private deal now or wait for clearer information/terms.',
      context: ['Deal access may not repeat', 'Information is incomplete', 'Lockup and governance matter'],
      keyAssumption:
        'Your edge is structural (terms, access, or insight), not FOMO.',
      primaryRisk:
        'You accept bad terms because access feels scarce.',
      sizingApproach:
        'Pre-commit term thresholds; walk away if not met (even if the deal is “hot”).',
      tags: ['Alternatives', 'Terms', 'Discipline'],
      usePrompt: `Use this decision frame.

DECISION:
Commit to a private deal now vs wait.

CONTEXT (fill):
- Terms:
- Governance:
- Lockup:
- Information gaps:
- Alternative deals / opportunity cost:

WHAT HAS TO BE TRUE (assumptions):
1) Edge is structural, not scarcity.
2) Terms protect me.

PRIMARY RISK / FAILURE MODE:
I accept bad terms because access feels rare.

SIZING / TRIGGERS:
- Term thresholds (must-haves):
- Walk-away rule:
- Evidence required before committing:

Now pressure-test: what would make me say “no” even if others say yes?`,
    },
  ];

  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
  const [isMobile, setIsMobile] = useState(false);

  const [copied, setCopied] = useState(false);

  const [openKeyAssumption, setOpenKeyAssumption] = useState(false);
  const [openPrimaryRisk, setOpenPrimaryRisk] = useState(false);
  const [openSizingApproach, setOpenSizingApproach] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;

    return entries.filter((e) => {
      const haystack = [
        e.title,
        e.decision,
        e.keyAssumption,
        e.primaryRisk,
        e.sizingApproach,
        e.tags.join(' '),
        e.context.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, query]);

  const active = useMemo(() => {
    const base = (query.trim() ? filtered : entries).find((e) => e.id === activeId);
    return base ?? (query.trim() ? filtered[0] : entries[0]);
  }, [activeId, entries, filtered, query]);

  useEffect(() => {
    setOpenKeyAssumption(false);
    setOpenPrimaryRisk(false);
    setOpenSizingApproach(false);
    setCopied(false);
  }, [activeId]);

  const visibleList = useMemo(() => {
    const q = query.trim();
    if (!q) return entries.slice(0, 6);
    return filtered;
  }, [entries, filtered, query]);

  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const navLinkStyle: React.CSSProperties = { textDecoration: 'none', color: 'inherit' };

  const backBtnStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    fontWeight: 800,
    fontSize: 13,
    opacity: 0.75,
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 999,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.6)',
    whiteSpace: 'nowrap',
  };

  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(255,255,255,0.7)',
    opacity: 0.85,
    whiteSpace: 'nowrap',
  };

  const primaryBtn: React.CSSProperties = {
    borderRadius: 12,
    border: 'none',
    padding: '10px 12px',
    background: '#0b0b0b',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(0,0,0,0.10)',
    whiteSpace: 'nowrap',
  };

  const secondaryBtn: React.CSSProperties = {
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.10)',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.6)',
    color: '#111',
    fontSize: 13,
    fontWeight: 650,
    cursor: 'pointer',
    opacity: 0.92,
    whiteSpace: 'nowrap',
  };

  const twoCol = !isMobile;

  const copyFramePrompt = async () => {
    if (!active?.usePrompt) return;
    try {
      await navigator.clipboard.writeText(active.usePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <Link href="/" style={backBtnStyle}>
            ← Back
          </Link>

          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.6,
              fontWeight: 450,
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Link href="/decision-review" style={navLinkStyle}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Notes
            </Link>
            <Link href="/decision-library" style={{ ...navLinkStyle, fontWeight: 700, opacity: 0.9 }}>
              Library
            </Link>

            {/* ✅ Added */}
            <Link href="/private-review" style={navLinkStyle}>
              Private Review
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1.0 }}>Decision Library</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            Reusable frames for heavy decisions.
          </p>

          <p
            style={{
              margin: '8px auto 0',
              fontSize: 14,
              opacity: 0.65,
              maxWidth: 820,
              lineHeight: 1.65,
            }}
          >
            No outcomes. No stories. No social mechanics. Just structure you can reuse when the decision feels heavy.
          </p>
        </section>

        {/* Search */}
        <section
          style={{
            marginTop: 18,
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
            border,
            borderRadius: 18,
            background: shellBg,
            padding: 14,
            boxShadow: softShadow,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search frames (RSUs, lockup, sizing, career)…"
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.15)',
              padding: '10px 12px',
              fontSize: 14,
              background: '#fff',
              outline: 'none',
            }}
          />
          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.62, lineHeight: 1.6 }}>
            Search reveals more. Pick a frame → copy prompt → run a review.
          </div>
        </section>

        {/* Layout */}
        <section
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: twoCol ? '1fr 1.6fr' : '1fr',
            gap: 14,
            alignItems: 'start',
          }}
        >
          {/* List */}
          <aside
            style={{
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 12,
              boxShadow: softShadow,
              maxWidth: twoCol ? undefined : 720,
              marginLeft: twoCol ? undefined : 'auto',
              marginRight: twoCol ? undefined : 'auto',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, opacity: 0.85 }}>
              Frames
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {visibleList.map((e) => {
                const isActive = e.id === active?.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setActiveId(e.id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: 14,
                      border: isActive
                        ? '1px solid rgba(0,0,0,0.20)'
                        : '1px solid rgba(0,0,0,0.10)',
                      background: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                      padding: '10px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 800, opacity: 0.92 }}>
                      {e.title}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.64, lineHeight: 1.35 }}>
                      {e.decision}
                    </div>

                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {e.tags.slice(0, 3).map((t) => (
                        <span key={t} style={pillStyle}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}

              {!query.trim() && (
                <div style={{ fontSize: 12.5, opacity: 0.58, padding: '6px 2px' }}>
                  Search to reveal more frames.
                </div>
              )}

              {query.trim() && filtered.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.65, padding: '10px 4px' }}>
                  No matches.
                </div>
              )}
            </div>
          </aside>

          {/* Detail */}
          <article
            style={{
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 16,
              boxShadow: softShadow,
              maxWidth: twoCol ? undefined : 720,
              marginLeft: twoCol ? undefined : 'auto',
              marginRight: twoCol ? undefined : 'auto',
            }}
          >
            {!active ? (
              <div style={{ padding: 8, fontSize: 13.5, opacity: 0.75 }}>No frame selected.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 260 }}>
                    <div style={{ fontSize: 12.5, opacity: 0.6 }}>Decision frame</div>
                    <h2 style={{ fontSize: 22, margin: '6px 0 0', letterSpacing: -0.4 }}>
                      {active.title}
                    </h2>

                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {active.tags.map((t) => (
                        <span key={t} style={pillStyle}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <button onClick={copyFramePrompt} style={primaryBtn}>
                      {copied ? 'Copied ✓' : 'Copy frame prompt'}
                    </button>
                    <Link
                      href="/#tool"
                      style={{
                        ...secondaryBtn,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Go to tool →
                    </Link>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.88 }}>Decision</div>
                  <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
                    {active.decision}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.88 }}>Context</div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, opacity: 0.88, lineHeight: 1.55 }}>
                    {active.context.map((c, idx) => (
                      <li key={idx} style={{ marginBottom: 4, fontSize: 13.5 }}>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <DisclosureCard
                    title="Key assumption"
                    body={active.keyAssumption}
                    isOpen={openKeyAssumption}
                    onToggle={() => setOpenKeyAssumption((v) => !v)}
                  />
                  <DisclosureCard
                    title="Primary risk"
                    body={active.primaryRisk}
                    isOpen={openPrimaryRisk}
                    onToggle={() => setOpenPrimaryRisk((v) => !v)}
                  />
                  <DisclosureCard
                    title="Sizing approach"
                    body={active.sizingApproach}
                    isOpen={openSizingApproach}
                    onToggle={() => setOpenSizingApproach((v) => !v)}
                  />
                </div>

                <details
                  style={{
                    marginTop: 14,
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.55)',
                    padding: 13,
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      listStyle: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 12.5, opacity: 0.72, fontWeight: 700 }}>
                      View frame prompt
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.55 }}>expand</div>
                  </summary>

                  <pre
                    style={{
                      marginTop: 10,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#fff',
                      padding: 14,
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {active.usePrompt}
                  </pre>
                </details>

                <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.62 }}>
                  Outcomes intentionally excluded. This is about decision quality, not hindsight.
                </div>
              </>
            )}
          </article>
        </section>

        <footer style={{ maxWidth: 980, margin: '18px auto 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.55 }}>
            Built for clarity under pressure. No feeds. No noise.
          </div>
        </footer>
      </main>
    </div>
  );
}

function DisclosureCard({
  title,
  body,
  isOpen,
  onToggle,
}: {
  title: string;
  body: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.55)',
        padding: 12,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
        }}
        aria-expanded={isOpen}
      >
        <div style={{ fontSize: 12.5, opacity: 0.72, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.55 }}>{isOpen ? 'collapse' : 'expand'}</div>
      </button>

      {isOpen ? (
        <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.5, opacity: 0.9 }}>
          {body}
        </div>
      ) : null}
    </div>
  );
}
