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
  deadline: string | null;
  status: string | null;
  created_by: string | null;
  closed_at: string | null;
  created_at?: string | null;
  summary_json: TeamSummary | null;
  summary_generated_at: string | null;
  summary_emailed_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
};

type ComparisonSession = {
  id: string;
  title: string;
  created_at: string | null;
  summary_json: TeamSummary | null;
};

function getConfidenceMeta(score?: number) {
  const value = typeof score === 'number' ? score : 0;

  if (value >= 80) {
    return {
      label: 'High Confidence',
      cardClass:
        'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      pillClass:
        'bg-emerald-600 text-white',
      dotClass: 'bg-emerald-500',
    };
  }

  if (value >= 60) {
    return {
      label: 'Moderate Confidence',
      cardClass:
        'border-amber-200 bg-amber-50/70 text-amber-950',
      pillClass:
        'bg-amber-500 text-white',
      dotClass: 'bg-amber-500',
    };
  }

  return {
    label: 'Low Confidence',
    cardClass:
      'border-rose-200 bg-rose-50/70 text-rose-950',
    pillClass:
      'bg-rose-600 text-white',
    dotClass: 'bg-rose-500',
  };
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

function Card({
  title,
  value,
  bold = false,
  className = '',
}: {
  title: string;
  value?: string | null;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-md ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">{title}</p>
      <p className={`mt-3 text-sm leading-7 text-black/80 ${bold ? 'font-semibold text-black' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-md">
      <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">{title}</p>

      {!items || items.length === 0 ? (
        <p className="mt-3 text-sm text-black/45">—</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-black/80">
          {items.map((item, i) => (
            <li key={`${title}-${i}`} className="flex gap-2">
              <span className="mt-[2px] text-black/35">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<TeamSession | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [comparisonSessions, setComparisonSessions] = useState<ComparisonSession[]>([]);

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
          throw new Error('You must be signed in to view this summary.');
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from('team_sessions')
          .select(
            `
            id,
            title,
            prompt,
            deadline,
            status,
            created_by,
            closed_at,
            created_at,
            summary_json,
            summary_generated_at,
            summary_emailed_at,
            dismissed_at,
            archived_at
          `
          )
          .eq('id', id)
          .single();

        if (sessionError || !sessionData) {
          throw new Error('Session not found.');
        }

        if (sessionData.created_by !== user.id) {
          throw new Error('You do not have access to this summary.');
        }

        let resolvedSession = sessionData as TeamSession;

        if (!resolvedSession.summary_generated_at || !resolvedSession.summary_json) {
          const finalizeRes = await fetch('/api/team/finalize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId: id }),
          });

          const rawText = await finalizeRes.text();

          let finalizeJson: any = null;
          try {
            finalizeJson = JSON.parse(rawText);
          } catch {
            finalizeJson = null;
          }

          if (!finalizeRes.ok) {
            throw new Error(finalizeJson?.error || rawText || 'Failed to finalize summary.');
          }

          const { data: refreshedSession, error: refreshedError } = await supabase
            .from('team_sessions')
            .select(
              `
              id,
              title,
              prompt,
              deadline,
              status,
              created_by,
              closed_at,
              created_at,
              summary_json,
              summary_generated_at,
              summary_emailed_at,
              dismissed_at,
              archived_at
            `
            )
            .eq('id', id)
            .single();

          if (refreshedError || !refreshedSession) {
            throw new Error('Summary finalized, but failed to reload.');
          }

          resolvedSession = refreshedSession as TeamSession;
        }

        const { data: recentSessions, error: recentError } = await supabase
          .from('team_sessions')
          .select(
            `
            id,
            title,
            created_at,
            summary_json
          `
          )
          .eq('created_by', user.id)
          .not('summary_json', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6);

        if (recentError) {
          throw new Error(recentError.message);
        }

        if (!cancelled) {
          setSession(resolvedSession);
          setSummary((resolvedSession.summary_json as TeamSummary | null) ?? null);
          setComparisonSessions(((recentSessions as ComparisonSession[]) ?? []).filter(Boolean));
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
  }, [id]);

  const confidenceMeta = useMemo(
    () => getConfidenceMeta(summary?.confidence_score),
    [summary?.confidence_score]
  );

  const comparisonRows = useMemo(() => {
    if (!comparisonSessions || comparisonSessions.length === 0) return [];

    return comparisonSessions
      .filter((item) => item?.summary_json)
      .slice(0, 4)
      .map((item) => {
        const score = safeNumber(item.summary_json?.confidence_score);
        return {
          id: item.id,
          title: item.title,
          date: formatDate(item.created_at),
          score,
        };
      });
  }, [comparisonSessions]);

  const currentScore = safeNumber(summary?.confidence_score);
  const previousComparable = comparisonRows.find((row) => row.id !== session?.id && row.score !== null);
  const delta =
    currentScore !== null && previousComparable?.score !== null
      ? currentScore - previousComparable.score
      : null;

  const decisionLocked =
    Boolean(session?.closed_at) &&
    Boolean(session?.summary_generated_at) &&
    Boolean(summary?.recommended_move);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">Loading summary...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!session || !summary) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-12 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/55">No summary available.</p>
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
        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Prepared for: Decision, not review
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                {session.title}
              </h1>

              {session.prompt ? (
                <p className="mt-3 max-w-3xl text-sm leading-7 text-black/58">
                  {session.prompt}
                </p>
              ) : null}
            </div>

            {decisionLocked ? (
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/70 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-black" />
                Decision locked
              </div>
            ) : null}
          </div>
        </div>

        <section className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black/38">
            This is what matters
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-black md:text-[2.15rem]">
            {summary.executive_signal || '—'}
          </h2>

          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-black/8 bg-black/[0.03] px-4 py-2 text-sm text-black/62">
            <span className="text-black/35">→</span>
            <span>If solved: unlocks execution speed and compounds results</span>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card title="The Decision" value={summary.decision} bold />
          <Card title="Why It Matters" value={summary.tension} />
          <Card title="Recommended Move" value={summary.recommended_move} bold />
          <Card title="Tradeoff" value={summary.tradeoff} />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div
            className={`rounded-2xl border p-6 shadow-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-md ${confidenceMeta.cardClass}`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                Confidence
              </p>

              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${confidenceMeta.pillClass}`}>
                {confidenceMeta.label}
              </span>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="text-4xl font-semibold leading-none">
                {summary.confidence_score ?? '—'}
              </div>
              <div className="mb-1 flex items-center gap-2 text-sm opacity-75">
                <span className={`h-2.5 w-2.5 rounded-full ${confidenceMeta.dotClass}`} />
                <span>Signal strength</span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 opacity-80">
              {summary.confidence_reason || '—'}
            </p>

            {delta !== null ? (
              <div className="mt-4 border-t border-black/8 pt-4 text-sm">
                <span className="opacity-65">Compared with last comparable review: </span>
                <span className={`font-semibold ${delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : ''}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
            ) : null}
          </div>

          <Card
            title="If Nothing Changes (14 Days)"
            value={summary.projection_14d}
          />
        </section>

        {summary.contradictions ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
              Misalignment detected
            </p>
            <p className="mt-3 text-sm leading-7 text-amber-900">
              {summary.contradictions}
            </p>
          </section>
        ) : null}

        <section className="grid gap-6 md:grid-cols-3">
          <ListCard title="Working" items={summary.operating?.working} />
          <ListCard title="Breaking" items={summary.operating?.breaking} />
          <Card title="Top Risk" value={summary.operating?.top_risk} />
        </section>

        <section className="rounded-2xl bg-black p-6 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">
            Leadership Edge
          </p>
          <p className="mt-3 text-lg leading-8 text-white">
            {summary.leadership_edge || '—'}
          </p>
        </section>

        <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">
                Team comparison over time
              </p>
              <p className="mt-2 text-sm leading-6 text-black/58">
                Recent reviews from this same owner. Use this to see whether decision quality and signal strength are improving.
              </p>
            </div>
          </div>

          {comparisonRows.length === 0 ? (
            <p className="mt-5 text-sm text-black/45">No prior summaries to compare yet.</p>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/6">
              <div className="grid grid-cols-[1.6fr_0.8fr_0.6fr] border-b border-black/6 bg-black/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                <div>Review</div>
                <div>Date</div>
                <div>Score</div>
              </div>

              {comparisonRows.map((row) => {
                const rowMeta = getConfidenceMeta(row.score ?? 0);
                const isCurrent = row.id === session.id;

                return (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1.6fr_0.8fr_0.6fr] items-center border-b border-black/6 px-4 py-4 text-sm last:border-b-0 ${
                      isCurrent ? 'bg-black/[0.025]' : 'bg-white'
                    }`}
                  >
                    <div className="pr-4">
                      <div className="font-medium text-black/88">
                        {row.title || 'Untitled review'}
                      </div>
                      {isCurrent ? (
                        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-black/40">
                          Current
                        </div>
                      ) : null}
                    </div>

                    <div className="text-black/58">{row.date}</div>

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
      </div>
    </main>
  );
}