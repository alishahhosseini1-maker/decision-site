'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [horizon, setHorizon] = useState('24–48 months');

  // UX state
  const [copied, setCopied] = useState(false);
  const [ctaCopied, setCtaCopied] = useState(false); // green only after click (this page load)
  const [lastUsedAt, setLastUsedAt] = useState<string | null>(null);

  // progressive disclosure
  const [hasStarted, setHasStarted] = useState(false);

  // validation
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const reviewRef = useRef<HTMLDetailsElement | null>(null);

  const STORAGE = {
    lastUsed: 'dl:last_used_at',
  };

  const tone = 'Calm, precise, direct. Like a senior engineer doing a design review.';

  useEffect(() => {
    try {
      const lu = localStorage.getItem(STORAGE.lastUsed);
      setLastUsedAt(lu);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatShort = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const reviewPrompt = useMemo(() => {
    const trimmedDecision = decision.trim();
    const trimmedContext = context.trim();

    const decisionBlock = trimmedDecision
      ? `DECISION:\n${trimmedDecision}`
      : `DECISION:\n[Paste the decision here]`;

    const contextBlock = trimmedContext ? `\n\nWHY THIS IS HARD TO UNDO (constraints / stakes):\n${trimmedContext}` : '';

    return `You are a disciplined decision partner.

Your job is NOT to provide advice, recommendations, or predictions.
Your job is to pressure-test a decision before commitment.

Time horizon: ${horizon}

Style requirements:
- ${tone}
- Challenge vague thinking
- Force specificity (numbers, constraints, triggers)
- Surface assumptions and failure modes
- Separate knowns vs unknowns
- Output should be skimmable and actionable

${decisionBlock}${contextBlock}

Now run a Decision Review with this structure:

1) Clarify the decision (rewrite it in 1 sentence)
2) What has to be true? (top 5 assumptions)
3) What would change your mind? (disconfirming evidence)
4) Key risks / failure modes (ranked)
5) Opportunity cost (what you're giving up)
6) Decision rule + sizing (simple rule-of-thumb given uncertainty + downside)
7) Triggers (what would make you proceed / pause / stop)
8) Checklist (10 yes/no items)
9) Verdict (Proceed / Proceed smaller / Wait / Don’t do it) + 2-line rationale`;
  }, [decision, context, horizon]);

  const validateDecision = () => {
    const text = decision.trim();
    if (!text) return 'Write the decision first.';
    if (text.length < 12) return 'Make it specific (at least ~12 characters).';
    return null;
  };

  const beginReview = async () => {
    const err = validateDecision();
    if (err) {
      setDecisionError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setDecisionError(null);
    setHasStarted(true);

    const iso = new Date().toISOString();
    setLastUsedAt(iso);
    try {
      localStorage.setItem(STORAGE.lastUsed, iso);
    } catch {}

    try {
      await navigator.clipboard.writeText(reviewPrompt);

      setCopied(true);
      setTimeout(() => setCopied(false), 1200);

      // once clicked successfully, stays green until refresh
      setCtaCopied(true);
    } catch {
      // clipboard may be blocked
    }

    setTimeout(() => {
      if (reviewRef.current) {
        reviewRef.current.open = true;
        reviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(reviewPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const shellBg = 'rgba(255,255,255,0.65)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const detailStyle: React.CSSProperties = {
    border,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.55)',
    padding: '9px 12px',
  };

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    listStyle: 'none',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 500,
    opacity: 0.9,
  };

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const lastUsedLabel = formatShort(lastUsedAt);

  // CTA: black default, green only after click-copy success (this page load)
  const ctaBg = ctaCopied ? '#16a34a' : '#0b0b0b';

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.55 }}>
            Last used: <span style={{ opacity: 0.75 }}>{lastUsedLabel}</span>
          </div>

          <nav style={{ fontSize: 13, opacity: 0.45, fontWeight: 400, whiteSpace: 'nowrap' }}>
            <Link href="/private-review" style={navLinkStyle}>
              Leave
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 64, margin: 0, letterSpacing: -1.1 }}>Decision Layer</h1>

          <p style={{ margin: '14px auto 0', fontSize: 18, opacity: 0.92, maxWidth: 820 }}>
            Run a decision review before you commit.
          </p>

          <p style={{ margin: '10px auto 0', fontSize: 13, opacity: 0.58, maxWidth: 820, lineHeight: 1.45 }}>
            Takes ~10 minutes. Start only if you&apos;re close to committing.
          </p>
        </section>

        {/* Card */}
        <section
          style={{
            maxWidth: 720,
            margin: '28px auto 0',
            border,
            borderRadius: 18,
            background: shellBg,
            padding: 18,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>What are you about to commit to?</div>

          <textarea
            value={decision}
            onChange={(e) => {
              setDecision(e.target.value);
              if (decisionError) setDecisionError(null);
              // if they change the decision after copying, reset CTA to black
              if (ctaCopied) setCtaCopied(false);
            }}
            placeholder="Examples: signing an offer • investing $500k • hiring a VP • killing a product • choosing a roadmap • acquiring a company"
            rows={5}
            style={{
              width: '100%',
              borderRadius: 14,
              border: decisionError ? '1px solid rgba(220,38,38,0.55)' : '1px solid rgba(0,0,0,0.15)',
              padding: 14,
              fontSize: 14,
              lineHeight: 1.45,
              resize: 'vertical',
              background: '#fff',
              outline: 'none',
            }}
          />

          {decisionError && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 600 }}>
              {decisionError}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62 }}>Write it like you&apos;re sending it to your board.</div>

          {/* Context */}
          <div style={{ marginTop: 10 }}>
            <details style={detailStyle}>
              <summary style={summaryStyle}>
                <span>▶ Why this is hard to undo</span>
              </summary>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, opacity: 0.9 }}>
                      Constraints / stakes (optional)
                    </div>
                    <textarea
                      value={context}
                      onChange={(e) => {
                        setContext(e.target.value);
                        if (ctaCopied) setCtaCopied(false);
                      }}
                      placeholder="Timeline, reputation, capital at risk, opportunity cost, dependencies, constraints…"
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
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, opacity: 0.9 }}>Time horizon</div>
                      <input
                        value={horizon}
                        onChange={(e) => {
                          setHorizon(e.target.value);
                          if (ctaCopied) setCtaCopied(false);
                        }}
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
                    </div>

                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, opacity: 0.9 }}>Tone (fixed)</div>
                      <div
                        style={{
                          width: '100%',
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.10)',
                          padding: '10px 12px',
                          fontSize: 13,
                          background: 'rgba(255,255,255,0.7)',
                          opacity: 0.85,
                        }}
                      >
                        {tone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* CTA */}
          <button
            onClick={beginReview}
            style={{
              marginTop: 14,
              width: '100%',
              borderRadius: 14,
              border: 'none',
              padding: '14px 16px',
              background: ctaBg,
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
              transition: 'background 180ms ease',
            }}
          >
            {ctaCopied ? 'Copied ✓' : 'Begin review (copy prompt)'}
          </button>

          <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62, textAlign: 'center' }}>
            Paste into your preferred tool. The goal is clarity, not perfection.
          </div>

          {/* After Start */}
          {hasStarted && (
            <div style={{ marginTop: 12 }}>
              <details ref={reviewRef} style={detailStyle} open>
                <summary style={summaryStyle}>
                  <span>▶ Decision Review prompt</span>
                </summary>

                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.62 }}>Copy it, run the review, and keep the output with the decision.</div>

                  <button
                    onClick={copyPrompt}
                    style={{
                      borderRadius: 12,
                      border: 'none',
                      padding: '10px 12px',
                      background: '#111',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                      marginLeft: 'auto',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copied ? 'Copied ✓' : 'Copy prompt'}
                  </button>
                </div>

                <pre
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: '#fff',
                    padding: 14,
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {reviewPrompt}
                </pre>
              </details>
            </div>
          )}
        </section>

        {/* Bottom: Door Notes only */}
        <footer
          style={{
            maxWidth: 720,
            margin: '18px auto 0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.55, whiteSpace: 'nowrap' }}>
            <Link href="/door-notes" style={navLinkStyle}>
              Door Notes
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

