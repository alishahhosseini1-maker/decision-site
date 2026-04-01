'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type TabMode = 'solo' | 'team';

type OutcomeStatus =
  | 'awaiting_outcome'
  | 'in_progress'
  | 'worked'
  | 'failed'
  | 'changed_direction';

type DecisionRow = {
  id: string;
  decision: string;
  context: string | null;
  score: number | null;
  verdict: string | null;
  outcome_status: OutcomeStatus | null;
  needs_follow_up: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  exclude_from_patterns: boolean | null;
};

type TeamHistoryRow = {
  id: string;
  title: string;
  prompt: string | null;
  status: string | null;
  created_at: string | null;
  deadline: string | null;
  summary_generated_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
};

const OUTCOME_OPTIONS: { value: OutcomeStatus; label: string }[] = [
  { value: 'awaiting_outcome', label: 'Awaiting outcome' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'worked', label: 'Worked' },
  { value: 'failed', label: 'Failed' },
  { value: 'changed_direction', label: 'Changed direction' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toOutcomeLabel(value?: OutcomeStatus | null) {
  return OUTCOME_OPTIONS.find((option) => option.value === value)?.label ?? 'Awaiting outcome';
}

function getScoreMeta(score?: number | null) {
  if (typeof score !== 'number') {
    return {
      label: 'No score',
      color: '#374151',
      border: 'rgba(55,65,81,0.16)',
      background: 'rgba(55,65,81,0.05)',
    };
  }

  if (score <= 39) {
    return {
      label: 'Not ready',
      color: '#b91c1c',
      border: 'rgba(185,28,28,0.18)',
      background: 'rgba(185,28,28,0.05)',
    };
  }

  if (score <= 69) {
    return {
      label: 'Proceed smaller',
      color: '#a16207',
      border: 'rgba(161,98,7,0.20)',
      background: 'rgba(161,98,7,0.06)',
    };
  }

  return {
    label: 'Ready',
    color: '#166534',
    border: 'rgba(22,101,52,0.18)',
    background: 'rgba(22,101,52,0.05)',
  };
}

function getOutcomeMeta(value?: OutcomeStatus | null) {
  switch (value) {
    case 'worked':
      return {
        color: '#166534',
        border: 'rgba(22,101,52,0.18)',
        background: 'rgba(22,101,52,0.06)',
      };
    case 'failed':
      return {
        color: '#b91c1c',
        border: 'rgba(185,28,28,0.18)',
        background: 'rgba(185,28,28,0.06)',
      };
    case 'in_progress':
      return {
        color: '#1d4ed8',
        border: 'rgba(29,78,216,0.18)',
        background: 'rgba(29,78,216,0.06)',
      };
    case 'changed_direction':
      return {
        color: '#7c3aed',
        border: 'rgba(124,58,237,0.18)',
        background: 'rgba(124,58,237,0.06)',
      };
    case 'awaiting_outcome':
    default:
      return {
        color: '#374151',
        border: 'rgba(55,65,81,0.16)',
        background: 'rgba(55,65,81,0.05)',
      };
  }
}

function getTeamStatusMeta(item: TeamHistoryRow) {
  if (item.summary_generated_at) {
    return {
      label: 'Decision ready',
      color: '#047857',
      border: 'rgba(16,185,129,0.20)',
      background: 'rgba(16,185,129,0.10)',
    };
  }

  if (item.status === 'open') {
    return {
      label: 'In progress',
      color: '#1d4ed8',
      border: 'rgba(59,130,246,0.18)',
      background: 'rgba(59,130,246,0.08)',
    };
  }

  return {
    label: 'Closed',
    color: '#374151',
    border: 'rgba(55,65,81,0.16)',
    background: 'rgba(55,65,81,0.05)',
  };
}

function normalizeDecisionText(value?: string | null) {
  if (!value) return '';

  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(i am|i'm|im|should i|thinking about|what if|whether to)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDecisionPatternKey(value?: string | null) {
  const text = normalizeDecisionText(value);

  if (!text) return 'general';

  if (
    text.includes('quit') &&
    text.includes('job') &&
    (text.includes('decision layer') || text.includes('business') || text.includes('company'))
  ) {
    return text.includes('decision layer')
      ? 'quit-job-build-decision-layer'
      : 'quit-job-start-company';
  }

  if (text.includes('hire') && text.includes('engineer')) return 'hire-engineer';
  if (text.includes('hire') && text.includes('employee')) return 'hire-employee';
  if (text.includes('raise') && (text.includes('capital') || text.includes('funding')))
    return 'raise-capital';
  if (
    text.includes('move') &&
    (text.includes('family') || text.includes('city') || text.includes('austin'))
  ) {
    return 'move-location';
  }
  if (text.includes('partnership') || text.includes('agreement')) return 'sign-partnership';

  return text.slice(0, 80) || 'general';
}

function toBlockerLabel(item: DecisionRow) {
  if (!item.context) return null;
  const clean = item.context.trim().replace(/\.$/, '');
  if (!clean) return null;
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

export default function HistoryPage() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tab, setTab] = useState<TabMode>('solo');

  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [teamHistory, setTeamHistory] = useState<TeamHistoryRow[]>([]);

  const [loadingSolo, setLoadingSolo] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [soloFilter, setSoloFilter] = useState<'all' | OutcomeStatus>('all');

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
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (authLoading) return;

      if (!user?.id) {
        if (!cancelled) {
          setDecisions([]);
          setTeamHistory([]);
          setLoadingSolo(false);
          setLoadingTeam(false);
          setError(null);
        }
        return;
      }

      if (!cancelled) {
        setLoadingSolo(true);
        setLoadingTeam(true);
        setError(null);
      }

      const [decisionsRes, teamRes] = await Promise.all([
        supabase
          .from('decisions')
          .select(
            'id, decision, context, score, verdict, outcome_status, needs_follow_up, created_at, updated_at, user_id, exclude_from_patterns'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('team_sessions')
          .select(
            'id, title, prompt, status, created_at, deadline, summary_generated_at, dismissed_at, archived_at'
          )
          .eq('created_by', user.id)
          .is('deleted_at', null)
          .or('dismissed_at.not.is.null,archived_at.not.is.null,summary_generated_at.not.is.null')
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      if (decisionsRes.error) {
        setError(decisionsRes.error.message || 'Failed to load solo decisions.');
        setDecisions([]);
      } else {
        setDecisions((decisionsRes.data as DecisionRow[]) || []);
      }

      if (teamRes.error) {
        setError(teamRes.error.message || 'Failed to load team reviews.');
        setTeamHistory([]);
      } else {
        setTeamHistory((teamRes.data as TeamHistoryRow[]) || []);
      }

      setLoadingSolo(false);
      setLoadingTeam(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const soloCounts = useMemo(() => {
    const awaiting = decisions.filter(
      (item) => (item.outcome_status ?? 'awaiting_outcome') === 'awaiting_outcome'
    ).length;

    const followUp = decisions.filter((item) => Boolean(item.needs_follow_up)).length;
    const worked = decisions.filter((item) => item.outcome_status === 'worked').length;

    return {
      total: decisions.length,
      awaiting,
      followUp,
      worked,
    };
  }, [decisions]);

  const teamCounts = useMemo(() => {
    const ready = teamHistory.filter((item) => Boolean(item.summary_generated_at)).length;
    const inProgress = teamHistory.filter(
      (item) => item.status === 'open' && !item.summary_generated_at
    ).length;
    const archived = teamHistory.filter(
      (item) => Boolean(item.archived_at) || Boolean(item.dismissed_at)
    ).length;

    return {
      total: teamHistory.length,
      ready,
      inProgress,
      archived,
    };
  }, [teamHistory]);

  const visibleDecisions = useMemo(() => {
    if (soloFilter === 'all') return decisions;
    return decisions.filter((item) => (item.outcome_status ?? 'awaiting_outcome') === soloFilter);
  }, [decisions, soloFilter]);

  const patternSummary = useMemo(() => {
    const eligible = decisions.filter((item) => !item.exclude_from_patterns);

    if (eligible.length < 3) return null;

    const groups = new Map<string, { items: DecisionRow[] }>();

    for (const item of eligible) {
      const key = toDecisionPatternKey(item.decision);
      const existing = groups.get(key);

      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { items: [item] });
      }
    }

    const candidates = Array.from(groups.entries())
      .map(([key, group]) => {
        const scores = group.items
          .map((item) => item.score)
          .filter((score): score is number => typeof score === 'number');

        const avgScore = scores.length
          ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
          : null;

        const blockerCounts = new Map<string, number>();

        for (const item of group.items) {
          const blocker = toBlockerLabel(item);
          if (!blocker) continue;
          blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
        }

        const topBlocker =
          Array.from(blockerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        const latestCreatedAt = group.items[0]?.created_at
          ? new Date(group.items[0].created_at).getTime()
          : 0;

        return {
          key,
          items: group.items,
          count: group.items.length,
          avgScore,
          topBlocker,
          latestCreatedAt,
        };
      })
      .filter((group) => group.count >= 3 && group.topBlocker)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;

        const aScore = typeof a.avgScore === 'number' ? a.avgScore : 999;
        const bScore = typeof b.avgScore === 'number' ? b.avgScore : 999;

        if (aScore !== bScore) return aScore - bScore;

        return b.latestCreatedAt - a.latestCreatedAt;
      });

    if (!candidates.length) return null;

    return candidates[0];
  }, [decisions]);

  const updateDecision = async (
    id: string,
    updates: Partial<Pick<DecisionRow, 'outcome_status' | 'exclude_from_patterns'>>
  ) => {
    try {
      setSavingId(id);
      setError(null);

      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('decisions')
        .update(payload)
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setDecisions((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updates,
                updated_at: payload.updated_at,
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update decision.');
    } finally {
      setSavingId(null);
    }
  };

  const pageShell: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f4f5f6',
    color: '#111',
  };

  const container: React.CSSProperties = {
    maxWidth: 980,
    margin: '0 auto',
    padding: '28px 20px 60px',
  };

  const card: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 16,
    background: '#fff',
    padding: 16,
    boxShadow: '0 10px 20px rgba(0,0,0,0.04)',
  };

  const metaBox: React.CSSProperties = {
    borderRadius: 12,
    background: 'rgba(0,0,0,0.03)',
    padding: '10px 12px',
  };

  const smallLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    opacity: 0.52,
    marginBottom: 6,
  };

  const ghostButton: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.12)',
    padding: '10px 14px',
    background: '#fff',
    color: '#111',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const activeTabButton = (active: boolean): React.CSSProperties => ({
    borderRadius: 999,
    border: active ? '1px solid rgba(0,0,0,0.14)' : '1px solid rgba(0,0,0,0.10)',
    padding: '10px 14px',
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    fontSize: 12.5,
    fontWeight: 900,
    cursor: 'pointer',
  });

  const activeFilterButton = (active: boolean): React.CSSProperties => ({
    borderRadius: 999,
    border: active ? '1px solid rgba(0,0,0,0.14)' : '1px solid rgba(0,0,0,0.10)',
    padding: '9px 12px',
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  });

  if (authLoading) {
    return (
      <div style={pageShell}>
        <main style={container}>
          <div style={card}>Loading decision history...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={pageShell}>
        <main style={container}>
          <div style={{ ...card, maxWidth: 680, margin: '40px auto 0' }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.03, marginBottom: 8 }}>
              Decision history
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.72, marginBottom: 16 }}>
              Sign in first to view your saved solo decisions and team reviews.
            </div>
            <a href="/" style={ghostButton}>
              Back to home
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={pageShell}>
      <main style={container}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.04 }}>
              Decision history
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 15,
                lineHeight: 1.55,
                opacity: 0.82,
                fontWeight: 600,
              }}
            >
              Review now. Record it. Revisit reality later.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/" style={ghostButton}>
              Back to home
            </a>
          </div>
        </header>

        {error && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: 12,
              border: '1px solid rgba(220,38,38,0.16)',
              background: 'rgba(220,38,38,0.04)',
              padding: '10px 12px',
              color: '#b91c1c',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <section style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setTab('solo')} style={activeTabButton(tab === 'solo')}>
              Solo Decisions
            </button>
            <button type="button" onClick={() => setTab('team')} style={activeTabButton(tab === 'team')}>
              Team Reviews
            </button>
          </div>
        </section>

        {tab === 'solo' ? (
          <>
            {patternSummary ? (
              <section
                style={{
                  ...card,
                  marginBottom: 16,
                  border: '1px solid rgba(0,0,0,0.09)',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,248,248,0.98) 100%)',
                }}
              >
                <div style={{ ...smallLabel, marginBottom: 8 }}>PATTERN FLAG</div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: -0.03,
                    lineHeight: 1.25,
                    marginBottom: 8,
                  }}
                >
                  You&apos;ve reviewed this decision {patternSummary.count} times.
                </div>

                <div style={{ fontSize: 14, lineHeight: 1.65, opacity: 0.78 }}>
                  Average score: <strong>{patternSummary.avgScore ?? '—'}</strong>
                  {' · '}
                  Consistently blocked by: <strong>{patternSummary.topBlocker}</strong>
                </div>

                <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.55, opacity: 0.58 }}>
                  Repeated low-readiness decisions usually signal an unresolved constraint.
                </div>
              </section>
            ) : null}

            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={card}>
                <div style={smallLabel}>TOTAL</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{soloCounts.total}</div>
              </div>

              <div style={card}>
                <div style={smallLabel}>AWAITING OUTCOME</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{soloCounts.awaiting}</div>
              </div>

              <div style={card}>
                <div style={smallLabel}>NEEDS FOLLOW-UP</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{soloCounts.followUp}</div>
              </div>

              <div style={card}>
                <div style={smallLabel}>WORKED</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{soloCounts.worked}</div>
              </div>
            </section>

            <section style={{ ...card, marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>Filter by outcome</div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSoloFilter('all')}
                    style={activeFilterButton(soloFilter === 'all')}
                  >
                    All
                  </button>

                  {OUTCOME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSoloFilter(option.value)}
                      style={activeFilterButton(soloFilter === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {loadingSolo ? (
              <div style={card}>Loading saved decisions...</div>
            ) : visibleDecisions.length === 0 ? (
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
                  No decisions yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.7 }}>
                  Run a solo review first. Once a verdict is saved, it will appear here as part of
                  your decision record.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {visibleDecisions.map((item) => {
                  const scoreMeta = getScoreMeta(item.score);
                  const outcomeMeta = getOutcomeMeta(item.outcome_status ?? 'awaiting_outcome');
                  const verdictParts = item.verdict ? item.verdict.split('\n\n') : [];
                  const verdictTitle = verdictParts[0] ?? item.verdict ?? 'No verdict';

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...card,
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 240px',
                          gap: 16,
                          alignItems: 'start',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 999,
                                padding: '5px 9px',
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: '0.08em',
                                color: scoreMeta.color,
                                border: `1px solid ${scoreMeta.border}`,
                                background: scoreMeta.background,
                              }}
                            >
                              {scoreMeta.label}
                            </div>

                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 999,
                                padding: '5px 9px',
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: '0.08em',
                                color: outcomeMeta.color,
                                border: `1px solid ${outcomeMeta.border}`,
                                background: outcomeMeta.background,
                              }}
                            >
                              {toOutcomeLabel(item.outcome_status)}
                            </div>

                            {item.needs_follow_up ? (
                              <div
                                style={{
                                  borderRadius: 999,
                                  padding: '5px 9px',
                                  fontSize: 10,
                                  fontWeight: 900,
                                  letterSpacing: '0.08em',
                                  color: '#92400e',
                                  border: '1px solid rgba(146,64,14,0.18)',
                                  background: 'rgba(146,64,14,0.06)',
                                }}
                              >
                                FOLLOW-UP
                              </div>
                            ) : null}

                            {item.exclude_from_patterns ? (
                              <div
                                style={{
                                  borderRadius: 999,
                                  padding: '5px 9px',
                                  fontSize: 10,
                                  fontWeight: 900,
                                  letterSpacing: '0.08em',
                                  color: '#6b7280',
                                  border: '1px solid rgba(107,114,128,0.18)',
                                  background: 'rgba(107,114,128,0.06)',
                                }}
                              >
                                EXCLUDED
                              </div>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 900,
                              letterSpacing: -0.03,
                              lineHeight: 1.2,
                              marginBottom: 10,
                            }}
                          >
                            {item.decision}
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            <div style={metaBox}>
                              <div style={smallLabel}>DATE</div>
                              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                                {formatDate(item.created_at)}
                              </div>
                            </div>

                            <div style={metaBox}>
                              <div style={smallLabel}>SCORE</div>
                              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                                {typeof item.score === 'number' ? item.score : '—'}
                              </div>
                            </div>

                            <div style={metaBox}>
                              <div style={smallLabel}>LAST UPDATED</div>
                              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                                {formatDate(item.updated_at ?? item.created_at)}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: 12,
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'rgba(0,0,0,0.015)',
                              padding: 12,
                            }}
                          >
                            <div style={smallLabel}>VERDICT</div>
                            <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.45 }}>
                              {verdictTitle}
                            </div>
                          </div>
                        </div>

                        <div style={{ width: 240, maxWidth: '100%' }}>
                          <div
                            style={{
                              borderRadius: 14,
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'rgba(255,255,255,0.75)',
                              padding: 12,
                            }}
                          >
                            <a
                              href={`/decision-summary?id=${item.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                borderRadius: 999,
                                border: 'none',
                                padding: '11px 14px',
                                background: '#111',
                                color: '#fff',
                                fontSize: 12.5,
                                fontWeight: 900,
                                textDecoration: 'none',
                                boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
                                marginBottom: 12,
                              }}
                            >
                              Open Brief
                            </a>

                            <label
                              style={{
                                display: 'block',
                                fontSize: 11,
                                fontWeight: 800,
                                opacity: 0.58,
                                marginBottom: 6,
                              }}
                            >
                              OUTCOME STATUS
                            </label>

                            <select
                              value={item.outcome_status ?? 'awaiting_outcome'}
                              onChange={(e) =>
                                updateDecision(item.id, {
                                  outcome_status: e.target.value as OutcomeStatus,
                                })
                              }
                              disabled={savingId === item.id}
                              style={{
                                width: '100%',
                                borderRadius: 12,
                                border: '1px solid rgba(0,0,0,0.14)',
                                padding: '11px 12px',
                                fontSize: 13,
                                background: '#fff',
                                marginBottom: 10,
                                outline: 'none',
                              }}
                            >
                              {OUTCOME_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                updateDecision(item.id, {
                                  exclude_from_patterns: !(item.exclude_from_patterns ?? false),
                                })
                              }
                              disabled={savingId === item.id}
                              style={{
                                width: '100%',
                                border: 'none',
                                backgroundColor: 'transparent',
                                fontSize: 11,
                                opacity: 0.6,
                                cursor: savingId === item.id ? 'default' : 'pointer',
                                textAlign: 'left',
                                padding: 0,
                              }}
                            >
                              {item.exclude_from_patterns
                                ? 'Include in patterns'
                                : 'Exclude from patterns'}
                            </button>

                            {savingId === item.id ? (
                              <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.58 }}>
                                Saving...
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={card}>
                <div style={smallLabel}>TOTAL</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{teamCounts.total}</div>
              </div>

              <div style={card}>
                <div style={smallLabel}>DECISION READY</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{teamCounts.ready}</div>
              </div>

              <div style={card}>
                <div style={smallLabel}>IN PROGRESS</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{teamCounts.inProgress}</div>
              </div>

              <div style={card}>
                <div style={smallLabel}>ARCHIVED</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{teamCounts.archived}</div>
              </div>
            </section>

            {loadingTeam ? (
              <div style={card}>Loading team reviews...</div>
            ) : teamHistory.length === 0 ? (
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
                  No team reviews yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.7 }}>
                  Team reviews with generated summaries or archived sessions will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {teamHistory.map((item) => {
                  const statusMeta = getTeamStatusMeta(item);
                  const actionHref = item.summary_generated_at
                    ? `/team/${item.id}/summary`
                    : `/team/${item.id}`;
                  const actionLabel = item.summary_generated_at ? 'Open Summary' : 'Open Review';

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...card,
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 220px',
                          gap: 16,
                          alignItems: 'start',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 999,
                                padding: '5px 9px',
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: '0.08em',
                                color: statusMeta.color,
                                border: `1px solid ${statusMeta.border}`,
                                background: statusMeta.background,
                              }}
                            >
                              {statusMeta.label.toUpperCase()}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 900,
                              letterSpacing: -0.03,
                              lineHeight: 1.2,
                              marginBottom: 8,
                            }}
                          >
                            {item.title}
                          </div>

                          <div
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.55,
                              opacity: 0.74,
                              marginBottom: 12,
                            }}
                          >
                            {item.prompt || 'Team review record.'}
                          </div>

                          <div
                            style={{
                              borderRadius: 12,
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'rgba(0,0,0,0.015)',
                              padding: 12,
                            }}
                          >
                            <div style={smallLabel}>TIMELINE</div>
                            <div style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 700 }}>
                              Created {formatDate(item.created_at)}
                              {item.summary_generated_at
                                ? ` • Generated ${formatDate(item.summary_generated_at)}`
                                : item.deadline
                                  ? ` • Deadline ${formatDate(item.deadline)}`
                                  : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ width: 220, maxWidth: '100%' }}>
                          <div
                            style={{
                              borderRadius: 14,
                              border: '1px solid rgba(0,0,0,0.08)',
                              background: 'rgba(255,255,255,0.75)',
                              padding: 12,
                            }}
                          >
                            <a
                              href={actionHref}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                borderRadius: 999,
                                border: 'none',
                                padding: '11px 14px',
                                background: '#111',
                                color: '#fff',
                                fontSize: 12.5,
                                fontWeight: 900,
                                textDecoration: 'none',
                                boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
                              }}
                            >
                              {actionLabel}
                            </a>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        <footer
          style={{
            marginTop: 60,
            paddingTop: 20,
            paddingBottom: 40,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            textAlign: 'center',
            fontSize: 12,
            color: '#777',
          }}
        >
          <div style={{ marginBottom: 8, color: '#111', fontWeight: 500 }}>
            Before you commit.
          </div>

          © 2026 Decision Layer ·{' '}
          <a href="/privacy" style={{ color: '#777', textDecoration: 'none' }}>
            Privacy
          </a>{' '}
          ·{' '}
          <a href="/about" style={{ color: '#777', textDecoration: 'none' }}>
            About
          </a>
        </footer>
      </main>
    </div>
  );
}