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

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function safeNumber(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function getScoreMeta(score?: number | null) {
  const value = typeof score === 'number' ? score : 0;

  if (value >= 70) {
    return {
      label: 'Survivable',
      cardClass: 'border-emerald-200 bg-emerald-50/70',
      pillClass: 'bg-emerald-600 text-white',
      textClass: 'text-emerald-950',
      mutedClass: 'text-emerald-900/70',
      dotClass: 'bg-emerald-500',
    };
  }

  if (value >= 40) {
    return {
      label: 'Needs work',
      cardClass: 'border-amber-200 bg-amber-50/70',
      pillClass: 'bg-amber-500 text-white',
      textClass: 'text-amber-950',
      mutedClass: 'text-amber-900/70',
      dotClass: 'bg-amber-500',
    };
  }

  return {
    label: 'Weak',
    cardClass: 'border-rose-200 bg-rose-50/70',
    pillClass: 'bg-rose-600 text-white',
    textClass: 'text-rose-950',
    mutedClass: 'text-rose-900/70',
    dotClass: 'bg-rose-500',
  };
}

function PrimaryCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">{label}</p>
      <p className="mt-3 text-[17px] font-medium leading-8 text-black/90">{value || '—'}</p>
    </section>
  );
}

function SecondaryCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <section className="rounded-[22px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">{label}</p>
      <p className="mt-3 text-sm leading-7 text-black/75">{value || '—'}</p>
    </section>
  );
}

function EvidenceCard({ label, items }: { label: string; items?: string[] }) {
  return (
    <section className="rounded-[22px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">{label}</p>
      {!items || items.length === 0 ? (
        <p className="mt-3 text-sm text-black/45">—</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-black/78">
          {items.map((item, idx) => (
            <li key={`${label}-${idx}`} className="flex gap-2">
              <span className="mt-[2px] text-black/35">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function splitVerdict(verdict?: string | null) {
  if (!verdict) return { title: 'No verdict saved', rationale: '—' };
  const parts = verdict.split('\n\n').map((p) => p.trim()).filter(Boolean);
  // Strip markdown bold
  const clean = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
  return {
    title: clean(parts[0] || 'No verdict saved'),
    rationale: clean(parts.slice(1).join('\n\n') || '—'),
  };
}

function extractSupporting(decision?: DecisionRecord | null) {
  const items: string[] = [];
  if (decision?.hinge) items.push(`Core assumption: ${decision.hinge}`);
  if (decision?.step) items.push(`Recommended move stays survivable: ${decision.step}`);
  if (decision?.door) items.push(`Decision type: ${decision.door}`);
  return items;
}

function extractBreaking(decision?: DecisionRecord | null) {
  const items: string[] = [];
  if (decision?.trap) items.push(`Hidden risk: ${decision.trap}`);
  if (decision?.hinge) items.push(`If this assumption fails, the decision breaks: ${decision.hinge}`);
  return items;
}

function buildInsight(decision?: DecisionRecord | null) {
  if (!decision) return '—';
  const score = decision.score;
  if (score !== null && score !== undefined) {
    if (score < 40) return 'The decision is not ready for full commitment yet.';
    if (score < 70) return 'There may be a real opportunity here, but the move likely needs to be smaller or clearer.';
    return 'The decision looks survivable if you keep the next step disciplined.';
  }
  return 'This decision should be judged by survivability, not optimism.';
}

function buildTension(decision?: DecisionRecord | null) {
  if (!decision) return '—';
  if (decision.context?.trim()) return decision.context;
  return 'The main tension is whether the upside is real enough to justify what gets harder to undo.';
}

function buildIfDelayed(decision?: DecisionRecord | null) {
  if (!decision) return '—';
  if (decision.trap?.trim()) return decision.trap;
  return 'The hidden cost becomes visible only after commitment.';
}

function buildWhatOthersMiss(decision?: DecisionRecord | null) {
  if (!decision) return '—';
  if (decision.step?.trim()) {
    return `The smartest move may not be to commit fully. It may be to take this next survivable step first: ${decision.step}`;
  }
  return 'What matters most is not whether the decision sounds good now, but whether it stays survivable if reality pushes back.';
}

export default function DecisionSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [comparisonDecisions, setComparisonDecisions] = useState<ComparisonDecision[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw new Error(authError.message);
        if (!user) throw new Error('You must be signed in to view this decision brief.');

        // Read id from URL query param
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        let query = supabase
          .from('decisions')
          .select('id, user_id, decision, context, score, verdict, door, hinge, trap, step, outcome_status, needs_follow_up, created_at, dismissed_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (id) {
          query = supabase
            .from('decisions')
            .select('id, user_id, decision, context, score, verdict, door, hinge, trap, step, outcome_status, needs_follow_up, created_at, dismissed_at')
            .eq('id', id)
            .eq('user_id', user.id)
            .limit(1);
        }

        const { data, error: decisionError } = await query.single();

        if (decisionError || !data) throw new Error('No saved decision brief found yet.');

        // Load recent decisions for comparison table (exclude current)
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
  const supporting = useMemo(() => extractSupporting(decision), [decision]);
  const breaking = useMemo(() => extractBreaking(decision), [decision]);

  const comparisonRows = useMemo(() => {
    return comparisonDecisions.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.decision,
      date: formatDate(item.created_at),
      score: safeNumber(item.score),
      isCurrent: false as boolean,
    }));
  }, [comparisonDecisions]);

  // Build full table: current decision first, then past decisions
  const allComparisonRows = useMemo(() => {
    if (!decision) return comparisonRows;
    const currentRow = {
      id: decision.id,
      title: decision.decision,
      date: formatDate(decision.created_at),
      score: safeNumber(decision.score),
      isCurrent: true as boolean,
    };
    return [currentRow, ...comparisonRows];
  }, [decision, comparisonRows]);

  const currentScore = safeNumber(decision?.score);
  const previousComparable = comparisonRows.find((r) => r.score !== null);
  const delta =
    currentScore !== null && previousComparable?.score != null
      ? currentScore - previousComparable.score
      : null;

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
          <div className="mt-4 flex gap-3">
            <a href="/" className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white">
              Back home
            </a>
            <a href="/history" className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white">
              View history
            </a>
          </div>
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
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
      <div
        className={`mx-auto max-w-5xl space-y-8 transition-all duration-700 ${
          animateIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {/* ── Header ── */}
        <header className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Prepared for: Decision, not review
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                {decision.decision}
              </h1>
              {decision.context ? (
                <p className="mt-2 max-w-3xl text-sm leading-7 text-black/56">
                  {decision.context}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/70 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-black" />
                Decision locked
              </div>
              <a
                href="/history"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
              >
                View history
              </a>
            </div>
          </div>
        </header>

        {/* ── What matters now ── */}
        <section className="rounded-[28px] border border-black/5 border-l-4 border-l-black bg-[#f1f1ec] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black/38">What matters now</p>
          <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-black md:text-[2.15rem]">
            {buildInsight(decision)}
          </h2>
          <p className="mt-4 text-sm leading-7 text-black/63">{buildTension(decision)}</p>
        </section>

        {/* ── Decision + Verdict ── */}
        <section className="grid gap-6 md:grid-cols-2">
          <PrimaryCard label="The decision" value={decision.decision} />
          <PrimaryCard label="Verdict" value={verdictData.title} />
        </section>

        {/* ── Score + If delayed ── */}
        <section className="grid gap-6 md:grid-cols-2">
          <section className={`rounded-[24px] border p-6 shadow-sm ${scoreMeta.cardClass}`}>
            <div className="flex items-center justify-between gap-4">
              <p className={`text-[11px] uppercase tracking-[0.18em] ${scoreMeta.mutedClass}`}>
                Decision quality
              </p>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${scoreMeta.pillClass}`}>
                {scoreMeta.label}
              </span>
            </div>

            <div className={`mt-4 flex items-end gap-3 ${scoreMeta.textClass}`}>
              <div className="text-4xl font-semibold leading-none">
                {safeNumber(decision.score) ?? '—'}
              </div>
              <div className={`mb-1 flex items-center gap-2 text-sm ${scoreMeta.mutedClass}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${scoreMeta.dotClass}`} />
                <span>Readiness score</span>
              </div>
            </div>

            <p className={`mt-4 text-sm leading-7 ${scoreMeta.mutedClass}`}>
              Higher scores suggest the move is more survivable. Lower scores suggest the decision
              likely needs clearer assumptions or a smaller step.
            </p>

            {delta !== null ? (
              <div className={`mt-4 border-t border-black/8 pt-4 text-sm ${scoreMeta.mutedClass}`}>
                <span>Compared with last comparable review: </span>
                <span className="font-semibold">{delta > 0 ? `+${delta}` : delta}</span>
              </div>
            ) : null}
          </section>

          <SecondaryCard label="If wrong" value={buildIfDelayed(decision)} />
        </section>

        {/* ── What others may miss ── */}
        <section className="rounded-[24px] bg-black p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">What others may miss</p>
          <p className="mt-3 text-lg font-medium italic leading-8 text-white">
            {buildWhatOthersMiss(decision)}
          </p>
        </section>

        {/* ── Supporting + Breaking ── */}
        <section className="grid gap-6 md:grid-cols-2">
          <EvidenceCard label="Supporting" items={supporting} />
          <EvidenceCard label="Breaking" items={breaking} />
        </section>

        {/* ── Rationale (full verdict body) ── */}
        {verdictData.rationale && verdictData.rationale !== '—' ? (
          <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">Rationale</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-black/78">
              {verdictData.rationale}
            </p>
          </section>
        ) : null}

        {/* ── Comparison over time ── */}
        <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">Comparison over time</p>
            <p className="mt-2 text-sm leading-6 text-black/55">
              A lighter historical view. Useful for trend, but secondary to the current decision.
            </p>
          </div>

          {allComparisonRows.length === 0 ? (
            <p className="mt-5 text-sm text-black/45">No prior decisions to compare yet.</p>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/6">
              <div className="grid grid-cols-[1.6fr_0.8fr_0.6fr] border-b border-black/6 bg-black/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                <div>Review</div>
                <div>Date</div>
                <div>Score</div>
              </div>

              {allComparisonRows.map((row) => {
                const rowMeta = getScoreMeta(row.score);

                return (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1.6fr_0.8fr_0.6fr] items-center border-b border-black/6 px-4 py-4 text-sm last:border-b-0 ${
                      row.isCurrent ? 'bg-black/[0.025]' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="overflow-hidden truncate font-medium text-black/86">{row.title || 'Untitled'}</div>
                      {row.isCurrent ? (
                        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-black/38">Current</div>
                      ) : null}
                    </div>
                    <div className="text-black/55">{row.date}</div>
                    <div>
                      {row.score !== null ? (
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${rowMeta.pillClass}`}>
                          {row.score}
                        </span>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="pt-1 text-xs text-black/38">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>Status: {decision.outcome_status || '—'}</span>
            <span>Needs follow-up: {decision.needs_follow_up ? 'Yes' : 'No'}</span>
            <span>Saved: {formatDateTime(decision.created_at)}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

