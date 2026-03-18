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
  overallSummary: string;
  working: string[];
  breaking: string[];
  risks: string[];
  actions: string[];
  contradiction: string;
  hiddenRisk: string;
};

export default function SummaryPage() {
  const { id } = useParams();

  const [inputs, setInputs] = useState<Input[]>([]);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        setSummary({
          overallSummary:
            typeof result?.overallSummary === 'string'
              ? result.overallSummary
              : 'No summary returned.',
          working: Array.isArray(result?.working) ? result.working : [],
          breaking: Array.isArray(result?.breaking) ? result.breaking : [],
          risks: Array.isArray(result?.risks) ? result.risks : [],
          actions: Array.isArray(result?.actions) ? result.actions : [],
          contradiction:
            typeof result?.contradiction === 'string' ? result.contradiction : '',
          hiddenRisk:
            typeof result?.hiddenRisk === 'string' ? result.hiddenRisk : '',
        });
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
    maxWidth: 980,
    margin: '0 auto',
    color: '#111',
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    background: '#fff',
  };

  const insightCardStyle: React.CSSProperties = {
    ...cardStyle,
    background: 'rgba(0,0,0,0.02)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 22,
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

  const listStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: 20,
    lineHeight: 1.7,
  };

  const rawInputCardStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: 14,
    marginBottom: 12,
    borderRadius: 8,
    background: '#fff',
    lineHeight: 1.65,
  };

  const emptyTextStyle: React.CSSProperties = {
    margin: 0,
    opacity: 0.65,
    lineHeight: 1.7,
    fontSize: 14,
  };

  const renderList = (items: string[]) => {
    if (!items || items.length === 0) {
      return <p style={emptyTextStyle}>None identified yet.</p>;
    }

    return (
      <ul style={listStyle}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  };

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
        <p style={{ marginBottom: 20, lineHeight: 1.6 }}>Generating executive summary...</p>
      )}

      {summary && (
        <>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Executive Summary</h2>

            <p style={{ margin: 0, lineHeight: 1.75, fontSize: 16 }}>
              {summary.overallSummary || 'No summary returned.'}
            </p>

            <div style={subTitleStyle}>What’s Working</div>
            {renderList(summary.working)}

            <div style={subTitleStyle}>What’s Breaking</div>
            {renderList(summary.breaking)}

            <div style={subTitleStyle}>Top Risks</div>
            {renderList(summary.risks)}

            <div style={subTitleStyle}>Recommended Actions</div>
            {renderList(summary.actions)}
          </div>

          {(summary.contradiction || summary.hiddenRisk) && (
            <div style={insightCardStyle}>
              <h2 style={sectionTitleStyle}>Critical Insight</h2>

              <div style={subTitleStyle}>Contradiction</div>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                {summary.contradiction || 'No major contradiction identified.'}
              </p>

              <div style={subTitleStyle}>Hidden Risk</div>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                {summary.hiddenRisk || 'No hidden risk identified.'}
              </p>
            </div>
          )}
        </>
      )}

      <h2 style={{ ...sectionTitleStyle, marginTop: 28 }}>Raw Inputs</h2>

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
            <strong>Anything Else:</strong> {input.next_action?.trim() ? input.next_action : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}