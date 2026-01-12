'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

export default function DecisionReviewPage() {
  // Match homepage look + behavior
  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const [isMobile, setIsMobile] = useState(false);

  const STORAGE = {
    noteDraft: 'dl:note_draft_v1',
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cardStyle: React.CSSProperties = {
    border,
    borderRadius: 18, // match homepage card radius
    background: shellBg,
    padding: 18, // match homepage padding
    boxShadow: softShadow,
    textAlign: 'left',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
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

  const buttonPrimary: React.CSSProperties = {
    borderRadius: 14,
    border: 'none',
    padding: '12px 14px',
    background: '#0b0b0b',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  };

  const buttonSecondary: React.CSSProperties = {
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.10)',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.6)',
    color: '#111',
    fontSize: 13.5,
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    opacity: 0.9,
    whiteSpace: 'nowrap',
  };

  const noteStyle: React.CSSProperties = {
    marginTop: 10,
    fontSize: 12.5,
    opacity: 0.62,
    lineHeight: 1.7,
  };

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  // ✅ ADDED: Back-to-homepage pill button (same style you used on Notes)
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

  // Example (keep boring + specific)
  const exampleDecision =
    "I’m considering increasing my NVIDIA exposure by ~5% of liquid net worth, but I’m already concentrated via RSUs and I don’t want a single-name drawdown to force a bad sale.";

  const exampleContext = `Role: Senior engineer. Comp includes meaningful RSUs.
Existing exposure: ~18% of liquid net worth is already tied to NVDA (including RSUs).
Constraint: I can tolerate a 30% drawdown in the position without panic-selling.
Horizon: 24–48 months.
Goal: Increase exposure only if sizing + triggers are clearly defined.`;

  // This is what we want the homepage tool to ingest (decision + context)
  const pasteBlock = useMemo(() => {
    return `DECISION:\n${exampleDecision}\n\nCONTEXT (only what changes sizing, timing, or risk):\n${exampleContext}`;
  }, []);

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(pasteBlock);
    } catch {
      // ignore
    }
  };

  // Cohesive flow: "Copy example" -> send them to homepage (no #tool dependency)
  const copyAndOpenHome = async () => {
    await copyExample();
    window.location.href = '/';
  };

  // Bridge into Notes with the same localStorage format as homepage
  const saveExampleAsNoteAndOpenNotes = async () => {
    try {
      localStorage.setItem(
        STORAGE.noteDraft,
        JSON.stringify({
          decision: exampleDecision,
          context: exampleContext,
          horizon: '24–48 months',
          createdAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
    window.location.href = '/decision-notes';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 70px', padding: '0 20px' }}>
        {/* ✅ UPDATED: Top nav now includes back-to-homepage button */}
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

            {/* Quiet return link (desktop only) */}
            {!isMobile && (
              <>
                <span style={{ opacity: 0.5, marginLeft: 6 }}>•</span>
                <Link href="/" style={{ ...navLinkStyle, fontSize: 12, opacity: 0.55 }}>
                  Back to tool
                </Link>
              </>
            )}
          </nav>
        </header>

        {/* Centered hero (same structure as homepage) */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1.0 }}>Decision Review</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            A structured pause before you commit.
          </p>

          <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.65 }}>
            It forces assumptions, disconfirming evidence, risk, and sizing — in a format you can
            audit later.
          </p>
        </section>

        {/* Cards */}
        <section style={{ marginTop: 18, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
          {/* Card: workflow first (simple + actionable) */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={pill}>Core workflow</span>
              <span style={pill}>Commit-aware</span>
              <span style={pill}>No prediction</span>
            </div>

            <div style={{ marginTop: 14, ...bodyText }}>
              A Decision Review is the thing you do <strong>right before</strong> you act — when the
              decision feels heavy. It preserves intent, assumptions, and triggers so your future
              self can audit decision quality.
            </div>

            <div style={divider} />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={copyAndOpenHome} style={buttonPrimary}>
                Copy example → open tool
              </button>

              <button onClick={copyExample} style={buttonSecondary}>
                Copy only
              </button>

              <div style={{ fontSize: 12.5, opacity: 0.62 }}>Drafts are ephemeral. Notes are the record.</div>
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Card: when */}
          <div style={cardStyle}>
            <div style={sectionTitle}>When to run one</div>
            <ul style={bulletList}>
              <li>The decision is meaningfully irreversible (or costly to reverse).</li>
              <li>Being wrong would matter (financially, professionally, emotionally).</li>
              <li>You’re relying on assumptions you can’t yet verify.</li>
              <li>You feel urgency, pressure, or narrative pull.</li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>Rule</div>
            <div style={{ ...bodyText, fontWeight: 700, opacity: 0.86 }}>
              Run a Decision Review only when being wrong would matter.
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Card: what it forces */}
          <div style={cardStyle}>
            <div style={sectionTitle}>What it forces</div>
            <ul style={bulletList}>
              <li>Clarify the decision (rewrite it in one sentence).</li>
              <li>Identify what has to be true (top assumptions).</li>
              <li>Define disconfirming evidence (what changes your mind).</li>
              <li>Rank failure modes (not a laundry list).</li>
              <li>Set sizing + triggers (specific, not vibes).</li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>Engineer translation</div>
            <div style={bodyText}>
              It’s a <span style={{ fontWeight: 800 }}>commit message for a decision</span> — intent
              preserved so it can be audited later.
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Card: example */}
          <div style={cardStyle}>
            <div style={sectionTitle}>One realistic example</div>
            <div style={{ ...bodyText, fontWeight: 700, opacity: 0.86 }}>{exampleDecision}</div>

            <div style={divider} />

            <div style={sectionTitle}>Context (only what changes sizing, timing, or risk)</div>
            <pre
              style={{
                margin: 0,
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.10)',
                background: '#fff',
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

            <div style={noteStyle}>Copy → paste into the tool → generate the review. Keep it boring and specific.</div>
          </div>

          <div style={{ height: 14 }} />

          {/* Card: what it is not + bridge to notes */}
          <div style={cardStyle}>
            <div style={sectionTitle}>What it is not</div>
            <ul style={bulletList}>
              <li>Stock picks, predictions, or market commentary.</li>
              <li>A long memo.</li>
              <li>Outcome-driven hindsight.</li>
              <li>A daily ritual you do for everything.</li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>After you commit</div>
            <div style={bodyText}>
              If the decision matters, preserve judgment at the moment of commitment with a Decision Note.
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/decision-notes" style={buttonSecondary}>
                Go to Decision Notes →
              </Link>

              <button onClick={saveExampleAsNoteAndOpenNotes} style={buttonPrimary}>
                Save this example as a Note →
              </button>
            </div>

            <div style={noteStyle}>
              Decision Notes intentionally exclude outcomes. They’re about decision quality at commitment time.
            </div>
          </div>
        </section>

        {/* Footer (match homepage tone) */}
        <footer style={{ marginTop: 18, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.7 }}>
            Clarity before commitment. Nothing more.
          </div>
        </footer>
      </main>
    </div>
  );
}
