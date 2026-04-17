// app/decision-summary/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

type DecisionRecord = {
  id: string;
  user_id: string | null;
  decision: string;
  context: string | null;
  score: number | null;
  readiness_clarity: number | null;
  readiness_assumptions: number | null;
  readiness_reversibility: number | null;
  readiness_risk: number | null;
  readiness_exit_logic: number | null;
  verdict: string | null;
  door: string | null;
  hinge: string | null;
  lock: string | null;
  trap: string | null;
  exit: string | null;
  step: string | null;
  script: string | null;
  tripwire: string | null;
  failure_modes: string[] | null;
  deep_review: string | null;
  final_thoughts: string | null;
  outcome_status: string | null;
  needs_follow_up: boolean | null;
  created_at: string | null;
  dismissed_at?: string | null;
};

type ComparisonDecision = {
  id: string;
  decision: string;
  score: number | null;
  created_at: string | null;
};

type DeepSection = { heading: string; lines: string[] };

const DEEP_HEADINGS = new Set([
  'what must go right',
  'what could go wrong',
  'hard to undo',
  'bottom line',
]);

function parseDeepReview(text?: string | null): DeepSection[] {
  if (!text) return [];
  const rawLines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections: DeepSection[] = [];
  let current: DeepSection | null = null;
  for (const raw of rawLines) {
    const cleaned = raw.replace(/^[^A-Za-z0-9]+/, '').trim();
    if (DEEP_HEADINGS.has(cleaned.toLowerCase())) {
      current = { heading: cleaned, lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;

    // Skip reflection prompts (numbered questions like "1. ", "2. ", "3. ")
    if (/^\d+\.\s/.test(raw)) continue;

    // Skip any line that looks like a reflection prompt heading
    if (/reflection.*prompt/i.test(cleaned)) continue;

    current.lines.push(raw.replace(/^[•\-]\s*/, '').trim());
  }
  return sections.filter((s) => s.lines.length > 0);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function safeNumber(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function getScoreMeta(score?: number | null) {
  const v = typeof score === 'number' ? score : 0;
  if (v >= 80) return { label: 'Strong to commit', pillClass: 'bg-emerald-600 text-white', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700', cardClass: 'border-emerald-200 bg-emerald-50/60' };
  if (v >= 65) return { label: 'Proceed with caution', pillClass: 'bg-yellow-600 text-white', dotClass: 'bg-yellow-500', textClass: 'text-yellow-700', cardClass: 'border-yellow-200 bg-yellow-50/60' };
  if (v >= 50) return { label: 'Take a smaller step', pillClass: 'bg-amber-500 text-white', dotClass: 'bg-amber-400', textClass: 'text-amber-700', cardClass: 'border-amber-200 bg-amber-50/60' };
  return { label: 'Needs more before you commit', pillClass: 'bg-rose-600 text-white', dotClass: 'bg-rose-500', textClass: 'text-rose-700', cardClass: 'border-rose-200 bg-rose-50/60' };
}

function getProgressColor(value?: number | null) {
  if (value === null || value === undefined) return 'rgba(0,0,0,0.14)';
  if (value <= 6) return '#dc2626';
  if (value <= 13) return '#f59e0b';
  return '#16a34a';
}

function getFactorHint(name: string, value: number | null, decision: DecisionRecord | null) {
  const score = value ?? 0;
  const isLow = score <= 6;
  const isMid = score > 6 && score <= 13;

  switch (name) {
    case 'Clarity':
      if (isLow) return 'Success criteria are vague or missing. You need to define what done looks like before committing.';
      if (isMid) return 'Success is defined but may lack measurable specifics or clear boundaries.';
      return 'Success criteria are clear and measurable.';

    case 'Assumptions':
      if (isLow) return 'Critical assumptions have not been validated. Test the riskiest ones before proceeding.';
      if (isMid) return 'Some assumptions identified but validation is incomplete or superficial.';
      return 'Key assumptions have been identified and tested.';

    case 'Reversibility':
      if (isLow) return 'High sunk costs or irreversible commitments. Make sure you can survive if this fails.';
      if (isMid) return 'Some costs can be recovered, but reversal would be costly or painful.';
      return 'Decision is mostly reversible with manageable costs.';

    case 'Risk':
      if (isLow) return 'Worst-case scenario is poorly understood or potentially catastrophic. Map the downside.';
      if (isMid) return 'Downside is identified but mitigation plan may be incomplete.';
      return 'Worst-case scenario is understood and survivable.';

    case 'Exit Logic':
      if (isLow) return 'No clear exit condition defined. You risk staying in too long if things go wrong.';
      if (isMid) return 'Exit condition exists but may be too vague or easy to rationalize away.';
      return 'Clear exit condition is defined and will be hard to ignore.';

    default:
      return 'Assessment based on decision specifics.';
  }
}

function splitVerdict(verdict?: string | null) {
  if (!verdict) return { title: 'No verdict saved', rationale: '' };
  const clean = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
  const parts = verdict.split('\n\n').map((p) => p.trim()).filter(Boolean);
  return {
    title: clean(parts[0] || ''),
    rationale: clean(parts.slice(1).join('\n\n') || ''),
  };
}

function buildInsight(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  // Generate a crisp headline (15 words or fewer) naming the single biggest blocker
  // Find the weakest dimension or most critical gap
  const dims = [
    { name: 'clarity', value: decision.readiness_clarity ?? 0, blocker: 'You have not defined what success looks like.' },
    { name: 'assumptions', value: decision.readiness_assumptions ?? 0, blocker: 'You have not validated the things that must be true.' },
    { name: 'reversibility', value: decision.readiness_reversibility ?? 0, blocker: 'You have not calculated what you cannot get back.' },
    { name: 'risk', value: decision.readiness_risk ?? 0, blocker: 'You have not modeled what happens if this goes wrong.' },
    { name: 'exit', value: decision.readiness_exit_logic ?? 0, blocker: 'You have not defined when you would walk away.' },
  ];

  const weakest = dims.sort((a, b) => a.value - b.value)[0];

  // If there's a critically weak dimension (≤6), call it out
  if (weakest.value <= 6) {
    return weakest.blocker;
  }

  // If trap exists and is specific, synthesize from it
  if (decision.trap?.trim() && decision.trap.length < 100) {
    // Extract the core insight from trap (first clause or key phrase)
    const trapCore = decision.trap.split(/[—,]/)[0].trim();
    if (trapCore.length < 60) {
      return `The hidden risk is ${trapCore.toLowerCase()}.`;
    }
  }

  // Synthesize from score and context
  const s = decision.score ?? 0;
  if (s < 60) return 'The foundation is incomplete. More clarity is needed.';
  if (s < 80) return 'The decision is viable but the step needs to be smaller.';
  return 'The decision is survivable if you stay disciplined.';
}

function buildWhatOthersMiss(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  // Surface a non-obvious insight based on the trap or hinge
  if (decision.trap?.trim()) {
    return `Most people won't see this risk coming: ${decision.trap}`;
  }

  if (decision.hinge?.trim()) {
    return `The entire decision pivots on something most people overlook: ${decision.hinge}`;
  }

  // Fallback based on score
  const score = decision.score ?? 0;
  if (score < 60) {
    return 'What looks like hesitation is actually incomplete information. You cannot commit to what you have not fully understood.';
  }

  return 'What matters most is not whether the decision sounds good now, but whether it stays survivable if reality pushes back.';
}

function buildSupportingSentence(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  // Provide specific detail from trap, hinge, or weakest dimension
  if (decision.trap?.trim()) {
    return `The hidden risk: ${decision.trap.toLowerCase().charAt(0) + decision.trap.slice(1)}`;
  }

  if (decision.hinge?.trim()) {
    return `Everything pivots on: ${decision.hinge.toLowerCase().charAt(0) + decision.hinge.slice(1)}`;
  }

  // Identify weakest dimension and call it out
  const dims = [
    { name: 'clarity', value: decision.readiness_clarity ?? 0, label: 'success criteria are unclear' },
    { name: 'assumptions', value: decision.readiness_assumptions ?? 0, label: 'key assumptions have not been validated' },
    { name: 'risk', value: decision.readiness_risk ?? 0, label: 'downside scenario is not well understood' },
    { name: 'exit', value: decision.readiness_exit_logic ?? 0, label: 'no clear exit condition is defined' },
  ];
  const weakest = dims.sort((a, b) => a.value - b.value)[0];
  if (weakest.value <= 6) {
    return `The main gap: ${weakest.label}.`;
  }

  const score = decision.score ?? 0;
  if (score < 60) {
    return 'More information is needed before you can commit with confidence.';
  }
  return 'The foundation is solid enough to move forward if you stay disciplined.';
}

function buildWhatToDoNow(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  // Extract sharp action from verdict title or step
  if (decision.step?.trim()) {
    return decision.step;
  }

  const verdictData = splitVerdict(decision.verdict);
  if (verdictData.title) {
    return verdictData.title;
  }

  return 'Review the key risks and decide on your next survivable step.';
}

function buildIfDelayed(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  const score = decision.score ?? 0;

  // Generate consequence of delay based on trap or score
  if (decision.trap?.trim()) {
    return `Delay amplifies the risk: ${decision.trap.toLowerCase()}`;
  }

  if (score >= 80) {
    return 'The window to act may narrow as conditions change — momentum matters here.';
  }

  if (score >= 65) {
    return 'Waiting without addressing the gaps means the decision gets harder, not clearer.';
  }

  return 'Delay without more information just compounds the uncertainty.';
}

function buildWhatsWorking(decision?: DecisionRecord | null): string[] {
  if (!decision) return [];

  const working: string[] = [];

  // Generate short phrases (under 10 words) from high-scoring dimensions
  const clarity = decision.readiness_clarity ?? 0;
  const assumptions = decision.readiness_assumptions ?? 0;
  const reversibility = decision.readiness_reversibility ?? 0;
  const risk = decision.readiness_risk ?? 0;
  const exitLogic = decision.readiness_exit_logic ?? 0;

  if (clarity > 13) {
    working.push('Success criteria are well-defined');
  }

  if (reversibility > 13) {
    working.push('Exit costs are manageable');
  }

  if (risk > 13) {
    working.push('Downside scenario is survivable');
  }

  if (exitLogic > 13) {
    working.push('Exit conditions are clear');
  }

  if (assumptions > 13) {
    working.push('Key assumptions have been validated');
  }

  // Extract genuine positives from context and deep review
  const contextLower = (decision.context || '').toLowerCase();
  const decisionLower = (decision.decision || '').toLowerCase();

  // Financial signals
  if (contextLower.includes('savings') || contextLower.includes('runway') || contextLower.includes('months')) {
    if (working.length < 3) working.push('Financial cushion available');
  }

  // Housing/flexibility signals
  if (contextLower.includes('rent') || decisionLower.includes('rent')) {
    if (working.length < 3) working.push('Housing flexibility (renting)');
  }

  // Reversibility signals
  if (contextLower.includes('reversible') || contextLower.includes('undo')) {
    if (working.length < 3) working.push('Decision is reversible');
  }

  // Pull from "what must go right" but extract key phrases, not full text
  if (working.length < 3 && decision.deep_review) {
    const sections = parseDeepReview(decision.deep_review);
    const mustGoRight = sections.find(s => s.heading.toLowerCase().includes('must go right'));
    if (mustGoRight && mustGoRight.lines.length > 0) {
      // Extract key phrase (first 8 words or up to comma/dash)
      const firstLine = mustGoRight.lines[0];
      const shortPhrase = firstLine.split(/[—,]/)[0].trim().split(' ').slice(0, 8).join(' ');
      if (shortPhrase.length > 20) {
        working.push(shortPhrase);
      }
    }
  }

  // If still empty, extract from door or hinge
  if (working.length === 0 && decision.door) {
    working.push(`Decision type is clear: ${decision.door.toLowerCase()}`);
  }

  // Ensure we always have at least 2 items
  if (working.length === 1) {
    if (decision.hinge) {
      working.push('Critical success factor identified');
    } else {
      working.push('Core risks mapped');
    }
  }

  return working.slice(0, 3);
}

function buildWhatsBreaking(decision?: DecisionRecord | null): string[] {
  if (!decision) return [];

  const breaking: string[] = [];

  // Summarize trap to under 12 words (don't paste full text)
  if (decision.trap?.trim()) {
    const trap = decision.trap;
    // Extract key phrase up to first punctuation or limit to 12 words
    const shortTrap = trap.split(/[—,;]/)[0].trim();
    const words = shortTrap.split(' ');
    if (words.length <= 12) {
      breaking.push(shortTrap);
    } else {
      // Take first 12 words
      breaking.push(words.slice(0, 12).join(' ') + '...');
    }
  }

  // Pull from low scoring dimensions
  if ((decision.readiness_clarity ?? 0) <= 6) {
    breaking.push('Success criteria are vague');
  }
  if ((decision.readiness_assumptions ?? 0) <= 6) {
    breaking.push('Assumptions have not been tested');
  }
  if ((decision.readiness_risk ?? 0) <= 6) {
    breaking.push('Downside scenario is unclear');
  }
  if ((decision.readiness_exit_logic ?? 0) <= 6) {
    breaking.push('Exit condition not defined');
  }
  if ((decision.readiness_reversibility ?? 0) <= 6) {
    breaking.push('Sunk costs are high');
  }

  return breaking.slice(0, 3);
}

function renderMarkdown(text: string): React.ReactNode {
  // Simple markdown rendering for bold, headings, and inline code
  let result: React.ReactNode[] = [];
  let currentText = text;
  let key = 0;

  // Handle headings (## )
  const headingMatch = currentText.match(/^##\s+(.+)$/m);
  if (headingMatch) {
    const parts = currentText.split(/^##\s+/m);
    result.push(<span key={key++}>{parts[0]}</span>);
    const remaining = parts[1];
    if (remaining) {
      const [heading, ...rest] = remaining.split('\n');
      result.push(<strong key={key++} className="font-semibold">{heading}</strong>);
      if (rest.length > 0) {
        result.push(<span key={key++}>{'\n' + rest.join('\n')}</span>);
      }
    }
    return <>{result}</>;
  }

  // Handle bold (**text** or __text__)
  const boldRegex = /(\*\*|__)(.*?)\1/g;
  const parts = currentText.split(boldRegex);

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '**' || parts[i] === '__') {
      // Next part is the bold text
      result.push(<strong key={key++} className="font-semibold">{parts[i + 1]}</strong>);
      i++; // Skip the closing marker
    } else if (parts[i]) {
      result.push(<span key={key++}>{parts[i]}</span>);
    }
  }

  return <>{result}</>;
}

// ── Accordion component ─────────────────────────────────────────────────────

function AccordionSection({
  heading,
  lines,
  isOpen,
  onToggle,
}: {
  heading: string;
  lines: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-black/6 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-black/70">{heading}</span>
        <span
          className="ml-4 flex-shrink-0 text-lg font-light text-black/30 transition-transform duration-150"
          style={{ display: 'inline-block', transform: isOpen ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div className="pb-4 space-y-2">
          {lines.map((line, i) => (
            <p key={i} className="text-sm leading-7 text-black/60">{renderMarkdown(line)}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Evidence row ────────────────────────────────────────────────────────────

function EvidenceRow({ tag, text, highlight }: { tag: string; text: string; highlight?: boolean }) {
  return (
    <div className="border-b border-black/6 py-4 last:border-b-0">
      <p
        className="text-[9.5px] font-medium uppercase tracking-[0.13em]"
        style={{ color: highlight ? '#A32D2D' : 'rgba(0,0,0,0.36)' }}
      >
        {tag}
      </p>
      <p className={`mt-1.5 text-sm leading-6 ${highlight ? 'font-medium text-black' : 'text-black/75'}`}>
        {text}
      </p>
    </div>
  );
}

// ── Anatomy row ─────────────────────────────────────────────────────────────

function AnatomyRow({ label, sublabel, value, highlight }: { label: string; sublabel: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[100px_1fr] items-baseline gap-0 border-b border-black/6 py-3 last:border-b-0">
      <div>
        <p className={`text-[9.5px] font-medium uppercase tracking-[0.11em] ${highlight ? 'text-black/55' : 'text-black/36'}`}>{label}</p>
        <p className="text-[9.5px] text-black/28">{sublabel}</p>
      </div>
      <p className={`text-sm leading-6 ${highlight ? 'font-medium text-black' : 'text-black/72'}`}>{value}</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function DecisionSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInEmailSent, setSignInEmailSent] = useState(false);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [comparisonDecisions, setComparisonDecisions] = useState<ComparisonDecision[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(authError.message);
        if (!user) throw new Error('You must be signed in to view this decision brief.');

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        let query = supabase
          .from('decisions')
          .select('id, user_id, decision, context, score, readiness_clarity, readiness_assumptions, readiness_reversibility, readiness_risk, readiness_exit_logic, verdict, door, hinge, lock, trap, exit, step, script, tripwire, failure_modes, deep_review, final_thoughts, outcome_status, needs_follow_up, created_at, dismissed_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (id) {
          query = supabase
            .from('decisions')
            .select('id, user_id, decision, context, score, readiness_clarity, readiness_assumptions, readiness_reversibility, readiness_risk, readiness_exit_logic, verdict, door, hinge, lock, trap, exit, step, script, tripwire, failure_modes, deep_review, final_thoughts, outcome_status, needs_follow_up, created_at, dismissed_at')
            .eq('id', id)
            .eq('user_id', user.id)
            .limit(1);
        }

        const { data, error: decisionError } = await query.single();
        if (decisionError || !data) throw new Error('No saved decision brief found yet.');

        const { data: recentData } = await supabase
          .from('decisions')
          .select('id, decision, score, created_at')
          .eq('user_id', user.id)
          .neq('id', data.id)
          .not('score', 'is', null)
          .order('created_at', { ascending: false })
          .limit(4);

        if (!cancelled) {
          setDecision(data as DecisionRecord);
          setComparisonDecisions((recentData as ComparisonDecision[]) ?? []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Something went wrong.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!shareMenuRef.current) return;
      if (!shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false);
      }
    }

    if (shareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [shareMenuOpen]);

  useEffect(() => {
    if (!shareToast) return;

    const timer = window.setTimeout(() => {
      setShareToast(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [shareToast]);

  const scoreMeta = useMemo(() => getScoreMeta(decision?.score), [decision?.score]);
  const verdictData = useMemo(() => splitVerdict(decision?.verdict), [decision?.verdict]);
  const deepSections = useMemo(() => parseDeepReview(decision?.deep_review), [decision?.deep_review]);

  const comparisonRows = useMemo(() => {
    return comparisonDecisions.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.decision,
      date: formatDate(item.created_at),
      score: safeNumber(item.score),
      isCurrent: false as boolean,
    }));
  }, [comparisonDecisions]);

  const allComparisonRows = useMemo(() => {
    if (!decision) return comparisonRows;
    return [
      { id: decision.id, title: decision.decision, date: formatDate(decision.created_at), score: safeNumber(decision.score), isCurrent: true as boolean },
      ...comparisonRows,
    ];
  }, [decision, comparisonRows]);

  const handleSignIn = async () => {
    const email = window.prompt('Enter your email to sign in:');
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSignInEmailSent(true);
  };

  const currentScore = safeNumber(decision?.score);
  const previousComparable = comparisonRows.find((r) => r.score !== null);
  const delta = currentScore !== null && previousComparable?.score != null
    ? currentScore - previousComparable.score
    : null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function handleCopyShareLink() {
    if (!decision?.id) return;
    try {
      const shareUrl = `${window.location.origin}/share/summary/${decision.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareMenuOpen(false);
      setShareToast(true);
    } catch {
      setShareMenuOpen(false);
      setShareToast(false);
    }
  }

  function handleEmailShareLink() {
    if (!decision?.id) return;
    const shareUrl = `${window.location.origin}/share/summary/${decision.id}`;
    const subject = encodeURIComponent(`Decision Layer Brief: ${decision.decision || 'Brief'}`);
    const body = encodeURIComponent(
      `Sharing my decision brief.\n\nView brief:\n${shareUrl}`
    );

    setShareMenuOpen(false);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">Loading decision brief...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-medium text-rose-700">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center rounded-full border border-black/10 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90"
            >
              Sign in
            </button>
            <a href="/" className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white">Back home</a>
            <a href="/history" className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white">View history</a>
          </div>
          {signInEmailSent && (
            <div className="mt-4 rounded-xl border border-black/10 bg-white p-3 flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-black">Check your email for the sign-in link.</p>
                <p className="mt-0.5 text-xs text-black/50">Don&apos;t see it? Check your junk or spam folder.</p>
              </div>
              <button type="button" onClick={() => setSignInEmailSent(false)} className="text-black/30 hover:text-black/60 text-base leading-none">&times;</button>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!decision) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">No decision brief available.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-black">
      {shareToast ? (
        <div
          className="fixed right-6 top-6 z-50"
          style={{
            animation: 'fadeInUp 0.25s ease',
          }}
        >
          <div className="rounded-xl bg-black px-5 py-3 text-sm text-white shadow-lg">
            <div className="flex items-center gap-2 font-medium">
              <span>✓</span>
              <span>Link copied</span>
            </div>
            <div className="mt-1 text-xs text-white/70">
              This version excludes internal history and raw inputs.
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`mx-auto max-w-5xl space-y-6 transition-all duration-700 ${
          animateIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >

        {/* ── Header ── */}
        <header className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/35">
            Decision brief &nbsp;·&nbsp; {formatDate(decision.created_at)}
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl max-w-2xl">
              {decision.decision}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/60 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-black/40" />
                Decision locked
              </div>
              <a
                href="/history"
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
              >
                View history
              </a>

              <div className="relative" ref={shareMenuRef}>
                <button
                  type="button"
                  onClick={() => setShareMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
                >
                  <span>Share Brief</span>
                  <span className="text-[10px]">▾</span>
                </button>

                {shareMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[220px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                    <div className="border-b border-black/6 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                      Share Brief
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="block w-full px-4 py-3 text-left text-sm text-black/82 transition hover:bg-black/[0.03]"
                    >
                      Copy share link
                    </button>

                    <button
                      type="button"
                      onClick={handleEmailShareLink}
                      className="block w-full px-4 py-3 text-left text-sm text-black/82 transition hover:bg-black/[0.03]"
                    >
                      Email share link
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* ── SIGNAL: What matters now ── */}
        <section className="rounded-[20px] border-l-4 border-l-black border border-black/6 bg-[#f1f1ec] p-8 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-black/36">What matters now</p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-black md:text-[1.65rem]">
            {buildInsight(decision)}
          </h2>
          <p className="mt-4 text-sm leading-7 text-black/63">
            {buildSupportingSentence(decision)}
          </p>
        </section>

        {/* ── THE DECISION + WHAT TO DO NOW ── */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">The decision</p>
            <p className="mt-3 text-sm leading-7 text-black/75">{decision.decision}</p>
          </div>
          <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">What to do now</p>
            <p className="mt-3 text-sm leading-7 text-black/80 font-semibold">{buildWhatToDoNow(decision)}</p>
          </div>
        </section>

        {/* ── SCORE + IF DELAYED ── */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className={`rounded-2xl border border-black/12 bg-white/60 p-7 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/42">
              Decision Quality
            </div>
            <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${scoreMeta.textClass}`}>
              {scoreMeta.label}
            </div>
          </div>

          {/* Hero score */}
          <div className="mb-5">
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-bold ${scoreMeta.textClass}`}>
                {safeNumber(decision.score) ?? '—'}
              </span>
              <span className="text-2xl text-black/36 font-normal">/ 100</span>
            </div>
            <div className="text-sm text-black/55 mt-2">Readiness score</div>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-black/8 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full ${scoreMeta.textClass.replace('text-', 'bg-').replace('/70', '')}`}
              style={{ width: `${safeNumber(decision.score) ?? 0}%`, transition: 'width 0.3s ease' }}
            />
          </div>

          {/* Interpretation */}
          <p className="text-sm leading-6 text-black/72 mb-4">
            Higher scores suggest the move is more survivable. Lower scores suggest the decision needs clearer assumptions or a smaller step.
          </p>

          {/* Scoring model dropdown */}
          <details className="border-t border-black/9 pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-black/72 flex justify-between items-center list-none">
              Scoring model
              <span className="text-base text-black/28">▼</span>
            </summary>
            <div className="mt-4 space-y-2">
              {[
                { name: 'Clarity', value: decision.readiness_clarity, hint: getFactorHint('Clarity', decision.readiness_clarity, decision) },
                { name: 'Assumptions', value: decision.readiness_assumptions, hint: getFactorHint('Assumptions', decision.readiness_assumptions, decision) },
                { name: 'Reversibility', value: decision.readiness_reversibility, hint: getFactorHint('Reversibility', decision.readiness_reversibility, decision) },
                { name: 'Risk', value: decision.readiness_risk, hint: getFactorHint('Risk', decision.readiness_risk, decision) },
                { name: 'Exit Logic', value: decision.readiness_exit_logic, hint: getFactorHint('Exit Logic', decision.readiness_exit_logic, decision) },
              ].map((factor, i) => (
                <div key={i}>
                  <div className="grid gap-2 items-center py-2 border-b border-black/6 grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[120px_1fr_50px]">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-black/72">{factor.name}</div>
                      <div className="h-0.5 bg-black/8 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${((factor.value ?? 0) / 20) * 100}%`,
                            background: getProgressColor(factor.value),
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-black/55 text-right">{factor.value ?? '—'}<span className="text-[10px] opacity-60">/20</span></div>
                  </div>
                  <p className="text-xs text-black/50 italic leading-relaxed mt-1 mb-2 sm:ml-32">{factor.hint}</p>
                </div>
              ))}
              
              {/* Total row */}
              <div className="grid gap-2 items-center py-2 border-t border-black/9 mt-2 grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[120px_1fr_40px]">
                <div className="space-y-1">
                  <div className={`text-xs font-bold ${scoreMeta.textClass}`}>Total</div>
                  <div className="h-1 bg-black/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${scoreMeta.textClass.replace('text-', 'bg-')}`}
                      style={{ width: `${safeNumber(decision.score) ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className={`text-xs font-bold ${scoreMeta.textClass} text-right`}>{safeNumber(decision.score) ?? '—'}</div>
              </div>
            </div>
          </details>

          {/* Comparison */}
          {delta !== null ? (
            <div className={`mt-4 border-t border-black/9 pt-3 text-sm text-black/55`}>
              vs your last similar decision{' '}
              <span className={`font-semibold ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>
          ) : null}
          </div>

          {/* IF DELAYED */}
          <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">If delayed</p>
            <p className="mt-3 text-sm leading-7 text-black/75">{buildIfDelayed(decision)}</p>
          </div>
        </section>

        {/* ── WHAT OTHERS MAY MISS ── */}
        <section className="rounded-[20px] bg-black p-6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">What others may miss</p>
          <p className="mt-3 text-base font-medium italic leading-7 text-white">
            {buildWhatOthersMiss(decision)}
          </p>
        </section>

        {/* ── WHAT'S WORKING / WHAT'S BREAKING ── */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36 mb-4">What&apos;s working</p>
            <div className="space-y-3">
              {buildWhatsWorking(decision).map((item, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-green-600 text-sm mt-0.5">✓</span>
                  <p className="text-sm leading-6 text-black/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36 mb-4">What&apos;s breaking</p>
            <div className="space-y-3">
              {buildWhatsBreaking(decision).map((item, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-red-600 text-sm mt-0.5">✗</span>
                  <p className="text-sm leading-6 text-black/75">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EVIDENCE: Threat / Hinge / Trap ── */}
        <section className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/36 mb-1">Evidence</p>
          <div className="border-t border-black/6 mt-3">
            {decision.hinge ? (
              <EvidenceRow tag="The hinge" text={decision.hinge} highlight />
            ) : null}
            {decision.trap ? (
              <EvidenceRow tag="Hidden trap" text={decision.trap} />
            ) : null}

          </div>
        </section>

        {/* ── REASONING (accordion, collapsed by default) ── */}
        {deepSections.length > 0 ? (
          <section className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36 mb-3">Reasoning</p>
            <div className="border-t border-black/6">
              {deepSections.map((section) => (
                <AccordionSection
                  key={section.heading}
                  heading={section.heading}
                  lines={section.lines}
                  isOpen={Boolean(openSections[section.heading.toLowerCase()])}
                  onToggle={() => toggleSection(section.heading.toLowerCase())}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── YOUR NOTES ── */}
        {decision.final_thoughts ? (
          <section className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">Your notes</p>
            <div className="mt-3 border-l-2 border-black/12 pl-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-black/65">{decision.final_thoughts}</p>
            </div>
          </section>
        ) : null}

        {/* ── RECORD: Decision anatomy ── */}
        <section className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/36 mb-3">Decision anatomy</p>
          <div className="border-t border-black/6">
            <AnatomyRow label="Door" sublabel="type of decision" value={decision.door} />
            <AnatomyRow label="Hinge" sublabel="what must be true" value={decision.hinge} highlight />
            <AnatomyRow label="Lock" sublabel="commitment mechanism" value={decision.lock} />
            <AnatomyRow label="Trap" sublabel="hidden failure risk" value={decision.trap} highlight />
            <AnatomyRow label="Exit" sublabel="escape condition" value={decision.exit} />
            <AnatomyRow label="Step" sublabel="next survivable move" value={decision.step} />
            <AnatomyRow label="Script" sublabel="exact words to use" value={decision.script} />
            <AnatomyRow label="Tripwire" sublabel="stop signal" value={decision.tripwire} highlight />
          </div>
        </section>

        {/* ── COMPARISON OVER TIME ── */}
        <section className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">Comparison over time</p>
          <p className="mt-1 text-xs text-black/40">A lighter historical view. Useful for trend, but secondary to the current decision.</p>

          {allComparisonRows.length === 0 ? (
            <p className="mt-4 text-sm text-black/40">No prior decisions to compare yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/6">
              <div className="grid grid-cols-[1.6fr_0.7fr_0.5fr] border-b border-black/6 bg-black/[0.025] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/38">
                <div>Review</div>
                <div>Date</div>
                <div>Score</div>
              </div>
              {allComparisonRows.map((row) => {
                const rowMeta = getScoreMeta(row.score);
                return (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1.6fr_0.7fr_0.5fr] items-center border-b border-black/6 px-4 py-3 text-sm last:border-b-0 ${
                      row.isCurrent ? 'bg-black/[0.02]' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="overflow-hidden truncate text-sm font-medium text-black/80">{row.title || 'Untitled'}</div>
                      {row.isCurrent ? (
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-black/35">Current</div>
                      ) : null}
                    </div>
                    <div className="text-xs text-black/50">{row.date}</div>
                    <div>
                      {row.score !== null ? (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${rowMeta.pillClass}`}>
                          {row.score}
                        </span>
                      ) : (
                        <span className="text-black/35">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="pt-1 text-[11px] text-black/35">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span>Status: {decision.outcome_status || '—'}</span>
            <span>Needs follow-up: {decision.needs_follow_up ? 'Yes' : 'No'}</span>
            <span>Saved: {formatDateTime(decision.created_at)}</span>
          </div>
        </footer>

      </div>
    </main>
  );
}

