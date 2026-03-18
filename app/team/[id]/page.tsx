'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type StoredTeamSession = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  shareUrl: string;
  createdAt: string;
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

  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

      setSession({
        id: data.id,
        title: data.title,
        prompt: data.prompt,
        deadline: data.deadline,
        shareUrl: data.share_url,
        createdAt: data.created_at,
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
      month: 'short',
      day: '2-digit',
      year: 'numeric',
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
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from('team_inputs').insert({
      session_id: id,
      name: name.trim() || null,
      department: department.trim(),
      moved_forward: movedForward.trim(),
      not_working: offTrack.trim(),
      risk: biggestRisk.trim(),
      needs: leadershipNeed.trim(),
      next_action: anythingElse.trim() || null,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
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

          <div style={{ marginTop: 20, display: 'grid', gap: 14 }}>
            <div>
              <div style={labelStyle}>Name (optional)</div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
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
              />
            </div>

            <div>
              <div style={labelStyle}>1. What moved forward this week?</div>
              <textarea
                value={movedForward}
                onChange={(e) => setMovedForward(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={labelStyle}>2. What is not working or off track?</div>
              <textarea
                value={offTrack}
                onChange={(e) => setOffTrack(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={labelStyle}>3. What is the biggest risk or issue right now?</div>
              <textarea
                value={biggestRisk}
                onChange={(e) => setBiggestRisk(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={labelStyle}>4. What do you need from leadership?</div>
              <textarea
                value={leadershipNeed}
                onChange={(e) => setLeadershipNeed(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <div style={labelStyle}>5. Anything else you’d like to share? (optional)</div>
              <textarea
                value={anythingElse}
                onChange={(e) => setAnythingElse(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
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
            disabled={submitting}
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
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.82 : 1,
              boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Team Input'}
          </button>
        </section>
      </main>
    </div>
  );
}