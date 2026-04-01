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

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function safeNumber(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function getConfidenceMeta(score?: number | null) {
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

function PrimaryCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">{label}</p>
      <p className="mt-3 text-[17px] font-medium leading-8 text-black/90">{value || '—'}</p>
    </section>
  );
}

function SecondaryCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <section className="rounded-[22px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">{label}</p>
      <p className="mt-3 text-sm leading-7 text-black/75">{value || '—'}</p>
    </section>
  );
}

function EvidenceCard({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
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
  if (!verdict) {
    return {
      title: 'No verdict saved',
      rationale: '—',
    };
  }

  const parts = verdict
    .split('\n\n')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    title: parts[0] || 'No verdict saved',
    rationale: parts.slice(1).join('\n\n') || '—',
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
  if (decision?.context) items.push(`Context pressure: ${decision.context}`);
  return items;
}

function buildInsight(decision?: DecisionRecord | null) {
  if (!decision) return '—';

  if (decision.score !== null && decision.score !== undefined) {
    if (decision.score < 40) {
      return 'The decision is not ready for full commitment yet.';
    }
    if (decision.score < 70) {
      return 'There may be a real opportunity here, but the move likely needs to be smaller or clearer.';
    }
    return 'The decision looks survivable if you keep the next step disciplined.';
  }

  return 'This decision should be judged by survivability, not optimism.';
}

function buildTension(decision?: DecisionRecord | null) {
  if (!decision) return '—';
  if (decision.context?.trim()) return decision.context;
  return 'The main tension is whether the upside is real enough to justify what gets harder to undo.';
}

function buildIfWrong(decision?: DecisionRecord | null) {
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

        if (authError) {
          throw new Error(authError.message);
        }

        if (!user) {
          throw new Error('You must be signed in to view this decision brief.');
        }

        const { data, error: decisionError } = await supabase
          .from('decisions')
          .select(
            `
            id,
            user_id,
            decision,
            context,
            score,
            verdict,
            door,
            hinge,
            trap,
            step,
            outcome_status,
            needs_follow_up,
            created_at,
            dismissed_at
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (decisionError || !data) {
          throw new Error('No saved decision brief found yet.');
        }

        if (!cancelled) {
          setDecision(data as DecisionRecord);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Something went wrong.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setAnimateIn(true));
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const confidenceMeta = useMemo(
    () => getConfidenceMeta(decision?.score),
    [decision?.score]
  );

  const verdictData = useMemo(() => splitVerdict(decision?.verdict), [decision?.verdict]);
  const supporting = useMemo(() => extractSupporting(decision), [decision]);
  const breaking = useMemo(() => extractBreaking(decision), [decision]);

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
            <a
              href="/"
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
            >
              Back home
            </a>

            <a
              href="/decisions"
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
            >
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
        <header className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Prepared for: Decision, not review
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                decision brief
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-black/56">
                A saved record of the decision, the verdict, and the survivable next move.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/70 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-black" />
                Decision locked
              </div>

              <a
                href="/decisions"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-black hover:text-white"
              >
                View history
              </a>
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-black/5 border-l-4 border-l-black bg-[#f1f1ec] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black/38">
            What matters now
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-black md:text-[2.15rem]">
            {buildInsight(decision)}
          </h2>

          <p className="mt-4 text-sm leading-7 text-black/63">{buildTension(decision)}</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <PrimaryCard label="The decision" value={decision.decision} />
          <PrimaryCard label="Verdict" value={verdictData.title} />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <section className={`rounded-[24px] border p-6 shadow-sm ${confidenceMeta.cardClass}`}>
            <div className="flex items-center justify-between gap-4">
              <p className={`text-[11px] uppercase tracking-[0.18em] ${confidenceMeta.mutedClass}`}>
                Decision quality
              </p>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${confidenceMeta.pillClass}`}
              >
                {confidenceMeta.label}
              </span>
            </div>

            <div className={`mt-4 flex items-end gap-3 ${confidenceMeta.textClass}`}>
              <div className="text-4xl font-semibold leading-none">
                {safeNumber(decision.score) ?? '—'}
              </div>
              <div className={`mb-1 flex items-center gap-2 text-sm ${confidenceMeta.mutedClass}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${confidenceMeta.dotClass}`} />
                <span>Readiness score</span>
              </div>
            </div>

            <p className={`mt-4 text-sm leading-7 ${confidenceMeta.mutedClass}`}>
              Higher scores suggest the move is more survivable. Lower scores suggest the decision
              likely needs clearer assumptions or a smaller step.
            </p>
          </section>

          <SecondaryCard label="If wrong" value={buildIfWrong(decision)} />
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">Rationale</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-black/78">
            {verdictData.rationale || '—'}
          </p>
        </section>

        <section className="rounded-[24px] bg-black p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">
            What others may miss
          </p>
          <p className="mt-3 text-lg leading-8 text-white">{buildWhatOthersMiss(decision)}</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <EvidenceCard label="Supporting" items={supporting} />
          <EvidenceCard label="Breaking" items={breaking} />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <SecondaryCard label="Door" value={decision.door} />
          <SecondaryCard label="Hinge" value={decision.hinge} />
          <SecondaryCard label="Trap" value={decision.trap} />
          <SecondaryCard label="Recommended move" value={decision.step} />
        </section>

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