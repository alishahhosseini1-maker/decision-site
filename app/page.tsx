'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [horizon, setHorizon] = useState('24–48 months');

  // UX state
  const [copied, setCopied] = useState(false);
  const [lastUsedAt, setLastUsedAt] = useState<string | null>(null);

  // progressive disclosure + mobile nav cleanup
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const promptDetailsRef = useRef<HTMLDetailsElement | null>(null);

  const STORAGE = {
    lastUsed: 'dl:last_used_at',
    noteDraft: 'dl:note_draft_v1',
  };

  const tone = 'Calm, precise, direct. Like a senior engineer doing a design review.';

  useEffect(() => {
    // load last used
    try {
      const lu = localStorage.getItem(STORAGE.lastUsed);
      setLastUsedAt(lu);
    } catch {
      // ignore
    }

    // mobile detection
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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

  const prompt = useMemo(() => {
    const trimmedDecision = decision.trim();
    const trimmedContext = context.trim();

    const decisionBlock = trimmedDecision
      ? `DECISION:\n${trimmedDecision}`
      : `DECISION:\n[Paste the decision here]`;

    const contextBlock = trimmedContext
      ? `\n\nCONTEXT (only what changes sizing, timing, or risk):\n${trimmedContext}`
      : `\n\nCONTEXT (optional):\n[If relevant: constraints, exposure, timeline, stakes]`;

    return `You are a disciplined decision partner.

Your job is NOT to provide stock picks, predictions, or market commentary.
Your job is to pressure-test a decision before committing capital, time, or reputation.

Time horizon: ${horizon}

Style requirements:
- ${tone}
- Ignore information that does not materially change conviction, sizing, timing, or risk
- Challenge vague thinking
- Surface assumptions
- Force specificity (numbers, constraints, triggers)
- Highlight risks, failure modes, and base rates
- Separate "knowns" vs "unknowns"
- Output should be skimmable and actionable

${decisionBlock}${contextBlock}

Now run a Decision Review with this structure:

1) Clarify the decision (rewrite it in 1 sentence)
2) What has to be true? (top 5 assumptions)
3) What would change your mind? (disconfirming evidence)
4) Key risks / failure modes (ranked)
5) Opportunity cost (what you're giving up)
6) Sizing framework (a simple rule-of-thumb based on uncertainty + downside)
7) Entry/exit plan (specific triggers, not vibes)
8) Checklist (10 yes/no items)
9) Recommendation (Proceed / Proceed smaller / Wait / Don't do it) + 2-line rationale`;
  }, [decision, context, horizon]);

  // Generate = mark used + copy prompt + reveal prompt section
  const generateDecisionReview = async () => {
    if (!decision.trim()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setHasGenerated(true);

    const iso = new Date().toISOString();
    setLastUsedAt(iso);
    try {
      localStorage.setItem(STORAGE.lastUsed, iso);
    } catch {}

    // Try copy prompt (best UX)
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard may be blocked; still reveal prompt for manual copy
    }

    setTimeout(() => {
      if (promptDetailsRef.current) {
        promptDetailsRef.current.open = true;
        promptDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Copy prompt explicitly (green button)
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  // Only shown after Generate
  const saveAsDecisionNote = async () => {
    const noteText = `Decision:
${decision.trim() || '[fill]'}

Context (only what changes sizing, timing, or risk):
${context.trim() || '[none]'}

Time horizon:
${horizon}

What would change my mind:
[fill]

Primary risks / failure modes:
[fill]

Confidence:
[Low | Medium | High]`;

    try {
      localStorage.setItem(
        STORAGE.noteDraft,
        JSON.stringify({
          decision: decision.trim(),
          context: context.trim(),
          horizon,
          createdAt: new Date().toISOString(),
        })
      );
    } catch {}

    try {
      await navigator.clipboard.writeText(noteText);
    } catch {}

    window.location.href = '/decision-notes';
  };

  const shellBg = 'rgba(255,255,255,0.65)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const detailStyle: React.CSSProperties = {
    border,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.55)',
    padding: '10px 12px',
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

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.62,
              fontWeight: 400,
              alignItems: 'center',
            }}
          >
            <Link href="/decision-review" style={navLinkStyle}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Decision Notes
            </Link>
            <Link href="/decision-library" style={navLinkStyle}>
              Decision Library
            </Link>

            {!isMobile && (
              <>
                <span style={{ opacity: 0.5, marginLeft: 6 }}>•</span>
                <span style={{ fontSize: 12, opacity: 0.55 }}>
                  Last used: <span style={{ opacity: 0.75 }}>{lastUsedLabel}</span>
                </span>
                <span style={{ fontSize: 12, opacity: 0.45 }}>
                  (bookmark + return before you commit)
                </span>
              </>
            )}
          </nav>
        </header>

        {/* Centered hero */}
        <section style={{ textAlign: 'center', marginTop: 54 }}>
          <h1 style={{ fontSize: 64, margin: 0, letterSpacing: -1.1 }}>Decision Layer</h1>

          <p style={{ margin: '10px 0 0', fontSize: 18, opacity: 0.9 }}>
            Clear thinking before committing capital — time, or reputation.
          </p>

          {hasGenerated && (
            <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.65 }}>
              No stock picks. No predictions. No market commentary.
            </p>
          )}
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
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Decision</div>

          <textarea
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="Example: I’m considering increasing my NVIDIA exposure, but I’m unsure how to size it given RSUs, valuation risk, and a 30% drawdown tolerance."
            rows={5}
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

          {/* ✅ RESTORED: Optional toggle exactly like before */}
          <div style={{ marginTop: 12 }}>
            <details style={detailStyle}>
              <summary style={summaryStyle}>
                <span>▶ Optional: context</span>
                <span style={{ opacity: 0.55, fontSize: 12 }}>expand</span>
              </summary>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, opacity: 0.9 }}>
                      Context (optional)
                    </div>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Role, comp structure, existing exposures, constraints, liquidity needs…"
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
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, opacity: 0.9 }}>
                        Time horizon
                      </div>
                      <input
                        value={horizon}
                        onChange={(e) => setHorizon(e.target.value)}
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
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, opacity: 0.9 }}>
                        Tone (fixed)
                      </div>
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

          {/* Primary action */}
          <button
            onClick={generateDecisionReview}
            style={{
              marginTop: 14,
              width: '100%',
              borderRadius: 14,
              border: 'none',
              padding: '14px 16px',
              background: '#0b0b0b',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
            }}
          >
            Generate decision review
          </button>

          {/* After Generate */}
          {hasGenerated && (
            <>
              <div style={{ marginTop: 12 }}>
                <details ref={promptDetailsRef} style={detailStyle}>
                  <summary style={summaryStyle}>
                    <span>▶ View generated prompt</span>
                    <span style={{ opacity: 0.55, fontSize: 12 }}>expand</span>
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
                    <div style={{ fontSize: 13, opacity: 0.62 }}>
                      Paste in ChatGPT / Claude / Gemini.
                    </div>

                    {/* ✅ Green copy prompt button */}
                    <button
                      onClick={copyPrompt}
                      style={{
                        borderRadius: 12,
                        border: 'none',
                        padding: '10px 12px',
                        background: '#16a34a',
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
                    {prompt}
                  </pre>
                </details>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <button
                  onClick={saveAsDecisionNote}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: 0.75,
                    textDecoration: 'underline',
                  }}
                  title="Copies a note scaffold and takes you to Decision Notes"
                >
                  Save as Decision Note
                </button>

                <div style={{ fontSize: 13, opacity: 0.55 }}>
                  Reminder: return here <strong>before</strong> you act.
                </div>
              </div>
            </>
          )}
        </section>

        {/* Bottom benefits */}
        <footer
          style={{
            maxWidth: 720,
            margin: '18px auto 0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 13,
              opacity: 0.62,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
              overflowX: 'auto',
              paddingBottom: 6,
            }}
          >
            <span>Pressure-tested decisions</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Capital-aware reasoning</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Executive-grade clarity</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
