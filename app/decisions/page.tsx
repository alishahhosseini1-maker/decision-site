'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export default function DecisionsPage() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | OutcomeStatus>('all');

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

    const loadDecisions = async () => {
      if (authLoading) return;

      if (!user?.id) {
        if (!cancelled) {
          setDecisions([]);
          setLoading(false);
          setError(null);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      const { data, error: queryError } = await supabase
        .from('decisions')
        .select(
          'id, decision, context, score, verdict, outcome_status, needs_follow_up, created_at, updated_at, user_id'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message || 'Failed to load decisions.');
        setDecisions([]);
      } else {
        setDecisions((data as DecisionRow[]) || []);
      }

      setLoading(false);
    };

    void loadDecisions();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const counts = useMemo(() => {
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

  const visibleDecisions = useMemo(() => {
    if (filter === 'all') return decisions;
    return decisions.filter((item) => (item.outcome_status ?? 'awaiting_outcome') === filter);
  }, [decisions, filter]);

  const updateDecision = async (
    id: string,
    updates: Partial<Pick<DecisionRow, 'outcome_status' | 'needs_follow_up'>>
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
              Sign in first to view your saved decisions and update outcomes over time.
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
            <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, opacity: 0.68 }}>
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
            <div style={{ fontSize: 24, fontWeight: 900 }}>{counts.total}</div>
          </div>

          <div style={card}>
            <div style={smallLabel}>AWAITING OUTCOME</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{counts.awaiting}</div>
          </div>

          <div style={card}>
            <div style={smallLabel}>NEEDS FOLLOW-UP</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{counts.followUp}</div>
          </div>

          <div style={card}>
            <div style={smallLabel}>WORKED</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{counts.worked}</div>
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
                onClick={() => setFilter('all')}
                style={activeFilterButton(filter === 'all')}
              >
                All
              </button>

              {OUTCOME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  style={activeFilterButton(filter === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div style={card}>Loading saved decisions...</div>
        ) : visibleDecisions.length === 0 ? (
          <div style={card}>
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
              No decisions yet
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.7 }}>
              Run a solo review first. Once a verdict is saved, it will appear here as part of your
              decision record.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {visibleDecisions.map((item) => {
              const scoreMeta = getScoreMeta(item.score);
              const outcomeMeta = getOutcomeMeta(item.outcome_status ?? 'awaiting_outcome');
              const verdictParts = item.verdict ? item.verdict.split('\n\n') : [];
              const verdictTitle = verdictParts[0] ?? item.verdict ?? 'No verdict';
              const verdictBody = verdictParts.slice(1).join('\n\n');

              return (
                <article key={item.id} style={card}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 280 }}>
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
                              display: 'inline-flex',
                              alignItems: 'center',
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
                            NEEDS FOLLOW-UP
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          fontSize: 19,
                          fontWeight: 900,
                          letterSpacing: -0.03,
                          lineHeight: 1.2,
                          marginBottom: 8,
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
                        <div
                          style={{
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.03)',
                            padding: '10px 12px',
                          }}
                        >
                          <div style={smallLabel}>DATE</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                            {formatDate(item.created_at)}
                          </div>
                        </div>

                        <div
                          style={{
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.03)',
                            padding: '10px 12px',
                          }}
                        >
                          <div style={smallLabel}>SCORE</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>
                            {typeof item.score === 'number' ? item.score : '—'}
                          </div>
                        </div>

                        <div
                          style={{
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.03)',
                            padding: '10px 12px',
                          }}
                        >
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
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            opacity: 0.52,
                            marginBottom: 6,
                          }}
                        >
                          VERDICT
                        </div>

                        <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.45 }}>
                          {verdictTitle}
                        </div>

                        {verdictBody ? (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 13,
                              lineHeight: 1.6,
                              opacity: 0.74,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {verdictBody}
                          </div>
                        ) : null}
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
                        <div style={{ fontSize: 12.5, fontWeight: 900, marginBottom: 10 }}>
                          Update outcome
                        </div>

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
                            marginBottom: 12,
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
                              needs_follow_up: !(item.needs_follow_up ?? false),
                            })
                          }
                          disabled={savingId === item.id}
                          style={{
                            width: '100%',
                            borderRadius: 999,
                            border: item.needs_follow_up
                              ? '1px solid rgba(146,64,14,0.18)'
                              : '1px solid rgba(0,0,0,0.12)',
                            padding: '10px 12px',
                            background: item.needs_follow_up
                              ? 'rgba(146,64,14,0.06)'
                              : '#fff',
                            color: '#111',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: savingId === item.id ? 'default' : 'pointer',
                            opacity: savingId === item.id ? 0.7 : 1,
                          }}
                        >
                          {item.needs_follow_up ? 'Remove follow-up flag' : 'Mark needs follow-up'}
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
      </main>
    </div>
  );
}