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
  recommendation?: string;
  priority?: string[];
};

export default function SummaryPage() {
  const { id } = useParams();

  const [session, setSession] = useState<Session | null>(null);
  const [inputs, setInputs] = useState<Input[]>([]);
  const [summary, setSummary] = useState<TeamSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data: sessionData } = await supabase
        .from('team_sessions')
        .select('*')
        .eq('id', id)
        .single();

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

  if (loading || !session) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  const isClosed =
    session.status === 'complete' ||
    (session.deadline && new Date(session.deadline).getTime() <= Date.now());

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.5 }}>Decision Layer — Summary</div>

        <h1 style={{ margin: '10px 0' }}>{session.title}</h1>

        <p style={{ opacity: 0.8 }}>{session.prompt}</p>

        <div style={{ marginTop: 10, fontSize: 13 }}>
          <strong>Deadline:</strong> {formatDeadline(session.deadline)}
        </div>

        <div style={{ marginTop: 6, fontSize: 13 }}>
          <strong>Responses:</strong> {inputs.length}
          {session.expectedParticipants
            ? ` / ${session.expectedParticipants}`
            : ''}
        </div>
      </div>

      {/* NOT CLOSED */}
      {!isClosed && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <strong>This review is still open.</strong>

          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
            Wait for all inputs or close the review before generating a summary.
          </div>
        </div>
      )}

      {/* CLOSED BUT NO INPUTS */}
      {isClosed && inputs.length === 0 && (
        <div style={{ marginTop: 16 }}>
          No inputs were submitted.
        </div>
      )}

      {/* CLOSED + READY */}
      {isClosed && inputs.length > 0 && (
        <>
          {!summary && (
            <button
              onClick={generateSummary}
              style={{
                marginTop: 20,
                width: '100%',
                padding: 14,
                background: '#111',
                color: '#fff',
                borderRadius: 12,
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {generating ? 'Generating...' : 'Generate Summary'}
            </button>
          )}

          {summary && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff',
              }}
            >
              <h2>Decision Card</h2>

              <p>
                <strong>Top Signal:</strong> {summary.topSignal}
              </p>

              <p>
                <strong>Decision:</strong> {summary.decision}
              </p>

              <p>
                <strong>Recommendation:</strong> {summary.recommendation}
              </p>

              <h3 style={{ marginTop: 12 }}>Priority</h3>
              <ul>
                {summary.priority?.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}