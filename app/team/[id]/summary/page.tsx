'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

type Session = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  status: 'open' | 'complete';
  expectedParticipants: number | null;
  created_by: string | null;
  summary_generated_at?: string | null;
};

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

export default function SummaryPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [session, setSession] = useState<Session | null>(null);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [summary, setSummary] = useState<TeamSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [showLeadershipContext, setShowLeadershipContext] = useState(false);
  const [showOperatingBreakdown, setShowOperatingBreakdown] = useState(false);
  const [showRawInputs, setShowRawInputs] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(authError.message);
        }

        if (!user) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from('team_sessions')
          .select('*')
          .eq('id', id)
          .single();

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message || 'Team session not found.');
        }

        const safeSession = sessionData as Session;

        if (!safeSession.created_by || safeSession.created_by !== user.id) {
          setAccessDenied(true);
          setSession(safeSession);
          setLoading(false);
          return;
        }

        let nextStatus: 'open' | 'complete' = safeSession.status;

        const deadlinePassed =
          !!safeSession.deadline && new Date(safeSession.deadline).getTime() <= Date.now();

        const { data: inputData, error: inputError } = await supabase
          .from('team_inputs')
          .select('*')
          .eq('session_id', id);

        if (inputError) {
          throw new Error(inputError.message);
        }

        const safeInputs = (inputData || []) as Input[];

        if (
          nextStatus === 'open' &&
          (deadlinePassed ||
            (safeSession.expectedParticipants &&
              safeInputs.length >= safeSession.expectedParticipants))
        ) {
          const { error: closeError } = await supabase
            .from('team_sessions')
            .update({
              status: 'complete',
              closed_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (!closeError) {
            nextStatus = 'complete';
          }
        }

        const normalizedSession: Session = {
          ...safeSession,
          status: nextStatus,
        };

        setSession(normalizedSession);
        setInputs(safeInputs);

        const reviewClosed =
          normalizedSession.status === 'complete' ||
          (!!normalizedSession.deadline &&
            new Date(normalizedSession.deadline).getTime() <= Date.now());

        if (!reviewClosed) {
          setLoading(false);
          return;
        }

        if (safeInputs.length === 0) {
          setLoading(false);
          return;
        }

        setSummaryLoading(true);

        try {
          const response = await fetch('/api/review/team-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: safeInputs,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result?.error || 'Failed to generate summary.');
          }

          setSummary(result);

          const generatedAt = new Date().toISOString();

          await supabase
            .from('team_sessions')
            .update({
              summary_generated_at: generatedAt,
            })
            .eq('id', id);

          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  summary_generated_at: generatedAt,
                }
              : prev
          );
        } catch (err: any) {
          setError(err?.message || 'Failed to generate summary.');
        } finally {
          setSummaryLoading(false);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Something went wrong.');
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  const formatDeadline = (value?: string | null) => {
    if (!value) return 'No deadline set';

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'No deadline set';

    return d.toLocaleString(undefined, {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const pageStyle: React.CSSProperties = {
    padding: 24,
    maxWidth: 860,
    margin: '0 auto',
    color: '#111',
  };

  const headerCardStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    background: '#fff',
    boxShadow: '0 10px 24px rgba(0,0,0,0.04)',
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    background: '#fff',
  };

  const primaryCardStyle: React.CSSProperties = {
    ...cardStyle,
    boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
  };

  const mutedCardStyle: React.CSSProperties = {
    ...cardStyle,
    background: 'rgba(0,0,0,0.02)',
  };

  const signalBoxStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 12,
    padding: 14,
    background: 'rgba(0,0,0,0.02)',
  };

  const consequenceBoxStyle: React.CSSProperties = {
    border: '1px solid rgba(185,28,28,0.16)',
    borderRadius: 12,
    padding: 14,
    background: 'rgba(185,28,28,0.03)',
    marginTop: 14,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    marginBottom: 14,
    letterSpacing: -0.03,
  };

  const subTitleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 800,
    marginTop: 18,
    marginBottom: 8,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.58,
    marginBottom: 6,
  };

  const bodyStyle: React.CSSProperties = {
    margin: 0,
    lineHeight: 1.7,
    fontSize: 16,
  };

  const compactBodyStyle: React.CSSProperties = {
    margin: 0,
    lineHeight: 1.65,
    fontSize: 14.5,
  };

  const listStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: 20,
    lineHeight: 1.7,
  };

  const rawInputCardStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    background: '#fff',
    lineHeight: 1.65,
  };

  const emptyTextStyle: React.CSSProperties = {
    margin: 0,
    opacity: 0.65,
    lineHeight: 1.7,
    fontSize: 14,
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.10)',
    padding: '12px 14px',
    background: '#fff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: 16,
  };

  const gridTwoStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16,
    marginBottom: 16,
  };

  const metaGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginTop: 16,
  };

  const metaBoxStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.02)',
    padding: '12px 14px',
    fontSize: 13,
    lineHeight: 1.55,
  };

  const readyBannerStyle: React.CSSProperties = {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: '#ecfdf5',
    border: '1px solid #10b981',
    fontSize: 13,
    fontWeight: 700,
  };

  const renderList = (items?: string[], emptyLabel = 'None identified yet.') => {
    if (!items || items.length === 0) {
      return <p style={emptyTextStyle}>{emptyLabel}</p>;
    }

    return (
      <ul style={listStyle}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  };

  const reviewClosed =
    !!session &&
    (session.status === 'complete' ||
      (!!session.deadline && new Date(session.deadline).getTime() <= Date.now()));

      const summaryReady =
      !!session?.summary_generated_at || session?.status === 'complete';

  const primaryRiskSignal =
    summary?.topSignal?.trim() ||
    summary?.breaking?.[0] ||
    'No primary risk signal identified yet.';

  const immediateDecision =
    summary?.decision?.trim() ||
    summary?.recommendation?.trim() ||
    'No immediate decision identified yet.';

  const ifIgnoredText =
    summary?.hiddenRisk?.trim() ||
    summary?.risks?.[0] ||
    'If ignored, this issue will likely stay hidden until it starts affecting outcomes more visibly.';

  const leadershipMissText =
    summary?.overallSummary?.trim() || 'No leadership summary returned.';

  const contradictionText =
    summary?.contradiction?.trim() ||
    'Inputs appear aligned. Risk of blind agreement if no dissenting signal is surfacing.';

  const hiddenRiskText =
    summary?.hiddenRisk?.trim() ||
    'Leadership may underestimate how quickly a small operating issue can spread into execution risk.';

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (accessDenied) {
    return (
      <div style={pageStyle}>
        <div style={headerCardStyle}>
          <div style={{ fontSize: 12, opacity: 0.5 }}>Decision Layer — Summary</div>
          <h1 style={{ fontSize: 30, margin: '12px 0 0', letterSpacing: -0.04 }}>
            Access Restricted
          </h1>
          <p style={{ marginTop: 14, lineHeight: 1.7, fontSize: 16 }}>
            This summary is only available to the review owner.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={pageStyle}>
        <div style={headerCardStyle}>
          <h1 style={{ fontSize: 30, marginBottom: 18, letterSpacing: -0.04 }}>
            Team Summary
          </h1>
          <p style={bodyStyle}>This review could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerCardStyle}>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Decision Layer — Summary</div>
        <h1 style={{ fontSize: 30, margin: '12px 0 0', letterSpacing: -0.04 }}>
          {session.title}
        </h1>
        <p style={{ marginTop: 16, lineHeight: 1.7, fontSize: 16, opacity: 0.84 }}>
          {session.prompt}
        </p>

        <div style={metaGridStyle}>
          <div style={metaBoxStyle}>
            <strong>Deadline:</strong> {formatDeadline(session.deadline)}
          </div>
          <div style={metaBoxStyle}>
            <strong>Responses:</strong> {inputs.length}
            {session.expectedParticipants ? ` / ${session.expectedParticipants}` : ''}
          </div>
        </div>

        {summaryReady && (
          <div style={readyBannerStyle}>
            Decision summary ready
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            color: '#b91c1c',
            marginBottom: 16,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {!reviewClosed && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Waiting for review completion</h2>
          <p style={bodyStyle}>
            This review is still open. The decision artifact will only unlock after the
            review is closed.
          </p>
        </div>
      )}

      {reviewClosed && inputs.length === 0 && !summaryLoading && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>No inputs submitted</h2>
          <p style={bodyStyle}>
            This review is closed, but no team inputs were submitted before completion.
          </p>
        </div>
      )}

      {summaryLoading && (
        <p style={{ marginBottom: 20, lineHeight: 1.6 }}>Generating leadership review...</p>
      )}

      {reviewClosed && summary && (
        <>
          <div style={primaryCardStyle}>
            <h2 style={sectionTitleStyle}>Decision Card</h2>

            <div style={labelStyle}>Primary Risk Signal</div>
            <div style={signalBoxStyle}>
              <p style={bodyStyle}>{primaryRiskSignal}</p>
            </div>

            <div style={consequenceBoxStyle}>
              <div style={labelStyle}>If not addressed</div>
              <p style={{ ...bodyStyle, fontWeight: 700 }}>{ifIgnoredText}</p>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={labelStyle}>What should we decide right now</div>
              <p style={{ ...bodyStyle, fontWeight: 700 }}>{immediateDecision}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLeadershipContext((prev) => !prev)}
            style={buttonStyle}
          >
            {showLeadershipContext ? 'Hide Why This Matters' : 'See Why This Matters'}
          </button>

          {showLeadershipContext && (
            <>
              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>What Leadership Is About to Miss</h2>
                <p style={bodyStyle}>{leadershipMissText}</p>

                {summary?.tradeoff && (
                  <div style={{ marginTop: 16 }}>
                    <div style={labelStyle}>Tradeoff</div>
                    <p style={bodyStyle}>{summary.tradeoff}</p>
                  </div>
                )}

                {summary?.recommendation && (
                  <div style={{ marginTop: 16 }}>
                    <div style={labelStyle}>Recommended move</div>
                    <p style={{ ...bodyStyle, fontWeight: 700 }}>{summary.recommendation}</p>
                  </div>
                )}
              </div>

              <div style={mutedCardStyle}>
                <h2 style={sectionTitleStyle}>Critical Insight</h2>

                <div style={subTitleStyle}>Contradiction</div>
                <p style={compactBodyStyle}>{contradictionText}</p>

                <div style={subTitleStyle}>Hidden Risk</div>
                <p style={compactBodyStyle}>{hiddenRiskText}</p>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowOperatingBreakdown((prev) => !prev)}
            style={buttonStyle}
          >
            {showOperatingBreakdown ? 'Hide Operating Breakdown' : 'See Operating Breakdown'}
          </button>

          {showOperatingBreakdown && (
            <>
              <div style={gridTwoStyle}>
                <div style={cardStyle}>
                  <h2 style={sectionTitleStyle}>Priority Stack</h2>
                  {renderList(summary.priority, 'No priorities identified yet.')}
                </div>

                <div style={cardStyle}>
                  <h2 style={sectionTitleStyle}>Action Ownership</h2>
                  {renderList(summary.owners, 'No owners assigned yet.')}
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Timeline</h2>
                {renderList(summary.timeline, 'No timeline identified yet.')}
              </div>

              <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>What’s Working</h2>
                {renderList(summary.working)}

                <div style={subTitleStyle}>What’s Breaking</div>
                {renderList(summary.breaking)}

                <div style={subTitleStyle}>Forward Risks</div>
                {renderList(summary.risks)}

                <div style={subTitleStyle}>Recommended Actions</div>
                {renderList(summary.actions)}
              </div>
            </>
          )}
        </>
      )}

      {reviewClosed && (
        <>
          <button
            type="button"
            onClick={() => setShowRawInputs((prev) => !prev)}
            style={buttonStyle}
          >
            {showRawInputs ? 'Hide Raw Inputs' : 'Show Raw Inputs'}
          </button>

          {showRawInputs && (
            <>
              {inputs.length === 0 && <p>No inputs yet.</p>}

              {inputs.map((input) => (
                <div key={input.id} style={rawInputCardStyle}>
                  <p>
                    <strong>Name:</strong> {input.name?.trim() ? input.name : 'Anonymous'}
                  </p>
                  <p>
                    <strong>Department:</strong> {input.department}
                  </p>
                  <p>
                    <strong>Moved Forward:</strong> {input.moved_forward}
                  </p>
                  <p>
                    <strong>Not Working:</strong> {input.not_working}
                  </p>
                  <p>
                    <strong>Risk:</strong> {input.risk}
                  </p>
                  <p>
                    <strong>Needs:</strong> {input.needs}
                  </p>
                  <p>
                    <strong>Anything Else:</strong>{' '}
                    {input.next_action?.trim() ? input.next_action : '—'}
                  </p>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}