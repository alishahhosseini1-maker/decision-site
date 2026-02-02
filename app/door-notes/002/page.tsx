'use client';

import Link from 'next/link';
import React from 'react';

export default function DoorNote002Page() {
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
          <h1 style={{ fontSize: 38, margin: 0, letterSpacing: -0.6 }}>Door Note #002</h1>

          <p style={{ margin: '10px auto 0', fontSize: 14, opacity: 0.68 }}>
            Buying a Home in a Buyer-Leaning Market
          </p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55 }}>Context: Negotiation leverage exists.</p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55, maxWidth: 760, lineHeight: 1.5 }}>
            Decision: Buy a home now in an environment where buyers have negotiation leverage.
          </p>
        </section>

        <section style={{ maxWidth: 720, margin: '28px auto 0' }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Decision</span>
            <p style={pStyle}>
              Buy a home now in an environment where buyers have negotiation leverage.
            </p>

            <h3 style={h3Style}>Door</h3>
            <p style={pStyle}>
              <strong>Revolving door.</strong>
            </p>
            <p style={pStyle}>Entry is allowed without punishment.</p>
            <p style={pStyle}>Exit remains available without damage.</p>
            <p style={pStyle}>If I treat this like a vault door (“now or never”), I will overpay.</p>
            <p style={pStyle}>If I treat it like a trapdoor (“never buy”), I will miss reasonable opportunities.</p>
            <p style={pStyle}>
              <strong>Internal phrase:</strong> “This door allows testing.”
            </p>

            <h3 style={h3Style}>Hinge</h3>
            <p style={pStyle}>
              Buyer leverage exists because:
            </p>
            <p style={pStyle}>• demand is constrained</p>
            <p style={pStyle}>• sellers are negotiating</p>
            <p style={pStyle}>• alternatives remain available</p>
            <p style={pStyle}>This does not require prices to crash.</p>
            <p style={pStyle}>It only requires mismatch to persist.</p>
            <p style={pStyle}>
              <strong>Internal phrase:</strong> “If demand snaps back, the hinge tightens.”
            </p>

            <h3 style={h3Style}>Locks</h3>
            <p style={pStyle}>No doors lock at:</p>
            <p style={pStyle}>• offer</p>
            <p style={pStyle}>• acceptance</p>
            <p style={pStyle}>• inspection</p>
            <p style={pStyle}>• renegotiation</p>
            <p style={pStyle}>Doors lock if I:</p>
            <p style={pStyle}>• waive contingencies</p>
            <p style={pStyle}>• overstretch affordability</p>
            <p style={pStyle}>• emotionally anchor to one home</p>
            <p style={pStyle}>Those locks are voluntary.</p>
            <p style={pStyle}>
              <strong>Internal phrase:</strong> “Nothing locks unless I lock it.”
            </p>

            <h3 style={h3Style}>Trap</h3>
            <p style={pStyle}>
              The trap is <strong>urgency</strong>.
            </p>
            <p style={pStyle}>Signals of the trap:</p>
            <p style={pStyle}>• fear of missing out</p>
            <p style={pStyle}>• justifying price instead of testing it</p>
            <p style={pStyle}>• compressing my own timeline</p>
            <p style={pStyle}>The market does not trap me.</p>
            <p style={pStyle}>My behavior does.</p>
            <p style={pStyle}>
              <strong>Internal phrase:</strong> “Urgency is the trap.”
            </p>

            <h3 style={h3Style}>Exit sign</h3>
            <p style={pStyle}>I pause or exit if 2+ appear:</p>
            <p style={pStyle}>• homes selling consistently above list</p>
            <p style={pStyle}>• inspections stop breaking deals</p>
            <p style={pStyle}>• concessions disappear</p>
            <p style={pStyle}>• time-on-market compresses sharply</p>
            <p style={pStyle}>• I feel rushed to decide</p>
            <p style={pStyle}>These are observable, not emotional.</p>
            <p style={pStyle}>
              <strong>Internal phrase:</strong> “When urgency returns, I step back.”
            </p>

            <h3 style={h3Style}>Step</h3>
            <p style={pStyle}>I step only as far as I can:</p>
            <p style={pStyle}>• walk away calmly</p>
            <p style={pStyle}>• absorb being wrong</p>
            <p style={pStyle}>• survive without rate relief</p>
            <p style={pStyle}>Losing the deal must feel neutral.</p>
            <p style={pStyle}>
              <strong>Internal phrase:</strong> “I step only as far as I can step back.”
            </p>

            <h3 style={h3Style}>Actionable</h3>
            <div style={actionStyle}>
              As long as I can walk without stress, the door remains revolving.
              <br />
              The moment urgency appears, I stop pushing.
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
