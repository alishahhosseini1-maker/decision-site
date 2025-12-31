'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const FIXED_TONE =
  'Calm, precise, direct — like a senior engineer doing a design review.';

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [horizon, setHorizon] = useState('24–48 months');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const prompt = useMemo(() => {
    const trimmedDecision = decision.trim();
    const trimmedContext = context.trim();
    const safeHorizon = horizon.trim() || '24–48 months';

    const decisionBlock = trimmedDecision
      ? `DECISION:\n${trimmedDecision}`
      : `DECISION:\n[Paste the decision here]`;

    const contextBlock = trimmedContext
      ? `\n\nCONTEXT (optional):\n${trimmedContext}`
      : '';

    return `You are a disciplined investing decision partner for senior engineers and tech executives.

Your job is NOT to provide stock picks, predictions, or market commentary.
Your job is to pressure-test a decision before capital is committed.

Time horizon: ${safeHorizon}

Style requirements:
- ${FIXED_TONE}
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
    try {
      await navigator.clipboard.writeText(prompt);
      alert('Copied Decision Review prompt to clipboard.');
    } catch {
      alert('Could not copy. Please copy manually from the prompt box.');
    }
  };

  return (
    <main
      style={{
        maxWidth: 860,
        margin: '56px auto',
        padding: '0 20px 72px',
        lineHeight: 1.55,
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 44,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.75 }}>
          <strong>Decision Layer</strong> · working reference
        </div>

        <nav style={{ display: 'flex', gap: 14, fontSize: 14, flexWrap: 'wrap' }}>
          <Link href="/decision-review" style={{ textDecoration: 'none' }}>
            Decision Review
          </Link>
          <Link href="/decision-models" style={{ textDecoration: 'none' }}>
            Decision Models
          </Link>
          <Link href="/walkthrough" style={{ textDecoration: 'none' }}>
            Walkthrough
          </Link>
        </nav>
      </header>

      {/* Centered hero */}
      <section style={{ textAlign: 'center', marginBottom: 26 }}>
        <h1 style={{ fontSize: 52, margin: '0 0 10px 0', letterSpacing: -0.8 }}>
          Decision Layer
        </h1>

        <p style={{ fontSize: 18, margin: '0 0 6px 0', opacity: 0.9 }}>
          A structured decision review for investment decisions before committing capital.
        </p>

        <p style={{ fontSize: 14, margin: 0, opacity: 0.7 }}>
          No stock picks. No predictions. No market commentary.
        </p>
      </section>

      {/* Tool card */}
      <section
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: 18,
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.55)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 8 }}>
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
            border: '1px solid rgba(0,0,0,0.12)',
            padding: 14,
            fontSize: 14,
            lineHeight: 1.5,
            background: 'rgba(255,255,255,0.9)',
            outline: 'none',
          }}
        />

        {/* Optional: context + settings */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'rgba(255,255,255,0.75)',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {showAdvanced ? '▼' : '▶'} Optional: context + settings
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 6 }}>
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
                  border: '1px solid rgba(0,0,0,0.12)',
                  padding: 14,
                  fontSize: 14,
                  lineHeight: 1.5,
                  background: 'rgba(255,255,255,0.9)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 6 }}>
                  Time horizon
                </div>
                <input
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.12)',
                    padding: '12px 14px',
                    fontSize: 14,
                    background: 'rgba(255,255,255,0.9)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 6 }}>
                  Tone (fixed)
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.12)',
                    padding: '12px 14px',
                    fontSize: 14,
                    background: 'rgba(245,245,245,0.9)',
                    opacity: 0.9,
                  }}
                >
                  {FIXED_TONE}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copy button */}
        <button
          type="button"
          onClick={copyPrompt}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.12)',
            background: '#111',
            color: '#fff',
            fontSize: 14,
            fontWeight: 650,
            cursor: 'pointer',
          }}
        >
          Copy Decision Review Prompt
        </button>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Paste into ChatGPT / Claude / Gemini.
        </div>

        {/* Prompt preview toggle */}
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'rgba(255,255,255,0.75)',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {showPrompt ? '▼' : '▶'} View generated prompt
        </button>

        {showPrompt && (
          <pre
            style={{
              marginTop: 10,
              whiteSpace: 'pre-wrap',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(255,255,255,0.9)',
              padding: 14,
              fontSize: 12,
              lineHeight: 1.45,
              overflow: 'auto',
            }}
          >
            {prompt}
          </pre>
        )}
      </section>

      <footer
        style={{
          marginTop: 28,
          textAlign: 'center',
          fontStyle: 'italic',
          opacity: 0.7,
        }}
      >
        If this feels slow, that’s intentional.
      </footer>
    </main>
  );
}
