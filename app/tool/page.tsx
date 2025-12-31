'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export default function ToolPage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [horizon, setHorizon] = useState('24–48 months');
  const [tone, setTone] = useState(
    'Calm, precise, direct. Like a senior engineer doing a design review.'
  );

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
  }, [decision, context, horizon, tone]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      alert('Copied Decision Review prompt to clipboard.');
    } catch {
      alert('Copy failed. Select the text and copy manually.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Decision Layer</h1>
            <p className="mt-1 text-sm text-zinc-600">
              A decision review layer for long-term capital allocation
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              No stock picks. No predictions. No market commentary.
            </p>
          </div>

          <Link href="/" className="text-sm text-zinc-700 hover:underline">
            ← Back
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Decision under consideration</label>
            <textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Example: I’m considering initiating a position in NVIDIA but am unsure how to size it given existing RSU exposure and current market sentiment."
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-zinc-300"
              rows={5}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Context (optional)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Role, compensation structure, existing exposures, constraints, liquidity needs…"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-zinc-300"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Time horizon</label>
              <input
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tone</label>
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={copyPrompt}
              className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Copy Decision Review Prompt
            </button>
            <div className="text-sm text-zinc-600">Then paste into ChatGPT/Gemini/Claude.</div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Generated Prompt (preview)</div>
            <pre className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-xs leading-5 text-zinc-800">
              {prompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
