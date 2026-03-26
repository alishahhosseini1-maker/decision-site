'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type TeamInput = {
  id: string;
  name: string | null;
  department: string;
  moved_forward: string;
  not_working: string;
  needs: string;
  next_action: string | null;
};

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
  raw_inputs?: TeamInput[];
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

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<TeamSession | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [inputs, setInputs] = useState<TeamInput[]>([]);
  const [comparisonSessions, setComparisonSessions] = useState<ComparisonSession[]>([]);
  const [showRawInputs, setShowRawInputs] = useState(false);

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

        const { data: inputRows, error: inputsError } = await supabase
          .from('team_inputs')
          .select(
            `
            id,
            name,
            department,
            moved_forward,
            not_working,
            needs,
            next_action
          `
          )
          .eq('session_id', id)
          .order('department', { ascending: true });

        if (inputsError) {
          throw new Error(inputsError.message || 'Could not load raw inputs.');
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
          setInputs((inputRows as TeamInput[]) ?? []);
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
  const previousComparable = comparisonRows.find(
    (row) => row.id !== session?.id && row.score !== null
  );

  const previousComparableScore =
    previousComparable && previousComparable.score !== null
      ? previousComparable.score
      : null;

  const delta =
    currentScore !== null && previousComparableScore !== null
      ? currentScore - previousComparableScore
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
        <header className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-black/38">
            Prepared for: Decision, not review
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                {session.title}
              </h1>

              {session.prompt ? (
                <p className="mt-2 max-w-3xl text-sm leading-7 text-black/56">
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
        </header>

        <section className="rounded-[28px] border border-black/5 border-l-4 border-l-black bg-[#f1f1ec] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-black/38">
            What matters now
          </p>

          <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-black md:text-[2.15rem]">
            {summary.executive_signal || '—'}
          </h2>

          <p className="mt-4 text-sm leading-7 text-black/63">
            {summary.tension || 'This is already affecting execution and needs a clear leadership response.'}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <PrimaryCard label="The decision" value={summary.decision} />
          <PrimaryCard label="What to do now" value={summary.recommended_move} />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <section
            className={`rounded-[24px] border p-6 shadow-sm ${confidenceMeta.cardClass}`}
          >
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

            {delta !== null ? (
              <div className={`mt-4 border-t border-black/8 pt-4 text-sm ${confidenceMeta.mutedClass}`}>
                <span>Compared with last comparable review: </span>
                <span className="font-semibold">
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
            ) : null}
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

        <section className="rounded-[24px] border border-black/5 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">
              Comparison over time
            </p>
            <p className="mt-2 text-sm leading-6 text-black/55">
              A lighter historical view. Useful for trend, but secondary to the current decision.
            </p>
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
                      <div className="font-medium text-black/86">
                        {row.title || 'Untitled review'}
                      </div>
                      {isCurrent ? (
                        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-black/38">
                          Current
                        </div>
                      ) : null}
                    </div>

                    <div className="text-black/55">{row.date}</div>

                    <div>
                      {row.score !== null ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${rowMeta.pillClass}`}
                        >
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

        <section className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowRawInputs((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">
                Raw inputs
              </p>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Supporting evidence behind the summary.
              </p>
            </div>

            <span className="text-sm font-medium text-black/65">
              {showRawInputs ? 'Hide' : 'Show'}
            </span>
          </button>

          {showRawInputs ? (
            <div className="mt-5 space-y-4">
              {inputs.length === 0 ? (
                <p className="text-sm text-black/45">No inputs found.</p>
              ) : (
                inputs.map((input) => (
                  <div
                    key={input.id}
                    className="rounded-[20px] border border-black/6 bg-[#fcfcf8] p-5"
                  >
                    <div className="mb-4 flex flex-wrap gap-3 text-xs text-black/52">
                      <span>Name: {input.name || 'Anonymous'}</span>
                      <span>Department: {input.department || '—'}</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-black/42">
                          What moved forward
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/76">
                          {input.moved_forward || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-black/42">
                          What is not working
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/76">
                          {input.not_working || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-black/42">
                          What leadership needs to decide
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/76">
                          {input.needs || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-black/42">
                          Next action
                        </p>
                        <p className="mt-2 text-sm leading-6 text-black/76">
                          {input.next_action || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>

        <footer className="pt-1 text-xs text-black/38">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>Status: {session.status || '—'}</span>
            <span>Deadline: {formatDateTime(session.deadline)}</span>
            <span>Closed: {formatDateTime(session.closed_at)}</span>
            <span>Generated: {formatDateTime(session.summary_generated_at)}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}