'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Domain =
  | 'Money/Portfolio'
  | 'Career/Business'
  | 'Relationships/Family'
  | 'Health'
  | 'Time/Commitments'
  | 'General';

type Snapshot = {
  domain: Domain;
  door: string;
  hinge: string;
  lock: string;
  trap: string;
  exit: string;
  step: string;
};

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

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDetailsElement | null>(null);
  const decisionInputRef = useRef<HTMLTextAreaElement | null>(null);

  const STORAGE = {
    lastUsed: 'dl:last_used_at',
  };

  const tone = 'Calm, precise, direct — like a senior engineer doing a design review.';

  useEffect(() => {
    try {
      const lu = localStorage.getItem(STORAGE.lastUsed);
      setLastUsedAt(lu);
    } catch {
      // ignore
    }

    // welcoming: put cursor where the user should start
    setTimeout(() => {
      decisionInputRef.current?.focus();
    }, 50);

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

  // -------------------------
  // PROMPT ENGINE (kept)
  // -------------------------
  const reviewPrompt = useMemo(() => {
    const trimmedDecision = decision.trim();
    const trimmedContext = context.trim();

    const decisionBlock = trimmedDecision ? `DECISION:\n${trimmedDecision}` : `DECISION:\n[Paste the decision here]`;

    const contextBlock = trimmedContext
      ? `\n\nWHY THIS IS HARD TO UNDO (constraints / stakes):\n${trimmedContext}`
      : '';

    return `You are a disciplined decision partner.

Your job is NOT to provide advice, recommendations, or predictions.
Your job is to slow the moment before commitment and pressure-test the decision.

Time horizon: ${horizon}

Style requirements:
- ${tone}
- Challenge vague thinking
- Force specificity (numbers, constraints, triggers)
- Surface hidden assumptions and failure modes
- Separate knowns vs unknowns
- Optimize for clarity and survivability, not certainty

---

${decisionBlock}${contextBlock}

Now run a Decision Review using this structure:

1) Decision classification
What kind of decision is this?
(e.g., reversible experiment, capital allocation, identity/career move, strategic lock-in, irreversible commitment)

2) Clarify the decision
Rewrite it in one precise sentence including scope, size, and timing.

3) What has to be true? (Top 3 hinges)
List the three load-bearing assumptions.
If any one fails, the decision meaningfully breaks.

4) Irreversibility check
What becomes hard to undo after committing?
(Time, capital, reputation, optionality, relationships)

5) Disconfirming evidence
What observable facts would make a rational person pause or walk away?

6) Failure modes (ranked)
How does this realistically go wrong?
Describe consequences, not probabilities.

7) Opportunity cost
What future paths or options are you giving up by stepping through this door?

8) Decision rule + sizing
Given uncertainty and downside, what is a survivable way to proceed?
Define scope, pacing, or limits.

9) Triggers
What signals would make you:
- Proceed
- Pause
- Stop or exit

10) Verdict
(Proceed / Proceed smaller / Wait / Don’t do it)

Provide a 2-line rationale focused on survivability and clarity — not confidence.`;
  }, [decision, context, horizon]);

  // -------------------------
  // UI label (kept)
  // -------------------------
  const labelForDomain = (d: Domain) => {
    switch (d) {
      case 'Money/Portfolio':
        return 'Money';
      case 'Career/Business':
        return 'Work/Business';
      case 'Relationships/Family':
        return 'Relationships';
      case 'Health':
        return 'Health';
      case 'Time/Commitments':
        return 'Time';
      default:
        return 'General';
    }
  };

  // -------------------------
  // More tailored Instant Snapshot (kept from your current version)
  // Goal: reads like a smart 15-year-old (clear, direct, no jargon)
  // -------------------------
  const instantSnapshot: Snapshot | null = useMemo(() => {
    const raw = decision.trim();
    const d = raw.toLowerCase();
    if (!d) return null;

    const includesAny = (words: string[]) => words.some((w) => d.includes(w));

    // 1) Detect archetype first
    const isOffer = includesAny([
      'offer',
      'sign',
      'accept',
      'decline',
      'job',
      'role',
      'promotion',
      'comp',
      'salary',
      'equity',
      'package',
      'join',
      'resign',
      'quit',
    ]);

    const isInvestCapital = includesAny([
      'invest',
      'investment',
      'deploy',
      'allocate',
      'allocation',
      'wire',
      'commit capital',
      'check',
      'seed',
      'series',
      'angel',
      'fund',
      'term sheet',
      'portfolio',
      'stocks',
      'stock',
      'etf',
      'options',
      'crypto',
      'bitcoin',
      'btc',
      'put',
      'call',
      'spread',
      'bond',
      'treasury',
      'yield',
    ]);

    const isHireExec = includesAny([
      'hire',
      'hiring',
      'vp',
      'vice president',
      'head of',
      'cfo',
      'cto',
      'coo',
      'ceo',
      'director',
      'exec',
      'executive',
      'replace',
      'fire',
      'firing',
      'let go',
      'terminate',
    ]);

    const isShutOrDouble = includesAny([
      'shut down',
      'shutdown',
      'sunset',
      'kill',
      'cancel',
      'end',
      'pause',
      'stop',
      'wind down',
      'double down',
      'scale',
      'invest more',
      'go all in',
      'pivot',
    ]);

    const isRaiseSellWait = includesAny([
      'raise',
      'fundraise',
      'fundraising',
      'round',
      'series a',
      'series b',
      'seed',
      'sell',
      'acquire',
      'acquisition',
      'm&a',
      'exit',
      'buyout',
      'offer to buy',
      'liquidity',
      'secondary',
      'wait',
      'delay',
      'hold',
    ]);

    // 2) Domain (label only)
    let domain: Domain = 'General';

    const careerBusiness = includesAny([
      'job',
      'career',
      'quit',
      'leave',
      'resign',
      'offer',
      'promotion',
      'raise',
      'comp',
      'salary',
      'join',
      'startup',
      'founder',
      'cofounder',
      'hire',
      'hiring',
      'fire',
      'firing',
      'vp',
      'director',
      'ceo',
      'product',
      'pricing',
      'strategy',
      'contract',
      'customer',
      'client',
      'pipeline',
      'sales',
      'business',
    ]);

    const money = includesAny([
      'portfolio',
      'stocks',
      'stock',
      'etf',
      'index',
      'spy',
      'qqq',
      'nvda',
      'msft',
      'aapl',
      'crypto',
      'bitcoin',
      'btc',
      'options',
      'call',
      'put',
      'spread',
      'rebalance',
      'allocation',
      'rates',
      'treasury',
      'bond',
      'yield',
      'invest',
      'investment',
      'fund',
      'term sheet',
    ]);

    const relationshipsFamily = includesAny([
      'marry',
      'marriage',
      'divorce',
      'relationship',
      'partner',
      'girlfriend',
      'boyfriend',
      'wife',
      'husband',
      'move in',
      'break up',
      'breakup',
      'baby',
      'kids',
      'child',
      'parenting',
      'family',
      'custody',
      'school',
    ]);

    const health = includesAny([
      'health',
      'diet',
      'fasting',
      'workout',
      'training',
      'injury',
      'pain',
      'surgery',
      'med',
      'meds',
      'medicine',
      'doctor',
      'therapy',
      'sleep',
      'alcohol',
      'weight',
      'cut',
      'bulk',
      'run',
      'ironman',
      'triathlon',
    ]);

    const timeCommitments = includesAny([
      'schedule',
      'time',
      'commit',
      'commitment',
      'routine',
      'habit',
      'daily',
      'weekly',
      'calendar',
      'meeting',
      'board',
      'volunteer',
      'side project',
      'project',
      'course',
      'mba',
      'cfa',
      'class',
    ]);

    if (careerBusiness) domain = 'Career/Business';
    else if (money) domain = 'Money/Portfolio';
    else if (relationshipsFamily) domain = 'Relationships/Family';
    else if (health) domain = 'Health';
    else if (timeCommitments) domain = 'Time/Commitments';

    // 3) Archetype snapshots
    const offerSnap: Snapshot = {
      domain: 'Career/Business',
      door: 'Heavy door (once you sign, your life starts moving in that direction fast).',
      hinge: 'The deal is only good if the day-to-day job is actually the job you want.',
      lock: 'After you say yes, it’s harder to change your story without looking flaky.',
      trap: 'Picking the shiny title/money and ignoring the actual work + manager.',
      exit: 'If the role expectations change, the manager is evasive, or the team is a mess before day 30.',
      step: 'Write 3 non-negotiables. Ask direct questions. If you can’t get clear answers, pause.',
    };

    const investSnap: Snapshot = {
      domain: 'Money/Portfolio',
      door: 'Steel-glass door (you can exit, but emotions + price swings mess with you).',
      hinge: 'You only win if you can hold through scary moments without panic-selling.',
      lock: 'Once you buy, your brain will defend the decision even if facts change.',
      trap: 'Thinking “I’m investing” when you’re really guessing short-term price moves.',
      exit: 'If the reason you bought is no longer true (numbers, product, demand), not just because price dipped.',
      step: 'Decide your max loss and max size first. Start smaller. Add only if the story stays true.',
    };

    const hireSnap: Snapshot = {
      domain: 'Career/Business',
      door: 'Steel door (a bad senior hire is expensive and slow to undo).',
      hinge: 'This person must solve a real bottleneck you can name in one sentence.',
      lock: 'Once they’re in, politics + morale make it hard to reverse quickly.',
      trap: 'Hiring for vibe/resume instead of proof they’ve done this exact job before.',
      exit: 'If they can’t ship outcomes in 30–60 days, blame everyone else, or avoid clear ownership.',
      step: 'Define the first 30/60/90 days. One owner. One scorecard. If they won’t accept it, don’t hire.',
    };

    const shutOrDoubleSnap: Snapshot = {
      domain: 'Career/Business',
      door: 'Trapdoor (looks like “just a decision,” but it changes your future options).',
      hinge: 'The real question: is this failing because of execution… or because nobody truly wants it?',
      lock: 'Time and attention are the real money. You don’t get them back.',
      trap: 'Throwing more effort at something that never had real demand.',
      exit: 'If you can’t name a clear path to traction with a deadline and numbers, you’re guessing.',
      step: 'Set a “proof window” with 1–2 metrics. If you don’t hit it, shut down cleanly and move on.',
    };

    const raiseSellWaitSnap: Snapshot = {
      domain: 'Career/Business',
      door: 'Heavy door with a window (you can change course, but everyone will see it).',
      hinge: 'Timing matters. The best move is the one that keeps you alive and strong, not “perfect.”',
      lock: 'Once you raise or sell, incentives and control change — sometimes forever.',
      trap: 'Chasing a headline outcome (valuation/exit) instead of survivability + leverage.',
      exit: 'If terms are confusing, investors/buyers push urgency, or you can’t explain the downside in plain words.',
      step: 'List 3 paths: raise, sell, wait. For each: what you gain, what you lose, and what could blow up.',
    };

    if (isRaiseSellWait) return raiseSellWaitSnap;
    if (isShutOrDouble) return shutOrDoubleSnap;
    if (isHireExec) return hireSnap;
    if (isOffer) return offerSnap;
    if (isInvestCapital) return investSnap;

    // 4) fallback
    return {
      domain,
      door: 'Revolving door (you can change your mind, but it gets harder once you start moving).',
      hinge: 'What is the ONE thing that has to be true for this to be a good move?',
      lock: 'Once you commit time/money/reputation, backing out feels painful.',
      trap: 'Telling yourself a story that sounds good instead of checking reality.',
      exit: 'If real-world signals keep disagreeing with your plan.',
      step: 'Take a smaller first step that keeps an easy exit.',
    };
  }, [decision]);

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
      setCtaCopied(true);
    } catch {}

    setTimeout(() => {
      snapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(reviewPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
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
  const ctaBg = ctaCopied ? '#16a34a' : '#0b0b0b';

  // Updated examples (recommended wording)
  const decisionPlaceholder =
    'Examples: sign an offer · invest capital · hire a VP · kill or double down · raise or sell · acquire a company';

  // ✅ NEW microcopy for optional context section (per your screenshot changes)
  const contextLabel = 'What makes this hard to reverse? (optional)';
  const contextPlaceholder =
    'What’s at stake? Time, money, reputation, people depending on this, or doors that close after you decide…';
  const horizonLabel = 'Decision horizon';
  const toneLabel = 'How this review thinks';
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

          <p style={{ margin: '16px auto 0', fontSize: 18, opacity: 0.92, maxWidth: 820 }}>
            Before you commit — slow the decision.
          </p>

          <p style={{ margin: '10px auto 0', fontSize: 13.5, opacity: 0.62, maxWidth: 820, lineHeight: 1.55 }}>
            Type the decision. We map the situation for you.
          </p>
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
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>What are you deciding?</div>

          <textarea
            ref={decisionInputRef}
            value={decision}
            onChange={(e) => {
              setDecision(e.target.value);
              if (decisionError) setDecisionError(null);
              if (ctaCopied) setCtaCopied(false);
              if (hasStarted) setHasStarted(false);
            }}
            placeholder={decisionPlaceholder}
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
            <div style={{ marginTop: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
              {decisionError}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62 }}>Describe it simply.</div>

          <div style={{ marginTop: 12 }}>
            <details style={detailStyle}>
              <summary style={summaryStyle}>
                <span>{optionalDetailsLabel}</span>
              </summary>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                      {contextLabel}
                    </div>
                    <textarea
                      value={context}
                      onChange={(e) => {
                        setContext(e.target.value);
                        if (ctaCopied) setCtaCopied(false);
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

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                        {horizonLabel}
                      </div>
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
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                        {toneLabel}
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

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 12.5, opacity: 0.62, lineHeight: 1.55 }}>
                      The goal is clarity — not confidence.
                    </div>
                    <div style={{ fontSize: 12.5, opacity: 0.56, lineHeight: 1.55 }}>
                      Decisions compound. This is where you slow one down.
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>

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
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
              transition: 'background 180ms ease',
            }}
          >
            {ctaCopied ? 'Copied ✓' : 'See My Decision Clearly'}
          </button>

          <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.62, textAlign: 'center' }}>
            Generates a clear snapshot. Copies the full review prompt (optional).
          </div>

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
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>🧭 Instant Snapshot</div>
                  <div style={{ fontSize: 12, opacity: 0.55 }}>
                    Category: <span style={{ fontWeight: 800 }}>{labelForDomain(instantSnapshot?.domain ?? 'General')}</span>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.55 }}>
                  <div>
                    <strong>Door:</strong> {instantSnapshot?.door ?? '—'}
                  </div>
                  <div>
                    <strong>Main thing that must be true:</strong> {instantSnapshot?.hinge ?? '—'}
                  </div>
                  <div>
                    <strong>What makes it hard to undo:</strong> {instantSnapshot?.lock ?? '—'}
                  </div>
                  <div>
                    <strong>Common mistake:</strong> {instantSnapshot?.trap ?? '—'}
                  </div>
                  <div>
                    <strong>Red flag (time to pause):</strong> {instantSnapshot?.exit ?? '—'}
                  </div>
                  <div>
                    <strong>Safest next step:</strong> {instantSnapshot?.step ?? '—'}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <details ref={reviewRef} style={detailStyle}>
                    <summary style={summaryStyle}>
                      <span>▶ Copy the full review prompt (better answers)</span>
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
                        Copy this into ChatGPT/Claude/Gemini for a full Decision Review.
                      </div>

                      <button
                        onClick={copyPrompt}
                        style={{
                          borderRadius: 12,
                          border: 'none',
                          padding: '10px 12px',
                          background: '#111',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 800,
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
