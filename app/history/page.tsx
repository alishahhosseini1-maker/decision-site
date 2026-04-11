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

type TeamSummary = {
  executive_signal?: string;
  decision?: string;
  tension?: string;
  recommended_move?: string;
  tradeoff?: string;
  confidence_score?: number;
  confidence_reason?: string;
  projection_14d?: string;
  contradictions?: string | null;
  operating?: {
    working?: string[];
    breaking?: string[];
    top_risk?: string;
  };
  leadership_edge?: string;
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
  summary_json: TeamSummary | null;
};

const OUTCOME_OPTIONS: { value: OutcomeStatus; label: string }[] = [
  { value: 'awaiting_outcome', label: 'Awaiting outcome' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'worked', label: 'Worked' },
  { value: 'failed', label: 'Failed' },
  { value: 'changed_direction', label: 'Changed direction' },
];

function toOutcomeLabel(value?: OutcomeStatus | null) {
  return OUTCOME_OPTIONS.find((option) => option.value === value)?.label ?? 'Awaiting outcome';
}

function getScoreMeta(score?: number | null) {
  if (typeof score !== 'number') {
    return {
      label: 'No score',
      color: '#374151',
      border: 'rgba(55,65,81,0.16)',
      background: 'rgba(55,65,81,0.06)',
    };
  }

  if (score < 60) {
    return {
      label: 'Needs more before you commit',
      color: '#b91c1c',
      border: 'rgba(185,28,28,0.18)',
      background: 'rgba(185,28,28,0.07)',
    };
  }

  if (score < 70) {
    return {
      label: 'Take a smaller first step',
      color: '#a16207',
      border: 'rgba(161,98,7,0.20)',
      background: 'rgba(161,98,7,0.07)',
    };
  }

  if (score < 80) {
    return {
      label: 'Proceed with caution',
      color: '#5C4B00',
      border: 'rgba(92,75,0,0.20)',
      background: '#FBF5DC',
    };
  }

  return {
    label: 'Strong to commit',
    color: '#166534',
    border: 'rgba(22,101,52,0.18)',
    background: 'rgba(22,101,52,0.07)',
  };
}

function getOutcomeMeta(value?: OutcomeStatus | null) {
  switch (value) {
    case 'worked':
      return {
        color: '#166534',
        border: 'rgba(22,101,52,0.18)',
        background: 'rgba(22,101,52,0.07)',
      };
    case 'failed':
      return {
        color: '#b91c1c',
        border: 'rgba(185,28,28,0.18)',
        background: 'rgba(185,28,28,0.07)',
      };
    case 'in_progress':
      return {
        color: '#1d4ed8',
        border: 'rgba(29,78,216,0.18)',
        background: 'rgba(29,78,216,0.07)',
      };
    case 'changed_direction':
      return {
        color: '#7c3aed',
        border: 'rgba(124,58,237,0.18)',
        background: 'rgba(124,58,237,0.07)',
      };
    case 'awaiting_outcome':
    default:
      return {
        color: '#374151',
        border: 'rgba(55,65,81,0.16)',
        background: 'rgba(55,65,81,0.06)',
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
    background: 'rgba(55,65,81,0.06)',
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
  if (text.includes('raise') && (text.includes('capital') || text.includes('funding'))) {
    return 'raise-capital';
  }
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

  const raw = item.context.toLowerCase();

  if (raw.includes('business plan')) return 'no business plan';
  if (raw.includes('initial clients') || raw.includes('signed contract')) {
    return 'no initial clients';
  }
  if (
    raw.includes('financial cushion') ||
    raw.includes('little money') ||
    raw.includes('money right now')
  ) {
    return 'weak financial cushion';
  }
  if (raw.includes('track record')) return 'no proven track record';
  if (raw.includes('trend') || raw.includes('market trend')) return 'no confirmed trend';
  if (raw.includes('validation')) return 'no validation';
  if (raw.includes('viewers') || raw.includes('traction')) return 'no early traction';
  if (raw.includes('resource')) return 'resource constraints';

  const clean = item.context.trim().replace(/\.$/, '');
  if (!clean) return null;

  const firstPhrase = clean.split(',')[0]?.trim() || clean;
  return firstPhrase.charAt(0).toLowerCase() + firstPhrase.slice(1);
}

function cleanWhitespace(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max = 110) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function toSingleSentenceVerdict(value?: string | null) {
  const raw = cleanWhitespace(value);
  if (!raw) return 'No verdict saved yet.';

  const firstParagraph = raw.split('\n\n')[0] || raw;
  const firstSentence =
    firstParagraph.match(/.*?[.!?](?:\s|$)/)?.[0]?.trim() || firstParagraph.trim();

  return truncate(firstSentence, 165);
}

function getPatternSummaryText(avgScore: number | null, blocker: string | null) {
  const avg = typeof avgScore === 'number' ? `Avg score ${avgScore}.` : '';
  const blockerLine = blocker ? `Blocker: ${blocker}.` : '';
  return [avg, blockerLine].filter(Boolean).join(' ');
}

function short(text?: string | null, max = 96) {
  const clean = cleanWhitespace(text);
  if (!clean) return '';
  return clean.length <= max ? clean : `${clean.slice(0, max).trim()}…`;
}

function titleFromOpenTeamReview(item: TeamHistoryRow) {
  const prompt = cleanWhitespace(item.prompt).toLowerCase();
  const title = cleanWhitespace(item.title).toLowerCase();
  const source = `${prompt} ${title}`.trim();

  if (!source) return 'Alignment still in progress';

  if (
    source.includes('budget') ||
    source.includes('spend') ||
    source.includes('resource allocation') ||
    source.includes('resource')
  ) {
    return 'Budget decision still unresolved';
  }

  if (
    source.includes('approval') ||
    source.includes('approvals') ||
    source.includes('approve') ||
    source.includes('sign-off')
  ) {
    return 'Approval path still open';
  }

  if (
    source.includes('underwriting') ||
    source.includes('capacity') ||
    source.includes('resourcing')
  ) {
    return 'Capacity decision still under review';
  }

  if (
    source.includes('sales') ||
    source.includes('pipeline') ||
    source.includes('seminar') ||
    source.includes('campaign') ||
    source.includes('content')
  ) {
    return 'Sales review still awaiting alignment';
  }

  if (
    source.includes('leadership') ||
    source.includes('align') ||
    source.includes('alignment')
  ) {
    return 'Leadership alignment still needed';
  }

  if (
    source.includes('team') ||
    source.includes('department') ||
    source.includes('cross') ||
    source.includes('review')
  ) {
    return 'Cross-functional review still open';
  }

  if (source.includes('director')) {
    return 'Director review still awaiting alignment';
  }

  return 'Alignment still in progress';
}

function summaryFromOpenTeamReview(item: TeamHistoryRow) {
  const prompt = cleanWhitespace(item.prompt);
  const title = cleanWhitespace(item.title);
  const source = `${prompt} ${title}`.toLowerCase();

  if (
    source.includes('budget') ||
    source.includes('spend') ||
    source.includes('resource allocation')
  ) {
    return 'Budget and allocation questions are still being worked through.';
  }

  if (
    source.includes('approval') ||
    source.includes('approve') ||
    source.includes('sign-off')
  ) {
    return 'Approval is still pending before the next step can move forward.';
  }

  if (
    source.includes('underwriting') ||
    source.includes('capacity') ||
    source.includes('resourcing')
  ) {
    return 'Operational capacity questions are still open.';
  }

  if (
    source.includes('sales') ||
    source.includes('pipeline') ||
    source.includes('seminar') ||
    source.includes('campaign') ||
    source.includes('content')
  ) {
    return 'Commercial priorities are still being aligned before a final move.';
  }

  return 'Waiting on alignment before decision can be finalized.';
}

function toTeamCardTitle(item: TeamHistoryRow) {
  const summary = item.summary_json;

  if (item.summary_generated_at && summary) {
    return (
      short(summary.decision, 90) ||
      short(summary.recommended_move, 90) ||
      short(summary.executive_signal, 90) ||
      'Decision ready'
    );
  }

  return titleFromOpenTeamReview(item);
}

function toTeamCardSummary(item: TeamHistoryRow) {
  const summary = item.summary_json;

  if (item.summary_generated_at && summary) {
    return (
      short(summary.executive_signal, 140) ||
      short(summary.tension, 140) ||
      short(summary.tradeoff, 140) ||
      short(summary.leadership_edge, 140) ||
      'Decision ready. Open to review details.'
    );
  }

  return summaryFromOpenTeamReview(item);
}

function toOrgSignalKey(item: TeamHistoryRow) {
  const summary = item.summary_json;
  const signal = [
    cleanWhitespace(summary?.executive_signal),
    cleanWhitespace(summary?.tension),
    cleanWhitespace(summary?.tradeoff),
    cleanWhitespace(summary?.leadership_edge),
    cleanWhitespace(summary?.operating?.top_risk),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!signal) return null;

  if (
    signal.includes('approval') ||
    signal.includes('approvals') ||
    signal.includes('slow approval') ||
    signal.includes('approval process')
  ) {
    return 'approval_bottlenecks';
  }

  if (
    signal.includes('budget') ||
    signal.includes('spend') ||
    signal.includes('resource') ||
    signal.includes('allocation')
  ) {
    return 'budget_constraints';
  }

  if (
    signal.includes('underwriting') ||
    signal.includes('capacity') ||
    signal.includes('resource constraint') ||
    signal.includes('resourcing')
  ) {
    return 'operating_capacity';
  }

  if (
    signal.includes('alignment') ||
    signal.includes('misalignment') ||
    signal.includes('contradiction') ||
    signal.includes('leadership')
  ) {
    return 'leadership_alignment';
  }

  if (
    signal.includes('content approval') ||
    signal.includes('workflow') ||
    signal.includes('execution drag') ||
    signal.includes('slow execution')
  ) {
    return 'execution_drag';
  }

  return null;
}

function toOrgSignalCopy(key: string) {
  switch (key) {
    case 'approval_bottlenecks':
      return {
        title: 'Approval bottlenecks are recurring across completed reviews.',
        summary: 'This is slowing execution beyond one team or one meeting.',
      };
    case 'budget_constraints':
      return {
        title: 'Budget pressure is recurring across completed reviews.',
        summary: 'Resource allocation is becoming a repeated decision drag.',
      };
    case 'operating_capacity':
      return {
        title: 'Capacity constraints are recurring across completed reviews.',
        summary: 'Execution is being limited by operational bottlenecks, not just strategy.',
      };
    case 'leadership_alignment':
      return {
        title: 'Leadership alignment issues are recurring across completed reviews.',
        summary: 'The friction is structural now, not isolated.',
      };
    case 'execution_drag':
      return {
        title: 'Execution drag is recurring across completed reviews.',
        summary: 'The org keeps losing momentum after the decision point.',
      };
    default:
      return null;
  }
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
  const [showStats, setShowStats] = useState(false);

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
            'id, title, prompt, status, created_at, deadline, summary_generated_at, dismissed_at, archived_at, summary_json'
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
      .filter((group) => group.count >= 3)
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

  const orgSignal = useMemo(() => {
    const completed = teamHistory.filter((item) => item.summary_generated_at && item.summary_json);

    if (completed.length < 3) return null;

    const counts = new Map<string, number>();

    for (const item of completed) {
      const key = toOrgSignalKey(item);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;

    const [key, count] = top;
    if (count < 2) return null;

    const copy = toOrgSignalCopy(key);
    if (!copy) return null;

    return {
      key,
      count,
      ...copy,
    };
  }, [teamHistory]);

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
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 16,
    background: '#fff',
    padding: 16,
    boxShadow: '0 10px 20px rgba(0,0,0,0.03)',
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

  const pillStyle = (
    color: string,
    border: string,
    background: string
  ): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '5px 9px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.06em',
    color,
    border: `1px solid ${border}`,
    background,
    whiteSpace: 'nowrap',
  });

  const subtleButton: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    background: '#fff',
    borderRadius: 999,
    padding: '9px 12px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.12)',
    padding: '10px 12px',
    fontSize: 12.5,
    background: '#fff',
    outline: 'none',
  };

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
                marginTop: 6,
                fontSize: 14,
                lineHeight: 1.5,
                opacity: 0.72,
                fontWeight: 600,
              }}
            >
              Review now. Record it. Revisit reality later.
            </div>
          </div>

          <a href="/" style={ghostButton}>
            Back to home
          </a>
        </header>

        {error ? (
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
        ) : null}

        <section style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTab('solo')}
              style={activeTabButton(tab === 'solo')}
            >
              Solo Decisions
            </button>
            <button
              type="button"
              onClick={() => setTab('team')}
              style={activeTabButton(tab === 'team')}
            >
              Team Reviews
            </button>
          </div>
        </section>

        {tab === 'solo' && patternSummary ? (
          <section
            style={{
              marginBottom: 14,
              borderRadius: 18,
              border: '1px solid rgba(0,0,0,0.10)',
              background: '#111',
              color: '#fff',
              padding: 16,
              boxShadow: '0 14px 28px rgba(0,0,0,0.12)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.10em',
                opacity: 0.72,
                marginBottom: 8,
              }}
            >
              PATTERN DETECTED
            </div>

            <div
              style={{
                fontSize: 19,
                fontWeight: 900,
                letterSpacing: -0.03,
                lineHeight: 1.15,
                marginBottom: 6,
              }}
            >
              You&apos;ve reviewed this decision {patternSummary.count} times.
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                opacity: 0.82,
                maxWidth: 760,
              }}
            >
              Still unresolved. {getPatternSummaryText(patternSummary.avgScore, patternSummary.topBlocker)}
            </div>
          </section>
        ) : null}

        {tab === 'team' && orgSignal ? (
          <section
            style={{
              marginBottom: 14,
              borderRadius: 18,
              border: '1px solid rgba(16,35,63,0.22)',
              background: '#10233f',
              color: '#fff',
              padding: 16,
              boxShadow: '0 14px 28px rgba(16,35,63,0.20)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.10em',
                opacity: 0.76,
                marginBottom: 8,
              }}
            >
              ORG SIGNAL
            </div>

            <div
              style={{
                fontSize: 19,
                fontWeight: 900,
                letterSpacing: -0.03,
                lineHeight: 1.15,
                marginBottom: 6,
              }}
            >
              {orgSignal.title}
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                opacity: 0.84,
                maxWidth: 760,
              }}
            >
              {orgSignal.summary} Seen across {orgSignal.count} completed reviews.
            </div>
          </section>
        ) : null}

        <section
          style={{
            ...card,
            marginBottom: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => setShowStats((prev) => !prev)}
              style={{
                ...subtleButton,
                padding: '8px 12px',
              }}
            >
              {showStats ? 'Hide stats ▴' : 'Show stats ▾'}
            </button>

            {tab === 'solo' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.6 }}>Outcome</div>
                <select
                  value={soloFilter}
                  onChange={(e) => setSoloFilter(e.target.value as 'all' | OutcomeStatus)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(0,0,0,0.12)',
                    padding: '8px 12px',
                    background: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    outline: 'none',
                  }}
                >
                  <option value="all">All</option>
                  {OUTCOME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {showStats ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 10,
                marginTop: 12,
              }}
            >
              {tab === 'solo' ? (
                <>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      TOTAL
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {soloCounts.total}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      AWAITING OUTCOME
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {soloCounts.awaiting}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      NEEDS FOLLOW-UP
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {soloCounts.followUp}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      WORKED
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {soloCounts.worked}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      TOTAL
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {teamCounts.total}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      DECISION READY
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {teamCounts.ready}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      IN PROGRESS
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {teamCounts.inProgress}
                    </div>
                  </div>
                  <div style={card}>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', opacity: 0.5 }}>
                      ARCHIVED
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                      {teamCounts.archived}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>

        {tab === 'solo' ? (
          <>
            {loadingSolo ? (
              <div style={card}>Loading saved decisions...</div>
            ) : visibleDecisions.length === 0 ? (
              <div style={card}>
                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
                  No decisions yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.7 }}>
                  Run a solo review first. Once a verdict is saved, it will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {visibleDecisions.map((item) => {
                  const scoreMeta = getScoreMeta(item.score);
                  const outcomeMeta = getOutcomeMeta(item.outcome_status ?? 'awaiting_outcome');
                  const verdictLine = toSingleSentenceVerdict(item.verdict);

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...card,
                        padding: 16,
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
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
                            <div style={pillStyle(scoreMeta.color, scoreMeta.border, scoreMeta.background)}>
                              {scoreMeta.label}
                            </div>

                            <div style={pillStyle(outcomeMeta.color, outcomeMeta.border, outcomeMeta.background)}>
                              {toOutcomeLabel(item.outcome_status)}
                            </div>

                            {item.needs_follow_up ? (
                              <div
                                style={pillStyle(
                                  '#92400e',
                                  'rgba(146,64,14,0.18)',
                                  'rgba(146,64,14,0.07)'
                                )}
                              >
                                Needs follow-up
                              </div>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 900,
                              letterSpacing: -0.03,
                              lineHeight: 1.15,
                              marginBottom: 8,
                            }}
                          >
                            {item.decision}
                          </div>

                          <div
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              opacity: 0.76,
                              maxWidth: 680,
                            }}
                          >
                            {verdictLine}
                          </div>
                        </div>

                        <div
                          style={{
                            width: 220,
                            maxWidth: '100%',
                            borderRadius: 14,
                            border: '1px solid rgba(0,0,0,0.08)',
                            background: 'rgba(255,255,255,0.80)',
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
                              marginBottom: 10,
                            }}
                          >
                            Open Brief
                          </a>

                          <select
                            value={item.outcome_status ?? 'awaiting_outcome'}
                            onChange={(e) =>
                              updateDecision(item.id, {
                                outcome_status: e.target.value as OutcomeStatus,
                              })
                            }
                            disabled={savingId === item.id}
                            style={selectStyle}
                          >
                            {OUTCOME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
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
                  const teamTitle = toTeamCardTitle(item);
                  const teamSummary = toTeamCardSummary(item);

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...card,
                        padding: 16,
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
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
                            <div style={pillStyle(statusMeta.color, statusMeta.border, statusMeta.background)}>
                              {statusMeta.label}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 900,
                              letterSpacing: -0.03,
                              lineHeight: 1.15,
                              marginBottom: 8,
                            }}
                          >
                            {teamTitle}
                          </div>

                          <div
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              opacity: 0.76,
                              maxWidth: 680,
                            }}
                          >
                            {teamSummary}
                          </div>
                        </div>

                        <div
                          style={{
                            width: 220,
                            maxWidth: '100%',
                            borderRadius: 14,
                            border: '1px solid rgba(0,0,0,0.08)',
                            background: 'rgba(255,255,255,0.80)',
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
                            Open Brief
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}