'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export default function DecisionReviewPage() {
  // Visual system (match homepage)
  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navLinkStyle: React.CSSProperties = { textDecoration: 'none', color: 'inherit' };

  // Back-to-homepage pill
  const backBtnStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    fontWeight: 800,
    fontSize: 13,
    opacity: 0.78,
    border,
    borderRadius: 999,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.6)',
    whiteSpace: 'nowrap',
  };

  const cardStyle: React.CSSProperties = {
    border,
    borderRadius: 18,
    background: shellBg,
    padding: 18,
    boxShadow: softShadow,
    textAlign: 'left',
  };

  const bodyText: React.CSSProperties = {
    fontSize: 14.5,
    opacity: 0.78,
    lineHeight: 1.85,
  };

  const noteStyle: React.CSSProperties = {
    marginTop: 10,
    fontSize: 12.5,
    opacity: 0.62,
    lineHeight: 1.7,
  };

  const divider: React.CSSProperties = {
    height: 1,
    background: 'rgba(0,0,0,0.06)',
    margin: '16px 0',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    opacity: 0.85,
    letterSpacing: 0.2,
    marginBottom: 10,
  };

  const linkSoft: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 650,
    opacity: 0.78,
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  };

  // Example (boring + specific)
  const exampleDecision =
    "I’m considering increasing my NVIDIA exposure by ~5% of liquid net worth, but I’m already concentrated via RSUs and I don’t want a single-name drawdown to force a bad sale.";

  const exampleContext = `Role: Senior engineer. Comp includes meaningful RSUs.
Existing exposure: ~18% of liquid net worth is already tied to NVDA (including RSUs).
Constraint: I can tolerate a 30% drawdown in the position without panic-selling.
Horizon: 24–48 months.
Goal: Increase exposure only if sizing + triggers are clearly defined.`;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 70px', padding: '0 20px' }}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            paddingTop: 6,
            flexWrap: 'nowrap',
          }}
        >
          <Link href="/" style={backBtnStyle}>
            ← Back to homepage
          </Link>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontSize: 13,
              opacity: 0.62,
              fontWeight: 450,
              whiteSpace: 'nowrap',
              flexWrap: 'nowrap',
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

            {!isMobile && (
              <>
                <span style={{ opacity: 0.5, marginLeft: 6 }}>•</span>
                <span style={{ fontSize: 12, opacity: 0.55 }}>Quick primer → then act</span>
              </>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1.0 }}>Decision Review</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            A structured pause before you commit.
          </p>

          <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.65 }}>
            Assumptions → disconfirming evidence → risks → sizing → triggers.
          </p>
        </section>

        {/* Main content */}
        <section style={{ marginTop: 18, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
          {/* ✅ Removed the “Use a Decision Review before acting…” info box */}

          {/* Collapsible sections (closed by default) */}
          <DetailsSection title="When to run one (rule-of-thumb)">
            <ul
              style={{
                margin: '8px 0 0',
                paddingLeft: 18,
                lineHeight: 1.9,
                opacity: 0.8,
                fontSize: 14.25,
              }}
            >
              <li>The decision is meaningfully irreversible (or costly to reverse).</li>
              <li>Being wrong would matter (money, reputation, stress).</li>
              <li>You’re relying on assumptions you can’t yet verify.</li>
              <li>You feel urgency, pressure, or narrative pull.</li>
            </ul>

            <div style={divider} />

            <div style={{ fontSize: 14.25, fontWeight: 750, opacity: 0.84 }}>
              Rule: run a Decision Review only when being wrong would matter.
            </div>
          </DetailsSection>

          <div style={{ height: 10 }} />

          <DetailsSection title="What it forces (the checklist)">
            <ol
              style={{
                margin: '8px 0 0',
                paddingLeft: 18,
                lineHeight: 1.9,
                opacity: 0.8,
                fontSize: 14.25,
              }}
            >
              <li>Clarify the decision (rewrite it in one sentence).</li>
              <li>What has to be true? (top assumptions)</li>
              <li>What would change your mind? (disconfirming evidence)</li>
              <li>Key risks / failure modes (ranked)</li>
              <li>Sizing + triggers (specific, not vibes)</li>
            </ol>

            <div style={divider} />

            <div style={bodyText}>
              Engineer translation: it’s a <strong>commit message for a decision</strong>.
            </div>
          </DetailsSection>

          <div style={{ height: 10 }} />

          <DetailsSection title="A realistic example">
            <div style={{ ...bodyText, fontWeight: 750, opacity: 0.86 }}>{exampleDecision}</div>

            <div style={divider} />

            <div style={sectionLabel}>Context (only what changes sizing, timing, or risk)</div>

            <pre
              style={{
                margin: 0,
                borderRadius: 14,
                border,
                background: '#fff',
                padding: 14,
                fontSize: 13.2,
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                opacity: 0.92,
              }}
            >
              {exampleContext}
            </pre>

            <div style={noteStyle}>Keep it boring. Specific beats clever.</div>
          </DetailsSection>

          <div style={{ height: 10 }} />

          <DetailsSection title="What it is not">
            <ul
              style={{
                margin: '8px 0 0',
                paddingLeft: 18,
                lineHeight: 1.9,
                opacity: 0.8,
                fontSize: 14.25,
              }}
            >
              <li>Stock picks, predictions, or market commentary.</li>
              <li>A long memo.</li>
              <li>Outcome-driven hindsight.</li>
              <li>A daily ritual you do for everything.</li>
            </ul>
          </DetailsSection>

          <div style={{ height: 14 }} />

          {/* After commit */}
          <div style={cardStyle}>
            <div style={sectionLabel}>After you commit</div>

            <div style={bodyText}>
              Once you act, use a Decision Note to preserve judgment at the moment of commitment — outcomes excluded.
            </div>

            <div style={{ marginTop: 12 }}>
              <Link href="/decision-notes" style={linkSoft as any}>
                Go to Decision Notes →
              </Link>
            </div>

            <div style={noteStyle}>Notes are the record. Drafts are ephemeral.</div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 18, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.7 }}>Clarity before commitment. Nothing more.</div>
        </footer>
      </main>
    </div>
  );
}

function DetailsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  // ✅ Smaller + less emphasized (per your screenshot feedback)
  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    listStyle: 'none',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13.5,
    fontWeight: 650,
    opacity: 0.88,
    padding: '2px 0',
  };

  return (
    <details
      style={{
        border,
        borderRadius: 18,
        background: shellBg,
        padding: 16,
        boxShadow: softShadow,
      }}
    >
      <summary style={summaryStyle}>
        <span>{title}</span>
        <span style={{ opacity: 0.45, fontSize: 12, fontWeight: 600 }}>expand</span>
      </summary>

      <div style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}
