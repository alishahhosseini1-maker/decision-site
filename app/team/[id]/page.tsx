'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type StoredTeamSession = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  shareUrl: string;
  createdAt: string;
  status: 'open' | 'complete';
  expectedParticipants: number | null;
};

export default function TeamParticipantPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [session, setSession] = useState<StoredTeamSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [movedForward, setMovedForward] = useState('');
  const [offTrack, setOffTrack] = useState('');
  const [biggestRisk, setBiggestRisk] = useState('');
  const [leadershipNeed, setLeadershipNeed] = useState('');
  const [anythingElse, setAnythingElse] = useState('');

  const [responseCount, setResponseCount] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isDeadlinePassed = (deadline?: string | null) => {
    if (!deadline) return false;
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return false;
    return Date.now() >= d.getTime();
  };

  const reviewClosed = useMemo(() => {
    if (!session) return false;
    return session.status === 'complete' || isDeadlinePassed(session.deadline);
  }, [session]);

  useEffect(() => {
    if (!id) return;

    const loadSession = async () => {
      setLoadingSession(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from('team_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoadingSession(false);
        return;
      }

      let nextStatus: 'open' | 'complete' = data.status;

      if (
        data.status === 'open' &&
        data.deadline &&
        new Date(data.deadline).getTime() <= Date.now()
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

      const { count } = await supabase
        .from('team_inputs')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', id);

      const safeCount = count ?? 0;

      if (
        nextStatus === 'open' &&
        data.expected_participants &&
        safeCount >= data.expected_participants
      ) {
        const { error: thresholdCloseError } = await supabase
          .from('team_sessions')
          .update({
            status: 'complete',
            closed_at: new Date().toISOString(),
            summary_generated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (!thresholdCloseError) {
          nextStatus = 'complete';
        }
      }

      setResponseCount(safeCount);

      setSession({
        id: data.id,
        title: data.title,
        prompt: data.prompt,
        deadline: data.deadline,
        shareUrl: data.share_url,
        createdAt: data.created_at,
        status: nextStatus,
        expectedParticipants: data.expected_participants,
      });

      setLoadingSession(false);
    };

    void loadSession();
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

  const validate = () => {
    if (!department.trim()) return 'Please add your department.';
    if (!movedForward.trim()) return 'Please answer what moved forward.';
    if (!offTrack.trim()) return 'Please answer what is not working or off track.';
    if (!biggestRisk.trim()) return 'Please answer the biggest risk or issue.';
    if (!leadershipNeed.trim()) return 'Please answer what you need from leadership.';
    return null;
  };

  const handleSubmit = async () => {
    if (!session) return;

    if (session.status === 'complete' || isDeadlinePassed(session.deadline)) {
      setError('This review is closed. Inputs are no longer being accepted.');
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('team_inputs').insert({
      session_id: id,
      name: name.trim() || null,
      department: department.trim(),
      moved_forward: movedForward.trim(),
      not_working: offTrack.trim(),
      risk: biggestRisk.trim(),
      needs: leadershipNeed.trim(),
      next_action: anythingElse.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    const { count } = await supabase
      .from('team_inputs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', id);

    const safeCount = count ?? responseCount + 1;
    setResponseCount(safeCount);

    if (session.expectedParticipants && safeCount >= session.expectedParticipants) {
      const { error: closeError } = await supabase
        .from('team_sessions')
        .update({
          status: 'complete',
          closed_at: new Date().toISOString(),
          summary_generated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!closeError) {
        setSession({
          ...session,
          status: 'complete',
        });
      }
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  const shellBg = 'rgba(255,255,255,0.72)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.15)',
    padding: 14,
    fontSize: 14,
    lineHeight: 1.5,
    background: '#fff',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  };

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
        <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px' }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Loading team review...</div>
        </main>
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
        <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px' }}>
          <div
            style={{
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 20,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.6 }}>Team Review</h1>
            <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, opacity: 0.75 }}>
              This team review was not found.
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
        <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px' }}>
          <div
            style={{
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 20,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.6 }}>Response submitted</h1>

            <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7, opacity: 0.8 }}>
              Your input has been saved for <strong>{session.title}</strong>.
            </div>

            <div
              style={{
                marginTop: 16,
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 14,
                background: '#fff',
                padding: 14,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              Leadership will receive this later as part of a summarized team review.
            </div>

            <div
              style={{
                marginTop: 12,
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.02)',
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <strong>Responses received:</strong> {responseCount}
              {session.expectedParticipants ? ` / ${session.expectedParticipants}` : ''}
            </div>

            {session.status === 'complete' || isDeadlinePassed(session.deadline) ? (
              <div
                style={{
                  marginTop: 12,
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 14,
                  background: '#fff',
                  padding: 14,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                }}
              >
                This review is closed. The summary is being used as the final decision artifact.
              </div>
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 760, margin: '40px auto 60px', padding: '0 20px' }}>
        <section
          style={{
            border,
            borderRadius: 18,
            background: shellBg,
            padding: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.5 }}>Decision Layer — Team Review</div>

          <h1 style={{ margin: '10px 0 0', fontSize: 34, letterSpacing: -0.8 }}>
            {session.title}
          </h1>

          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.7, opacity: 0.82 }}>
            {session.prompt}
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gap: 10,
            }}
          >
            <div
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.02)',
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <strong>Deadline:</strong> {formatDeadline(session.deadline)}
            </div>

            <div
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.02)',
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <strong>Responses received:</strong> {responseCount}
              {session.expectedParticipants ? ` / ${session.expectedParticipants}` : ''}
            </div>
          </div>

          {reviewClosed ? (
            <div
              style={{
                marginTop: 16,
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 14,
                background: '#fff',
                padding: 14,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              This review is closed. Inputs are no longer being accepted.
            </div>
          ) : null}

          <div style={{ marginTop: 20, display: 'grid', gap: 14 }}>
            <div>
              <div style={labelStyle}>Name (optional)</div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                disabled={reviewClosed}
              />
            </div>

            <div>
              <div style={labelStyle}>Department</div>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Example: Operations"
                style={inputStyle}
                disabled={reviewClosed}
              />
            </div>

            <div>
              <div style={labelStyle}>1. What moved forward this week?</div>
              <textarea
                value={movedForward}
                onChange={(e) => setMovedForward(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={reviewClosed}
              />
            </div>

            <div>
              <div style={labelStyle}>2. What is not working or off track?</div>
              <textarea
                value={offTrack}
                onChange={(e) => setOffTrack(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={reviewClosed}
              />
            </div>

            <div>
              <div style={labelStyle}>3. What is the biggest risk or issue right now?</div>
              <textarea
                value={biggestRisk}
                onChange={(e) => setBiggestRisk(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={reviewClosed}
              />
            </div>

            <div>
              <div style={labelStyle}>4. What do you need from leadership?</div>
              <textarea
                value={leadershipNeed}
                onChange={(e) => setLeadershipNeed(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={reviewClosed}
              />
            </div>

            <div>
              <div style={labelStyle}>5. Anything else you’d like to share? (optional)</div>
              <textarea
                value={anythingElse}
                onChange={(e) => setAnythingElse(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={reviewClosed}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || reviewClosed}
            style={{
              marginTop: 16,
              width: '100%',
              borderRadius: 14,
              border: 'none',
              padding: '14px 16px',
              background: '#0b0b0b',
              color: '#fff',
              fontSize: 14,
              fontWeight: 900,
              cursor: submitting || reviewClosed ? 'default' : 'pointer',
              opacity: submitting || reviewClosed ? 0.72 : 1,
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
            }}
          >
            {reviewClosed ? 'Review Closed' : submitting ? 'Submitting...' : 'Submit Team Input'}
          </button>
        </section>
      </main>
    </div>
  );
}