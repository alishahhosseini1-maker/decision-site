'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

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
  const { id } = useParams();

  const [inputs, setInputs] = useState<Input[]>([]);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeadershipContext, setShowLeadershipContext] = useState(false);
  const [showOperatingBreakdown, setShowOperatingBreakdown] = useState(false);
  const [showRawInputs, setShowRawInputs] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('team_inputs')
        .select('*')
        .eq('session_id', id);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const safeInputs = (data || []) as Input[];
      setInputs(safeInputs);
      setLoading(false);

      if (safeInputs.length === 0) return;

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
      } catch (err: any) {
        setError(err?.message || 'Failed to generate summary.');
      } finally {
        setSummaryLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  const pageStyle: React.CSSProperties = {
    padding: 24,
    maxWidth: 860,
    margin: '0 auto',
    color: '#111',
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

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 30, marginBottom: 18, letterSpacing: -0.04 }}>Team Summary</h1>

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

      {summaryLoading && (
        <p style={{ marginBottom: 20, lineHeight: 1.6 }}>Generating leadership review...</p>
      )}

      {summary && (
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
    </div>
  );
}