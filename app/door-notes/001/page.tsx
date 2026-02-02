'use client';

import Link from 'next/link';
import React, { type CSSProperties } from 'react';

export default function DoorNote001Page() {
  const shellBg = 'rgba(255,255,255,0.65)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const navLinkStyle: CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const cardStyle: CSSProperties = {
    border,
    borderRadius: 18,
    background: shellBg,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  };

  const h3Style: CSSProperties = {
    margin: '18px 0 8px',
    fontSize: 14,
    fontWeight: 800,
    opacity: 0.9,
  };

  const pStyle: CSSProperties = {
    margin: '0 0 10px',
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.88,
  };

  const actionStyle: CSSProperties = {
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
          <h1 style={{ fontSize: 38, margin: 0, letterSpacing: -0.6 }}>Door Note #001</h1>

          <p style={{ margin: '10px auto 0', fontSize: 14, opacity: 0.68 }}>Revolving Glass Door</p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55 }}>
            Source: Institutional flow research
          </p>

          <p style={{ margin: '6px auto 0', fontSize: 12.5, opacity: 0.55, maxWidth: 760, lineHeight: 1.5 }}>
            Context: How crowded risk-taking has become and what happens when exits shrink.
          </p>
        </section>

        <section style={{ maxWidth: 720, margin: '28px auto 0' }}>
          <div style={cardStyle}>
            <h3 style={h3Style}>What door is this?</h3>
            <p style={pStyle}>
              This is a <strong>revolving glass door</strong>.
            </p>
            <p style={pStyle}>You can walk in.</p>
            <p style={pStyle}>You can walk out.</p>
            <p style={pStyle}>But if everyone pushes at once, it shatters.</p>
            <p style={pStyle}>
              Flows are people inside the building. This note shows how crowded the lobby is, not whether the building is
              safe.
            </p>

            <h3 style={h3Style}>What is happening to the door?</h3>
            <p style={pStyle}>The door is spinning faster, and the crowd is pressing closer together.</p>
            <p style={pStyle}>Movement looks smooth from the outside. Inside, space is shrinking.</p>

            <h3 style={h3Style}>What breaks if this door fails?</h3>
            <p style={pStyle}>Everyone turns at once.</p>
            <p style={pStyle}>That is when glass doors break. Not from impact, but from pressure.</p>

            <h3 style={h3Style}>Where is the exit?</h3>
            <p style={pStyle}>Stay near the edge.</p>
            <p style={pStyle}>Keep your weight outside.</p>
            <p style={pStyle}>Move slowly enough that you can step back without forcing others.</p>
            <p style={pStyle}>Size determines whether this door is reversible.</p>

            <h3 style={h3Style}>Action</h3>
            <div style={actionStyle}>Step in lightly, but keep your hand on the frame.</div>

            <div style={{ marginTop: 18, borderTop: '1px solid rgba(0,0,0,0.10)', paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, opacity: 0.9 }}>Final mental image</div>
              <p style={pStyle}>
                This PDF is a <strong>security camera, not a map</strong>. It shows crowd density at the door, not what is
                behind it.
              </p>
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
