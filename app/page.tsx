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

type ReadySummarySession = {
  id: string;
  title: string;
  summary_generated_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
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

  const [readySummaries, setReadySummaries] = useState<ReadySummarySession[]>([]);
  const [loadingReadySummaries, setLoadingReadySummaries] = useState(false);

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
  const [reviewResult, setReviewResult] = useState<any | null>(null);

  const [deepLoading, setDeepLoading] = useState(false);
  const [deepReview, setDeepReview] = useState<string | null>(null);

  const [finalThoughts, setFinalThoughts] = useState('');
  const [verdictRequested, setVerdictRequested] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

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

    const loadReadySummaries = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setReadySummaries([]);
          setLoadingReadySummaries(false);
        }
        return;
      }

      if (!cancelled) {
        setLoadingReadySummaries(true);
      }

      const { data, error } = await supabase
        .from('team_sessions')
        .select('id, title, summary_generated_at, dismissed_at, archived_at')
        .eq('created_by', user.id)
        .not('summary_generated_at', 'is', null)
        .is('dismissed_at', null)
        .is('archived_at', null)
        .order('summary_generated_at', { ascending: false });

      if (!cancelled) {
        if (error) {
          setReadySummaries([]);
        } else {
          setReadySummaries((data || []) as ReadySummarySession[]);
        }

        setLoadingReadySummaries(false);
      }
    };

    void loadReadySummaries();

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

  const handleDismiss = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('team_sessions')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error(error);
        return;
      }

      setReadySummaries((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error(err);
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

    let cleaned = text;

    cleaned = cleaned.replace(
      /\n*(➡️\s*Final call|Final call)[\s\S]*?(?=(\n*(🧾\s*Why|Why))|$)/i,
      ''
    );

    cleaned = cleaned.replace(/\n*(🧾\s*Why|Why)[\s\S]*$/i, '');

    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
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
  };

  const scoreTotal =
    typeof reviewResult?.score?.total === 'number' ? reviewResult.score.total : null;

  const scoreMeta =
    scoreTotal === null
      ? {
          color: '#111111',
          border: 'rgba(0,0,0,0.08)',
          label: '',
          background: 'rgba(0,0,0,0.02)',
        }
      : scoreTotal <= 39
        ? {
            color: '#dc2626',
            border: 'rgba(220,38,38,0.22)',
            label: 'Weak',
            background: 'rgba(220,38,38,0.03)',
          }
        : scoreTotal <= 69
          ? {
              color: '#eab308',
              border: 'rgba(234,179,8,0.24)',
              label: 'Needs work',
              background: 'rgba(234,179,8,0.04)',
            }
          : {
              color: '#16a34a',
              border: 'rgba(22,163,74,0.22)',
              label: 'Survivable',
              background: 'rgba(22,163,74,0.03)',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          context,
        }),
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
        headers: {
          'Content-Type': 'application/json',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      setVerdict('Something went wrong. Try again.');
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
    padding: '9px 12px',
  };

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    listStyle: 'none',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 600,
    opacity: 0.9,
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

  const lastUsedLabel = formatShort(lastUsedAt);
  const ctaBg = '#0b0b0b';

  const decisionPlaceholder =
    'Examples: ship or delay · escalate or handle · hire or wait · speak or hold · commit or pivot';

  const contextPlaceholder = 'deadlines · who’s affected · risk · cost · downside';
  const optionalDetailsLabel = '▶ Any details I should know (optional)';
  const finalThoughtsPlaceholder =
    'What stands out most? What still feels uncertain? What are you leaning toward after reading this?';

  const visibleDeepReview = cleanDeepReview(deepReview);
  const verdictParts = verdict ? verdict.split('\n\n') : [];
  const verdictTitle = verdictParts[0] ?? '';
  const verdictReason = verdictParts.slice(1).join('\n\n');

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

        {user && (
          <section style={{ maxWidth: 720, margin: '18px auto 0' }}>
            <div
              style={{
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 16,
                background: 'rgba(16,185,129,0.08)',
                padding: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>
                Decision summaries
              </div>

              {loadingReadySummaries ? (
                <div style={{ fontSize: 13.5, opacity: 0.72 }}>
                  Checking for ready summaries...
                </div>
              ) : readySummaries.length === 0 ? (
                <div style={{ fontSize: 13.5, opacity: 0.72 }}>
                  No summaries ready yet.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>
                    {readySummaries.length} ready
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {readySummaries.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.08)',
                          background: '#fff',
                          padding: '12px 14px',
                        }}
                      >
                        <a
                          href={`/team/${item.id}/summary`}
                          style={{
                            flex: 1,
                            color: '#111',
                            textDecoration: 'none',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 900 }}>{item.title}</div>

                          <div style={{ marginTop: 4, fontSize: 12.5, opacity: 0.65 }}>
                            Summary ready • Open
                          </div>
                        </a>

                        <button
                          onClick={() => handleDismiss(item.id)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(0,0,0,0.12)',
                            padding: '6px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: '#fff',
                            cursor: 'pointer',
                            opacity: 0.7,
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h1 style={{ fontSize: 64, margin: 0, letterSpacing: -1.1 }}>Decision Layer</h1>
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
                Think through a decision on your own
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
                Collect input and align before a meeting
              </div>
            </button>
          </div>
        </section>

        <section
          style={{
            maxWidth: 720,
            margin: '16px auto 0',
            border,
            borderRadius: 18,
            background: shellBg,
            padding: 18,
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
            textAlign: 'left',
          }}
        >
          {mode === 'solo' ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                What decision are you facing?
              </div>

              <textarea
                ref={decisionInputRef}
                value={decision}
                onChange={(e) => {
                  setDecision(e.target.value);
                  if (decisionError) setDecisionError(null);
                  if (hasStarted) setHasStarted(false);
                  if (apiError) setApiError(null);
                  if (reviewResult) setReviewResult(null);
                  if (deepReview) setDeepReview(null);
                  if (deepLoading) setDeepLoading(false);
                  if (finalThoughts) setFinalThoughts('');
                  if (verdictRequested) setVerdictRequested(false);
                  if (verdict) setVerdict(null);
                  if (verdictLoading) setVerdictLoading(false);
                }}
                placeholder={decisionPlaceholder}
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  border: decisionError
                    ? '1px solid rgba(220,38,38,0.55)'
                    : '1px solid rgba(0,0,0,0.15)',
                }}
              />

              {decisionError && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
                  {decisionError}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <details style={detailStyle}>
                  <summary style={summaryStyle}>
                    <span>{optionalDetailsLabel}</span>
                  </summary>

                  <div style={{ marginTop: 12 }}>
                    <textarea
                      value={context}
                      onChange={(e) => {
                        setContext(e.target.value);
                        if (apiError) setApiError(null);
                        if (reviewResult) setReviewResult(null);
                        if (deepReview) setDeepReview(null);
                        if (deepLoading) setDeepLoading(false);
                        if (finalThoughts) setFinalThoughts('');
                        if (verdictRequested) setVerdictRequested(false);
                        if (verdict) setVerdict(null);
                        if (verdictLoading) setVerdictLoading(false);
                      }}
                      placeholder={contextPlaceholder}
                      rows={4}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </details>
              </div>

              <button
                onClick={beginReview}
                disabled={loading}
                style={{
                  marginTop: 14,
                  width: '100%',
                  borderRadius: 14,
                  border: 'none',
                  padding: '14px 16px',
                  background: ctaBg,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.82 : 1,
                  boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                  transition: 'background 180ms ease',
                }}
              >
                {loading ? 'Reviewing...' : 'See My Decision Clearly'}
              </button>

              {apiError && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
                  {apiError}
                </div>
              )}

              {hasStarted && (
                <div style={{ marginTop: 12 }} ref={snapshotRef}>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>🧭 Instant Snapshot</div>

                    {reviewResult?.score && (
                      <div
                        style={{
                          marginTop: 12,
                          border: `1px solid ${scoreMeta.border}`,
                          borderRadius: 12,
                          padding: 12,
                          background: scoreMeta.background,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
                          Decision Quality Score
                        </div>

                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 900,
                            lineHeight: 1,
                            color: scoreMeta.color,
                          }}
                        >
                          {reviewResult.score.total}/100
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: scoreMeta.color,
                          }}
                        >
                          {scoreMeta.label}
                        </div>

                        <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.78 }}>
                          {reviewResult.score.summary}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 10,
                        display: 'grid',
                        gap: 8,
                        fontSize: 13.5,
                        lineHeight: 1.55,
                      }}
                    >
                      <div>
                        <strong>Door (the decision):</strong> {reviewResult?.snapshot?.door ?? '—'}
                      </div>
                      <div>
                        <strong>Hinge (what must be true):</strong>{' '}
                        {reviewResult?.snapshot?.hinge ?? '—'}
                      </div>
                      <div>
                        <strong>Locks (what gets hard to undo):</strong>{' '}
                        {reviewResult?.snapshot?.lock ?? '—'}
                      </div>
                      <div>
                        <strong>Trap (the hidden risk):</strong> {reviewResult?.snapshot?.trap ?? '—'}
                      </div>
                      <div>
                        <strong>Exit (when to pause):</strong> {reviewResult?.snapshot?.exit ?? '—'}
                      </div>
                      <div>
                        <strong>Step (the next move):</strong> {reviewResult?.snapshot?.step ?? '—'}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <details
                        style={detailStyle}
                        onToggle={(e) => {
                          const el = e.currentTarget;
                          if (el.open) {
                            void loadDeepReview();
                          }
                        }}
                      >
                        <summary style={summaryStyle}>
                          <span>▶ See the details why</span>
                        </summary>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 13,
                            opacity: 0.72,
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {deepLoading
                            ? 'Loading deep review...'
                            : visibleDeepReview || 'In-depth review coming next.'}
                        </div>

                        {!deepLoading && visibleDeepReview && (
                          <div style={{ marginTop: 18 }}>
                            <div
                              style={{
                                border: '1px solid rgba(0,0,0,0.10)',
                                borderRadius: 14,
                                background: '#fff',
                                padding: 14,
                              }}
                            >
                              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>
                                Final thoughts
                              </div>

                              <textarea
                                value={finalThoughts}
                                onChange={(e) => {
                                  setFinalThoughts(e.target.value);
                                  if (verdictRequested) setVerdictRequested(false);
                                  if (verdict) setVerdict(null);
                                  if (verdictLoading) setVerdictLoading(false);
                                }}
                                placeholder={finalThoughtsPlaceholder}
                                rows={4}
                                style={{
                                  ...inputStyle,
                                  resize: 'vertical',
                                  fontSize: 13.5,
                                }}
                              />

                              <button
                                onClick={handleGenerateVerdict}
                                disabled={verdictLoading || !finalThoughts.trim()}
                                style={{
                                  marginTop: 12,
                                  width: '100%',
                                  borderRadius: 12,
                                  border: 'none',
                                  padding: '13px 15px',
                                  background: '#111',
                                  color: '#fff',
                                  fontSize: 13.5,
                                  fontWeight: 800,
                                  cursor:
                                    verdictLoading || !finalThoughts.trim() ? 'default' : 'pointer',
                                  opacity: verdictLoading || !finalThoughts.trim() ? 0.72 : 1,
                                  boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
                                }}
                              >
                                {verdictLoading ? 'Generating Verdict...' : 'Generate Verdict'}
                              </button>
                            </div>

                            {verdictRequested && (
                              <div
                                ref={verdictRef}
                                style={{
                                  marginTop: 12,
                                  border: '1px solid rgba(0,0,0,0.14)',
                                  borderRadius: 16,
                                  background: 'rgba(0,0,0,0.02)',
                                  padding: 16,
                                  boxShadow: '0 10px 20px rgba(0,0,0,0.04)',
                                }}
                              >
                                <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.82 }}>
                                  Verdict
                                </div>

                                {verdictLoading ? (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      fontSize: 20,
                                      fontWeight: 900,
                                      letterSpacing: -0.02,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    Thinking...
                                  </div>
                                ) : (
                                  <div style={{ marginTop: 8 }}>
                                    <div
                                      style={{
                                        fontSize: 22,
                                        fontWeight: 900,
                                        letterSpacing: -0.03,
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {verdictTitle}
                                    </div>

                                    {verdictReason && (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          fontSize: 13.5,
                                          lineHeight: 1.6,
                                          opacity: 0.76,
                                          whiteSpace: 'pre-wrap',
                                        }}
                                      >
                                        {verdictReason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                Start a team review
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Title</div>
                  <input
                    type="text"
                    value={teamTitle}
                    onChange={(e) => {
                      setTeamTitle(e.target.value);
                      if (teamError) setTeamError(null);
                      if (teamSessionPreview) setTeamSessionPreview(null);
                    }}
                    placeholder="Example: Weekly Director Review - Kisco Senior Living"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    What is the focus?
                  </div>
                  <textarea
                    value={teamPrompt}
                    onChange={(e) => {
                      setTeamPrompt(e.target.value);
                      if (teamError) setTeamError(null);
                      if (teamSessionPreview) setTeamSessionPreview(null);
                    }}
                    placeholder="Example: How did the event go? What worked well? What should improve for next time?"
                    rows={5}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Deadline <span style={{ opacity: 0.5, fontWeight: 500 }}>(optional)</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={teamDeadline}
                    onChange={(e) => {
                      setTeamDeadline(e.target.value);
                      if (teamSessionPreview) setTeamSessionPreview(null);
                    }}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Expected participants <span style={{ opacity: 0.5, fontWeight: 500 }}>(optional)</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={expectedParticipants}
                    onChange={(e) => {
                      setExpectedParticipants(e.target.value);
                      if (teamError) setTeamError(null);
                      if (teamSessionPreview) setTeamSessionPreview(null);
                    }}
                    placeholder="Example: 5"
                    style={inputStyle}
                  />
                </div>
              </div>

              {!user && (
                <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.72, lineHeight: 1.6 }}>
                  Sign in only appears when you create the review.
                </div>
              )}

              {teamError && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
                  {teamError}
                </div>
              )}

              {authError && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleTeamCreateButtonClick}
                disabled={creatingTeamSession || authLoading}
                style={{
                  marginTop: 14,
                  width: '100%',
                  borderRadius: 14,
                  border: 'none',
                  padding: '14px 16px',
                  background: ctaBg,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: creatingTeamSession || authLoading ? 'default' : 'pointer',
                  opacity: creatingTeamSession || authLoading ? 0.72 : 1,
                  boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
                }}
              >
                {creatingTeamSession
                  ? 'Creating Team Review...'
                  : authLoading
                    ? 'Checking Access...'
                    : user
                      ? 'Create Team Review'
                      : 'Sign In To Create Team Review'}
              </button>

              {teamSessionPreview && (
                <div
                  ref={teamPreviewRef}
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div style={cardStyle}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>Team review created</div>

                    <div style={{ marginTop: 12, display: 'grid', gap: 10, fontSize: 13.5 }}>
                      <div>
                        <strong>Title:</strong> {teamSessionPreview.title}
                      </div>
                      <div style={{ lineHeight: 1.6 }}>
                        <strong>Prompt:</strong> {teamSessionPreview.prompt}
                      </div>
                      <div>
                        <strong>Deadline:</strong> {formatDeadline(teamSessionPreview.deadline)}
                      </div>
                      <div>
                        <strong>Expected participants:</strong>{' '}
                        {teamSessionPreview.expectedParticipants ?? 'Not set'}
                      </div>
                      <div>
                        <strong>Session ID:</strong> {teamSessionPreview.id}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          marginBottom: 6,
                          opacity: 0.7,
                        }}
                      >
                        Share link preview
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            borderRadius: 12,
                            border: '1px solid rgba(0,0,0,0.10)',
                            padding: '12px 14px',
                            background: 'rgba(0,0,0,0.02)',
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            wordBreak: 'break-all',
                          }}
                        >
                          {teamSessionPreview.shareUrl}
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyShareLink}
                          style={{
                            borderRadius: 12,
                            border: '1px solid rgba(0,0,0,0.12)',
                            padding: '12px 14px',
                            background: '#fff',
                            fontSize: 12.5,
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {copied ? 'Copied' : 'Copy Link'}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          marginBottom: 6,
                          opacity: 0.7,
                        }}
                      >
                        Owner summary page
                      </div>

                      <a
                        href={teamSessionPreview.summaryUrl}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.12)',
                          padding: '12px 14px',
                          background: '#fff',
                          fontSize: 12.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          color: '#111',
                          textDecoration: 'none',
                        }}
                      >
                        Open Owner Summary Page
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}