'use client';

import Link from 'next/link';

export default function DecisionReviewPage() {
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
    lineHeight: 1.8,
  };

  const bulletList: React.CSSProperties = {
    margin: '10px 0 0',
    paddingLeft: 18,
    lineHeight: 1.85,
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
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    fontWeight: 700,
    opacity: 0.88,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 70px', padding: '0 20px' }}>
        {/* Top nav */}
        <header
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  }}
>
  {/* LEFT: Home anchor */}
  <Link
    href="/"
    style={{
      textDecoration: 'none',
      color: 'inherit',
      fontWeight: 800,
      fontSize: 14,
      letterSpacing: 0.2,
      opacity: 0.9,
    }}
  >
    Decision Layer
  </Link>

  {/* RIGHT: Section nav */}
  <nav
    style={{
      display: 'flex',
      gap: 18,
      fontSize: 13,
      opacity: 0.62,
      fontWeight: 400,
    }}
  >
    <Link href="/decision-review" style={{ textDecoration: 'none', color: 'inherit' }}>
      Decision Review
    </Link>
    <Link href="/decision-notes" style={{ textDecoration: 'none', color: 'inherit' }}>
      Decision Notes
    </Link>
    <Link href="/walkthrough" style={{ textDecoration: 'none', color: 'inherit' }}>
      Walkthrough
    </Link>
    <Link href="/decision-library" style={{ textDecoration: 'none', color: 'inherit' }}>
      Decision Library
    </Link>
  </nav>
</header>







        {/* Hero */}
        <section style={{ marginTop: 66, maxWidth: 860 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span style={pill}>Concept</span>
            <span style={pill}>Core workflow</span>
            <span style={pill}>No prediction</span>
          </div>

          <h1 style={{ fontSize: 52, margin: '14px 0 0', letterSpacing: -1.0 }}>
            Decision Review
          </h1>

          <p style={{ margin: '14px 0 0', ...bodyText, fontSize: 15 }}>
            A structured pause before committing capital, time, or reputation.
            The purpose is decision quality under uncertainty — not outcomes, not forecasts, not narratives.
          </p>

          <p style={{ margin: '10px 0 0', fontSize: 13.5, opacity: 0.62, lineHeight: 1.7 }}>
            Use the tool on the homepage to generate a Decision Review. Use Decision Notes to preserve judgment at commitment time.
          </p>
        </section>

        {/* Flow cards */}
        <section style={{ marginTop: 18, maxWidth: 860, display: 'grid', gap: 14 }}>
          {/* Card 1 */}
          <div style={cardStyle}>
            <div style={sectionTitle}>When to run one</div>
            <ul style={bulletList}>
              <li>The decision is meaningfully irreversible.</li>
              <li>Being wrong would matter (financially, professionally, or emotionally).</li>
              <li>You’re relying on assumptions you can’t yet verify.</li>
              <li>You feel urgency, pressure, or narrative pull.</li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>Rule</div>
            <div style={{ ...bodyText, fontWeight: 700 }}>
              Run a Decision Review only when being wrong would matter.
            </div>
          </div>

          {/* Card 2 */}
          <div style={cardStyle}>
            <div style={sectionTitle}>What it forces</div>
            <ul style={bulletList}>
              <li>Clarity on the actual decision (not the story).</li>
              <li>The few assumptions that must be true.</li>
              <li>Disconfirming evidence (what would change your mind).</li>
              <li>Risks and failure modes (ranked, not listed).</li>
              <li>Sizing and triggers (specific, not vibes).</li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>Default behavior</div>
            <div style={bodyText}>
              Drafts are intentionally ephemeral. If you want to preserve the decision at commitment time, write a Decision Note.
            </div>
          </div>

          {/* Card 3 */}
          <div style={cardStyle}>
            <div style={sectionTitle}>What it is not</div>
            <ul style={bulletList}>
              <li>Stock picks, predictions, or market commentary.</li>
              <li>A long memo.</li>
              <li>Outcome-driven hindsight.</li>
              <li>A productivity ritual.</li>
            </ul>

            <div style={divider} />

            <div style={sectionTitle}>Engineer translation</div>
            <div style={bodyText}>
              It’s a <span style={{ fontWeight: 800 }}>commit message for a decision</span> — intent preserved so it can be audited later.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 18, maxWidth: 860 }}>
          <div style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.7 }}>
            Clarity before commitment. Nothing more.
          </div>
        </footer>
      </main>
    </div>
  );
}
