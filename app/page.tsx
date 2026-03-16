'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');

  const [lastUsedAt, setLastUsedAt] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<any | null>(null);

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const decisionInputRef = useRef<HTMLTextAreaElement | null>(null);

  const STORAGE = {
    lastUsed: 'dl:last_used_at',
  };

  useEffect(() => {
    try {
      const lu = localStorage.getItem(STORAGE.lastUsed);
      setLastUsedAt(lu);
    } catch {
      // ignore
    }

    setTimeout(() => {
      decisionInputRef.current?.focus();
    }, 50);
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

  const scoreTotal =
    typeof reviewResult?.score?.total === 'number' ? reviewResult.score.total : null;

  const scoreMeta =
    scoreTotal === null
      ? {
          color: '#111111',
          border: 'rgba(0,0,0,0.08)',
          label: '',
          background: 'rgba(0,0,0,0.02)',
        }
      : scoreTotal <= 39
        ? {
            color: '#dc2626',
            border: 'rgba(220,38,38,0.22)',
            label: 'Weak',
            background: 'rgba(220,38,38,0.03)',
          }
        : scoreTotal <= 69
          ? {
              color: '#eab308',
              border: 'rgba(234,179,8,0.24)',
              label: 'Needs work',
              background: 'rgba(234,179,8,0.04)',
            }
          : {
              color: '#16a34a',
              border: 'rgba(22,163,74,0.22)',
              label: 'Survivable',
              background: 'rgba(22,163,74,0.03)',
            };

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
    setApiError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          context,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'API request failed');
      }

      setReviewResult(data);

      const iso = new Date().toISOString();
      setLastUsedAt(iso);

      try {
        localStorage.setItem(STORAGE.lastUsed, iso);
      } catch {
        // ignore
      }

      setTimeout(() => {
        snapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err: any) {
      setApiError(err?.message || 'Something went wrong. Please try again.');
      setReviewResult(null);
    } finally {
      setLoading(false);
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
    fontWeight: 600,
    opacity: 0.9,
  };

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const lastUsedLabel = formatShort(lastUsedAt);
  const ctaBg = '#0b0b0b';

  const decisionPlaceholder =
    'Examples: quit my job · invest money · hire someone · move cities · start a company';

  const contextLabel = 'Add any details that might matter (optional)';
  const contextPlaceholder = 'Examples: money involved, people affected, deadlines, risks ...';
  const optionalDetailsLabel = '▶ Context (optional)';

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
          <div style={{ fontSize: 12, opacity: 0.42 }}>
            Last used: <span style={{ opacity: 0.65 }}>{lastUsedLabel}</span>
          </div>

          <nav style={{ fontSize: 13, opacity: 0.35, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <Link href="/private-review" style={navLinkStyle}>
              Leave
            </Link>
          </nav>
        </header>

        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h1 style={{ fontSize: 64, margin: 0, letterSpacing: -1.1 }}>Decision Layer</h1>
        </section>

        <section
          style={{
            maxWidth: 720,
            margin: '40px auto 0',
            border,
            borderRadius: 18,
            background: shellBg,
            padding: 18,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            What decision are you facing?
          </div>

          <textarea
            ref={decisionInputRef}
            value={decision}
            onChange={(e) => {
              setDecision(e.target.value);
              if (decisionError) setDecisionError(null);
              if (hasStarted) setHasStarted(false);
              if (apiError) setApiError(null);
              if (reviewResult) setReviewResult(null);
            }}
            placeholder={decisionPlaceholder}
            rows={5}
            style={{
              width: '100%',
              borderRadius: 14,
              border: decisionError
                ? '1px solid rgba(220,38,38,0.55)'
                : '1px solid rgba(0,0,0,0.15)',
              padding: 14,
              fontSize: 14,
              lineHeight: 1.45,
              resize: 'vertical',
              background: '#fff',
              outline: 'none',
            }}
          />

          {decisionError && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
              {decisionError}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <details style={detailStyle}>
              <summary style={summaryStyle}>
                <span>{optionalDetailsLabel}</span>
              </summary>

              <div style={{ marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                    {contextLabel}
                  </div>
                  <textarea
                    value={context}
                    onChange={(e) => {
                      setContext(e.target.value);
                      if (apiError) setApiError(null);
                      if (reviewResult) setReviewResult(null);
                    }}
                    placeholder={contextPlaceholder}
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
              </div>
            </details>
          </div>

          <button
            onClick={beginReview}
            disabled={loading}
            style={{
              marginTop: 14,
              width: '100%',
              borderRadius: 14,
              border: 'none',
              padding: '14px 16px',
              background: ctaBg,
              color: '#fff',
              fontSize: 14,
              fontWeight: 900,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.82 : 1,
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
              transition: 'background 180ms ease',
            }}
          >
            {loading ? 'Reviewing...' : 'See My Decision Clearly'}
          </button>

          {apiError && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
              {apiError}
            </div>
          )}

          {hasStarted && (
            <div style={{ marginTop: 12 }} ref={snapshotRef}>
              <div
                style={{
                  border,
                  borderRadius: 14,
                  background: '#fff',
                  padding: 14,
                  boxShadow: '0 10px 20px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 900 }}>🧭 Instant Snapshot</div>

                {reviewResult?.score && (
                  <div
                    style={{
                      marginTop: 12,
                      border: `1px solid ${scoreMeta.border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: scoreMeta.background,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
                      Decision Quality Score
                    </div>

                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        lineHeight: 1,
                        color: scoreMeta.color,
                      }}
                    >
                      {reviewResult.score.total}/100
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: scoreMeta.color,
                      }}
                    >
                      {scoreMeta.label}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.78 }}>
                      {reviewResult.score.summary}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.55 }}>
                  <div>
                    <strong>Door (the decision):</strong> {reviewResult?.snapshot?.door ?? '—'}
                  </div>
                  <div>
                    <strong>Hinge (what must be true):</strong> {reviewResult?.snapshot?.hinge ?? '—'}
                  </div>
                  <div>
                    <strong>Locks (what gets hard to undo):</strong> {reviewResult?.snapshot?.lock ?? '—'}
                  </div>
                  <div>
                    <strong>Trap (the hidden risk):</strong> {reviewResult?.snapshot?.trap ?? '—'}
                  </div>
                  <div>
                    <strong>Exit (when to pause):</strong> {reviewResult?.snapshot?.exit ?? '—'}
                  </div>
                  <div>
                    <strong>Step (the next move):</strong> {reviewResult?.snapshot?.step ?? '—'}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <details style={detailStyle}>
                    <summary style={summaryStyle}>
                      <span>▶ See In-Depth Review</span>
                    </summary>

                    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.72, lineHeight: 1.6 }}>
                      In-depth review coming next.
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </section>

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