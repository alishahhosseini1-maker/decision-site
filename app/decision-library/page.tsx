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
        'Comfortable with volatility; avoiding permanent impairment',
        'Career risk correlated with stock drawdown',
      ],
      keyAssumption:
        'Volatility is acceptable and does not imply a permanent impairment to fundamentals over the horizon.',
      primaryRisk: 'Correlated drawdown (portfolio + career) forces a bad sell at the wrong time.',
      sizingApproach:
        'Incremental adds only; pre-commit a max exposure cap and a drawdown-based pause rule.',
      tags: ['RSUs', 'Concentration', 'Correlation'],
    },
    {
      id: 'dl-002',
      title: 'Private investment with long lockup',
      decision: 'Commit capital to an alternative/private investment with multi-year illiquidity.',
      context: ['Liquidity needs uncertain (taxes, life events)', 'No visibility into interim marks', 'Decision is hard to reverse'],
      keyAssumption: 'Illiquidity is compensated with a true structural edge (not just a story).',
      primaryRisk: 'Liquidity mismatch forces you to fund obligations elsewhere at the worst time.',
      sizingApproach: 'Size as if the capital is gone; commit only after a “liquidity stress” pass.',
      tags: ['Alternatives', 'Illiquidity', 'Lockup'],
    },
    {
      id: 'dl-003',
      title: 'Leaving a role for a higher-upside opportunity',
      decision:
        'Leave a stable role for a higher-upside opportunity with ambiguous execution risk.',
      context: [
        'Opportunity cost includes reputation and time',
        'Path dependency: the decision compounds quickly',
        'Downside includes months of “rebuild” time',
      ],
      keyAssumption: 'You can sustain the execution cadence long enough to reach a proof point.',
      primaryRisk: 'Execution gap: momentum dies before the first credible milestone.',
      sizingApproach:
        'Stage the leap: secure a proof milestone before burning the bridge where possible.',
      tags: ['Career', 'Risk', 'Reputation'],
    },
    {
      id: 'dl-004',
      title: 'Buying a home vs. staying liquid',
      decision: 'Buy a home now versus staying liquid and waiting for better terms.',
      context: ['High impact on flexibility and monthly burn', 'Market uncertainty; rate sensitivity', 'Non-financial utility matters'],
      keyAssumption: 'The home’s utility and stability are worth the flexibility you give up.',
      primaryRisk: 'You lock in a burn rate that narrows future options and raises stress.',
      sizingApproach: 'Set a “sleep well” payment threshold; if above it, wait or reduce scope.',
      tags: ['Personal finance', 'Liquidity', 'Lifestyle'],
    },

    // More frames (search-revealed)
    {
      id: 'dl-005',
      title: 'Sell vs. hold after a big run-up',
      decision:
        'Decide whether to trim a position after a large gain without anchoring to price or regret.',
      context: [
        'Position is now outsized vs original sizing intent',
        'Tax impact and concentration both matter',
        'Opportunity cost: what would you buy instead?',
      ],
      keyAssumption: 'Your edge is still present; the thesis remains true at the new price and size.',
      primaryRisk: 'You confuse “up a lot” with “overvalued” or “safe.”',
      sizingApproach:
        'Trim to a pre-committed max exposure band; keep a core only if thesis triggers still intact.',
      tags: ['Concentration', 'Taxes', 'Regret'],
    },
    {
      id: 'dl-006',
      title: 'Start a position vs. wait for a better entry',
      decision:
        'Start a position now versus waiting for a better price while avoiding paralysis.',
      context: ['Conviction exists but uncertainty is non-trivial', 'Fear of missing out is present', 'Averaging plan is possible'],
      keyAssumption: 'Time-in-position matters more than perfect entry if sizing is disciplined.',
      primaryRisk: 'You delay indefinitely and then chase at a worse level.',
      sizingApproach: 'Starter position + scale plan: add only on defined conditions, not emotions.',
      tags: ['Timing', 'Scaling', 'Discipline'],
    },
    {
      id: 'dl-007',
      title: 'Options vs. equity for expressing a view',
      decision:
        'Choose between options (defined risk) and equity (open-ended horizon) for the same thesis.',
      context: ['Need to define max loss and time horizon', 'Volatility/IV can dominate outcomes', 'Liquidity and exit mechanics differ'],
      keyAssumption: 'Your thesis has a timeframe; the payoff profile matches what you actually believe.',
      primaryRisk: 'You buy time decay and call it conviction.',
      sizingApproach: 'Size options by max loss; keep loss tolerable without changing life behavior.',
      tags: ['Options', 'Convexity', 'Time'],
    },
    {
      id: 'dl-008',
      title: 'Concentrated bet vs. diversified approach',
      decision:
        'Decide whether to concentrate into a top idea or spread risk across multiple exposures.',
      context: ['Portfolio already has correlated exposures', 'Career + portfolio risk may overlap', 'Downside tolerance is finite'],
      keyAssumption: 'You can survive being wrong without forced selling or identity damage.',
      primaryRisk: 'Correlation spikes when you need diversification most.',
      sizingApproach: 'Cap any single theme + single name; require explicit downside scenario plan.',
      tags: ['Diversification', 'Correlation', 'Risk'],
    },
    {
      id: 'dl-009',
      title: 'Emergency fund sizing (cash vs. invested)',
      decision:
        'Choose how much cash to hold versus investing more while maintaining resilience.',
      context: ['Income stability is uncertain', 'Large planned expenses possible', 'Psychological “sleep well” threshold matters'],
      keyAssumption: 'The marginal return of investing cash exceeds the resilience cost.',
      primaryRisk: 'You create fragility and are forced to sell during stress.',
      sizingApproach: 'Set a minimum runway; invest only above the runway and only if drawdown plan exists.',
      tags: ['Liquidity', 'Resilience', 'Cash'],
    },
    {
      id: 'dl-010',
      title: 'Join a startup vs. stay at big tech',
      decision:
        'Choose a high-variance career move with unclear payoff and reputation risk.',
      context: ['Comp structure changes (equity vs cash)', 'Execution risk is real', 'Time cost is irreversible'],
      keyAssumption: 'The team + market + your role can reach a credible milestone in a defined time.',
      primaryRisk: 'You trade stability for a story without a path to proof.',
      sizingApproach: 'Define a proof milestone + timeline; commit only if the downside is survivable.',
      tags: ['Career', 'Variance', 'Equity'],
    },
    {
      id: 'dl-011',
      title: 'Relocate for quality of life vs. career leverage',
      decision:
        'Move locations to optimize lifestyle without accidentally sacrificing long-term leverage.',
      context: ['Family and lifestyle utility is meaningful', 'Career growth might slow or change trajectory', 'Cost-of-living and taxes matter'],
      keyAssumption: 'The move improves life meaningfully and doesn’t destroy your best future options.',
      primaryRisk: 'You underestimate second-order career and network effects.',
      sizingApproach: 'Run “reversibility” test: ensure you can undo the move without major loss if wrong.',
      tags: ['Lifestyle', 'Reversibility', 'Career'],
    },
    {
      id: 'dl-012',
      title: 'Take profits to pay taxes vs. keep exposure',
      decision:
        'Sell assets to cover upcoming taxes while trying not to damage the core thesis.',
      context: ['Tax bill is known or highly likely', 'Liquidity sources vary in cost', 'Selling may change future upside'],
      keyAssumption: 'Reducing exposure now is cheaper than risking a forced sale later.',
      primaryRisk: 'You keep exposure and end up selling at the worst time due to obligation.',
      sizingApproach: 'Ring-fence the tax bill early; treat it as non-negotiable liability.',
      tags: ['Taxes', 'Liquidity', 'Planning'],
    },
    {
      id: 'dl-013',
      title: 'Over-concentration in a single sector/theme',
      decision:
        'Reduce thematic exposure without turning risk management into performance chasing.',
      context: ['Holdings share common drivers', 'Drawdowns tend to cluster', 'You want to keep the best idea, not the whole basket'],
      keyAssumption: 'Your future returns do not require being maximally exposed to the same driver.',
      primaryRisk: 'A single macro shock hits everything you own at once.',
      sizingApproach: 'Set driver-level caps (not just ticker caps); rotate only with explicit thesis changes.',
      tags: ['Theme', 'Correlation', 'Risk'],
    },
    {
      id: 'dl-014',
      title: 'Spend vs. invest decision (lifestyle upgrade)',
      decision:
        'Make a lifestyle upgrade without undermining future optionality and freedom.',
      context: ['Upgrade is recurring (burn rate) vs one-time', 'Income stability uncertain', 'Utility is real but hard to quantify'],
      keyAssumption: 'The utility gain is durable and worth the opportunity cost.',
      primaryRisk: 'You lock in a burn rate that narrows future choices.',
      sizingApproach: 'Define a “never cross” savings rate; only upgrade if you remain above it.',
      tags: ['Lifestyle', 'Burn rate', 'Opportunity cost'],
    },
    {
      id: 'dl-015',
      title: 'Private deal: invest now vs. wait for better terms',
      decision:
        'Decide whether to commit to a private deal now or wait for clearer information/terms.',
      context: ['Deal access may not repeat', 'Information is incomplete', 'Lockup and governance matter'],
      keyAssumption: 'Your expected edge is structural (terms, access, or insight), not FOMO.',
      primaryRisk: 'You accept bad terms because access feels scarce.',
      sizingApproach: 'Pre-commit term thresholds; walk away if not met (even if the deal is “hot”).',
      tags: ['Alternatives', 'Terms', 'Discipline'],
    },
  ];

  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
  const [isMobile, setIsMobile] = useState(false);

  // Progressive reveal controls (default: collapsed)
  const [openKeyAssumption, setOpenKeyAssumption] = useState(false);
  const [openPrimaryRisk, setOpenPrimaryRisk] = useState(false);
  const [openSizingApproach, setOpenSizingApproach] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const active = useMemo(() => entries.find((e) => e.id === activeId) ?? entries[0], [activeId, entries]);

  // When switching frames, keep things calm: collapse the deeper sections again
  useEffect(() => {
    setOpenKeyAssumption(false);
    setOpenPrimaryRisk(false);
    setOpenSizingApproach(false);
  }, [activeId]);

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

  const visibleList = useMemo(() => {
    const q = query.trim();
    if (!q) return entries.slice(0, 4);
    return filtered;
  }, [entries, filtered, query]);

  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const navLinkStyle: React.CSSProperties = { textDecoration: 'none', color: 'inherit' };

  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(255,255,255,0.7)',
    opacity: 0.85,
    whiteSpace: 'nowrap',
  };

  const twoCol = !isMobile;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Top nav (cohesive) */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <Link
            href="/"
            style={{
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
            }}
          >
            ← Back to homepage
          </Link>

          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.62,
              fontWeight: 400,
              alignItems: 'center',
            }}
          >
            <Link href="/decision-review" style={navLinkStyle}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Decision Notes
            </Link>
            <Link href="/decision-library" style={navLinkStyle}>
              Decision Library
            </Link>
          </nav>
        </header>

        {/* Centered hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1.0 }}>Decision Library</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            A small set of anonymized decision frames.
          </p>

          <p
            style={{
              margin: '8px 0 0',
              fontSize: 14,
              opacity: 0.65,
              maxWidth: 820,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            No outcomes. No stories. No social mechanics. Just structure you can reuse when the decision
            feels heavy.
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
            Search reveals more. 
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
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, opacity: 0.85 }}>
              Decision frames
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {visibleList.map((e) => {
                const isActive = e.id === activeId;
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
                    <div style={{ fontSize: 13.5, fontWeight: 700, opacity: 0.92 }}>{e.title}</div>
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
                  Search to reveal more.
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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 260 }}>
                <div style={{ fontSize: 12.5, opacity: 0.6 }}>Decision frame</div>
                <h2 style={{ fontSize: 22, margin: '6px 0 0', letterSpacing: -0.4 }}>
                  {active?.title}
                </h2>
              </div>

              {/* ✅ Single primary action (removed the extra CTA) */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Link
                  href="/#tool"
                  style={{
                    ...navLinkStyle,
                    alignSelf: 'flex-start',
                    fontSize: 13,
                    border: 'none',
                    borderRadius: 999,
                    padding: '8px 12px',
                    background: '#0b0b0b',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 750,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                  }}
                >
                  Use this structure →
                </Link>
              </div>
            </div>

            {/* Keep the “at-a-glance” sections visible */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.88 }}>Decision</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
                {active?.decision}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.88 }}>Context</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, opacity: 0.88, lineHeight: 1.55 }}>
                {(active?.context ?? []).map((c, idx) => (
                  <li key={idx} style={{ marginBottom: 4, fontSize: 13.5 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* ✅ Progressive reveal (reduces density) */}
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <DisclosureCard
                title="Key assumption"
                body={active?.keyAssumption ?? ''}
                isOpen={openKeyAssumption}
                onToggle={() => setOpenKeyAssumption((v) => !v)}
              />
              <DisclosureCard
                title="Primary risk"
                body={active?.primaryRisk ?? ''}
                isOpen={openPrimaryRisk}
                onToggle={() => setOpenPrimaryRisk((v) => !v)}
              />
              <DisclosureCard
                title="Sizing approach"
                body={active?.sizingApproach ?? ''}
                isOpen={openSizingApproach}
                onToggle={() => setOpenSizingApproach((v) => !v)}
              />
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(active?.tags ?? []).map((t) => (
                <span key={t} style={pillStyle}>
                  {t}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.62 }}>
              Outcomes intentionally excluded. This is about decision quality, not hindsight.
            </div>
          </article>
        </section>

        {/* Footer */}
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
        <div style={{ fontSize: 12.5, opacity: 0.72, fontWeight: 650 }}>{title}</div>
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
