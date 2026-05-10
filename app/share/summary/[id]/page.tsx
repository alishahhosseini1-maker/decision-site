// app/share/summary/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

    if (/^\d+\.\s/.test(raw)) continue;
    if (/reflection.*prompt/i.test(cleaned)) continue;
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
  return '';
}

function splitVerdict(text?: string | null) {
  if (!text) return { title: '', lines: [] };
  const trimmed = text.trim();
  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline === -1) return { title: trimmed, lines: [] };
  const title = trimmed.slice(0, firstNewline).trim();
  const rest = trimmed.slice(firstNewline + 1).trim();
  const lines = rest.split('\n').map((l) => l.trim()).filter(Boolean);
  return { title, lines };
}

function buildInsight(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  if (decision.what_others_miss?.trim()) {
    return decision.what_others_miss;
  }

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

  if (decision.trap?.trim()) {
    return `The hidden risk: ${decision.trap.toLowerCase().charAt(0) + decision.trap.slice(1)}`;
  }

  if (decision.hinge?.trim()) {
    return `Everything pivots on: ${decision.hinge.toLowerCase().charAt(0) + decision.hinge.slice(1)}`;
  }

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

  if (decision.if_delayed?.trim()) {
    return decision.if_delayed;
  }

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

  const clarity = decision.readiness_clarity ?? 0;
  const assumptions = decision.readiness_assumptions ?? 0;
  const reversibility = decision.readiness_reversibility ?? 0;
  const risk = decision.readiness_risk ?? 0;
  const exitLogic = decision.readiness_exit_logic ?? 0;

  if (clarity >= 14) {
    working.push('You know what success looks like');
  }
  if (assumptions >= 12) {
    working.push('Core assumptions are validated');
  }
  if (reversibility >= 12) {
    working.push('You can reverse course if needed');
  }
  if (risk >= 10) {
    working.push('Downside is bounded');
  }
  if (exitLogic >= 12) {
    working.push('Exit condition is clear');
  }

  if (working.length === 0) {
    working.push('Decision framed clearly');
  }

  return working.slice(0, 3);
}

function buildTopRisk(decision?: DecisionRecord | null): string {
  if (!decision) return '—';

  if (decision.trap?.trim()) {
    return decision.trap;
  }

  const dims = [
    { name: 'Clarity', value: decision.readiness_clarity ?? 0, risk: 'The success criteria are not clear enough to measure progress.' },
    { name: 'Assumptions', value: decision.readiness_assumptions ?? 0, risk: 'Core assumptions have not been validated before committing.' },
    { name: 'Reversibility', value: decision.readiness_reversibility ?? 0, risk: 'This decision is hard to reverse if conditions change.' },
    { name: 'Risk', value: decision.readiness_risk ?? 0, risk: 'The downside scenario is not well understood.' },
    { name: 'Exit Logic', value: decision.readiness_exit_logic ?? 0, risk: 'No clear condition for when to walk away.' },
  ];

  const weakest = dims.sort((a, b) => a.value - b.value)[0];
  return weakest.risk;
}

export default function ShareBriefPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase
          .from('decisions')
          .select(`
            id, decision, context, score,
            readiness_clarity, readiness_assumptions, readiness_reversibility,
            readiness_risk, readiness_exit_logic,
            readiness_rationale_clarity, readiness_rationale_assumptions,
            readiness_rationale_reversibility, readiness_rationale_risk,
            readiness_rationale_exit_logic,
            verdict, door, hinge, lock, trap, exit, step, script,
            tripwire, failure_modes, if_delayed, what_others_miss,
            deep_review, final_thoughts, created_at
          `)
          .eq('id', id)
          .single();

        if (error) throw new Error('Decision not found');

        if (!cancelled) {
          setDecision(data as DecisionRecord);
          setLoading(false);
          setTimeout(() => setAnimateIn(true), 50);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load decision');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const scoreMeta = useMemo(() => getScoreMeta(decision?.score), [decision?.score]);
  const deepSections = useMemo(() => parseDeepReview(decision?.deep_review), [decision?.deep_review]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">Loading shared decision...</p>
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

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
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
                  <div className="text-xs font-bold text-black/72">Total</div>
                </div>
                <div />
                <div className="text-sm font-bold text-black/75 text-right">{safeNumber(decision.score) ?? '—'}<span className="text-xs opacity-60">/100</span></div>
              </div>
            </div>
          </details>
        </div>

          <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">IF DELAYED</p>
            <p className="mt-3 text-sm leading-7 text-black/75">{buildIfDelayed(decision)}</p>
          </div>
        </section>

        {/* ── EVIDENCE (expandable deep review) ── */}
        {deepSections.length > 0 && (
          <details className="rounded-2xl border border-black/6 bg-white shadow-sm group">
            <summary className="cursor-pointer px-7 py-6 list-none flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-black/40 mb-1">Evidence</p>
                <p className="text-base font-semibold text-black/80">The analysis behind the score</p>
              </div>
              <span className="text-lg text-black/30 transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="px-7 pb-7 pt-2 space-y-6 border-t border-black/5">
              {deepSections.map((sec, idx) => (
                <div key={idx}>
                  <h3 className="text-xs uppercase tracking-[0.14em] text-black/50 mb-3 font-semibold">
                    {sec.heading}
                  </h3>
                  <ul className="space-y-2 text-sm leading-7 text-black/70">
                    {sec.lines.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-black/30 mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ── OPERATING SNAPSHOT ── */}
        <section className="rounded-2xl border border-black/6 bg-white p-7 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/40 mb-5">OPERATING SNAPSHOT</p>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-[0.14em] text-black/50 mb-3 font-semibold">
                What&apos;s working
              </h3>
              <ul className="space-y-2 text-sm leading-7 text-black/70">
                {buildWhatsWorking(decision).map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-[0.14em] text-black/50 mb-3 font-semibold">
                Top risk
              </h3>
              <p className="text-sm leading-7 text-black/70 flex gap-2">
                <span className="text-rose-600 mt-0.5">!</span>
                <span>{buildTopRisk(decision)}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── DOOR FRAMEWORK DETAILS ── */}
        <section className="grid gap-6 md:grid-cols-2">
          {decision.door && (
            <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">DOOR · What you&apos;re deciding</p>
              <p className="mt-3 text-sm leading-7 text-black/75">{decision.door}</p>
            </div>
          )}
          {decision.hinge && (
            <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">HINGE · What this pivots on</p>
              <p className="mt-3 text-sm leading-7 text-black/75">{decision.hinge}</p>
            </div>
          )}
          {decision.lock && (
            <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">LOCK · Hard to undo</p>
              <p className="mt-3 text-sm leading-7 text-black/75">{decision.lock}</p>
            </div>
          )}
          {decision.exit && (
            <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">EXIT · Walk away if</p>
              <p className="mt-3 text-sm leading-7 text-black/75">{decision.exit}</p>
            </div>
          )}
          {decision.trap && (
            <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">TRAP · Hidden risk</p>
              <p className="mt-3 text-sm leading-7 text-black/75">{decision.trap}</p>
            </div>
          )}
          {decision.step && (
            <div className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">STEP · Next move</p>
              <p className="mt-3 text-sm leading-7 text-black/75">{decision.step}</p>
            </div>
          )}
        </section>

        {/* Footer */}
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
