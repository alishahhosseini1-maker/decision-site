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
  risk: string;
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

function SectionList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <h3 className="text-sm font-semibold text-black">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-black/70">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="leading-6">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<TeamSession | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [showRawInputs, setShowRawInputs] = useState(false);

  async function handleCloseAndGenerate() {
    try {
      setClosing(true);
      setError(null);

      const res = await fetch('/api/team/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: id }),
      });

      const rawText = await res.text();

      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.error || rawText || 'Failed to close and generate summary.');
      }

      window.location.reload();
    } catch (err: any) {
      setError(err?.message || 'Failed to close and generate summary.');
    } finally {
      setClosing(false);
    }
  }

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
            risk,
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
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6">
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

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                Team Summary
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black">
                {session.title}
              </h1>
            </div>

            <p className="text-sm leading-6 text-black/70">{session.prompt}</p>

            <div className="flex flex-wrap gap-3 text-xs text-black/55">
              <span>Status: {session.status || 'unknown'}</span>
              <span>
                Deadline: {session.deadline ? new Date(session.deadline).toLocaleString() : 'None'}
              </span>
              <span>
                Closed: {session.closed_at ? new Date(session.closed_at).toLocaleString() : 'Not yet'}
              </span>
              <span>
                Summary generated:{' '}
                {session.summary_generated_at
                  ? new Date(session.summary_generated_at).toLocaleString()
                  : 'Not yet'}
              </span>
              <span>
                Email:{' '}
                {session.summary_emailed_at
                  ? `Sent ${new Date(session.summary_emailed_at).toLocaleString()}`
                  : 'Not sent yet'}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleCloseAndGenerate}
                disabled={closing}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {closing ? 'Closing...' : 'Close & Generate Summary'}
              </button>

              <button
                onClick={handleDismissFromHome}
                disabled={dismissing}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dismissing ? 'Dismissing...' : 'Dismiss from Home'}
              </button>

              <button
                onClick={handleArchiveSummary}
                disabled={archiving}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {archiving ? 'Archiving...' : 'Archive Summary'}
              </button>
            </div>
          </div>
        </div>

        {!summary ? (
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <p className="text-sm text-black/65">No summary is available yet.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                  Top Signal
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  {summary.topSignal || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                  Recommendation
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  {summary.recommendation || '—'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                  Decision
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  {summary.decision || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                  Tradeoff
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  {summary.tradeoff || '—'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                Overall Summary
              </p>
              <p className="mt-2 text-sm leading-7 text-black/80">
                {summary.overallSummary || '—'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionList title="Priority" items={summary.priority} />
              <SectionList title="Owners" items={summary.owners} />
              <SectionList title="Timeline" items={summary.timeline} />
              <SectionList title="Actions" items={summary.actions} />
              <SectionList title="What’s Working" items={summary.working} />
              <SectionList title="What’s Breaking" items={summary.breaking} />
              <SectionList title="Risks" items={summary.risks} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                  Contradiction
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  {summary.contradiction || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-black/45">
                  Hidden Risk
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  {summary.hiddenRisk || '—'}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-black">Raw Inputs</p>
              <p className="text-xs text-black/55">
                View the original participant responses behind this summary.
              </p>
            </div>

            <button
              onClick={() => setShowRawInputs((v) => !v)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm text-black transition hover:bg-black hover:text-white"
            >
              {showRawInputs ? 'Hide Inputs' : 'Show Inputs'}
            </button>
          </div>

          {showRawInputs ? (
            <div className="mt-5 space-y-4">
              {inputs.length === 0 ? (
                <p className="text-sm text-black/60">No inputs found.</p>
              ) : (
                inputs.map((input) => (
                  <div
                    key={input.id}
                    className="rounded-2xl border border-black/10 bg-[#fcfcf8] p-4"
                  >
                    <div className="mb-3 flex flex-wrap gap-3 text-xs text-black/55">
                      <span>Name: {input.name || 'Anonymous'}</span>
                      <span>Department: {input.department || '—'}</span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                          Moved Forward
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/75">
                          {input.moved_forward || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                          Not Working
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/75">
                          {input.not_working || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                          Risk
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/75">
                          {input.risk || '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                          Needs
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/75">
                          {input.needs || '—'}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                          Next Action
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/75">
                          {input.next_action || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}