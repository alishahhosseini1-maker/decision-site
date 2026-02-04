'use client';

import Link from 'next/link';
import React from 'react';

export default function DoorNote003Page() {
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
          <h1 style={{ fontSize: 38, margin: 0, letterSpacing: -0.6 }}>Door Note #003</h1>

          <p style={{ margin: '10px auto 0', fontSize: 14, opacity: 0.68 }}>
            Google’s AI Energy Bet
          </p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55 }}>
            Context: Power is becoming a gating factor for AI.
          </p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55, maxWidth: 760, lineHeight: 1.5 }}>
            Decision: Commit billions to secure and build power generation to support AI data centers.
          </p>
        </section>

        <section style={{ maxWidth: 720, margin: '28px auto 0' }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Decision</span>
            <p style={pStyle}>
              Commit billions to secure and build power generation to support AI data centers.
            </p>

            <h3 style={h3Style}>Door</h3>
            <p style={pStyle}>
              <strong>Heavy steel door.</strong>
            </p>
            <p style={pStyle}>Long-term.</p>
            <p style={pStyle}>Slow-moving.</p>
            <p style={pStyle}>Hard to reverse once momentum builds.</p>
            <p style={pStyle}>This is infrastructure, not an experiment.</p>

            <h3 style={h3Style}>Hinge</h3>
            <p style={pStyle}>This door stays aligned only if AI demand remains:</p>
            <p style={pStyle}>• persistent, not cyclical</p>
            <p style={pStyle}>• energy-intensive, not efficiency-light</p>
            <p style={pStyle}>• dependent on always-on data centers</p>
            <p style={pStyle}>
              If AI energy intensity drops materially, the hinge loosens.
            </p>

            <h3 style={h3Style}>Locks</h3>
            <p style={pStyle}>Locks engage through:</p>
            <p style={pStyle}>• sunk capital in physical assets</p>
            <p style={pStyle}>• long construction and payback timelines</p>
            <p style={pStyle}>• regulatory and political exposure</p>
            <p style={pStyle}>• organizational identity shifting toward energy operations</p>
            <p style={pStyle}>These locks compound quietly.</p>

            <h3 style={h3Style}>Trap</h3>
            <p style={pStyle}>
              The trap is <strong>overbuilding</strong>.
            </p>
            <p style={pStyle}>Signals of the trap:</p>
            <p style={pStyle}>• scaling power ahead of durable demand</p>
            <p style={pStyle}>• misjudging the pace of efficiency gains</p>
            <p style={pStyle}>• treating today’s scarcity as permanent</p>
            <p style={pStyle}>The downside arrives slowly, not suddenly.</p>

            <h3 style={h3Style}>Exit sign</h3>
            <p style={pStyle}>Exit signs begin flashing if:</p>
            <p style={pStyle}>• data-center power shortages ease faster than expected</p>
            <p style={pStyle}>• AI energy intensity drops materially</p>
            <p style={pStyle}>• grid capacity expands ahead of hyperscaler demand</p>
            <p style={pStyle}>These are early warning lights, not headlines.</p>

            <h3 style={h3Style}>Step</h3>
            <p style={pStyle}>This step is structural, not optional.</p>
            <p style={pStyle}>Scale is driven by necessity, not aggression.</p>
            <p style={pStyle}>Once taken, reversal is expensive and reputational.</p>

            <h3 style={h3Style}>Actionable</h3>
            <div style={actionStyle}>
              Heavy steel doors reward patience, not speed.
              <br />
              When scale is forced, precision matters more than optimism.
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
