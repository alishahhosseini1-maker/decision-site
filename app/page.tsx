'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const horizon = '24–48 months';
  const tone =
    'Calm, precise, direct. Like a senior engineer doing a design review.';

  const prompt = useMemo(() => {
    const decisionBlock = decision.trim()
      ? `DECISION:\n${decision.trim()}`
      : `DECISION:\n[Paste the decision here]`;

    const contextBlock = context.trim()
      ? `\n\nCONTEXT (optional):\n${context.trim()}`
      : '';

    return `You are a disciplined investing decision partner for senior engineers and executives.

Your job is NOT to provide stock picks, predictions, or market commentary.
Your job is to pressure-test a decision before capital is committed.

Time horizon: ${horizon}

Style requirements:
- ${tone}
- Ignore information that does not materially change conviction, sizing, timing, or risk
- Challenge vague thinking
- Surface assumptions
- Force specificity
- Highlight risks and failure modes
- Separate knowns vs unknowns

${decisionBlock}${contextBlock}

Now run a Decision Review with this structure:

1) Clarify the decision
2) What has to be true?
3) What would change your mind?
4) Key risks / failure modes
5) Opportunity cost
6) Sizing framework
7) Entry / exit rules
8) Checklist
9) Recommendation`;
  }, [decision, context]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    alert('Decision Review prompt copied.');
  };

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '72px auto',
        padding: '0 20px',
        lineHeight: 1.6,
      }}
    >
      {/* Top nav (lighter, lower emphasis) */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 16,
          fontSize: 13,
          opacity: 0.65,
          marginBottom: 48,
        }}
      >
        <Link href="/decision-review">Decision Review</Link>
        <Link href="/decision-models">Decision Models</Link>
        <Link href="/walkthrough">Walkthrough</Link>
      </nav>

      {/* Hero */}
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Decision Layer</h1>

      <p style={{ fontSize: 18, marginBottom: 6 }}>
        A structured decision review for investment decisions before committing
        capital.
      </p>

      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 36 }}>
        No stock picks. No predictions. No market commentary.
      </p>

      {/* Core card */}
      <div
        style={{
          background: 'white',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 14,
          padding: 20,
        }}
      >
        <label style={{ fontWeight: 600 }}>Decision</label>

        <textarea
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="Example: I’m considering increasing my NVIDIA exposure, but I’m unsure how to size it given RSUs, valuation risk, and a 30% drawdown tolerance."
          rows={5}
          style={{
            width: '100%',
            marginTop: 10,
            padding: 14,
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.15)',
            fontSize: 14,
          }}
        />

        {/* Optional section */}
        <div
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            marginTop: 14,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ▶ Optional: context + settings
        </div>

        {showAdvanced && (
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Role, compensation structure, constraints, liquidity needs…"
            rows={4}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 14,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.15)',
              fontSize: 14,
            }}
          />
        )}

        {/* Copy button */}
        <button
          onClick={copyPrompt}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '14px 0',
            background: 'black',
            color: 'white',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Copy Decision Review Prompt
        </button>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
          Paste into ChatGPT / Claude / Gemini.
        </div>

        {/* View generated prompt toggle */}
        <div
          onClick={() => setShowPrompt(!showPrompt)}
          style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'white',
            color: 'black',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ▶ View generated prompt
        </div>

        {/* Prompt preview */}
        {showPrompt && (
          <pre
            style={{
              marginTop: 12,
              padding: 14,
              background: 'black',
              color: 'white',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.15)',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {prompt}
          </pre>
        )}
      </div>

      {/* Bottom positioning statement */}
      <div
        style={{
          marginTop: 42,
          display: 'flex',
          gap: 10,
          flexWrap: 'nowrap',
          justifyContent: 'center',
          fontSize: 13,
          opacity: 0.75,
        }}
      >
        <span>Pressure-tested decisions</span>
        <span>•</span>
        <span>Capital-aware reasoning</span>
        <span>•</span>
        <span>Executive-grade clarity</span>
      </div>
    </main>
  );
}
