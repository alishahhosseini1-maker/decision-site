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

type RankedSnapshot = {
  primary: Snapshot | null;
  secondary: Snapshot | null;
  primaryLabel: string | null;
  secondaryLabel: string | null;
  confidence: number; // 0..1
  lowConfidence: boolean;
  reasonHints: string[]; // short bullets explaining uncertainty
};

type Hint = 'money' | 'job' | 'strategy' | null;

export default function HomePage() {
  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');
  const [horizon, setHorizon] = useState('24–48 months');

  // Optional: user hint to disambiguate low confidence
  const [hint, setHint] = useState<Hint>(null);

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

    const decisionBlock = trimmedDecision
      ? `DECISION:\n${trimmedDecision}`
      : `DECISION:\n[Paste the decision here]`;

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
  // Snapshot library (teen-clear)
  // -------------------------
  const SNAPSHOTS = useMemo(() => {
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

    const relationshipSnap: Snapshot = {
      domain: 'Relationships/Family',
      door: 'Steel door (it gets way harder to undo after time + emotions pile up).',
      hinge: 'Values have to match in real life, not just in a good week.',
      lock: 'Living situation, families, and habits start linking together.',
      trap: 'Ignoring patterns because you want it to work.',
      exit: 'If the same problem repeats and honest effort doesn’t change it.',
      step: 'Slow down. Name your non-negotiables. Watch the pattern, not the promises.',
    };

    const healthSnap: Snapshot = {
      domain: 'Health',
      door: 'Steel door (your body reacts and it’s not instant to reverse).',
      hinge: 'This only works if you can stick to it and it’s safe for you.',
      lock: 'Habits form fast; injuries are slow to fix.',
      trap: 'Going extreme for 7 days, then quitting and starting over.',
      exit: 'If pain, sleep, mood, or performance gets worse consistently.',
      step: 'Start smaller. Track it. Keep the version you can repeat daily.',
    };

    const timeSnap: Snapshot = {
      domain: 'Time/Commitments',
      door: 'Trapdoor (looks small, turns into a permanent obligation).',
      hinge: 'You can only say yes if it doesn’t steal from your real priorities.',
      lock: 'Once people depend on you, quitting gets messy.',
      trap: 'Saying yes to feel like “that person” instead of because it fits your life.',
      exit: 'If you feel dread, resentment, or your calendar starts breaking.',
      step: 'Put an end date on it. Define a stop rule. Cap the commitment.',
    };

    const generalSnap: Snapshot = {
      domain: 'General',
      door: 'Revolving door (you can change your mind, but it gets harder once you start moving).',
      hinge: 'What is the ONE thing that has to be true for this to be a good move?',
      lock: 'Once you commit time/money/reputation, backing out feels painful.',
      trap: 'Telling yourself a story that sounds good instead of checking reality.',
      exit: 'If real-world signals keep disagreeing with your plan.',
      step: 'Take a smaller first step that keeps an easy exit.',
    };

    return {
      OFFER: offerSnap,
      INVEST: investSnap,
      HIRE: hireSnap,
      SHUT_OR_DOUBLE: shutOrDoubleSnap,
      RAISE_SELL_WAIT: raiseSellWaitSnap,
      RELATIONSHIP: relationshipSnap,
      HEALTH: healthSnap,
      TIME: timeSnap,
      GENERAL: generalSnap,
    };
  }, []);

  // -------------------------
  // HARDENED CLASSIFIER (improved)
  // - decision + context
  // - phrase + word-boundary
  // - negation guard
  // - proximity disambiguation (raise salary vs raise round)
  // - acquire users vs acquire company
  // - confidence + low-confidence behavior
  // - optional user hint chips to disambiguate
  // -------------------------
  const rankedSnapshot: RankedSnapshot = useMemo(() => {
    const decisionRaw = decision.trim();
    const contextRaw = context.trim();
    const textRaw = `${decisionRaw} ${contextRaw}`.trim();

    if (!textRaw) {
      return {
        primary: null,
        secondary: null,
        primaryLabel: null,
        secondaryLabel: null,
        confidence: 0,
        lowConfidence: false,
        reasonHints: [],
      };
    }

    const text = textRaw.toLowerCase();

    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Tokenize for proximity logic
    const tokens = (text.match(/[a-z0-9]+/g) ?? []).map((t) => t.toLowerCase());

    const NEGATIONS = new Set(['not', 'dont', "don't", 'avoid', 'no', 'never']);

    const indicesOf = (needle: string) => {
      const n = needle.toLowerCase();
      const out: number[] = [];
      for (let i = 0; i < tokens.length; i++) if (tokens[i] === n) out.push(i);
      return out;
    };

    const negatedNearIndex = (idx: number, window = 3) => {
      const start = Math.max(0, idx - window);
      for (let i = start; i < idx; i++) if (NEGATIONS.has(tokens[i])) return true;
      return false;
    };

    const hasWord = (word: string) => {
      const w = word.toLowerCase();
      const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
      if (!re.test(text)) return false;
      // if any occurrence is NOT negated, count as true
      const idxs = indicesOf(w);
      if (idxs.length === 0) return true;
      return idxs.some((idx) => !negatedNearIndex(idx, 3));
    };

    const hasPhrase = (phrase: string) => {
      const p = phrase.toLowerCase().trim();
      if (!p) return false;
      const parts = p.split(/\s+/).map(escapeRegExp);
      const re = new RegExp(`\\b${parts.join('\\s+')}\\b`, 'i');
      if (!re.test(text)) return false;

      // negation guard: use first token of phrase
      const first = p.split(/\s+/)[0];
      const idxs = indicesOf(first);
      if (idxs.length === 0) return true;
      return idxs.some((idx) => !negatedNearIndex(idx, 3));
    };

    const withinWindow = (aWords: string[], bWords: string[], window = 5) => {
      const aIdxs: number[] = [];
      const bIdxs: number[] = [];

      for (const w of aWords) aIdxs.push(...indicesOf(w));
      for (const w of bWords) bIdxs.push(...indicesOf(w));

      if (aIdxs.length === 0 || bIdxs.length === 0) return false;

      for (const ai of aIdxs) {
        for (const bi of bIdxs) {
          if (Math.abs(ai - bi) <= window) return true;
        }
      }
      return false;
    };

    // Stakes extractor (simple but high-leverage)
    const stakeSignals = {
      money: ['savings', 'cash', 'runway', 'debt', 'mortgage', 'rent', 'wire', 'capital', 'bankrupt', 'broke', '$'],
      reputation: ['announce', 'public', 'brand', 'board', 'investors', 'press', 'reputation'],
      people: ['team', 'layoff', 'employees', 'customer', 'clients', 'family', 'kids'],
      time: ['weeks', 'months', 'every week', 'daily', 'deadline', 'calendar'],
    };

    const stakeHits = {
      money: stakeSignals.money.some((w) => (w === '$' ? text.includes('$') : hasWord(w) || hasPhrase(w))),
      reputation: stakeSignals.reputation.some((w) => hasWord(w) || hasPhrase(w)),
      people: stakeSignals.people.some((w) => hasWord(w) || hasPhrase(w)),
      time: stakeSignals.time.some((w) => hasWord(w) || hasPhrase(w)),
    };

    // Acquire users vs acquire company
    const acquireCompanySignals = [
      'acquire a company',
      'buy the company',
      'purchase the company',
      'm&a',
      'loi',
      'letter of intent',
      'term sheet',
      'purchase agreement',
      'buyout',
    ];
    const acquireUsersSignals = ['acquire users', 'user acquisition', 'paid acquisition', 'growth marketing'];

    const looksLikeAcquireCompany = acquireCompanySignals.some((p) => hasPhrase(p));
    const looksLikeAcquireUsers = acquireUsersSignals.some((p) => hasPhrase(p));

    // Raise disambiguation: salary raise vs fundraising raise
    const raiseNearComp = withinWindow(['raise'], ['salary', 'comp', 'promotion', 'title'], 5);
    const raiseNearFund = withinWindow(['raise'], ['round', 'capital', 'investors', 'valuation', 'dilution', 'runway'], 6);
    const hasFundPhrases =
      hasPhrase('raise a round') || hasPhrase('raise capital') || hasPhrase('fundraising') || hasPhrase('seed round') || hasPhrase('series a') || hasPhrase('series b');

    type RuleKey =
      | 'RAISE_SELL_WAIT'
      | 'SHUT_OR_DOUBLE'
      | 'HIRE'
      | 'OFFER'
      | 'INVEST'
      | 'RELATIONSHIP'
      | 'HEALTH'
      | 'TIME';

    type RuleSet = {
      label: string;
      key: RuleKey;
      domain: Domain;
      phrasesStrong: string[];
      phrasesWeak: string[];
      wordsStrong: string[];
      wordsWeak: string[];
      // optional exclusions
      downweightIf: () => boolean;
      downweightBy: number;
      boostIf: () => boolean;
      boostBy: number;
    };

    const rules: RuleSet[] = [
      {
        label: 'Raise / Sell / Exit',
        key: 'RAISE_SELL_WAIT',
        domain: 'Career/Business',
        phrasesStrong: [
          'raise a round',
          'raise capital',
          'fundraising round',
          'term sheet',
          'letter of intent',
          'loi',
          'buyout offer',
          'offer to buy',
          'sell the company',
          'm&a',
          'series a',
          'series b',
          'seed round',
          'secondary sale',
          'liquidity event',
        ],
        phrasesWeak: ['fundraise', 'fundraising', 'raise money', 'exit', 'acquisition', 'sell'],
        wordsStrong: ['investors', 'valuation', 'dilution', 'runway', 'equity'],
        wordsWeak: ['raise', 'acquire', 'buyout', 'buyer'],
        downweightIf: () => (raiseNearComp && !raiseNearFund && !hasFundPhrases) || (looksLikeAcquireUsers && !looksLikeAcquireCompany),
        downweightBy: 6,
        boostIf: () => raiseNearFund || hasFundPhrases || hasWord('investors') || hasWord('dilution') || hasWord('runway'),
        boostBy: 4,
      },
      {
        label: 'Kill / Double Down / Pivot',
        key: 'SHUT_OR_DOUBLE',
        domain: 'Career/Business',
        phrasesStrong: ['shut down', 'wind down', 'double down', 'kill the product', 'sunset the product', 'cancel the product'],
        phrasesWeak: ['sunset', 'shutdown', 'shut it down', 'pause the product', 'pivot'],
        wordsStrong: ['sunset', 'shutdown', 'pivot', 'scale'],
        wordsWeak: ['pause', 'stop', 'kill', 'cancel', 'end'],
        downweightIf: () => false,
        downweightBy: 0,
        boostIf: () => hasWord('product') || hasWord('roadmap') || hasWord('traction'),
        boostBy: 2,
      },
      {
        label: 'Hire / Fire Exec',
        key: 'HIRE',
        domain: 'Career/Business',
        phrasesStrong: ['hire a vp', 'hire vp', 'hire a cfo', 'hire a cto', 'hire a coo', 'head of sales', 'head of product'],
        phrasesWeak: ['senior hire', 'executive hire', 'replace the vp', 'fire the vp', 'let go'],
        wordsStrong: ['vp', 'cfo', 'cto', 'coo', 'executive'],
        wordsWeak: ['hire', 'hiring', 'fire', 'firing', 'terminate', 'director'],
        downweightIf: () => false,
        downweightBy: 0,
        boostIf: () => stakeHits.people,
        boostBy: 2,
      },
      {
        label: 'Job Offer / Comp',
        key: 'OFFER',
        domain: 'Career/Business',
        phrasesStrong: ['job offer', 'sign the offer', 'accept the offer', 'decline the offer', 'new role', 'comp package', 'equity package'],
        phrasesWeak: ['ask for a raise', 'salary raise', 'promotion', 'join the company', 'resign', 'quit'],
        wordsStrong: ['offer', 'promotion', 'salary', 'equity'],
        wordsWeak: ['sign', 'accept', 'decline', 'raise', 'resign', 'quit', 'role', 'job', 'comp'],
        downweightIf: () => raiseNearFund || hasFundPhrases || hasWord('investors') || hasWord('valuation') || hasWord('dilution'),
        downweightBy: 7,
        boostIf: () => raiseNearComp || hasWord('manager') || hasWord('team') || hasWord('role'),
        boostBy: 3,
      },
      {
        label: 'Invest Significant Capital',
        key: 'INVEST',
        domain: 'Money/Portfolio',
        phrasesStrong: ['invest significant capital', 'commit capital', 'deploy capital', 'all in', 'go all in', 'wire money'],
        phrasesWeak: ['invest', 'investment', 'allocate', 'rebalance', 'buy shares', 'buy calls', 'buy puts'],
        wordsStrong: ['portfolio', 'stocks', 'stock', 'options', 'crypto', 'bitcoin', 'btc', 'etf', 'bond', 'treasury'],
        wordsWeak: ['invest', 'allocate', 'allocation', 'buy', 'sell', 'call', 'put', 'yield', 'rates', 'capital'],
        downweightIf: () => hasPhrase('job offer') || (hasWord('offer') && !hasWord('invest') && !hasWord('capital')),
        downweightBy: 4,
        boostIf: () => stakeHits.money || hasWord('savings') || hasPhrase('no money') || hasPhrase('go broke'),
        boostBy: 4,
      },
      {
        label: 'Relationships / Family',
        key: 'RELATIONSHIP',
        domain: 'Relationships/Family',
        phrasesStrong: ['move in', 'break up', 'get married', 'have a baby'],
        phrasesWeak: ['relationship', 'marriage', 'divorce', 'partner'],
        wordsStrong: ['marry', 'marriage', 'divorce', 'custody'],
        wordsWeak: ['partner', 'family', 'kids', 'baby'],
        downweightIf: () => false,
        downweightBy: 0,
        boostIf: () => false,
        boostBy: 0,
      },
      {
        label: 'Health',
        key: 'HEALTH',
        domain: 'Health',
        phrasesStrong: ['surgery', 'start medication', 'stop medication'],
        phrasesWeak: ['workout plan', 'diet plan', 'training plan'],
        wordsStrong: ['surgery', 'injury', 'meds', 'medicine', 'doctor', 'therapy'],
        wordsWeak: ['diet', 'fasting', 'workout', 'training', 'sleep', 'weight'],
        downweightIf: () => false,
        downweightBy: 0,
        boostIf: () => false,
        boostBy: 0,
      },
      {
        label: 'Time / Commitments',
        key: 'TIME',
        domain: 'Time/Commitments',
        phrasesStrong: ['join a board', 'weekly commitment', 'daily commitment'],
        phrasesWeak: ['side project', 'new project', 'new course'],
        wordsStrong: ['board', 'calendar', 'meeting'],
        wordsWeak: ['schedule', 'commitment', 'routine', 'daily', 'weekly', 'course', 'mba', 'cfa'],
        downweightIf: () => false,
        downweightBy: 0,
        boostIf: () => stakeHits.time,
        boostBy: 2,
      },
    ];

    // Scoring
    const scoreRule = (r: RuleSet) => {
      let score = 0;

      for (const p of r.phrasesStrong) if (hasPhrase(p)) score += 7;
      for (const p of r.phrasesWeak) if (hasPhrase(p)) score += 4;

      for (const w of r.wordsStrong) if (hasWord(w)) score += 2;
      for (const w of r.wordsWeak) if (hasWord(w)) score += 1;

      // Disambiguation / adjustments
      if (r.downweightIf()) score -= r.downweightBy;
      if (r.boostIf()) score += r.boostBy;

      // Hint boosts (user-controlled for low confidence)
      if (hint === 'money') {
        if (r.key === 'INVEST') score += 5;
        if (r.key === 'RAISE_SELL_WAIT') score += 2;
        if (r.key === 'OFFER') score -= 2;
      }
      if (hint === 'job') {
        if (r.key === 'OFFER') score += 5;
        if (r.key === 'INVEST') score -= 2;
        if (r.key === 'RAISE_SELL_WAIT') score -= 2;
      }
      if (hint === 'strategy') {
        if (r.key === 'SHUT_OR_DOUBLE') score += 4;
        if (r.key === 'RAISE_SELL_WAIT') score += 3;
        if (r.key === 'INVEST') score += 1;
        if (r.key === 'OFFER') score -= 2;
      }

      return score;
    };

    const scored = rules
      .map((r) => ({ r, score: scoreRule(r) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];

    // If nothing matched, fallback to GENERAL with low confidence
    if (!top) {
      return {
        primary: SNAPSHOTS.GENERAL,
        secondary: null,
        primaryLabel: 'General',
        secondaryLabel: null,
        confidence: 0.2,
        lowConfidence: true,
        reasonHints: ['Not enough signal in the wording. Add one detail (money/job/strategy).'],
      };
    }

    // Confidence
    const topScore = Math.max(0, top.score);
    const secondScore = Math.max(0, second?.score ?? 0);

    const confidence = topScore / (topScore + secondScore + 1);

    // Minimum bar so we don’t confidently show wrong stuff
    const MIN_SCORE = 5;
    const lowConfidence = topScore < MIN_SCORE || confidence < 0.55;

    // Primary + Secondary (only if close)
    const primary = SNAPSHOTS[top.r.key];
    const primaryLabel = top.r.label;

    let secondary: Snapshot | null = null;
    let secondaryLabel: string | null = null;

    if (second) {
      const ratio = secondScore / (topScore + 1e-9);
      if (ratio >= 0.6) {
        secondary = SNAPSHOTS[second.r.key];
        secondaryLabel = second.r.label;
      }
    }

    // Explain uncertainty (simple)
    const reasonHints: string[] = [];
    if (lowConfidence) {
      if (topScore < MIN_SCORE) reasonHints.push('This looks vague / short. One extra detail will sharpen it.');
      if (confidence < 0.55) reasonHints.push('Two categories are competing. Pick what this is mainly about.');
      if (looksLikeAcquireUsers && !looksLikeAcquireCompany) reasonHints.push('“Acquire” could mean users (marketing) or a company (M&A).');
      if (hasWord('raise') && !hasFundPhrases && !raiseNearFund && !raiseNearComp) reasonHints.push('“Raise” could mean salary or fundraising.');
      if (reasonHints.length === 0) reasonHints.push('Low confidence. Add one constraint or stake to clarify.');
    }

    return { primary, secondary, primaryLabel, secondaryLabel, confidence, lowConfidence, reasonHints };
  }, [decision, context, hint, SNAPSHOTS]);

  const instantSnapshot = rankedSnapshot.primary;

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

  // Examples
  const decisionPlaceholder =
    'Examples: sign an offer · invest capital · hire a VP · cut or double down · raise or sell · acquire a company';

  // Microcopy
  const contextLabel = 'What makes this hard to reverse? (optional)';
  const contextPlaceholder =
    'What’s at stake? Time, money, reputation, people depending on this, or doors that close after you decide…';
  const horizonLabel = 'Decision horizon';
  const toneLabel = 'How this review thinks';
  const optionalDetailsLabel = '▶ Context (optional)';

  const Chip = ({
    active,
    label,
    onClick,
  }: {
    active: boolean;
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: active ? '1px solid rgba(0,0,0,0.35)' : '1px solid rgba(0,0,0,0.12)',
        background: active ? 'rgba(0,0,0,0.06)' : '#fff',
        padding: '8px 10px',
        fontSize: 12.5,
        fontWeight: 800,
        cursor: 'pointer',
      }}
      type="button"
    >
      {label}
    </button>
  );

  const confidencePct = Math.round((rankedSnapshot.confidence || 0) * 100);

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
              if (hint) setHint(null); // reset hint on new input
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
                        if (hint) setHint(null);
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

                  <div style={{ fontSize: 12, opacity: 0.55, textAlign: 'right' }}>
                    Category:{' '}
                    <span style={{ fontWeight: 800 }}>{labelForDomain(instantSnapshot?.domain ?? 'General')}</span>
                    <div style={{ marginTop: 2, fontSize: 11.5, opacity: 0.78 }}>
                      Confidence: <span style={{ fontWeight: 800 }}>{confidencePct}%</span>
                      {rankedSnapshot.lowConfidence && (
                        <span style={{ marginLeft: 8, fontWeight: 900, color: '#b45309' }}>Low</span>
                      )}
                    </div>
                    {rankedSnapshot.secondary && rankedSnapshot.secondaryLabel && (
                      <div style={{ marginTop: 2, fontSize: 11.5, opacity: 0.75 }}>
                        Also relevant: <span style={{ fontWeight: 700 }}>{rankedSnapshot.secondaryLabel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Low-confidence guardrail */}
                {rankedSnapshot.lowConfidence && (
                  <div
                    style={{
                      marginTop: 10,
                      border: '1px solid rgba(180,83,9,0.25)',
                      background: 'rgba(180,83,9,0.06)',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
                      Quick check (to make this accurate)
                    </div>

                    {rankedSnapshot.reasonHints.length > 0 && (
                      <div style={{ fontSize: 12.5, opacity: 0.8, lineHeight: 1.55 }}>
                        {rankedSnapshot.reasonHints.slice(0, 3).map((t, i) => (
                          <div key={i}>• {t}</div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Chip
                        active={hint === 'money'}
                        label="Mainly money / investing"
                        onClick={() => setHint(hint === 'money' ? null : 'money')}
                      />
                      <Chip
                        active={hint === 'job'}
                        label="Mainly job / offer / comp"
                        onClick={() => setHint(hint === 'job' ? null : 'job')}
                      />
                      <Chip
                        active={hint === 'strategy'}
                        label="Mainly company strategy"
                        onClick={() => setHint(hint === 'strategy' ? null : 'strategy')}
                      />
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.75 }}>
                      (Optional) Pick one — it re-ranks the snapshot instantly.
                    </div>
                  </div>
                )}

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

                {rankedSnapshot.secondary && (
                  <div style={{ marginTop: 12 }}>
                    <details style={detailStyle}>
                      <summary style={summaryStyle}>
                        <span>▶ Also relevant snapshot</span>
                      </summary>

                      <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.55 }}>
                        <div style={{ fontSize: 12.5, opacity: 0.7 }}>
                          This decision hits more than one “shape.” Here’s the second one.
                        </div>
                        <div>
                          <strong>Door:</strong> {rankedSnapshot.secondary.door}
                        </div>
                        <div>
                          <strong>Main thing that must be true:</strong> {rankedSnapshot.secondary.hinge}
                        </div>
                        <div>
                          <strong>What makes it hard to undo:</strong> {rankedSnapshot.secondary.lock}
                        </div>
                        <div>
                          <strong>Common mistake:</strong> {rankedSnapshot.secondary.trap}
                        </div>
                        <div>
                          <strong>Red flag (time to pause):</strong> {rankedSnapshot.secondary.exit}
                        </div>
                        <div>
                          <strong>Safest next step:</strong> {rankedSnapshot.secondary.step}
                        </div>
                      </div>
                    </details>
                  </div>
                )}

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
                        type="button"
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
