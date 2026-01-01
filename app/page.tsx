'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [context, setContext] = useState('');
  const [horizon, setHorizon] = useState('24–48 months');
  const [showPrompt, setShowPrompt] = useState(false);

  const tone =
    'Calm, precise, direct. Like a senior engineer doing a design review.';

  const prompt = useMemo(() => {
    const trimmedDecision = decision.trim();
    const trimmedContext = context.trim();

    const decisionBlock = trimmedDecision
      ? `DECISION:\n${trimmedDecision}`
      : `DECISION:\n[Paste the decision here]`;

    const contextBlock = trimmedContext
      ? `\n\nCONTEXT (optional):\n${trimmedContext}`
      : '';

    return `You are a disciplined investing decision partner for senior engineers and tech executives.

Your job is NOT to provide stock picks, predictions, or market commentary.
Your job is to pressure-test a decision before capital is committed.

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

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    alert('Copied Decision Review prompt to clipboard.');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #E6EAEA 0%, #F5F6F6 60%, #FFFFFF 100%)',
        color: '#0A0A0A',
      }}
    >
      {/* Top nav */}
      <header
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: '28px 20px 0',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <nav
          style={{
            display: 'flex',
            gap: 18,
            fontSize: 13,
            opacity: 0.68,
            letterSpacing: 0.1,
          }}
        >
          <Link href="/decision-review" style={{ textDecoration: 'none', color: 'inherit' }}>
            Decision Review
          </Link>
          <Link href="/decision-models" style={{ textDecoration: 'none', color: 'inherit' }}>
            Decision Models
          </Link>
          <Link href="/walkthrough" style={{ textDecoration: 'none', color: 'inherit' }}>
            Walkthrough
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '44px 20px 56px' }}>
        {/* Hero */}
        <section style={{ maxWidth: 760 }}>
          <h1
            style={{
              fontSize: 64,
              lineHeight: 1.02,
              margin: '0 0 18px 0',
              letterSpacing: -1.2,
              fontWeight: 500,
            }}
          >
            Decision Layer
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              margin: '0 0 8px 0',
              opacity: 0.92,
            }}
          >
            Clear thinking before committing capital.
          </p>

          <p style={{ fontSize: 14, margin: 0, opacity: 0.65 }}>
            No stock picks. No predictions. No market commentary.
          </p>
        </section>

        {/* Card */}
        <section
          style={{
            marginTop: 26,
            maxWidth: 760,
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 18,
            padding: 18,
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          {/* Decision */}
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 10 }}>
              Decision
            </div>

            <textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Example: I’m considering increasing my NVIDIA exposure, but I’m unsure how to size it given RSUs, valuation risk, and a 30% drawdown tolerance."
              rows={5}
              style={{
                width: '100%',
                resize: 'vertical',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.14)',
                padding: 14,
                fontSize: 14,
                lineHeight: 1.55,
                outline: 'none',
                background: '#FFFFFF',
              }}
            />
          </div>

          {/* Optional settings */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((v) => !v)}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'rgba(255,255,255,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {isAdvancedOpen ? '▼' : '▶'} Optional: context + settings
            </span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              {isAdvancedOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {isAdvancedOpen && (
            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 8 }}>
                  Context (optional)
                </div>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Role, compensation structure, existing exposures, constraints, liquidity needs…"
                  rows={4}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.14)',
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 1.55,
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 8 }}>
                    Time horizon
                  </div>
                  <input
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.14)',
                      padding: '12px 14px',
                      fontSize: 14,
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 8 }}>
                    Tone
                  </div>
                  <div
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.10)',
                      padding: '12px 14px',
                      fontSize: 13,
                      background: 'rgba(0,0,0,0.04)',
                      color: 'rgba(0,0,0,0.75)',
                    }}
                  >
                    {tone}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={copyPrompt}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '14px 16px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, #111111 0%, #000000 100%)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            Copy Decision Review Prompt
          </button>

          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.65 }}>
            Paste into ChatGPT / Claude / Gemini.
          </div>

          {/* View generated prompt */}
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#FFFFFF',
              color: '#0A0A0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 650 }}>
              View generated prompt
            </span>

            {/* black pill with white chevron */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 999,
                background: '#000',
                color: '#FFF',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {showPrompt ? '▲' : '▼'}
            </span>
          </button>

          {showPrompt && (
            <pre
              style={{
                marginTop: 12,
                whiteSpace: 'pre-wrap',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.10)',
                background: '#FFFFFF',
                padding: 14,
                fontSize: 12,
                lineHeight: 1.5,
                color: 'rgba(0,0,0,0.82)',
              }}
            >
              {prompt}
            </pre>
          )}
        </section>

        {/* Bottom line */}
        <footer
          style={{
            maxWidth: 760,
            marginTop: 18,
            textAlign: 'center',
            fontSize: 12.5,
            opacity: 0.65,
          }}
        >
          Pressure-tested decisions&nbsp;&nbsp;•&nbsp;&nbsp;Capital-aware reasoning&nbsp;&nbsp;•&nbsp;&nbsp;Executive-grade clarity
        </footer>
      </main>
    </div>
  );
}
