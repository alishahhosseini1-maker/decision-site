'use client';

import Link from 'next/link';
import { useMemo } from 'react';

export default function WalkthroughPage() {
  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const cardStyle: React.CSSProperties = {
    border,
    borderRadius: 20,
    background: shellBg,
    padding: 22,
    boxShadow: softShadow,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    opacity: 0.9,
    letterSpacing: 0.2,
    marginBottom: 10,
  };

  const bodyText: React.CSSProperties = {
    fontSize: 14.5,
    opacity: 0.78,
    lineHeight: 1.85,
  };

  const bulletList: React.CSSProperties = {
    margin: '10px 0 0',
    paddingLeft: 18,
    lineHeight: 1.9,
    opacity: 0.82,
    fontSize: 14.5,
  };

  const divider: React.CSSProperties = {
    height: 1,
    background: 'rgba(0,0,0,0.06)',
    margin: '18px 0',
  };

  const pill: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    fontWeight: 700,
    opacity: 0.88,
    whiteSpace: 'nowrap',
  };

  const exampleDecision =
    "I’m considering increasing my NVIDIA exposure by ~5% of liquid net worth, but I’m already concentrated via RSUs and I don’t want a single-name drawdown to force a bad sale.";

  const exampleContext =
    `Role: Senior engineer. Comp includes meaningful RSUs.
Existing exposure: ~18% of liquid net worth is already tied to NVDA (including RSUs).
Constraint: I can tolerate a 30% drawdown in the position without panic-selling.
Horizon: 24–48 months.
Goal: Increase exposure only if sizing + triggers are clearly defined.`;

  // Optional: build a “ready to paste” block for the homepage tool.
  const pasteBlock = useMemo(() => {
    return `DECISION:\n${exampleDecision}\n\nCONTEXT (optional):\n${exampleContext}`;
  }, []);

  const copyExampleToClipboard = async () => {
    await navigator.clipboard.writeText(pasteBlock);
    alert('Copied example decision + context. Paste into the homepage tool.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 70px', padding: '0 20px' }}>
        {/* Top nav */}
        <header style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
          <nav style={{ display: 'flex', gap: 18, fontSize: 13, opacity: 0.62, fontWeight: 400 }}>
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

        {/* Hero */}
        <section style={{ marginTop: 66, maxWidth: 860 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span style={pill}>First-use</span>
            <span style={pill}>One example</span>
            <span style={pill}>No theory</span>
          </div>

          <h1 style={{ fontSize: 52, margin: '14px 0 0', letterSpacing: -1.0 }}>
            Walkthrough
          </h1>

          <p style={{ margin: '14px 0 0', ...bodyText, fontSize: 15 }}>
            This page exists to remove first-use friction.
            You’ll see one realistic decision, how to fill the tool, and how to preserve judgment.
          </p>

          <p style={{ margin: '10px 0 0', fontSize: 13.5, opacity: 0.62, lineHeight: 1.7 }}>
            If you already think in assumptions, risks, and sizing, you can skip this and go straight to the tool.
          </p>

          <div style={{ marginTop: 14 }}>
            <button
              onClick={copyExampleToClipboard}
              style={{
                borderRadius: 14,
                border: 'none',
                padding: '12px 14px',
                background: '#0b0b0b',
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
              }}
            >
              Copy example into tool
            </button>

            <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62 }}>
              Paste into the Decision Review tool on the homepage.
            </div>
          </div>
        </section>

        {/* Flow cards */}
        <section style={{ marginTop: 18, maxWidth: 860, display: 'grid', gap: 14 }}>
          {/* Card: Example */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Example decision</div>
            <div style={{ ...bodyText, fontWeight: 700, opacity: 0.86 }}>
              {exampleDecision}
            </div>

            <div style={divider} />

            <div style={sectionTitle}>Example context</div>
            <pre
              style={{
                margin: 0,
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.10)',
                background: 'rgba(255,255,255,0.75)',
                padding: 14,
                fontSize: 13.2,
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                opacity: 0.9,
              }}
            >
              {exampleContext}
            </pre>
          </div>

          {/* Card: How to fill it */}
          <div style={cardStyle}>
            <div style={sectionTitle}>How to fill the tool (30 seconds)</div>
            <ul style={bulletList}>
              <li>
                <span style={{ fontWeight: 800 }}>Decision:</span> one sentence. Action + magnitude + constraint.
              </li>
              <li>
                <span style={{ fontWeight: 800 }}>Context (optional):</span> only what changes sizing, timing, or risk.
              </li>
              <li>
                <span style={{ fontWeight: 800 }}>Horizon:</span> set it explicitly (e.g., 6–12 months vs 24–48 months).
              </li>
              <li>
                <span style={{ fontWeight: 800 }}>Then run the review:</span> you’re forcing assumptions + disconfirming evidence.
              </li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>What to avoid</div>
            <ul style={bulletList}>
              <li>“Tell me what to buy” (wrong tool).</li>
              <li>Market narration and hot takes.</li>
              <li>Vague constraints like “I can handle volatility.”</li>
              <li>Adding details that don’t change conviction, sizing, timing, or risk.</li>
            </ul>
          </div>

          {/* Card: Save to notes */}
          <div style={cardStyle}>
            <div style={sectionTitle}>After you commit (Decision Notes)</div>
            <div style={bodyText}>
              If the decision matters, preserve judgment at the moment of commitment.
              Decision Notes are short records for your future self — they separate luck from skill.
            </div>

            <div style={divider} />

            <div style={sectionTitle}>What a Decision Note contains</div>
            <ul style={bulletList}>
              <li>The decision (one sentence)</li>
              <li>The key assumptions</li>
              <li>What would change your mind (disconfirming evidence)</li>
              <li>Conviction at the time (Low / Medium / High)</li>
            </ul>

            <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.62 }}>
              Outcomes intentionally excluded. Revisit after new information arrives — not after price moves.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 18, maxWidth: 860 }}>
          <div style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.7 }}>
            The goal is not prediction. The goal is decision quality under uncertainty.
          </div>
        </footer>
      </main>
    </div>
  );
}
