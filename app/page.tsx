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
  // Translate snapshot language to "15-year-old clear"
  // (keeps meaning; drops jargon)
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

  const teenifyDoor = (raw: string) => {
    // quick rewrites of common door types
    const s = raw.toLowerCase();

    if (s.includes('trapdoor')) return 'Trapdoor (looks small, but you might get stuck doing it)';
    if (s.includes('steel') && s.includes('glass')) return 'Heavy door with a window (you can change it, but people will notice)';
    if (s.includes('steel')) return 'Heavy door (hard to undo once you go through)';
    if (s.includes('revolving')) return 'Revolving door (you can change your mind, but it can get messy)';
    if (s.includes('glass')) return 'Glass door (easy to change, but can crack fast)';

    return raw;
  };

  const teenify = (domain: Domain, snap: Omit<Snapshot, 'domain'>): Omit<Snapshot, 'domain'> => {
    // Domain-aware, but still short.
    if (domain === 'Money/Portfolio') {
      return {
        door: teenifyDoor(snap.door),
        hinge: 'The big question: will the “safer” stuff actually hold up better when things get weird?',
        lock: 'If you sell now, it’s hard to buy back later without feeling dumb (especially if price goes up).',
        trap: 'Thinking you’re “being safe” when you’re really making a big market prediction.',
        exit: 'If the companies you moved into start missing earnings, or the ones you sold keep crushing it.',
        step: 'Don’t go all-in. Move a little at a time and set a max amount you’re willing to shift.',
      };
    }

    if (domain === 'Career/Business') {
      return {
        door: teenifyDoor(snap.door),
        hinge: 'Will this actually work in real life (with real customers / real bosses), not just in your head?',
        lock: 'Once people see you as “that guy,” it’s harder to change your brand later.',
        trap: 'Chasing the exciting upside and ignoring what could break you.',
        exit: 'If you can’t get results fast enough (money, traction, performance) within a clear time limit.',
        step: 'Test it small first. Set a deadline and a “stop rule” if it’s not working.',
      };
    }

    if (domain === 'Relationships/Family') {
      return {
        door: teenifyDoor(snap.door),
        hinge: 'Do your values match in a way you can see over and over (not just one good week)?',
        lock: 'Emotions + time + life setup make it harder to reverse later.',
        trap: 'Ignoring repeated red flags because you want it to work.',
        exit: 'If the same issues keep happening and don’t improve with honest effort.',
        step: 'Slow down. Look for patterns. Decide what you will not compromise on.',
      };
    }

    if (domain === 'Health') {
      return {
        door: teenifyDoor(snap.door),
        hinge: 'Is this the right plan for you, and can you actually stick to it?',
        lock: 'Your body and habits change over time, so it’s not easy to “undo” fast.',
        trap: 'Going extreme for 1 week, then quitting and starting over.',
        exit: 'If you feel worse, get injured, or results don’t show up even when you’re consistent.',
        step: 'Start small and track it. Do the version you can repeat every day.',
      };
    }

    if (domain === 'Time/Commitments') {
      return {
        door: teenifyDoor(snap.door),
        hinge: 'Can you do this every week without it wrecking your main priorities?',
        lock: 'Once people depend on you, it’s hard to quit without drama or guilt.',
        trap: 'Saying yes because it sounds good, not because it fits your life.',
        exit: 'If your calendar gets packed, you feel stressed, or you start resenting it.',
        step: 'Try it for a short trial. Put an end date on it. Cap your commitments.',
      };
    }

    // General
    return {
      door: teenifyDoor(snap.door),
      hinge: 'What is the ONE thing that has to be true for this to be a good move?',
      lock: 'Once you start, backing out might cost time, money, or reputation.',
      trap: 'Making up a story that feels true instead of checking reality.',
      exit: 'If the real-world signs start clearly going against you.',
      step: 'Take a smaller step first. Keep an easy way to exit.',
    };
  };

  // -------------------------
  // DOMAIN + SNAPSHOT (expanded)
  // Zero cognitive load: user does not choose anything.
  // -------------------------
  const instantSnapshot: Snapshot | null = useMemo(() => {
    const d = decision.trim().toLowerCase();
    if (!d) return null;

    const includesAny = (words: string[]) => words.some((w) => d.includes(w));

    // 👇 Fix the earlier bug: prioritize Career/Business BEFORE Money
    // Also: money list should be OBJECT words (not generic buy/sell/invest)
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
      'rotate',
      'rotation',
      'rebalance',
      'rebal',
      'allocation',
      'halo',
      'capex',
      'rates',
      'treasury',
      'bond',
      'yield',
    ]);

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
      'roadmap',
      'product',
      'pricing',
      'strategy',
      'acquire',
      'acquisition',
      'm&a',
      'contract',
      'customer',
      'client',
      'pipeline',
      'sales',
      'business',
      'program',
      'high ticket',
      'coaching',
      'offer test',
      'funnel',
      'lead',
      'close',
      'closing',
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

    let domain: Domain = 'General';

    // priority order matters
    if (careerBusiness) domain = 'Career/Business';
    else if (money) domain = 'Money/Portfolio';
    else if (relationshipsFamily) domain = 'Relationships/Family';
    else if (health) domain = 'Health';
    else if (timeCommitments) domain = 'Time/Commitments';

    // defaults (General) — adult version
    let door = 'Revolving steel-glass door (reversible, but momentum builds)';
    let hinge = 'One assumption quietly holds this decision up.';
    let lock = 'Reversal gets harder due to timing + attention + emotion.';
    let trap = 'Turning uncertainty into a story you defend.';
    let exit = 'Clear real-world signals contradict the premise.';
    let step = 'Proceed partially; preserve optionality.';

    // Domain-specific templates (adult version)
    if (domain === 'Money/Portfolio') {
      door = 'Revolving steel-glass door (reversible allocation change; heavy momentum)';
      hinge = 'Durability + real earnings must matter more than expectation-driven growth over your horizon.';
      lock = 'Re-entry friction: selling winners, then hesitating to buy back higher.';
      trap = 'Accidentally making a macro bet (“AI is over” / “HALO is safe”).';
      exit = 'Earnings + guidance consistently favor the side you reduced, or resilience fails on the side you added.';
      step = 'Rotate in tranches; cap the move so you can be wrong and still be fine.';
    }

    if (domain === 'Career/Business') {
      door = 'Revolving steel-glass door (reversible tests, but reputation forms fast)';
      hinge = 'Real demand must exist at your price, from a specific buyer, with a specific pain.';
      lock = 'Positioning + reputation: once people label you, it’s harder to reset.';
      trap = 'Mistaking compliments for customers / interest for payment.';
      exit = 'You can’t get qualified calls or close within a defined number of attempts.';
      step = 'Run a time-boxed offer test (limited seats, clear stop rule).';
    }

    if (domain === 'Relationships/Family') {
      door = 'Steel door (high irreversibility; long tail)';
      hinge = 'Values alignment must be real, repeated, and observable.';
      lock = 'Emotional + legal + time compounding locks.';
      trap = 'Optimism bias under uncertainty / ignoring repeated signals.';
      exit = 'Repeated evidence of misalignment (patterns), not one-off conflict.';
      step = 'Slow down; collect disconfirming evidence; define non-negotiables.';
    }

    if (domain === 'Health') {
      door = 'Steel door (compounding effects; harder to reverse quickly)';
      hinge = 'Correct diagnosis + consistent adherence must be real, not hoped for.';
      lock = 'Physiology + habit formation: changes compound in one direction.';
      trap = 'Extreme swings (all-or-nothing) instead of sustainable systems.';
      exit = 'Symptoms persist, performance declines, or side effects outweigh benefits.';
      step = 'Start smaller, measure, iterate; choose actions you can repeat daily.';
    }

    if (domain === 'Time/Commitments') {
      door = 'Trapdoor disguised as a revolving door (looks small, becomes permanent)';
      hinge = 'You must be able to sustain this without stealing from critical priorities.';
      lock = 'Recurring obligation + guilt lock: it’s hard to stop once others depend on you.';
      trap = 'Overcommitment from identity signaling (“I should do this”).';
      exit = 'Calendar overload, missed core work, rising stress, or persistent resentment.';
      step = 'Time-box it (trial), define stop rules, and protect a hard cap on commitments.';
    }

    // ✅ Apply teen translation right before returning
    const teen = teenify(domain, { door, hinge, lock, trap, exit, step });

    return { domain, ...teen };
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

  // ✅ NEW placeholder: your roundtable examples
  const decisionPlaceholder =
    'Examples: signing an offer · investing capital · hiring a VP · shut down or double down · raise, sell, or wait';

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
            // ✅ CHANGED: placeholder now uses the examples (substitute the old text)
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
                <span>▶ Optional details</span>
              </summary>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                      Why this is hard to undo (optional)
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
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.9 }}>
                        Time horizon
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
                    Category:{' '}
                    <span style={{ fontWeight: 800 }}>{labelForDomain(instantSnapshot?.domain ?? 'General')}</span>
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
                      <span>▶ Advanced reasoning (optional)</span>
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
                      <div style={{ fontSize: 13, opacity: 0.62 }}>Copy the full prompt if you want a deep review.</div>

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
