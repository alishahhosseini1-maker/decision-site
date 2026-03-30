'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';

type Mode = 'solo' | 'team';

type TeamSessionPreview = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  expectedParticipants: number | null;
  shareUrl: string;
  summaryUrl: string;
  createdAt: string;
};

type LatestTeamSession = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  status: string | null;
  expected_participants: number | null;
  created_at: string | null;
  summary_generated_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
};

type ReviewResult = {
  readiness: {
    clarity: number;
    assumptions: number;
    reversibility: number;
    risk: number;
    exitLogic: number;
    total: number;
    label: 'Not ready to commit' | 'Proceed smaller' | 'Ready to commit';
    summary: string;
  };
  topline: {
    primaryRisk: string;
    mustBeTrue: string;
    recommendedMove: string;
  };
  snapshot: {
    door: string;
    hinge: string;
    lock: string;
    trap: string;
    exit: string;
    step: string;
  };
};

function parseLocalDateTimeParts(value: string) {
  if (!value) return null;

  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function localDateTimeToIso(value: string): string | null {
  const parts = parseLocalDateTimeParts(value);
  if (!parts) return null;

  const localDate = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0
  );

  if (Number.isNaN(localDate.getTime())) return null;

  return localDate.toISOString();
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('solo');

  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [latestTeamSession, setLatestTeamSession] = useState<LatestTeamSession | null>(null);
  const [loadingLatestTeamSession, setLoadingLatestTeamSession] = useState(false);
  const [latestTeamSessionError, setLatestTeamSessionError] = useState<string | null>(null);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [dismissingSessionId, setDismissingSessionId] = useState<string | null>(null);

  const [decision, setDecision] = useState('');
  const [context, setContext] = useState('');

  const [teamTitle, setTeamTitle] = useState('');
  const [teamPrompt, setTeamPrompt] = useState('');
  const [teamDeadline, setTeamDeadline] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSessionPreview, setTeamSessionPreview] = useState<TeamSessionPreview | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingTeamSession, setCreatingTeamSession] = useState(false);

  const [lastUsedAt, setLastUsedAt] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  const [deepLoading, setDeepLoading] = useState(false);
  const [deepReview, setDeepReview] = useState<string | null>(null);

  const [finalThoughts, setFinalThoughts] = useState('');
  const [verdictRequested, setVerdictRequested] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  
  const [outcome, setOutcome] = useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = useState(false);

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const decisionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const verdictRef = useRef<HTMLDivElement | null>(null);
  const teamPreviewRef = useRef<HTMLDivElement | null>(null);

  const STORAGE = {
    lastUsed: 'dl:last_used_at',
  };

  useEffect(() => {
    try {
      const lu = localStorage.getItem(STORAGE.lastUsed);
      setLastUsedAt(lu);
    } catch {
      // ignore
    }

    setTimeout(() => {
      decisionInputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const authUser = session?.user ?? null;

      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? null,
            }
          : null
      );

      setAuthLoading(false);
    };

    void getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;

      setUser(
        authUser
          ? {
              id: authUser.id,
              email: authUser.email ?? null,
            }
          : null
      );

      setAuthLoading(false);
      setAuthError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLatestTeamSession = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setLatestTeamSession(null);
          setLoadingLatestTeamSession(false);
          setLatestTeamSessionError(null);
        }
        return;
      }

      if (!cancelled) {
        setLoadingLatestTeamSession(true);
        setLatestTeamSessionError(null);
      }

      const { data, error } = await supabase
        .from('team_sessions')
        .select(
          'id, title, prompt, deadline, status, expected_participants, created_at, summary_generated_at, dismissed_at, archived_at'
        )
        .eq('created_by', user.id)
        .is('dismissed_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!cancelled) {
        if (error) {
          setLatestTeamSession(null);
          setLatestTeamSessionError(error.message || 'Failed to load latest team review.');
        } else {
          const latest = ((data || []) as LatestTeamSession[])[0] ?? null;
          setLatestTeamSession(latest);
          setLatestTeamSessionError(null);
        }

        setLoadingLatestTeamSession(false);
      }
    };

    void loadLatestTeamSession();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSignIn = async () => {
    setAuthError(null);

    const email = window.prompt('Enter your email to sign in:');
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        setAuthError('Too many sign-in emails were requested. Wait a few minutes, then try again.');
      } else {
        setAuthError(error.message);
      }
      return;
    }

    window.alert('Check your email for the sign-in link.');
  };

  const handleSignOut = async () => {
    setAuthError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    }
  };

  const handleDismissFromHome = async (sessionId: string) => {
    try {
      setDismissingSessionId(sessionId);
      setLatestTeamSessionError(null);

      const { error } = await supabase
        .from('team_sessions')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        throw new Error(error.message);
      }

      setLatestTeamSession(null);
    } catch (err: any) {
      setLatestTeamSessionError(err?.message || 'Failed to dismiss from home.');
    } finally {
      setDismissingSessionId(null);
    }
  };

  const handleCloseAndGenerateFromHome = async (sessionId: string) => {
    try {
      setClosingSessionId(sessionId);
      setLatestTeamSessionError(null);

      const res = await fetch('/api/team/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const rawText = await res.text();

      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }

      if (!res.ok) {
        throw new Error(json?.error || rawText || 'Failed to generate summary.');
      }

      setLatestTeamSession((prev) =>
        prev && prev.id === sessionId
          ? {
              ...prev,
              status: 'complete',
              summary_generated_at: new Date().toISOString(),
            }
          : prev
      );
    } catch (err: any) {
      setLatestTeamSessionError(err?.message || 'Failed to generate summary.');
    } finally {
      setClosingSessionId(null);
    }
  };

  const formatShort = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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

  const cleanDeepReview = (text?: string | null) => {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  const resetReviewState = () => {
    setHasStarted(false);
    setDecisionError(null);
    setLoading(false);
    setApiError(null);
    setReviewResult(null);
    setDeepLoading(false);
    setDeepReview(null);
    setFinalThoughts('');
    setVerdictRequested(false);
    setVerdict(null);
    setVerdictLoading(false);
    setOutcome(null);
    setSavingOutcome(false);
  };

  const validateDecision = () => {
    const text = decision.trim();
    if (!text) return 'Write the decision first.';
    if (text.length < 12) return 'Make it specific (at least ~12 characters).';
    return null;
  };

  const validateTeamSession = () => {
    if (!teamTitle.trim()) return 'Add a title for the team review.';
    if (teamTitle.trim().length < 6) return 'Make the title a little more specific.';
    if (!teamPrompt.trim()) return 'Describe what you want input on.';
    if (teamPrompt.trim().length < 16) {
      return 'Make the prompt more specific so the team knows what to answer.';
    }

    if (expectedParticipants.trim()) {
      const count = Number(expectedParticipants);
      if (!Number.isInteger(count) || count <= 0) {
        return 'Expected participants must be a positive whole number.';
      }
    }

    return null;
  };

  const beginReview = async () => {
    const err = validateDecision();
    if (err) {
      setDecisionError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setDecisionError(null);
    setHasStarted(true);
    setApiError(null);
    setLoading(true);
    setDeepLoading(false);
    setDeepReview(null);
    setFinalThoughts('');
    setVerdictRequested(false);
    setVerdict(null);
    setVerdictLoading(false);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, context }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'API request failed');
      }

      setReviewResult(data);

      const iso = new Date().toISOString();
      setLastUsedAt(iso);

      try {
        localStorage.setItem(STORAGE.lastUsed, iso);
      } catch {
        // ignore
      }

      setTimeout(() => {
        snapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err: any) {
      setApiError(err?.message || 'Something went wrong. Please try again.');
      setReviewResult(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDeepReview = async () => {
    if (deepReview || deepLoading) return;

    setDeepLoading(true);

    try {
      const res = await fetch('/api/review/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, context }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Deep review request failed');
      }

      setDeepReview(data?.analysis ?? 'No deep review returned.');
    } catch (err: any) {
      setDeepReview(err?.message || 'Failed to load deep review.');
    } finally {
      setDeepLoading(false);
    }
  };

  const handleGenerateVerdict = async () => {
    if (!finalThoughts.trim()) return;

    setVerdictRequested(true);
    setVerdictLoading(true);
    setVerdict(null);

    try {
      const res = await fetch('/api/review/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          context,
          thoughts: finalThoughts,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Verdict failed.');
      }

      setVerdict(data?.verdict ?? '');

      setTimeout(() => {
        verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch {
      setVerdict('Not ready yet\n\nSomething went wrong. Try again.');
    } finally {
      setVerdictLoading(false);
    }
  };

  const handleCreateTeamSession = async () => {
    setTeamError(null);
    setCopied(false);

    const validationError = validateTeamSession();
    if (validationError) {
      setTeamError(validationError);
      setTeamSessionPreview(null);
      return;
    }

    setCreatingTeamSession(true);

    try {
      const {
        data: { user: authUser },
        error: authLookupError,
      } = await supabase.auth.getUser();

      if (authLookupError) {
        setTeamError(authLookupError.message);
        setTeamSessionPreview(null);
        setCreatingTeamSession(false);
        return;
      }

      if (!authUser?.id) {
        setTeamError('You are not fully signed in yet. Refresh once, then try again.');
        setTeamSessionPreview(null);
        setCreatingTeamSession(false);
        return;
      }

      const expectedCount =
        expectedParticipants.trim() && !Number.isNaN(Number(expectedParticipants))
          ? Number(expectedParticipants)
          : null;

      const id = `team-${Date.now().toString(36)}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const parsedDeadlineIso = localDateTimeToIso(teamDeadline);

      const preview: TeamSessionPreview = {
        id,
        title: teamTitle.trim(),
        prompt: teamPrompt.trim(),
        deadline: parsedDeadlineIso,
        expectedParticipants: expectedCount,
        shareUrl: `${origin}/team/${id}`,
        summaryUrl: `${origin}/team/${id}/summary`,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        id: preview.id,
        title: preview.title,
        prompt: preview.prompt,
        deadline: parsedDeadlineIso,
        share_url: preview.shareUrl,
        expected_participants: expectedCount,
        created_by: authUser.id,
      };

      const { error } = await supabase.from('team_sessions').insert(payload).select();

      if (error) {
        setTeamError(error.message);
        setTeamSessionPreview(null);
        setCreatingTeamSession(false);
        return;
      }

      setUser({
        id: authUser.id,
        email: authUser.email ?? null,
      });

      setTeamSessionPreview(preview);

      setLatestTeamSession({
        id: preview.id,
        title: preview.title,
        prompt: preview.prompt,
        deadline: preview.deadline,
        status: 'open',
        expected_participants: preview.expectedParticipants,
        created_at: preview.createdAt,
        summary_generated_at: null,
        archived_at: null,
        dismissed_at: null,
      });

      setTimeout(() => {
        teamPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err: any) {
      setTeamError(err?.message || 'Failed to create team review.');
      setTeamSessionPreview(null);
    } finally {
      setCreatingTeamSession(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!teamSessionPreview?.shareUrl) return;

    try {
      await navigator.clipboard.writeText(teamSessionPreview.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleTeamCreateButtonClick = async () => {
    if (authLoading) return;

    const {
      data: { user: freshUser },
    } = await supabase.auth.getUser();

    if (!freshUser) {
      await handleSignIn();
      return;
    }

    await handleCreateTeamSession();
  };

  const scoreTotal =
    typeof reviewResult?.readiness?.total === 'number' ? reviewResult.readiness.total : null;

  const scoreMeta =
    reviewResult?.readiness?.label === 'Not ready to commit'
      ? {
          color: '#b91c1c',
          border: 'rgba(185,28,28,0.20)',
          background: 'rgba(185,28,28,0.04)',
          badge: 'NOT READY',
        }
      : reviewResult?.readiness?.label === 'Proceed smaller'
        ? {
            color: '#a16207',
            border: 'rgba(161,98,7,0.22)',
            background: 'rgba(161,98,7,0.05)',
            badge: 'PROCEED SMALLER',
          }
        : {
            color: '#166534',
            border: 'rgba(22,101,52,0.20)',
            background: 'rgba(22,101,52,0.04)',
            badge: 'READY',
          };

  const shellBg = 'rgba(255,255,255,0.65)';
  const border = '1px solid rgba(0,0,0,0.10)';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.15)',
    padding: 14,
    fontSize: 14,
    lineHeight: 1.45,
    background: '#fff',
    outline: 'none',
  };

  const detailStyle: React.CSSProperties = {
    border,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.55)',
    padding: '12px 14px',
  };

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    listStyle: 'none',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 700,
    opacity: 0.95,
  };

  const modeCardBase: React.CSSProperties = {
    flex: 1,
    borderRadius: 14,
    padding: '14px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 160ms ease',
    userSelect: 'none',
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 14,
    background: '#fff',
    padding: 14,
    boxShadow: '0 10px 20px rgba(0,0,0,0.04)',
  };

  const topActionButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: user ? '1px solid rgba(0,0,0,0.12)' : 'none',
    padding: '10px 14px',
    background: user ? '#fff' : '#111',
    color: user ? '#111' : '#fff',
    fontSize: 12.5,
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const ctaButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: 'none',
    padding: '13px 18px',
    background: '#0b0b0b',
    color: '#fff',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 10px 18px rgba(0,0,0,0.10)',
  };

  const lightButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.12)',
    padding: '12px 16px',
    background: '#fff',
    color: '#111',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  };

  const decisionPlaceholder =
    'Examples: leave or stay · hire or wait · launch or delay · invest or hold · commit or pivot';

  const contextPlaceholder = 'deadlines · who’s affected · cost · downside · unknowns';
  const optionalDetailsLabel = '▶ Any details I should know (optional)';
  const finalThoughtsPlaceholder =
    'What still feels off? What is the main thing giving you pause? What are you leaning toward before you commit?';

  const lastUsedLabel = formatShort(lastUsedAt);
  const visibleDeepReview = cleanDeepReview(deepReview);
  const verdictParts = verdict ? verdict.split('\n\n') : [];
  const verdictTitle = verdictParts[0] ?? '';
  const verdictReason = verdictParts.slice(1).join('\n\n');

  const hasSummaryReady = !!latestTeamSession?.summary_generated_at;
  const isOpenLatest = !!latestTeamSession && !latestTeamSession.summary_generated_at;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>
        <header
          style={{
            paddingTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.42 }}>
            Last used: <span style={{ opacity: 0.65 }}>{lastUsedLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!authLoading && user && (
              <div style={{ fontSize: 12.5, opacity: 0.62 }}>{user.email || 'Signed in'}</div>
            )}

            {authLoading ? null : user ? (
              <>
                <a
                  href="/archive"
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(0,0,0,0.12)',
                    padding: '10px 14px',
                    background: '#fff',
                    color: '#111',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  Archive
                </a>

                <button type="button" onClick={handleSignOut} style={topActionButtonStyle}>
                  Sign Out
                </button>
              </>
            ) : (
              <button type="button" onClick={handleSignIn} style={topActionButtonStyle}>
                Sign In
              </button>
            )}
          </div>
        </header>

        {authError && (
          <div
            style={{
              maxWidth: 720,
              margin: '14px auto 0',
              borderRadius: 12,
              border: '1px solid rgba(220,38,38,0.16)',
              background: 'rgba(220,38,38,0.04)',
              padding: '10px 12px',
              color: '#b91c1c',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {authError}
          </div>
        )}

        {user && (
          <section style={{ maxWidth: 680, margin: '18px auto 0' }}>
            <div
              style={{
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 14,
                background: '#fff',
                padding: 14,
                boxShadow: '0 8px 18px rgba(0,0,0,0.035)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 8, opacity: 0.72 }}>
                Latest Team Review
              </div>

              {loadingLatestTeamSession ? (
                <div style={{ fontSize: 13, opacity: 0.72 }}>Loading latest review...</div>
              ) : !latestTeamSession ? (
                <div
                  style={{
                    borderRadius: 12,
                    border: '1px dashed rgba(0,0,0,0.14)',
                    background: 'rgba(0,0,0,0.02)',
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                    No active team review
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.68 }}>
                    Create a team review below and it will appear here as your latest review.
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 999,
                      border: hasSummaryReady
                        ? '1px solid rgba(16,185,129,0.20)'
                        : '1px solid rgba(59,130,246,0.18)',
                      background: hasSummaryReady
                        ? 'rgba(16,185,129,0.10)'
                        : 'rgba(59,130,246,0.08)',
                      color: hasSummaryReady ? '#047857' : '#1d4ed8',
                      padding: '5px 9px',
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {hasSummaryReady ? 'SUMMARY READY' : 'OPEN'}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        letterSpacing: -0.02,
                        lineHeight: 1.2,
                      }}
                    >
                      {latestTeamSession.title}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        opacity: 0.72,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {latestTeamSession.prompt}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gridTemplateColumns: hasSummaryReady
                        ? 'repeat(2, minmax(0, 1fr))'
                        : 'repeat(3, minmax(0, 1fr))',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 10,
                        background: 'rgba(0,0,0,0.03)',
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{ fontSize: 10, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}
                      >
                        DEADLINE
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
                        {formatDeadline(latestTeamSession.deadline)}
                      </div>
                    </div>

                    {!hasSummaryReady && (
                      <div
                        style={{
                          borderRadius: 10,
                          background: 'rgba(0,0,0,0.03)',
                          padding: '8px 10px',
                        }}
                      >
                        <div
                          style={{ fontSize: 10, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}
                        >
                          PARTICIPANTS
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
                          {latestTeamSession.expected_participants ?? 'Not set'}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        borderRadius: 10,
                        background: 'rgba(0,0,0,0.03)',
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{ fontSize: 10, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}
                      >
                        {hasSummaryReady ? 'GENERATED' : 'CREATED'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
                        {hasSummaryReady
                          ? formatShort(latestTeamSession.summary_generated_at)
                          : formatShort(latestTeamSession.created_at)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {isOpenLatest ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCloseAndGenerateFromHome(latestTeamSession.id)}
                          disabled={closingSessionId === latestTeamSession.id}
                          style={{
                            borderRadius: 999,
                            border: 'none',
                            padding: '9px 12px',
                            background: '#111',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 900,
                            cursor:
                              closingSessionId === latestTeamSession.id ? 'default' : 'pointer',
                            opacity: closingSessionId === latestTeamSession.id ? 0.72 : 1,
                            boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
                          }}
                        >
                          {closingSessionId === latestTeamSession.id
                            ? 'Closing...'
                            : 'Close & Generate Summary'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDismissFromHome(latestTeamSession.id)}
                          disabled={dismissingSessionId === latestTeamSession.id}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(0,0,0,0.12)',
                            padding: '9px 12px',
                            background: '#fff',
                            color: '#111',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor:
                              dismissingSessionId === latestTeamSession.id ? 'default' : 'pointer',
                            opacity: dismissingSessionId === latestTeamSession.id ? 0.72 : 1,
                          }}
                        >
                          {dismissingSessionId === latestTeamSession.id
                            ? 'Dismissing...'
                            : 'Dismiss from Home'}
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          href={`/team/${latestTeamSession.id}/summary`}
                          style={{
                            borderRadius: 999,
                            border: 'none',
                            padding: '9px 12px',
                            background: '#111',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 900,
                            textDecoration: 'none',
                            boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
                          }}
                        >
                          Open Summary
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDismissFromHome(latestTeamSession.id)}
                          disabled={dismissingSessionId === latestTeamSession.id}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(0,0,0,0.12)',
                            padding: '9px 12px',
                            background: '#fff',
                            color: '#111',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor:
                              dismissingSessionId === latestTeamSession.id ? 'default' : 'pointer',
                            opacity: dismissingSessionId === latestTeamSession.id ? 0.72 : 1,
                          }}
                        >
                          {dismissingSessionId === latestTeamSession.id
                            ? 'Dismissing...'
                            : 'Dismiss from Home'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {latestTeamSessionError && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: '#dc2626',
                    fontWeight: 700,
                  }}
                >
                  {latestTeamSessionError}
                </div>
              )}
            </div>
          </section>
        )}

        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h1 style={{ fontSize: 64, margin: 0, letterSpacing: -1.1 }}>Decision Layer</h1>
          <div
            style={{
              marginTop: 10,
              fontSize: 26,
              fontStyle: 'italic',
              fontWeight: 500,
              letterSpacing: -0.03,
              opacity: 0.9,
            }}
          >
            Before you commit.
          </div>
          <div
            style={{
              maxWidth: 560,
              margin: '14px auto 0',
              fontSize: 15,
              lineHeight: 1.6,
              opacity: 0.68,
            }}
          >
            
          </div>
        </section>

        <section style={{ maxWidth: 720, margin: '28px auto 0' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                setMode('solo');
                resetReviewState();
                setTimeout(() => {
                  decisionInputRef.current?.focus();
                }, 50);
              }}
              style={{
                ...modeCardBase,
                border:
                  mode === 'solo'
                    ? '1px solid rgba(0,0,0,0.22)'
                    : '1px solid rgba(0,0,0,0.10)',
                background: mode === 'solo' ? '#ffffff' : 'rgba(255,255,255,0.55)',
                boxShadow:
                  mode === 'solo'
                    ? '0 10px 24px rgba(0,0,0,0.06)'
                    : '0 4px 12px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>👤</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Solo Decision</div>
              <div style={{ marginTop: 4, fontSize: 12.5, opacity: 0.68, lineHeight: 1.45 }}>
                Pressure-test a decision on your own
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('team');
                resetReviewState();
              }}
              style={{
                ...modeCardBase,
                border:
                  mode === 'team'
                    ? '1px solid rgba(0,0,0,0.22)'
                    : '1px solid rgba(0,0,0,0.10)',
                background: mode === 'team' ? '#ffffff' : 'rgba(255,255,255,0.55)',
                boxShadow:
                  mode === 'team'
                    ? '0 10px 24px rgba(0,0,0,0.06)'
                    : '0 4px 12px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Team Review</div>
              <div style={{ marginTop: 4, fontSize: 12.5, opacity: 0.68, lineHeight: 1.45 }}>
                Collect input before a decision gets locked
              </div>
            </button>
          </div>
        </section>

        {mode === 'solo' ? (
          <section style={{ maxWidth: 720, margin: '20px auto 0' }}>
            <div
              style={{
                border,
                borderRadius: 16,
                background: shellBg,
                boxShadow: '0 18px 40px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(10px)',
                padding: 18,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    opacity: 0.58,
                  }}
                >
                  SOLO DECISION
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
                  Pressure-test this before you commit
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, opacity: 0.68 }}>
                  Get a readiness check, key risks, and a next move.
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <textarea
                    ref={decisionInputRef}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    rows={4}
                    placeholder={decisionPlaceholder}
                    style={{ ...inputStyle, minHeight: 124, resize: 'vertical' }}
                  />
                  {decisionError && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
                      {decisionError}
                    </div>
                  )}
                </div>

                <details style={detailStyle}>
                  <summary style={summaryStyle}>{optionalDetailsLabel}</summary>
                  <div style={{ paddingTop: 12 }}>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={4}
                      placeholder={contextPlaceholder}
                      style={{ ...inputStyle, minHeight: 112, resize: 'vertical' }}
                    />
                  </div>
                </details>

                {apiError && (
                  <div
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(220,38,38,0.16)',
                      background: 'rgba(220,38,38,0.04)',
                      padding: '10px 12px',
                      color: '#b91c1c',
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    {apiError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={beginReview}
                    disabled={loading}
                    style={{
                      ...ctaButtonStyle,
                      opacity: loading ? 0.72 : 1,
                      cursor: loading ? 'default' : 'pointer',
                    }}
                  >
                    {loading ? 'Running Review...' : 'Run Decision Review'}
                  </button>
                </div>
              </div>
            </div>

            {hasStarted && loading && !reviewResult && (
              <div style={{ marginTop: 16, ...cardStyle }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Review in progress...</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, opacity: 0.68 }}>
                  Structuring the decision, testing the main assumption, and checking whether this looks ready to commit.
                </div>
              </div>
            )}

            {reviewResult && (
              <div ref={snapshotRef} style={{ marginTop: 16, display: 'grid', gap: 14 }}>
                <div
                  style={{
                    ...cardStyle,
                    border: `1px solid ${scoreMeta.border}`,
                    background: scoreMeta.background,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 999,
                      border: `1px solid ${scoreMeta.border}`,
                      background: '#fff',
                      color: scoreMeta.color,
                      padding: '5px 10px',
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {scoreMeta.badge}
                  </div>

                  <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, opacity: 0.6 }}>
                    Decision Readiness
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -0.04 }}>
                      {scoreTotal ?? '—'}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: scoreMeta.color }}>
                      {reviewResult.readiness.label}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55, opacity: 0.76 }}>
                    {reviewResult.readiness.summary}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div style={{ ...detailStyle, background: '#fff' }}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        PRIMARY RISK
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45, fontWeight: 700 }}>
                        {reviewResult.topline.primaryRisk}
                      </div>
                    </div>

                    <div style={{ ...detailStyle, background: '#fff' }}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        WHAT MUST BE TRUE
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45, fontWeight: 700 }}>
                        {reviewResult.topline.mustBeTrue}
                      </div>
                    </div>

                    <div style={{ ...detailStyle, background: '#fff' }}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        RECOMMENDED MOVE
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45, fontWeight: 700 }}>
                        {reviewResult.topline.recommendedMove}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.6, marginBottom: 12 }}>
                    Instant Snapshot
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div style={detailStyle}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        DOOR
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{reviewResult.snapshot.door}</div>
                    </div>

                    <div style={detailStyle}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        HINGE
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{reviewResult.snapshot.hinge}</div>
                    </div>

                    <div style={detailStyle}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        LOCKS
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{reviewResult.snapshot.lock}</div>
                    </div>

                    <div style={detailStyle}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        TRAP
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{reviewResult.snapshot.trap}</div>
                    </div>

                    <div style={detailStyle}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        EXIT
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{reviewResult.snapshot.exit}</div>
                    </div>

                    <div style={detailStyle}>
                      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                        STEP
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{reviewResult.snapshot.step}</div>
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <details
                    onToggle={(e) => {
                      const el = e.currentTarget;
                      if (el.open) {
                        void loadDeepReview();
                      }
                    }}
                  >
                    <summary style={summaryStyle}>▶ See the deeper review</summary>

                    <div style={{ paddingTop: 12 }}>
                      {deepLoading ? (
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.72 }}>
                          Loading deeper review...
                        </div>
                      ) : visibleDeepReview ? (
                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontSize: 13.5,
                            lineHeight: 1.65,
                            opacity: 0.92,
                          }}
                        >
                          {visibleDeepReview}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.72 }}>
                          Open this section to load the deeper review.
                        </div>
                      )}
                    </div>
                  </details>
                </div>

                <div style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.6, marginBottom: 10 }}>
                    Final Thoughts
                  </div>

                  <textarea
                    value={finalThoughts}
                    onChange={(e) => setFinalThoughts(e.target.value)}
                    rows={5}
                    placeholder={finalThoughtsPlaceholder}
                    style={{ ...inputStyle, minHeight: 132, resize: 'vertical' }}
                  />

                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleGenerateVerdict}
                      disabled={verdictLoading || !finalThoughts.trim()}
                      style={{
                        ...ctaButtonStyle,
                        opacity: verdictLoading || !finalThoughts.trim() ? 0.72 : 1,
                        cursor: verdictLoading || !finalThoughts.trim() ? 'default' : 'pointer',
                      }}
                    >
                      {verdictLoading ? 'Generating...' : 'Generate Final Verdict'}
                    </button>
                  </div>
                </div>

                {verdictRequested && (
  <>
    <div ref={verdictRef} style={cardStyle}>
      <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.6, marginBottom: 10 }}>
        Final Verdict
      </div>

      {verdictLoading ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.55, opacity: 0.72 }}>
          Generating final verdict...
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: -0.03,
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            {verdictTitle}
          </div>

          {verdictReason && (
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 13.5,
                lineHeight: 1.6,
                opacity: 0.84,
              }}
            >
              {verdictReason}
            </div>
          )}
        </>
      )}
    </div>

    {verdict && !verdictLoading && (
      <div style={{ ...cardStyle, marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.6, marginBottom: 10 }}>
          What happened?
        </div>

        <div style={{ fontSize: 13.5, lineHeight: 1.55, opacity: 0.76, marginBottom: 12 }}>
          This turns the review into a real decision record instead of a one-time output.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Still in progress', 'Worked', 'Failed', 'Changed direction'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setOutcome(option)}
              style={{
                borderRadius: 999,
                border:
                  outcome === option
                    ? '1px solid #111'
                    : '1px solid rgba(0,0,0,0.12)',
                background: outcome === option ? '#111' : '#fff',
                color: outcome === option ? '#fff' : '#111',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {outcome && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12.5,
              fontWeight: 700,
              color: 'rgba(0,0,0,0.72)',
            }}
          >
            Selected: {outcome}
          </div>
        )}
      </div>
    )}
  </>
)}
              </div>
            )}
          </section>
        ) : (
          <section style={{ maxWidth: 720, margin: '20px auto 0' }}>
            <div
              style={{
                border,
                borderRadius: 16,
                background: shellBg,
                boxShadow: '0 18px 40px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(10px)',
                padding: 18,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    opacity: 0.58,
                  }}
                >
                  TEAM REVIEW
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>
                  Collect input before the decision gets locked
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, opacity: 0.68 }}>
                  Collect team input, surface risks, and generate a summary before the decision gets locked.
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.66 }}>
                    Title
                  </div>
                  <input
                    value={teamTitle}
                    onChange={(e) => setTeamTitle(e.target.value)}
                    placeholder="Examples: Weekly Director Meeting"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.66 }}>
                    What do you want input on?
                  </div>
                  <textarea
                    value={teamPrompt}
                    onChange={(e) => setTeamPrompt(e.target.value)}
                    rows={5}
                    placeholder="Examples: What moved forward this week? What is off track? Where is a decision needed?"
                    style={{ ...inputStyle, minHeight: 132, resize: 'vertical' }}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.66 }}>
                      Deadline (optional)
                    </div>
                    <input
                      type="datetime-local"
                      value={teamDeadline}
                      onChange={(e) => setTeamDeadline(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.66 }}>
                      Expected participants (optional)
                    </div>
                    <input
                      value={expectedParticipants}
                      onChange={(e) => setExpectedParticipants(e.target.value)}
                      placeholder="Example: 6"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {teamError && (
                  <div
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(220,38,38,0.16)',
                      background: 'rgba(220,38,38,0.04)',
                      padding: '10px 12px',
                      color: '#b91c1c',
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    {teamError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={handleTeamCreateButtonClick}
                    disabled={creatingTeamSession}
                    style={{
                      ...ctaButtonStyle,
                      opacity: creatingTeamSession ? 0.72 : 1,
                      cursor: creatingTeamSession ? 'default' : 'pointer',
                    }}
                  >
                    {creatingTeamSession ? 'Creating...' : 'Create Team Review'}
                  </button>
                </div>
              </div>
            </div>

            {teamSessionPreview && (
              <div ref={teamPreviewRef} style={{ marginTop: 16, ...cardStyle }}>
                <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.6, marginBottom: 10 }}>
                  Team Review Created
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={detailStyle}>
                    <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                      TITLE
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{teamSessionPreview.title}</div>
                  </div>

                  <div style={detailStyle}>
                    <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6 }}>
                      SHARE LINK
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        wordBreak: 'break-all',
                      }}
                    >
                      {teamSessionPreview.shareUrl}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleCopyShareLink} style={lightButtonStyle}>
                      {copied ? 'Copied' : 'Copy Share Link'}
                    </button>

                    <a
                      href={teamSessionPreview.summaryUrl}
                      style={{
                        ...lightButtonStyle,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      Open Summary Page
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}