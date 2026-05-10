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
  readiness_rationale_clarity: string | null;
  readiness_rationale_assumptions: string | null;
  readiness_rationale_reversibility: string | null;
  readiness_rationale_risk: string | null;
  readiness_rationale_exit_logic: string | null;
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
  if_delayed: string | null;
  what_others_miss: string | null;
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

    // Stop parsing when we hit the new prompt sections (STEP, SCRIPT, etc.)
    if (/^(STEP|SCRIPT|WALK AWAY IF|FAILURE MODES)$/i.test(cleaned)) {
      break;
    }

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
  // Use LLM-generated rationale if available
  if (decision) {
    switch (name) {
      case 'Clarity':
        if (decision.readiness_rationale_clarity?.trim()) return decision.readiness_rationale_clarity;
        break;
      case 'Assumptions':
        if (decision.readiness_rationale_assumptions?.trim()) return decision.readiness_rationale_assumptions;
        break;
      case 'Reversibility':
        if (decision.readiness_rationale_reversibility?.trim()) return decision.readiness_rationale_reversibility;
        break;
      case 'Risk':
        if (decision.readiness_rationale_risk?.trim()) return decision.readiness_rationale_risk;
        break;
      case 'Exit Logic':
        if (decision.readiness_rationale_exit_logic?.trim()) return decision.readiness_rationale_exit_logic;
        break;
    }
  }

  // Fallback to empty string if no LLM-generated rationale
  return '';
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

  console.log('[buildWhatOthersMiss] decision.what_others_miss:', decision.what_others_miss);

  // Use LLM-generated what_others_miss if available
  if (decision.what_others_miss?.trim()) {
    return decision.what_others_miss;
  }

  // Fallback: generate based on hinge or score
  if (decision.hinge?.trim()) {
    return `The entire decision pivots on something most people overlook: ${decision.hinge}`;
  }

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

  console.log('[buildIfDelayed] decision.if_delayed:', decision.if_delayed);

  // Use LLM-generated if_delayed if available
  if (decision.if_delayed?.trim()) {
    return decision.if_delayed;
  }

  // Fallback: generate based on score
  const score = decision.score ?? 0;

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
      const firstLine = stripMarkdown(mustGoRight.lines[0]);
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

function stripMarkdown(text: string): string {
  // Remove markdown bold (**text** or __text__)
  return text.replace(/(\*\*|__)(.*?)\1/g, '$2');
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

  // Special layout for Walk away if: full-width with label on its own line
  if (label === 'Walk away if') {
    return (
      <div className="border-b border-black/6 py-3 last:border-b-0">
        <p className={`text-[9.5px] font-medium uppercase tracking-[0.11em] ${highlight ? 'text-black/55' : 'text-black/36'}`}>
          {label}:
        </p>
        <p className="text-[9.5px] text-black/28 mb-2">{sublabel}</p>
        <p className={`text-sm leading-6 ${highlight ? 'font-medium text-black' : 'text-black/72'}`}>{value}</p>
      </div>
    );
  }

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

export default function ShareBriefPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [comparisonDecisions, setComparisonDecisions] = useState<ComparisonDecision[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  

  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  const scoreMeta = useMemo(() => getScoreMeta(decision?.score), [decision?.score]);
  const verdictData = useMemo(() => splitVerdict(decision?.verdict), [decision?.verdict]);
  const deepSections = useMemo(() => parseDeepReview(decision?.deep_review), [decision?.deep_review]);

  

  

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">Loading decision brief...</p>
        </div>
      </main>
    );
  }

  if (error || !decision) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-black/6 bg-white p-8 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Decision Layer
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            Decision brief unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-black/60">
            This decision could not be loaded.
          </p>
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
      

      <div
        className={`mx-auto max-w-5xl space-y-6 transition-all duration-700 ${
          animateIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >

        {/* ── Header ── */}
        <header className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/35">
            SHARED DECISION &nbsp;·&nbsp; {formatDate(decision.created_at)}
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl max-w-2xl">
              {decision.decision}
            </h1>
          </div>
        </header>

        {/* ── SIGNAL: What matters now ── */}
        <section className="rounded-[20px] border-l-4 border-l-black border border-black/6 bg-[#f1f1ec] p-8 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#A32D2D]">WHAT THIS DECISION IS MISSING</p>
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">NEXT MOVE</p>
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
            <div className="text-sm text-black/55 mt-2">Pre-commit score</div>
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
              Score breakdown
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

          </div>

          {/* IF DELAYED */}
          {decision.if_delayed?.trim() ? (
          <details open className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-black/36 flex justify-between items-center list-none">
              IF YOU WAIT
              <span className="text-base text-black/28">▼</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-black/75">{buildIfDelayed(decision)}</p>
          </details>
          ) : null}
        </section>

        {/* ── WHAT OTHERS MAY MISS ── */}
        <details open className="rounded-[20px] bg-black p-6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-white/50 flex justify-between items-center list-none">
            What others may miss
            <span className="text-base text-white/40">▼</span>
          </summary>
          <p className="mt-3 text-base font-medium italic leading-7 text-white">
            {buildWhatOthersMiss(decision)}
          </p>
        </details>

        {/* ── WHAT TO SAY (SCRIPT) ── */}
        {decision.script?.trim() ? (
          <details open className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-black/36 flex justify-between items-center list-none">
              WHAT TO SAY
              <span className="text-base text-black/28">▼</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-black/75 italic">{decision.script}</p>
          </details>
        ) : null}

        {/* ── WALK AWAY IF ── */}
        {decision.tripwire?.trim() ? (
          <details open className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-black/36 flex justify-between items-center list-none">
              WALK AWAY IF
              <span className="text-base text-black/28">▼</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-black/75 font-semibold">{decision.tripwire}</p>
          </details>
        ) : null}

        {/* ── EVIDENCE: Threat / Hinge / Trap ── */}
        <details open className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-black/36 flex justify-between items-center list-none">
            Evidence
            <span className="text-base text-black/28">▼</span>
          </summary>
          <div className="border-t border-black/6 mt-3">
            {decision.door ? (
              <EvidenceRow tag="The decision" text={decision.door} />
            ) : null}
            {decision.hinge ? (
              <EvidenceRow tag="The hinge" text={decision.hinge} highlight />
            ) : null}
            {decision.lock ? (
              <EvidenceRow tag="What can't be undone" text={decision.lock} />
            ) : null}
            {decision.exit ? (
              <EvidenceRow tag="Exit condition" text={decision.exit} />
            ) : null}
            {decision.trap ? (
              <EvidenceRow tag="Hidden trap" text={decision.trap} />
            ) : null}
          </div>
        </details>

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
          <details className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-black/36 flex justify-between items-center list-none">
              Your notes
              <span className="text-base text-black/28">▼</span>
            </summary>
            <div className="mt-3 border-l-2 border-black/12 pl-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-black/65">{decision.final_thoughts}</p>
            </div>
          </details>
        ) : null}

        

        {/* ── Footer ── */}
        <footer className="mt-12 pt-8 border-t border-black/8 text-center">
          <a
            href="https://decisionlayer.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium text-black/55 hover:text-black transition-colors inline-block"
          >
            Reviewed with Decision Layer →
          </a>
        </footer>

      </div>
    </main>
  );
}

