import Link from 'next/link';
import React from 'react';

export default function DoorNotesIndexPage() {
  const shellBg = 'rgba(255,255,255,0.65)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block', // makes the whole row reliably clickable
  };

  const cardStyle: React.CSSProperties = {
    border,
    borderRadius: 18,
    background: shellBg,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  };

  const itemStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 14,
    background: '#fff',
    padding: '14px 16px',
    display: 'grid',
    gap: 6,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const metaStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.55,
    whiteSpace: 'nowrap',
  };

  const descStyle: React.CSSProperties = {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 1.45,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.55 }}>Decision Layer</div>

          <nav style={{ fontSize: 13, opacity: 0.55, fontWeight: 400, whiteSpace: 'nowrap' }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Home
            </Link>
          </nav>
        </header>

        {/* Title */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 44, margin: 0, letterSpacing: -0.8 }}>Door Notes</h1>
          <p
            style={{
              margin: '12px auto 0',
              fontSize: 14,
              opacity: 0.68,
              maxWidth: 760,
              lineHeight: 1.5,
            }}
          >
            One decision per note. Same ritual every time.
          </p>

          <div
            style={{
              margin: '10px auto 0',
              fontSize: 12.5,
              opacity: 0.55,
              maxWidth: 760,
              lineHeight: 1.5,
            }}
          >
            Door → Hinge → Locks → Trap → Exit sign → Step
          </div>
        </section>

        {/* Archive */}
        <section style={{ maxWidth: 720, margin: '28px auto 0' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginBottom: 10 }}>
              Archive
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {/* 001 */}
              <Link href="/door-notes/001" style={navLinkStyle} aria-label="Open Door Note 001">
                <div style={itemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Door Note #001</div>
                    <div style={metaStyle}>Flow research</div>
                  </div>

                  <div style={descStyle}>
                    Revolving glass door. Crowding risk and what happens when exits shrink.
                  </div>
                </div>
              </Link>

              {/* 002 */}
              <Link href="/door-notes/002" style={navLinkStyle} aria-label="Open Door Note 002">
                <div style={itemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Door Note #002</div>
                    <div style={metaStyle}>Housing</div>
                  </div>

                  <div style={descStyle}>
                    Buying a home in a buyer-leaning market. Leverage exists until urgency returns.
                  </div>
                </div>
              </Link>

              {/* 003 */}
              <Link href="/door-notes/003" style={navLinkStyle} aria-label="Open Door Note 003">
                <div style={itemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Door Note #003</div>
                    <div style={metaStyle}>AI / Energy</div>
                  </div>

                  <div style={descStyle}>
                    Heavy steel door. Power becomes a gating factor for AI. The trap is overbuilding ahead of durable demand.
                  </div>
                </div>
              </Link>
            </div>

            <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.6 }}>
              One note at a time. Same structure. No hype.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
