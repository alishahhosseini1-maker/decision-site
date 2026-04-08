// app/decision-summary/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

type DecisionRecord = {
  id: string;
  user_id: string | null;
  decision: string;
  context: string | null;
  score: number | null;
  verdict: string | null;
  door: string | null;
  hinge: string | null;
  trap: string | null;
  step: string | null;
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
  if (v >= 80) return { label: 'Ready', pillClass: 'bg-emerald-600 text-white', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700', cardClass: 'border-emerald-200 bg-emerald-50/60' };
  if (v >= 60) return { label: 'Proceed smaller', pillClass: 'bg-amber-500 text-white', dotClass: 'bg-amber-400', textClass: 'text-amber-700', cardClass: 'border-amber-200 bg-amber-50/60' };
  return { label: 'Not ready', pillClass: 'bg-rose-600 text-white', dotClass: 'bg-rose-500', textClass: 'text-rose-700', cardClass: 'border-rose-200 bg-rose-50/60' };
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
  const s = decision.score;
  if (s !== null && s !== undefined) {
    if (s < 60) return 'The decision is not ready for full commitment yet.';
    if (s < 80) return 'There may be a real opportunity here, but the move likely needs to be smaller or clearer.';
    return 'The decision looks survivable if you keep the next step disciplined.';
  }
  return 'This decision should be judged by survivability, not optimism.';
}

function buildWhatOthersMiss(decision?: DecisionRecord | null) {
  if (!decision) return '—';
  if (decision.step?.trim()) {
    return `The smartest move may not be to commit fully. It may be to take this next survivable step first: ${decision.step}`;
  }
  return 'What matters most is not whether the decision sounds good now, but whether it stays survivable if reality pushes back.';
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
            <p key={i} className="text-sm leading-7 text-black/60">{line}</p>
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
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [comparisonDecisions, setComparisonDecisions] = useState<ComparisonDecision[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

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
          .select('id, user_id, decision, context, score, verdict, door, hinge, trap, step, deep_review, final_thoughts, outcome_status, needs_follow_up, created_at, dismissed_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (id) {
          query = supabase
            .from('decisions')
            .select('id, user_id, decision, context, score, verdict, door, hinge, trap, step, deep_review, final_thoughts, outcome_status, needs_follow_up, created_at, dismissed_at')
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

  const currentScore = safeNumber(decision?.score);
  const previousComparable = comparisonRows.find((r) => r.score !== null);
  const delta = currentScore !== null && previousComparable?.score != null
    ? currentScore - previousComparable.score
    : null;

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-black/55">Loading decision brief...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-medium text-rose-700">{error}</p>
          <div className="mt-4 flex gap-3">
            <a href="/" className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white">Back home</a>
            <a href="/history" className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white">View history</a>
          </div>
        </div>
      </main>
    );
  }

  if (!decision) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-black/55">No decision brief available.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-black">
      <div
        className={`mx-auto max-w-3xl space-y-6 transition-all duration-700 ${
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
            </div>
          </div>
        </header>

        {/* ── SIGNAL: What matters now ── */}
        <section className="rounded-[20px] border-l-4 border-l-black border border-black/6 bg-[#f1f1ec] p-7 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-black/36">What matters now</p>
          <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-black md:text-[1.65rem]">
            {buildInsight(decision)}
          </h2>
          {decision.context ? (
            <p className="mt-3 text-sm leading-7 text-black/58">{decision.context}</p>
          ) : null}
        </section>

        {/* ── VERDICT ── */}
        <section className="rounded-[20px] border border-black/6 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left — the decision */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">The decision</p>
              <p className="mt-2 text-sm leading-7 text-black/75">{decision.decision}</p>
            </div>
            {/* Right — the verdict with left border */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-black/36">Verdict</p>
              <div className="mt-2 border-l-[3px] border-l-black pl-4 py-1 bg-[#f9f9f7] rounded-r-lg">
                <p className="text-sm font-normal leading-7 text-black">{verdictData.title}</p>
              </div>
              {verdictData.rationale ? (
                <p className="mt-3 text-sm leading-7 text-black/60">{verdictData.rationale}</p>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── SCORE ── */}
        <section className={`rounded-[20px] border p-6 shadow-sm ${scoreMeta.cardClass}`}>
          <div className="flex items-center justify-between gap-4">
            <p className={`text-[10px] uppercase tracking-[0.18em] ${scoreMeta.textClass} opacity-70`}>
              Decision quality
            </p>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${scoreMeta.pillClass}`}>
              {scoreMeta.label}
            </span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className={`text-4xl font-semibold leading-none ${scoreMeta.textClass}`}>
              {safeNumber(decision.score) ?? '—'}
            </span>
            <div className={`mb-1 flex items-center gap-1.5 text-sm ${scoreMeta.textClass} opacity-70`}>
              <span className={`h-2 w-2 rounded-full ${scoreMeta.dotClass}`} />
              Readiness score
            </div>
          </div>
          <p className={`mt-3 text-sm leading-6 ${scoreMeta.textClass} opacity-70`}>
            Higher scores suggest the move is more survivable. Lower scores suggest the decision needs clearer assumptions or a smaller step.
          </p>
          {delta !== null ? (
            <div className={`mt-3 border-t border-black/8 pt-3 text-sm ${scoreMeta.textClass} opacity-70`}>
              Compared with last comparable review: <span className="font-semibold">{delta > 0 ? `+${delta}` : delta}</span>
            </div>
          ) : null}
        </section>

        {/* ── WHAT OTHERS MAY MISS ── */}
        <section className="rounded-[20px] bg-black p-6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">What others may miss</p>
          <p className="mt-3 text-base font-medium italic leading-7 text-white">
            {buildWhatOthersMiss(decision)}
          </p>
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
            {decision.step ? (
              <EvidenceRow tag="Next survivable move" text={decision.step} />
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
            <AnatomyRow label="Trap" sublabel="hidden failure risk" value={decision.trap} highlight />
            <AnatomyRow label="Step" sublabel="next survivable move" value={decision.step} />
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

