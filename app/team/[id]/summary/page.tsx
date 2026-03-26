'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type Input = {
  id: string;
  name: string | null;
  department: string;
  moved_forward: string;
  not_working: string;
  needs: string;
  next_action: string | null;
};

type TeamSummary = {
  topSignal?: string;
  decision?: string;
  tradeoff?: string;
  recommendation?: string;
  priority?: string[];
  owners?: string[];
  timeline?: string[];
  overallSummary?: string;
  working?: string[];
  breaking?: string[];
  risks?: string[];
  actions?: string[];
  contradiction?: string;
  hiddenRisk?: string;
};

type TeamSession = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  status: string | null;
  created_by: string | null;
  closed_at: string | null;
  summary_json: TeamSummary | null;
  summary_generated_at: string | null;
  summary_emailed_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
};

function MetaChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-black/40">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-5 text-black/75">{value}</div>
    </div>
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-black/75">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex gap-2">
            <span className="mt-[2px] text-black/35">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExecutiveRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="border-t border-black/8 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
        {label}
      </div>
      <div className="mt-2 text-[15px] leading-7 text-black/84">{value || '—'}</div>
    </div>
  );
}

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<TeamSession | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [showRawInputs, setShowRawInputs] = useState(false);

  async function handleArchiveSummary() {
    try {
      setArchiving(true);
      setError(null);

      const { error } = await supabase
        .from('team_sessions')
        .update({
          archived_at: new Date().toISOString(),
          dismissed_at: null,
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      window.location.href = '/archive';
    } catch (err: any) {
      setError(err?.message || 'Failed to archive summary.');
    } finally {
      setArchiving(false);
    }
  }

  async function handleDismissFromHome() {
    try {
      setDismissing(true);
      setError(null);

      const { error } = await supabase
        .from('team_sessions')
        .update({
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'Failed to dismiss summary from home.');
    } finally {
      setDismissing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
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
          throw new Error('Could not load session.');
        }

        if (sessionData.created_by !== user.id) {
          throw new Error('You do not have access to this summary.');
        }

        let resolvedSession = sessionData as TeamSession;

        if (!resolvedSession.summary_generated_at || !resolvedSession.summary_json) {
          setFinalizing(true);

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
            throw new Error(
              finalizeJson?.error || rawText || 'Failed to finalize session.'
            );
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
            throw new Error('Summary was finalized, but failed to reload session.');
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
          throw new Error(inputsError.message || 'Could not load team inputs.');
        }

        if (!cancelled) {
          setSession(resolvedSession);
          setSummary((resolvedSession.summary_json as TeamSummary | null) ?? null);
          setInputs((inputRows as Input[]) ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Something went wrong.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFinalizing(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/60">
            {finalizing ? 'Finalizing summary...' : 'Loading summary...'}
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-black/60">Session not found.</p>
        </div>
      </main>
    );
  }

  const whatMattersNow = summary?.topSignal || summary?.overallSummary || '—';
  const decisionRequired = summary?.decision || summary?.recommendation || '—';
  const ifWeWait = summary?.hiddenRisk || summary?.contradiction || summary?.tradeoff || '—';

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[28px] border border-black/10 bg-white p-7 shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/40">
                  Leadership Summary
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-black">
                  {session.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-black/70">
                  {session.prompt}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  onClick={handleDismissFromHome}
                  disabled={dismissing}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {dismissing ? 'Dismissing...' : 'Dismiss from Home'}
                </button>

                <button
                  onClick={handleArchiveSummary}
                  disabled={archiving}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {archiving ? 'Archiving...' : 'Archive Summary'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetaChip label="Status" value={session.status || 'unknown'} />
              <MetaChip
                label="Deadline"
                value={
                  session.deadline ? new Date(session.deadline).toLocaleString() : 'None'
                }
              />
              <MetaChip
                label="Closed"
                value={
                  session.closed_at ? new Date(session.closed_at).toLocaleString() : 'Not yet'
                }
              />
              <MetaChip
                label="Generated"
                value={
                  session.summary_generated_at
                    ? new Date(session.summary_generated_at).toLocaleString()
                    : 'Not yet'
                }
              />
              <MetaChip
                label="Email"
                value={
                  session.summary_emailed_at
                    ? `Sent ${new Date(session.summary_emailed_at).toLocaleString()}`
                    : 'Not sent yet'
                }
              />
            </div>
          </div>
        </div>

        {!summary ? (
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <p className="text-sm text-black/65">No summary is available yet.</p>
          </div>
        ) : (
          <>
            <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_14px_30px_rgba(0,0,0,0.05)]">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/40">
                Decision Card
              </div>

              <div className="mt-5 space-y-1">
                <ExecutiveRow label="What matters now" value={whatMattersNow} />
                <ExecutiveRow label="Decision required" value={decisionRequired} />
                <ExecutiveRow label="If we wait" value={ifWeWait} />
              </div>
            </div>

            <details
              className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
              open
            >
              <summary className="cursor-pointer list-none text-[13px] font-black uppercase tracking-[0.16em] text-black/55">
                Leadership Context
              </summary>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                    What this means
                  </div>
                  <p className="mt-3 text-[15px] leading-8 text-black/82">
                    {summary.overallSummary || '—'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                      Recommendation
                    </div>
                    <p className="mt-3 text-sm leading-7 text-black/80">
                      {summary.recommendation || '—'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                      Tradeoff
                    </div>
                    <p className="mt-3 text-sm leading-7 text-black/80">
                      {summary.tradeoff || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </details>

            <details className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
              <summary className="cursor-pointer list-none text-[13px] font-black uppercase tracking-[0.16em] text-black/55">
                Operating Breakdown
              </summary>

              <div className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailList title="Priority" items={summary.priority} />
                  <DetailList title="Owners" items={summary.owners} />
                  <DetailList title="Timeline" items={summary.timeline} />
                  <DetailList title="Actions" items={summary.actions} />
                  <DetailList title="What’s Working" items={summary.working} />
                  <DetailList title="What’s Breaking" items={summary.breaking} />
                  <DetailList title="Risks" items={summary.risks} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                      Contradiction
                    </div>
                    <p className="mt-3 text-sm leading-7 text-black/80">
                      {summary.contradiction || '—'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                      Hidden Risk
                    </div>
                    <p className="mt-3 text-sm leading-7 text-black/80">
                      {summary.hiddenRisk || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </details>
          </>
        )}

        <details
          className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
          open={showRawInputs}
          onToggle={(e) => setShowRawInputs(e.currentTarget.open)}
        >
          <summary className="cursor-pointer list-none text-[13px] font-black uppercase tracking-[0.16em] text-black/55">
            Raw Inputs
          </summary>

          <div className="mt-3 text-xs leading-5 text-black/55">
            Supporting evidence behind the summary. Use this when you want to inspect the original participant responses.
          </div>

          <div className="mt-5 space-y-4">
            {inputs.length === 0 ? (
              <p className="text-sm text-black/60">No inputs found.</p>
            ) : (
              inputs.map((input) => (
                <div
                  key={input.id}
                  className="rounded-3xl border border-black/10 bg-[#fcfcf8] p-5"
                >
                  <div className="mb-4 flex flex-wrap gap-3 text-xs text-black/55">
                    <span>Name: {input.name || 'Anonymous'}</span>
                    <span>Department: {input.department || '—'}</span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">
                        What Moved the Needle
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/75">
                        {input.moved_forward || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">
                        What Is Slowing Things Down
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/75">
                        {input.not_working || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">
                        Decision Needed From Leadership
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/75">
                        {input.needs || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">
                        What Should Happen Next
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/75">
                        {input.next_action || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      </div>
    </main>
  );
}