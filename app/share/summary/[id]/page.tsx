'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type TeamSummary = {
  executive_signal?: string;
  decision?: string;
  tension?: string;
  recommended_move?: string;
  tradeoff?: string;
  confidence_score?: number;
  confidence_reason?: string;
  projection_14d?: string;
  contradictions?: string | null;
  operating?: {
    working?: string[];
    breaking?: string[];
    top_risk?: string;
  };
  leadership_edge?: string;
};

type TeamSession = {
  id: string;
  title: string;
  prompt: string;
  summary_json: TeamSummary | null;
};

function getConfidenceMeta(score?: number) {
  const value = typeof score === 'number' ? score : 0;

  if (value >= 80) {
    return {
      label: 'High confidence',
      cardClass: 'border-emerald-200 bg-emerald-50/70',
      pillClass: 'bg-emerald-600 text-white',
      textClass: 'text-emerald-950',
      mutedClass: 'text-emerald-900/70',
      dotClass: 'bg-emerald-500',
    };
  }

  if (value >= 60) {
    return {
      label: 'Moderate confidence',
      cardClass: 'border-amber-200 bg-amber-50/70',
      pillClass: 'bg-amber-500 text-white',
      textClass: 'text-amber-950',
      mutedClass: 'text-amber-900/70',
      dotClass: 'bg-amber-500',
    };
  }

  return {
    label: 'Low confidence',
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

export default function SharedSummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<TeamSession | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('team_sessions')
          .select(
            `
            id,
            title,
            prompt,
            summary_json
          `
          )
          .eq('id', id)
          .single();

        if (error || !data) {
          throw new Error('Shared summary not found.');
        }

        if (!cancelled) {
          setSession(data as TeamSession);
          setSummary((data.summary_json as TeamSummary | null) ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Something went wrong.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (id) {
      load();
    }
    
    return () => {
      cancelled = true;
    };
  }, [id]);

  const confidenceMeta = useMemo(
    () => getConfidenceMeta(summary?.confidence_score),
    [summary?.confidence_score]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">Loading shared summary...</p>
        </div>
      </main>
    );
  }

  if (error || !session || !summary) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-black/6 bg-white p-8 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Decision Layer
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            Shared summary unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-black/60">
            This summary could not be loaded.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Prepared for: Decision, not review
          </p>

          <div>
            <p className="text-sm text-black/50">Decision Layer · Shared summary</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black md:text-4xl">
              {session.title}
            </h1>

            {session.prompt ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-black/56">
                {session.prompt}
              </p>
            ) : null}
          </div>
        </header>

        <section className="rounded-[28px] border border-black/5 border-l-4 border-l-black bg-[#f1f1ec] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black/38">
            What matters now
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-black md:text-[2.15rem]">
            {summary.executive_signal || '—'}
          </h2>

          <p className="mt-4 text-sm leading-7 text-black/63">
            {summary.tension || 'This is already affecting execution and needs a clear response.'}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <PrimaryCard label="The decision" value={summary.decision} />
          <PrimaryCard label="What to do now" value={summary.recommended_move} />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <section className={`rounded-[24px] border p-6 shadow-sm ${confidenceMeta.cardClass}`}>
            <div className="flex items-center justify-between gap-4">
              <p className={`text-[11px] uppercase tracking-[0.18em] ${confidenceMeta.mutedClass}`}>
                Confidence
              </p>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${confidenceMeta.pillClass}`}
              >
                {confidenceMeta.label}
              </span>
            </div>

            <div className={`mt-4 flex items-end gap-3 ${confidenceMeta.textClass}`}>
              <div className="text-4xl font-semibold leading-none">
                {summary.confidence_score ?? '—'}
              </div>
              <div className={`mb-1 flex items-center gap-2 text-sm ${confidenceMeta.mutedClass}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${confidenceMeta.dotClass}`} />
                <span>Based on consistency across team inputs</span>
              </div>
            </div>

            <p className={`mt-4 text-sm leading-7 ${confidenceMeta.mutedClass}`}>
              {summary.confidence_reason || '—'}
            </p>
          </section>

          <SecondaryCard
            label="If delayed"
            value={summary.projection_14d || summary.tradeoff || '—'}
          />
        </section>

        <section className="rounded-[24px] bg-black p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">
            What others may miss
          </p>
          <p className="mt-3 text-lg leading-8 text-white">
            {summary.leadership_edge || '—'}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <EvidenceCard label="What’s working" items={summary.operating?.working} />
          <EvidenceCard label="What’s breaking" items={summary.operating?.breaking} />
        </section>

        {summary.contradictions ? (
          <section className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
              Misalignment
            </p>
            <p className="mt-3 text-sm leading-7 text-amber-900">
              {summary.contradictions}
            </p>
          </section>
        ) : null}

        <SecondaryCard label="Top risk" value={summary.operating?.top_risk || '—'} />
      </div>
    </main>
  );
}