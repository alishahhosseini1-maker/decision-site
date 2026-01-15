'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export default function DecisionReviewPage() {
  const border = '1px solid rgba(0,0,0,0.08)';
  const shellBg = 'rgba(255,255,255,0.75)';
  const softShadow = '0 8px 24px rgba(0,0,0,0.04)';

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const backBtnStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    fontWeight: 600,
    fontSize: 13,
    opacity: 0.7,
    border: border,
    borderRadius: 999,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.7)',
    whiteSpace: 'nowrap',
  };

  const bodyText: React.CSSProperties = {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 1.8,
  };

  // Less ticker-y, more stakes-y
  const exampleDecision =
    'I’m considering concentrating a large portion of my liquid net worth into a single position, but I need to define downside, what has to be true, and what would change my mind before I commit.';

  const exampleContext = `Constraint: I cannot tolerate a forced sale
Downside tolerance: 25–35% drawdown
Correlation risk: income + holdings tied to the same company/sector
Horizon: 24–48 months
Goal: Commit only with explicit sizing + disconfirming triggers`;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 70px', padding: '0 20px' }}>
        {/* Top nav (Decision Review is primary, others demoted) */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <Link href="/" style={backBtnStyle}>
            ← Back to homepage
          </Link>

          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.55,
              fontWeight: 400,
              whiteSpace: 'nowrap',
              alignItems: 'center',
            }}
          >
            <Link href="/decision-review" style={{ ...navLinkStyle, opacity: 0.9, fontWeight: 600 }}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Notes
            </Link>
            <Link href="/decision-library" style={navLinkStyle}>
              Library
            </Link>
            <Link href="/private-review" style={navLinkStyle}>
              Private Review
            </Link>

            {!isMobile && (
              <>
                <span style={{ opacity: 0.35 }}>•</span>
                <span style={{ fontSize: 12, opacity: 0.45 }}>
                  Use when the cost of being wrong is real
                </span>
              </>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h1 style={{ fontSize: 48, margin: 0, letterSpacing: -0.8 }}>Decision Review</h1>

          {/* ✅ Updated */}
          <p style={{ marginTop: 10, fontSize: 17, opacity: 0.85 }}>
            A structured pause before irreversible commitment.
          </p>

          <p style={{ marginTop: 6, fontSize: 14, opacity: 0.6 }}>
            Clarify → assumptions → disconfirming evidence → failure modes → commitment criteria.
          </p>

          <p style={{ marginTop: 10, fontSize: 13, opacity: 0.55 }}>
            Not advice. No recommendations. This exists to make your assumptions explicit.
          </p>
        </section>

        {/* Sections */}
        <section
          style={{
            marginTop: 28,
            maxWidth: 760,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <DetailsSection title="When to run one (rule-of-thumb)">
            <ul style={{ paddingLeft: 18, ...bodyText }}>
              <li>The decision is costly, heavy, or hard to reverse.</li>
              <li>Being wrong would change your life, finances, or reputation.</li>
              <li>You’re relying on assumptions you haven’t written down.</li>
              <li>You feel urgency, narrative pull, or social pressure.</li>
            </ul>
          </DetailsSection>

          <DetailsSection title="What it forces (the checklist)">
            <ol style={{ paddingLeft: 18, ...bodyText }}>
              <li>Rewrite the decision in one sentence.</li>
              <li>State what must be true (assumptions) for it to be a good move.</li>
              <li>Define disconfirming evidence (what would change your mind).</li>
              <li>Rank failure modes (how you could be wrong).</li>
              <li>Set commitment criteria (what “proceed” means).</li>
            </ol>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.55 }}>
              The goal is clarity, not speed.
            </div>
          </DetailsSection>

          <DetailsSection title="A realistic example">
            <div style={{ ...bodyText, fontWeight: 500 }}>{exampleDecision}</div>

            <pre
              style={{
                marginTop: 12,
                borderRadius: 12,
                border,
                background: '#fff',
                padding: 14,
                fontSize: 13,
                lineHeight: 1.6,
                opacity: 0.9,
                whiteSpace: 'pre-wrap',
              }}
            >
              {exampleContext}
            </pre>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.55 }}>
              Notice: no outcomes, no “alpha,” no story. Only the structure.
            </div>
          </DetailsSection>

          <DetailsSection title="What it is not">
            <ul style={{ paddingLeft: 18, ...bodyText }}>
              <li>Stock picks or trade signals.</li>
              <li>Predictions or forecasts.</li>
              <li>Post-hoc justification.</li>
              <li>A daily ritual to feel productive.</li>
            </ul>
          </DetailsSection>

          {/* Model 2 fork: end with tension + next step */}
          <div
            style={{
              marginTop: 18,
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 18,
              boxShadow: softShadow,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>Before you act</div>

            {/* ✅ Tightened per roundtable */}
            <p style={{ marginTop: 8, ...bodyText }}>
              If this decision carries real stakes, do not act until assumptions are explicit and
              disconfirming evidence is named.
            </p>

            <p style={{ marginTop: 8, ...bodyText }}>
              A second set of eyes helps surface blind spots you can't see alone.
            </p>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.12)',
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111',
                  background: 'rgba(255,255,255,0.8)',
                  opacity: 0.9,
                  whiteSpace: 'nowrap',
                }}
              >
                {/* ✅ Renamed */}
                Pause and revisit
              </Link>

              <Link
                href="/private-review"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  borderRadius: 12,
                  border: 'none',
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#fff',
                  background: '#0b0b0b',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.10)',
                  whiteSpace: 'nowrap',
                }}
              >
                Pressure-test with a human →
              </Link>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.5 }}>
              Outcomes intentionally excluded. This is about decision quality, not hindsight.
            </div>
          </div>

          {/* Keep this, but make it clearly post-commitment */}
          <div
            style={{
              marginTop: 12,
              border,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.70)',
              padding: 18,
              boxShadow: softShadow,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>After you commit</div>

            <p style={{ marginTop: 8, ...bodyText }}>
              Once you act, write a Decision Note to preserve judgment at the moment of commitment —
              outcomes excluded.
            </p>

            <Link
              href="/decision-notes"
              style={{
                marginTop: 10,
                display: 'inline-block',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                color: '#111',
              }}
            >
              Go to Notes →
            </Link>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
              Notes are the record. Drafts are ephemeral.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.5 }}>Clarity before commitment. Nothing more.</div>
        </footer>
      </main>
    </div>
  );
}

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details
      style={{
        marginBottom: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.8)',
        padding: 16,
        boxShadow: '0 6px 18px rgba(0,0,0,0.03)',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13.5,
          fontWeight: 700,
          opacity: 0.88,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, opacity: 0.45 }}>expand</span>
      </summary>

      <div style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}
