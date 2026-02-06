'use client';

import Link from 'next/link';
import React from 'react';

export default function DoorNote004Page() {
  const shellBg = 'rgba(255,255,255,0.65)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const cardStyle: React.CSSProperties = {
    border,
    borderRadius: 18,
    background: shellBg,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  };

  const h3Style: React.CSSProperties = {
    margin: '18px 0 8px',
    fontSize: 14,
    fontWeight: 800,
    opacity: 0.9,
  };

  const pStyle: React.CSSProperties = {
    margin: '0 0 10px',
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.88,
  };

  const labelStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
    opacity: 0.65,
    marginBottom: 8,
  };

  const actionStyle: React.CSSProperties = {
    marginTop: 10,
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 14,
    background: '#fff',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 800,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.55 }}>Door Notes</div>

          <nav style={{ fontSize: 13, opacity: 0.55, fontWeight: 400, whiteSpace: 'nowrap' }}>
            <Link href="/door-notes" style={navLinkStyle}>
              Back
            </Link>
          </nav>
        </header>

        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 38, margin: 0, letterSpacing: -0.6 }}>Door Note #004</h1>

          <p style={{ margin: '10px auto 0', fontSize: 14, opacity: 0.68 }}>
            Some Winning Trades Are Heavy Steel Doors
          </p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55 }}>
            Context: Crowded winners can flip fast when the regime changes.
          </p>

          <p
            style={{
              margin: '6px auto 0',
              fontSize: 12.5,
              opacity: 0.55,
              maxWidth: 760,
              lineHeight: 1.5,
            }}
          >
            Decision: Concentrate into a small set of popular “winners” while valuations are high, trusting that
            conditions stay favorable long enough for results to catch up.
          </p>
        </section>

        <section style={{ maxWidth: 720, margin: '28px auto 0' }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Decision</span>
            <p style={pStyle}>
              Concentrate into a small set of popular “winners” while valuations are high, trusting that conditions
              stay favorable long enough for results to catch up.
            </p>

            <h3 style={h3Style}>Door</h3>
            <p style={pStyle}>
              <strong>Heavy steel door.</strong>
            </p>
            <p style={pStyle}>This is a commitment, not a casual trade.</p>
            <p style={pStyle}>It’s concentrated.</p>
            <p style={pStyle}>It depends on the market “regime” staying friendly.</p>
            <p style={pStyle}>When it turns, it doesn’t drift — it slams.</p>

            <h3 style={h3Style}>Hinge</h3>
            <p style={pStyle}>This door holds only if one thing stays true:</p>
            <p style={pStyle}>
              <strong>Interest rates stay friendly long enough for results to catch up.</strong>
            </p>
            <p style={pStyle}>Not stories. Not headlines. Not vibes.</p>
            <p style={pStyle}>If rates aren’t cooperating, the whole setup weakens.</p>

            <h3 style={h3Style}>Locks</h3>
            <p style={pStyle}>Locks engage because exits get crowded:</p>
            <p style={pStyle}>• you’re holding what everyone else owns</p>
            <p style={pStyle}>• selling becomes the signal</p>
            <p style={pStyle}>• liquidity disappears right when you want it</p>
            <p style={pStyle}>By the time it feels obvious, it’s already late.</p>

            <h3 style={h3Style}>Trap</h3>
            <p style={pStyle}>
              The trap is staying in after the reason quietly leaves.
            </p>
            <p style={pStyle}>It doesn’t start with panic.</p>
            <p style={pStyle}>It starts with gravity:</p>
            <p style={pStyle}>• rates stay high longer than expected</p>
            <p style={pStyle}>• results don’t justify the valuation</p>
            <p style={pStyle}>• forced selling shows up in the “froth” first</p>

            <h3 style={h3Style}>Exit sign</h3>
            <p style={pStyle}>You won’t get a clean warning headline.</p>
            <p style={pStyle}>The early exit sign is simpler:</p>
            <p style={pStyle}>
              <strong>Good news stops working.</strong>
            </p>
            <p style={pStyle}>When leaders can’t push higher even on “perfect” news, the exit sign is lit.</p>

            <h3 style={h3Style}>Step</h3>
            <p style={pStyle}>
              The right move here isn’t all-in or all-out.
            </p>
            <p style={pStyle}>
              Take a <strong>small step</strong>: enough exposure to stay engaged, small enough to stay rational.
            </p>
            <p style={pStyle}>If it costs you flexibility, sleep, or clear thinking — you stepped too far.</p>

            <h3 style={h3Style}>Actionable</h3>
            <div style={actionStyle}>
              Don’t add size until rates are cooperating — not just prices.
              <br />
              Pre-commit one clear “reduce” signal before earnings confirm what the chart already told you.
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.6, textAlign: 'center' }}>
            <Link href="/" style={navLinkStyle}>
              Return to Decision Layer
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
