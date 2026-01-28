'use client';

import Link from 'next/link';
import React from 'react';

export default function PrivateReviewPage() {
  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const backBtnStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    fontWeight: 800,
    fontSize: 13,
    opacity: 0.75,
    border,
    borderRadius: 999,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.6)',
    whiteSpace: 'nowrap',
  };

  const primaryBtnStyle: React.CSSProperties = {
    textDecoration: 'none',
    borderRadius: 14,
    border: 'none',
    padding: '12px 14px',
    background: '#0b0b0b',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    boxShadow: '0 10px 20px rgba(0,0,0,0.10)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  };

  const lockedBtnStyle: React.CSSProperties = {
    borderRadius: 14,
    border,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.7)',
    color: '#111',
    fontSize: 13,
    fontWeight: 800,
    opacity: 0.45,
    minWidth: 200,
    textAlign: 'center',
    cursor: 'not-allowed',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>

        {/* Top bar (ONLY back) */}
        <header style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 6 }}>
          <Link href="/" style={backBtnStyle}>
            ← Back
          </Link>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1.0 }}>Private Review</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            Not available yet.
          </p>

          <p style={{ margin: '8px auto 0', fontSize: 14, opacity: 0.65, maxWidth: 680, lineHeight: 1.55 }}>
            This review is meant to be run alone.
            <br />
            If you need a second review, that comes later.
          </p>
        </section>

        {/* Card */}
        <section
          style={{
            maxWidth: 720,
            margin: '22px auto 0',
            border,
            borderRadius: 18,
            background: shellBg,
            padding: 18,
            boxShadow: softShadow,
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>
              What to do instead
            </div>

            <div style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6 }}>
              Go back to the Decision Review, copy the prompt, run it in your preferred tool,
              and keep the output with the decision.
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Link href="/" style={primaryBtnStyle}>
                Return to Decision Review →
              </Link>

              <div style={lockedBtnStyle}>
                Private Review (locked)
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62 }}>
              Decision-quality review. Not advice.
            </div>
          </div>
        </section>

        <footer style={{ maxWidth: 980, margin: '18px auto 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.55 }}>
            Quiet, private, and intentional.
          </div>
        </footer>
      </main>
    </div>
  );
}
