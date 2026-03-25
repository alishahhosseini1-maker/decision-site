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
  created_by: string;
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
  priorities?: string[];
  risks?: string[];
  contradictions?: string[];
  actions?: string[];
};

export default function SummaryPage() {
  const { id } = useParams();

  const [session, setSession] = useState<Session | null>(null);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [summary, setSummary] = useState<TeamSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: sessionData } = await supabase
        .from('team_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (!user || user.id !== sessionData?.created_by) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const { data: inputData } = await supabase
        .from('team_inputs')
        .select('*')
        .eq('session_id', id);

      setSession(sessionData);
      setInputs(inputData || []);
      setLoading(false);
    };

    load();
  }, [id]);

  const formatDeadline = (value?: string | null) => {
    if (!value) return 'No deadline';
    return new Date(value).toLocaleString();
  };

  const isClosed =
    session?.status === 'complete' ||
    (session?.deadline && new Date(session.deadline).getTime() <= Date.now());

  const generateSummary = async () => {
    if (!inputs.length) return;

    setGenerating(true);

    const res = await fetch('/api/review/team-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs }),
    });

    const data = await res.json();
    setSummary(data);
    setGenerating(false);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (accessDenied) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: 20 }}>
        <h2>Access Restricted</h2>
        <p>This summary is only available to the review owner.</p>
      </div>
    );
  }

  if (!session) {
    return <div style={{ padding: 20 }}>Session not found</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Decision Layer — Summary</div>

        <h1>{session.title}</h1>

        <p>{session.prompt}</p>

        <div>
          <strong>Deadline:</strong> {formatDeadline(session.deadline)}
        </div>

        <div>
          <strong>Responses:</strong> {inputs.length}
          {session.expectedParticipants
            ? ` / ${session.expectedParticipants}`
            : ''}
        </div>
      </div>

      {!isClosed && (
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
          Review is still open. Summary not available yet.
        </div>
      )}

      {isClosed && inputs.length === 0 && (
        <div>No inputs submitted.</div>
      )}

      {isClosed && inputs.length > 0 && (
        <>
          {!summary && (
            <button
              onClick={generateSummary}
              style={{
                width: '100%',
                padding: 14,
                background: '#111',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 800,
              }}
            >
              {generating ? 'Generating...' : 'Generate Decision Card'}
            </button>
          )}

          {summary && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <h2>Decision Card</h2>

              <p><strong>Top Signal:</strong> {summary.topSignal}</p>
              <p><strong>Decision:</strong> {summary.decision}</p>
              <p><strong>Tradeoff:</strong> {summary.tradeoff}</p>
              <p><strong>Recommendation:</strong> {summary.recommendation}</p>

              <h3>Priorities</h3>
              <ul>{summary.priorities?.map((p, i) => <li key={i}>{p}</li>)}</ul>

              <h3>Risks</h3>
              <ul>{summary.risks?.map((r, i) => <li key={i}>{r}</li>)}</ul>

              <h3>Contradictions</h3>
              <ul>{summary.contradictions?.map((c, i) => <li key={i}>{c}</li>)}</ul>

              <h3>Actions</h3>
              <ul>{summary.actions?.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}