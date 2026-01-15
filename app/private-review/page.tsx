'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

export default function PrivateReviewPage() {
  // Visual system (match the site)
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

  // UX status
  const [status, setStatus] = useState<'idle' | 'copied' | 'error' | 'missingEmail'>('idle');

  /**
   * Set in Vercel -> Project Settings -> Environment Variables:
   * NEXT_PUBLIC_INTAKE_EMAIL = your real inbox address
   *
   * NOTE: NEXT_PUBLIC_* values are baked at BUILD time. You must redeploy after changing them.
   */
  const INTAKE_EMAIL = (process.env.NEXT_PUBLIC_INTAKE_EMAIL || '')
    .replace(/\s+/g, '') // removes whitespace/newlines
    .replace(/[^\x20-\x7E]/g, '') // removes hidden non-ascii chars
    .trim();

  const canSend = !!decision.trim();

  const intakeText = useMemo(() => {
    return `Decision Layer — Private Review

Name (optional):
${name.trim() || '[optional]'}

Email (optional):
${email.trim() || '[optional]'}

Decision (required):
${decision.trim() || '[required]'}

Context (optional):
${context.trim() || '[optional]'}

—
Decision-quality review. Not investment advice.`;
  }, [name, email, decision, context]);

  const mailtoHref = useMemo(() => {
    if (!INTAKE_EMAIL) return '';
    const subject = encodeURIComponent('Decision Layer — Private Review');
    const body = encodeURIComponent(intakeText);
    return `mailto:${INTAKE_EMAIL}?subject=${subject}&body=${body}`;
  }, [INTAKE_EMAIL, intakeText]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2200);
      return true;
    } catch {
      return false;
    }
  };

  const onSend = async () => {
    setStatus('idle');

    if (!canSend) {
      alert('Please write the decision (one sentence) first.');
      return;
    }

    // If env var isn't configured, we can’t open a mailto reliably — but we can still copy.
    if (!INTAKE_EMAIL || !mailtoHref) {
      setStatus('missingEmail');
      const ok = await copyToClipboard(intakeText);
      if (!ok) setStatus('error');
      return;
    }

    // Open the email draft first.
    // Many browsers won’t open anything if the user has no mail app configured — so we always copy as fallback.
    try {
      window.location.assign(mailtoHref);
      await copyToClipboard(intakeText);
    } catch {
      const ok = await copyToClipboard(intakeText);
      setStatus(ok ? 'copied' : 'error');
    }
  };

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

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>One decision. Pressure-tested.</p>

          <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.65 }}>About decision quality. Not advice.</p>
        </section>

        {/* Single card */}
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
              placeholder=""
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
              placeholder=""
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

            <button
              type="button"
              onClick={onSend}
              style={{
                ...primaryBtn,
                opacity: canSend ? 1 : 0.5,
                cursor: canSend ? 'pointer' : 'not-allowed',
                background: canSend ? '#0b0b0b' : '#6b7280',
              }}
              disabled={!canSend}
            >
              Send for review →
            </button>

            {/* Status messages (no debug / no “Intake: NOT SET”) */}
            {status === 'copied' && (
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                Copied. If your email client didn’t open, paste into a new email and send it.
              </div>
            )}

            {status === 'missingEmail' && (
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                Your site isn’t configured to receive submissions yet. Set{' '}
                <strong>NEXT_PUBLIC_INTAKE_EMAIL</strong> in Vercel and redeploy. Your message was copied as a
                fallback.
              </div>
            )}

            {status === 'error' && (
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                Couldn’t open email or copy automatically. Manually copy the text below.
                <pre
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: '#fff',
                    padding: 12,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {intakeText}
                </pre>
              </div>
            )}

            <div style={{ fontSize: 12.5, opacity: 0.62, lineHeight: 1.6 }}>
              Decision-quality review. Not investment advice.
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
