'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  // Keep this tight and curated. No feeds. No “latest”. No social mechanics.
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
      primaryRisk:
        'Correlated drawdown (portfolio + career) forces a bad sell at the wrong time.',
      sizingApproach:
        'Incremental adds only; pre-commit a max exposure cap and a drawdown-based pause rule.',
      tags: ['RSUs', 'Concentration', 'Correlation'],
    },
    {
      id: 'dl-002',
      title: 'Private investment with long lockup',
      decision:
        'Commit capital to an alternative/private investment with multi-year illiquidity.',
      context: [
        'Liquidity needs uncertain (taxes, life events)',
        'No visibility into interim marks',
        'Decision is hard to reverse',
      ],
      keyAssumption:
        'Illiquidity is compensated with a true structural edge (not just a story).',
      primaryRisk:
        'Liquidity mismatch forces you to fund obligations elsewhere at the worst time.',
      sizingApproach:
        'Size as if the capital is gone; commit only after a “liquidity stress” pass.',
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
      keyAssumption:
        'You can sustain the execution cadence long enough to reach a proof point.',
      primaryRisk:
        'Execution gap: momentum dies before the first credible milestone.',
      sizingApproach:
        'Stage the leap: secure a proof milestone before burning the bridge where possible.',
      tags: ['Career', 'Risk', 'Reputation'],
    },
    {
      id: 'dl-004',
      title: 'Buying a home vs. staying liquid',
      decision:
        'Buy a home now versus staying liquid and waiting for better terms.',
      context: [
        'High impact on flexibility and monthly burn',
        'Market uncertainty; rate sensitivity',
        'Non-financial utility matters',
      ],
      keyAssumption:
        'The home’s utility and stability are worth the flexibility you give up.',
      primaryRisk:
        'You lock in a burn rate that narrows future options and raises stress.',
      sizingApproach:
        'Set a “sleep well” payment threshold; if above it, wait or reduce scope.',
      tags: ['Personal finance', 'Liquidity', 'Lifestyle'],
    },
  ];

  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);

  const active = useMemo(
    () => entries.find((e) => e.id === activeId) ?? entries[0],
    [entries, activeId]
  );

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

  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
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

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Top nav (matches Home) */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.62,
              fontWeight: 400,
            }}
          >
            <Link href="/decision-review" style={navLinkStyle}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Decision Notes
            </Link>
            <Link href="/walkthrough" style={navLinkStyle}>
              Walkthrough
            </Link>
            <Link href="/decision-library" style={navLinkStyle}>
              Decision Library
            </Link>
          </nav>
        </header>

        {/* Header */}
        <section style={{ marginTop: 44 }}>
          <h1 style={{ fontSize: 36, margin: 0, letterSpacing: -0.6 }}>
            Decision Library
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, opacity: 0.72, maxWidth: 760 }}>
            A small collection of anonymized decision frames. No outcomes. No stories. No social
            mechanics. Just the structure that makes real decisions clearer.
          </p>
        </section>

        {/* Search */}
        <section
          style={{
            marginTop: 16,
            border,
            borderRadius: 14,
            background: shellBg,
            padding: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions (e.g., RSUs, lockup, sizing, career)…"
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
          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.62 }}>
            Keep it small. If this grows into a feed, it loses the point.
          </div>
        </section>

        {/* Two-column layout */}
        <section
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1.6fr',
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
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 10, opacity: 0.85 }}>
              Curated examples
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map((e) => {
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
                    <div style={{ fontSize: 13.5, fontWeight: 650, opacity: 0.92 }}>
                      {e.title}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.64, lineHeight: 1.35 }}>
                      {e.decision}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      {e.tags.slice(0, 3).map((t) => (
                        <span key={t} style={pillStyle}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.65, padding: '10px 4px' }}>
                  No matches. Keep the library small and focused.
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
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12.5, opacity: 0.6 }}>Decision frame</div>
                <h2 style={{ fontSize: 22, margin: '6px 0 0', letterSpacing: -0.4 }}>
                  {active?.title}
                </h2>
              </div>
              <Link
                href="/decision-review"
                style={{
                  ...navLinkStyle,
                  alignSelf: 'flex-start',
                  fontSize: 13,
                  opacity: 0.75,
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 999,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.6)',
                }}
              >
                Use this structure →
              </Link>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 650, opacity: 0.88 }}>Decision</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
                {active?.decision}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 650, opacity: 0.88 }}>Context</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, opacity: 0.88, lineHeight: 1.55 }}>
                {(active?.context ?? []).map((c, idx) => (
                  <li key={idx} style={{ marginBottom: 4, fontSize: 13.5 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                marginTop: 14,
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 10,
              }}
            >
              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.55)',
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12.5, opacity: 0.62 }}>Key assumption</div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5, opacity: 0.9 }}>
                  {active?.keyAssumption}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.55)',
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12.5, opacity: 0.62 }}>Primary risk</div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5, opacity: 0.9 }}>
                  {active?.primaryRisk}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.55)',
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12.5, opacity: 0.62 }}>Sizing approach</div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.5, opacity: 0.9 }}>
                  {active?.sizingApproach}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(active?.tags ?? []).map((t) => (
                <span key={t} style={pillStyle}>
                  {t}
                </span>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.62 }}>
              Note: outcomes are intentionally excluded. This library is about decision quality, not
              hindsight.
            </div>
          </article>
        </section>

        {/* Footer (quiet) */}
        <footer style={{ maxWidth: 980, margin: '18px auto 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.55 }}>
            Built for clarity under pressure. No feeds. No noise.
          </div>
        </footer>
      </main>
    </div>
  );
}
