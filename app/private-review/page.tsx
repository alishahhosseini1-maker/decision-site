'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

export default function PrivateReviewPage() {
  // Visual system
  const border = '1px solid rgba(0,0,0,0.10)';
  const shellBg = 'rgba(255,255,255,0.65)';
  const softShadow = '0 10px 30px rgba(0,0,0,0.05)';

  const navLinkStyle: React.CSSProperties = { textDecoration: 'none', color: 'inherit' };

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

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    borderRadius: 14,
    border: 'none',
    padding: '14px 16px',
    background: '#0b0b0b',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(0,0,0,0.10)',
  };

  // Intake
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');

  // Replace with real intake email
  const INTAKE_EMAIL = 'you@domain.com';

  const canSend = !!decision.trim();

  const intakeText = useMemo(() => {
    return `Decision Layer — Private Review

Decision:
${decision.trim() || '[required]'}

Context:
${context.trim() || '[optional]'}

Name:
${name.trim() || '[optional]'}

Email:
${email.trim() || '[optional]'}

—
Decision-quality review. Not investment advice.`;
  }, [name, email, decision, context]);

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent('Decision Layer — Private Review');
    const body = encodeURIComponent(intakeText);
    return `mailto:${INTAKE_EMAIL}?subject=${subject}&body=${body}`;
  }, [INTAKE_EMAIL, intakeText]);

  const label = (text: string, hint?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>{text}</div>
      {hint ? <div style={{ fontSize: 12.5, opacity: 0.6 }}>{hint}</div> : null}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <Link href="/" style={backBtnStyle}>
            ← Back
          </Link>

          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.6,
              fontWeight: 450,
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <Link href="/decision-review" style={navLinkStyle}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Notes
            </Link>
            <Link href="/decision-library" style={navLinkStyle}>
              Library
            </Link>
            <Link href="/private-review" style={{ ...navLinkStyle, fontWeight: 700, opacity: 0.9 }}>
              Private Review
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1.0 }}>Private Review</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            One decision. Pressure-tested.
          </p>

          <p style={{ margin: '10px 0 0', fontSize: 13, opacity: 0.58 }}>
            About decision quality. Not advice.
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
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            {label('Decision (required)', 'One sentence.')}
            <textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Example: Increase exposure to X, capped at Y% total, if condition Z holds."
              rows={4}
              style={{
                width: '100%',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.15)',
                padding: 14,
                fontSize: 14,
                lineHeight: 1.45,
                resize: 'vertical',
                background: '#fff',
                outline: 'none',
              }}
            />

            {label('Context (optional)', 'Only what changes risk, sizing, or timing.')}
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Constraints, exposure, stakes, liquidity needs, what you can’t tolerate."
              rows={4}
              style={{
                width: '100%',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.15)',
                padding: 14,
                fontSize: 14,
                lineHeight: 1.45,
                resize: 'vertical',
                background: '#fff',
                outline: 'none',
              }}
            />

            {label('Name (optional)')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.15)',
                padding: '10px 12px',
                fontSize: 14,
                background: '#fff',
                outline: 'none',
              }}
            />

            {label('Email (optional)')}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.15)',
                padding: '10px 12px',
                fontSize: 14,
                background: '#fff',
                outline: 'none',
              }}
            />

            <a
              href={canSend ? mailtoHref : undefined}
              onClick={(e) => {
                if (!canSend) {
                  e.preventDefault();
                  alert('Please write the decision (one sentence) first.');
                }
              }}
              style={{
                ...navLinkStyle,
                ...primaryBtn,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canSend ? 1 : 0.5,
              }}
            >
              Send for review →
            </a>

            <div style={{ fontSize: 12.5, opacity: 0.55, lineHeight: 1.6 }}>
              Not investment advice. Decision-quality review.
            </div>
          </div>
        </section>

        <footer style={{ maxWidth: 980, margin: '18px auto 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.55 }}>Quiet, private, and intentional.</div>
        </footer>
      </main>
    </div>
  );
}
