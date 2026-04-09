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

type OpenDecisionPreview = {
  id: string;
  decision: string;
  outcome_status: string | null;
  needs_follow_up: boolean | null;
  created_at: string | null;
  dismissed_at: string | null;
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

type PendingSoloReview = {
  decision: string;
  context: string;
  reviewResult: ReviewResult | null;
  deepReview: string | null;
  finalThoughts: string;
  verdictRequested: boolean;
  verdict: string | null;
  revealStage: number;
  reflectionPrompts: string[];
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

function buildBreakLine(hinge?: string | null) {
  if (!hinge || !hinge.trim()) {
    return 'If this assumption is wrong, this decision breaks.';
  }

  const clean = hinge.trim().replace(/\.$/, '');
  const normalized = clean.charAt(0).toLowerCase() + clean.slice(1);
  return `If ${normalized} fails, this decision breaks.`;
}

type DeepReviewSection = {
  heading: string;
  lines: string[];
};

const DEEP_REVIEW_SKIP_HEADINGS = new Set([
  'reflection prompts',
]);

const DEEP_REVIEW_HEADINGS = new Set([
  'what must go right',
  'what could go wrong',
  'hard to undo',
  'bottom line',
]);

function cleanDeepReviewHeading(line: string) {
  return line.replace(/^[^A-Za-z0-9]+/, '').trim();
}

function parseDeepReviewSections(text?: string | null): DeepReviewSection[] {
  if (!text) return [];

  const rawLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: DeepReviewSection[] = [];
  let current: DeepReviewSection | null = null;
  let skipToNextSection = false;

  for (const rawLine of rawLines) {
    const isMarkdownHeading = rawLine.startsWith('#');
    const cleaned = cleanDeepReviewHeading(rawLine);
    const key = cleaned.toLowerCase();

    if (DEEP_REVIEW_HEADINGS.has(key)) {
      // Recognised section heading (e.g. ## What must go right)
      current = { heading: cleaned, lines: [] };
      sections.push(current);
      skipToNextSection = false;
      continue;
    }

    if (isMarkdownHeading || DEEP_REVIEW_SKIP_HEADINGS.has(key)) {
      // Unrecognised heading (e.g. ## Reflection prompts or plain Reflection prompts) — stop collecting
      skipToNextSection = true;
      continue;
    }

    if (!current || skipToNextSection) continue;

    current.lines.push(rawLine.replace(/^[\u2022\u2023\u25E6\u2043\-\*]\s*/, '').trim());
  }

  return sections.filter((section) => section.lines.length > 0);
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500&display=swap';

const serif = "'DM Serif Display', serif";
const sans = "'Outfit', sans-serif";
const mono = "'DM Mono', monospace";

function getScoreMeta(label?: string) {
  if (label === 'Not ready to commit')
    return { color: '#A32D2D', bg: '#FCEBEB', borderColor: 'rgba(163,45,45,0.20)', badge: 'NOT READY' };
  if (label === 'Proceed smaller')
    return { color: '#854F0B', bg: '#FAEEDA', borderColor: 'rgba(133,79,11,0.20)', badge: 'PROCEED SMALLER' };
  return { color: '#0F6E56', bg: '#E1F5EE', borderColor: 'rgba(15,110,86,0.20)', badge: 'READY' };
}

function getProgressColor(value?: number | null) {
  if (value === null || value === undefined) return 'rgba(0,0,0,0.14)';
  if (value <= 6) return '#dc2626';
  if (value <= 13) return '#f59e0b';
  return '#16a34a';
}

function getFactorHint(name: string, _decisionText: string) {
  switch (name) {
    case 'Clarity':
      return `If you can’t say what success looks like, you don’t have a decision — you have a preference.`;
    case 'Assumptions':
      return `Which things must be true for this to work — and have you actually checked any of them?`;
    case 'Reversibility':
      return `How much of the cost is unrecoverable if this goes wrong? That’s your real stake.`;
    case 'Risk':
      return `What’s the worst realistic outcome — and could you survive it?`;
    case 'Exit Logic':
      return `Without a clear exit condition, you’ll keep going long after you should have stopped.`;
    default:
      return 'Keep this factor specific to the decision at hand.';
  }
}

// ─── Layout sub-components ──────────────────────────────────────────────────────

function Z2Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: sans,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: 'rgba(0,0,0,0.36)',
        marginBottom: '0.85rem',
      }}
    >
      {children}
    </div>
  );
}

function RowDivider() {
  return (
    <div
      style={{
        borderTop: '0.5px solid rgba(0,0,0,0.09)',
        marginTop: '1.75rem',
        marginBottom: '1.75rem',
      }}
    />
  );
}

// Zone 2 finding row
function FindingRow({
  tag,
  text,
  variant = 'default',
}: {
  tag: string;
  text: string;
  variant?: 'threat' | 'condition' | 'directive' | 'default';
}) {
  const tagColor =
    variant === 'threat' ? '#A32D2D' :
    variant === 'condition' ? 'rgba(0,0,0,0.55)' :
    'rgba(0,0,0,0.36)';

  const textSize = variant === 'threat' ? 15 : variant === 'condition' ? 14 : 13.5;
  const textWeight = variant === 'threat' ? 500 : variant === 'condition' ? 500 : 400;
  const textColor = variant === 'directive' ? 'rgba(0,0,0,0.55)' : '#111';
  const textFamily = variant === 'directive' ? serif : sans;
  const textStyle = variant === 'directive' ? 'italic' as const : 'normal' as const;

  return (
    <div
      style={{
        padding: '15px 0',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontSize: 9.5,
          fontWeight: 500,
          letterSpacing: '0.13em',
          textTransform: 'uppercase' as const,
          color: tagColor,
          marginBottom: 6,
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontFamily: textFamily,
          fontSize: textSize,
          lineHeight: 1.6,
          color: textColor,
          fontWeight: textWeight,
          fontStyle: textStyle,
        }}
      >
        {text}
      </div>
    </div>
  );
}

const ANATOMY_HIGHLIGHT = new Set(['Hinge', 'Trap']);

function AnatomyRow({
  label,
  sublabel,
  value,
}: {
  label: string;
  sublabel: string;
  value: string;
}) {
  const highlight = ANATOMY_HIGHLIGHT.has(label);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '150px 1fr',
        padding: '20px 0',
        borderBottom: '0.5px solid rgba(0,0,0,0.07)',
        alignItems: 'start',
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.13em',
            textTransform: 'uppercase' as const,
            color: highlight ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.32)',
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            style={{
              fontFamily: sans,
              fontSize: 9,
              color: 'rgba(0,0,0,0.28)',
              marginTop: 3,
              fontWeight: 400,
              letterSpacing: '0.03em',
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: sans,
          fontSize: highlight ? 14 : 13,
          color: highlight ? '#111' : 'rgba(0,0,0,0.72)',
          lineHeight: 1.65,
          fontWeight: highlight ? 500 : 400,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// Converts **bold** and *italic* markdown to React elements
function renderMarkdownLine(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Handle **bold** and *italic*
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={key++} style={{ fontWeight: 600, color: 'rgba(0,0,0,0.75)' }}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={key++}>{match[2]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function AccordionRow({
  heading,
  lines,
  isOpen,
  onToggle,
}: {
  heading: string;
  lines: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '18px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontFamily: sans,
          fontSize: 13.5,
          fontWeight: 500,
          color: 'rgba(0,0,0,0.75)',
          textAlign: 'left' as const,
        }}
      >
        {heading}
        <span
          style={{
            fontSize: 18,
            fontWeight: 300,
            color: 'rgba(0,0,0,0.28)',
            lineHeight: 1,
            flexShrink: 0,
            display: 'inline-block',
            transform: isOpen ? 'rotate(45deg)' : 'none',
            transition: 'transform 0.18s ease',
          }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div style={{ paddingBottom: 20 }}>
          {lines.map((line, i) => {
            const isNumbered = /^\d+\./.test(line);
            return (
              <div
                key={i}
                style={{
                  fontFamily: sans,
                  fontSize: 13.5,
                  lineHeight: 1.75,
                  color: 'rgba(0,0,0,0.58)',
                  marginBottom: i < lines.length - 1 ? 16 : 0,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                {!isNumbered && (
                  <span style={{ color: 'rgba(0,0,0,0.18)', flexShrink: 0, marginTop: 4, fontSize: 11 }}>—</span>
                )}
                <span style={{ paddingLeft: isNumbered ? 2 : 0 }}>{renderMarkdownLine(line)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('solo');

  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signInEmailSent, setSignInEmailSent] = useState(false);

  const [latestTeamSession, setLatestTeamSession] = useState<LatestTeamSession | null>(null);
  const [loadingLatestTeamSession, setLoadingLatestTeamSession] = useState(false);
  const [latestTeamSessionError, setLatestTeamSessionError] = useState<string | null>(null);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [dismissingSessionId, setDismissingSessionId] = useState<string | null>(null);

  const [openDecisions, setOpenDecisions] = useState<OpenDecisionPreview[]>([]);
  const [loadingOpenDecisions, setLoadingOpenDecisions] = useState(false);
  const [openDecisionsError, setOpenDecisionsError] = useState<string | null>(null);

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
  const [savingVerdict, setSavingVerdict] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [revealStage, setRevealStage] = useState(0);
  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([]);

  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [openBreakdownSections, setOpenBreakdownSections] = useState<Record<string, boolean>>({});

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const decisionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const verdictRef = useRef<HTMLDivElement | null>(null);
  const teamPreviewRef = useRef<HTMLDivElement | null>(null);

  const STORAGE = {
    lastUsed: 'dl:last_used_at',
    pendingSoloReview: 'dl:pending_solo_review',
    pendingLockVerdict: 'dl:pending_lock_verdict',
    pendingBeginReview: 'dl:pending_begin_review',
    pendingDecisionInput: 'dl:pending_decision_input',
  };

  const persistSoloReviewLocally = (payload?: Partial<PendingSoloReview>) => {
    try {
      const nextPayload: PendingSoloReview = {
        decision: payload?.decision ?? decision,
        context: payload?.context ?? context,
        reviewResult: payload?.reviewResult ?? reviewResult,
        deepReview: payload?.deepReview ?? deepReview,
        finalThoughts: payload?.finalThoughts ?? finalThoughts,
        verdictRequested: payload?.verdictRequested ?? verdictRequested,
        verdict: payload?.verdict ?? verdict,
        revealStage: payload?.revealStage ?? revealStage,
        reflectionPrompts: payload?.reflectionPrompts ?? reflectionPrompts,
      };

      localStorage.setItem(STORAGE.pendingSoloReview, JSON.stringify(nextPayload));
    } catch {
      // ignore
    }
  };

  const clearPendingSoloReview = () => {
    try {
      localStorage.removeItem(STORAGE.pendingSoloReview);
      localStorage.removeItem(STORAGE.pendingLockVerdict);
    } catch {
      // ignore
    }
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
    const hydratePendingSoloReview = () => {
      try {
        const raw = localStorage.getItem(STORAGE.pendingSoloReview);
        if (!raw) return;

        const saved = JSON.parse(raw) as PendingSoloReview;

        setDecision(saved.decision ?? '');
        setContext(saved.context ?? '');
        setReviewResult(saved.reviewResult ?? null);
        setDeepReview(saved.deepReview ?? null);
        setFinalThoughts(saved.finalThoughts ?? '');
        setVerdictRequested(Boolean(saved.verdictRequested));
        setVerdict(saved.verdict ?? null);
        setRevealStage(saved.revealStage ?? 0);
        setReflectionPrompts(saved.reflectionPrompts ?? []);
        setHasStarted(Boolean(saved.reviewResult || saved.verdict || saved.deepReview));
      } catch {
        // ignore
      }
    };

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

      hydratePendingSoloReview();
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

      try {
        const raw = localStorage.getItem(STORAGE.pendingSoloReview);
        if (raw) {
          const saved = JSON.parse(raw) as PendingSoloReview;

          setDecision(saved.decision ?? '');
          setContext(saved.context ?? '');
          setReviewResult(saved.reviewResult ?? null);
          setDeepReview(saved.deepReview ?? null);
          setFinalThoughts(saved.finalThoughts ?? '');
          setVerdictRequested(Boolean(saved.verdictRequested));
          setVerdict(saved.verdict ?? null);
          setRevealStage(saved.revealStage ?? 0);
          setReflectionPrompts(saved.reflectionPrompts ?? []);
          setHasStarted(Boolean(saved.reviewResult || saved.verdict || saved.deepReview));
        }
      } catch {
        // ignore
      }

      setAuthLoading(false);
      setAuthError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ─── Sign-in pending save: fires once when user becomes available ─────────────
  // Supabase magic link causes a full page reload. On return, user starts as null
  // and becomes non-null after onAuthStateChange fires. This effect watches for
  // that transition and completes any pending save directly from localStorage,
  // bypassing all closure state entirely.
  useEffect(() => {
    if (!user?.id) return;

    let pendingLock: string | null = null;
    try { pendingLock = localStorage.getItem(STORAGE.pendingLockVerdict); } catch { return; }
    if (pendingLock !== 'true') return;

    // Clear the flag immediately so this only runs once
    try { localStorage.removeItem(STORAGE.pendingLockVerdict); } catch { /* ignore */ }

    const userId = user.id; // capture before async

    const doSave = async () => {
      try {
        const raw = localStorage.getItem(STORAGE.pendingSoloReview);
        if (!raw) return;

        const saved = JSON.parse(raw) as PendingSoloReview;
        if (!saved.reviewResult || !saved.verdict) return;

        // Restore all UI state so the page shows the review correctly
        setDecision(saved.decision ?? '');
        setContext(saved.context ?? '');
        setReviewResult(saved.reviewResult);
        setDeepReview(saved.deepReview ?? null);
        setFinalThoughts(saved.finalThoughts ?? '');
        setVerdictRequested(Boolean(saved.verdictRequested));
        setVerdict(saved.verdict);
        setHasStarted(true);

        const saveRes = await fetch('/api/decision/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: saved.decision,
            context: saved.context,
            score: saved.reviewResult?.readiness?.total ?? null,
            clarity: saved.reviewResult?.readiness?.clarity ?? null,
            assumptions: saved.reviewResult?.readiness?.assumptions ?? null,
            reversibility: saved.reviewResult?.readiness?.reversibility ?? null,
            risk: saved.reviewResult?.readiness?.risk ?? null,
            exitLogic: saved.reviewResult?.readiness?.exitLogic ?? null,
            verdict: saved.verdict,
            door: saved.reviewResult?.snapshot?.door ?? null,
            hinge: saved.reviewResult?.snapshot?.hinge ?? null,
            trap: saved.reviewResult?.snapshot?.trap ?? null,
            step: saved.reviewResult?.snapshot?.step ?? null,
            deep_review: saved.deepReview ?? null,
            final_thoughts: saved.finalThoughts ?? null,
            outcome_status: 'awaiting_outcome',
            userId,
          }),
        });

        if (saveRes.ok) {
          const saveData = await saveRes.json();
          if (saveData?.id) setDecisionId(saveData.id);
          try { localStorage.removeItem(STORAGE.pendingSoloReview); } catch { /* ignore */ }
          setSavedToast('Decision saved to history');
        }
      } catch {
        // ignore
      }
    };

    void doSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!mode || mode !== 'solo') return;
    if (!decision && !reviewResult && !verdict) return; // don't overwrite with empty state
    persistSoloReviewLocally();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision, context, reviewResult, deepReview, finalThoughts, verdictRequested, verdict, mode]);

  useEffect(() => {
    if (!savedToast) return;

    const timer = window.setTimeout(() => {
      setSavedToast(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [savedToast]);

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

  useEffect(() => {
    let cancelled = false;

    const loadOpenDecisions = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setOpenDecisions([]);
          setLoadingOpenDecisions(false);
          setOpenDecisionsError(null);
        }
        return;
      }

      if (!cancelled) {
        setLoadingOpenDecisions(true);
        setOpenDecisionsError(null);
      }

      const { data, error } = await supabase
        .from('decisions')
        .select('id, decision, outcome_status, needs_follow_up, created_at, dismissed_at')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .or('outcome_status.eq.awaiting_outcome,outcome_status.eq.in_progress,needs_follow_up.eq.true')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (error) {
          setOpenDecisions([]);
          setOpenDecisionsError(error.message || 'Failed to load open decisions.');
        } else {
          const sorted = (((data || []) as OpenDecisionPreview[]) ?? [])
            .sort((a, b) => {
              const aPriority =
                a.needs_follow_up ? 0 : a.outcome_status === 'awaiting_outcome' ? 1 : 2;
              const bPriority =
                b.needs_follow_up ? 0 : b.outcome_status === 'awaiting_outcome' ? 1 : 2;
              return aPriority - bPriority;
            })
            .slice(0, 3);

          setOpenDecisions(sorted);
          setOpenDecisionsError(null);
        }

        setLoadingOpenDecisions(false);
      }
    };

    void loadOpenDecisions();

    return () => {
      cancelled = true;
    };
  }, [user?.id, decisionId]);

  const handleSignIn = async () => {
    setAuthError(null);

    const email = window.prompt('Enter your email to sign in:');
    if (!email) return false;

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
      return false;
    }

    setSignInEmailSent(true);
    return true;
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

  const handleDismissDecisionFromHome = async (id: string) => {
    try {
      setOpenDecisionsError(null);

      const { error } = await supabase
        .from('decisions')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      setOpenDecisions((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setOpenDecisionsError(err?.message || 'Failed to dismiss decision from home.');
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
    setSavingVerdict(false);
    setDecisionId(null);
    setRevealStage(0);
    setReflectionPrompts([]);
    clearPendingSoloReview();
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
    setSavingVerdict(false);
    setDecisionId(null);

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

      persistSoloReviewLocally({
        decision,
        context,
        reviewResult: data,
        deepReview: null,
        finalThoughts: '',
        verdictRequested: false,
        verdict: null,
        revealStage: 0,
        reflectionPrompts: [],
      });
      setRevealStage(0);
      setReflectionPrompts([]);

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
    if (deepLoading) return;

    setDeepLoading(true);

    try {
      const res = await fetch('/api/review/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          context,
          hinge: reviewResult?.snapshot?.hinge ?? '',
          trap: reviewResult?.snapshot?.trap ?? '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Deep review request failed');
      }

      const analysis = data?.analysis ?? 'No deep review returned.';
      const prompts: string[] = Array.isArray(data?.reflectionPrompts) ? data.reflectionPrompts : [];
      setDeepReview(analysis);
      setReflectionPrompts(prompts);
      persistSoloReviewLocally({ deepReview: analysis, reflectionPrompts: prompts });
    } catch (err: any) {
      const failureMessage = err?.message || 'Failed to load deep review.';
      setDeepReview(failureMessage);
      persistSoloReviewLocally({ deepReview: failureMessage });
    } finally {
      setDeepLoading(false);
    }
  };

  const handleGenerateVerdict = async () => {
    if (!finalThoughts.trim()) return;

    setVerdictRequested(true);
    setVerdictLoading(true);
    setVerdict(null);

    const hinge = reviewResult?.snapshot?.hinge || '';
    const next_move = reviewResult?.snapshot?.step || '';

    try {
      const res = await fetch('/api/review/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          context,
          thoughts: finalThoughts,
          hinge,
          next_move,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Verdict failed.');
      }

      const nextVerdict = data?.verdict ?? '';
      setVerdict(nextVerdict);

      persistSoloReviewLocally({
        finalThoughts,
        verdictRequested: true,
        verdict: nextVerdict,
      });

      setTimeout(() => {
        verdictRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch {
      const fallbackVerdict = 'Not ready yet\n\nSomething went wrong. Try again.';
      setVerdict(fallbackVerdict);
      persistSoloReviewLocally({
        finalThoughts,
        verdictRequested: true,
        verdict: fallbackVerdict,
      });
    } finally {
      setVerdictLoading(false);
    }
  };

  const handleLockVerdict = async () => {
    if (!reviewResult || !verdict || savingVerdict) return;

    setApiError(null);

    if (!user) {
      persistSoloReviewLocally({
        decision,
        context,
        reviewResult,
        deepReview,
        finalThoughts,
        verdictRequested,
        verdict,
      });

      try {
        localStorage.setItem(STORAGE.pendingLockVerdict, 'true');
      } catch {
        // ignore
      }

      await handleSignIn();
      return;
    }

    try {
      setSavingVerdict(true);

      const saveRes = await fetch('/api/decision/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          context,
          score: reviewResult?.readiness?.total ?? null,
          clarity: reviewResult?.readiness?.clarity ?? null,
          assumptions: reviewResult?.readiness?.assumptions ?? null,
          reversibility: reviewResult?.readiness?.reversibility ?? null,
          risk: reviewResult?.readiness?.risk ?? null,
          exitLogic: reviewResult?.readiness?.exitLogic ?? null,
          verdict,
          door: reviewResult?.snapshot?.door ?? null,
          hinge: reviewResult?.snapshot?.hinge ?? null,
          trap: reviewResult?.snapshot?.trap ?? null,
          step: reviewResult?.snapshot?.step ?? null,
          deep_review: deepReview ?? null,
          final_thoughts: finalThoughts ?? null,
          outcome_status: 'awaiting_outcome',
          userId: user.id,
        }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(saveData?.error || 'Failed to save decision.');
      }

      if (saveData?.id) {
        setDecisionId(saveData.id);
      }

      clearPendingSoloReview();
      setSavedToast('Decision saved to history');
    } catch (err: any) {
      setApiError(err?.message || 'Failed to save decision.');
    } finally {
      setSavingVerdict(false);
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

  const toggleBreakdownSection = (heading: string) => {
    const key = heading.toLowerCase();
    setOpenBreakdownSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ─── Derived values ───────────────────────────────────────────────────────────

  const scoreTotal =
    typeof reviewResult?.readiness?.total === 'number' ? reviewResult.readiness.total : null;

  const verdictDisplay =
    reviewResult?.readiness?.label === 'Not ready to commit'
      ? 'Do not commit'
      : reviewResult?.readiness?.label === 'Proceed smaller'
        ? 'Proceed smaller'
        : 'Proceed';

  const meta = getScoreMeta(reviewResult?.readiness?.label);

  const lastUsedLabel = formatShort(lastUsedAt);
  const visibleDeepReview = cleanDeepReview(deepReview);
  const deepReviewSections = parseDeepReviewSections(visibleDeepReview);

  const stripMarkdownBold = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
  const verdictParts = verdict ? verdict.split('\n\n') : [];
  const verdictTitle = stripMarkdownBold(verdictParts[0] ?? '');
  const verdictReason = stripMarkdownBold(verdictParts.slice(1).join('\n\n'));

  const hasSummaryReady = Boolean(latestTeamSession?.summary_generated_at);
  const openLoopCount = openDecisions.length;
  const openLoopLabel = openLoopCount === 1 ? '1 unresolved' : `${openLoopCount} unresolved`;

  // ─── Shared inline styles ─────────────────────────────────────────────────────

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
    fontFamily: sans,
    color: '#111',
    boxSizing: 'border-box',
  };

  const detailStyle: React.CSSProperties = {
    border,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.55)',
    padding: '10px 12px',
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
    fontFamily: sans,
  };

  const modeCardBase: React.CSSProperties = {
    flex: 1,
    borderRadius: 14,
    padding: '14px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 160ms ease',
    userSelect: 'none',
    fontFamily: sans,
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
    fontFamily: sans,
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
    fontFamily: sans,
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
    fontFamily: sans,
  };

  const decisionPlaceholder = 'launch · invest · hire · pivot · exit';
  const contextPlaceholder = "stakes · deadline · who's affected · what you're risking";
  const optionalDetailsLabel = '▶ Any details I should know (optional)';

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <link rel="stylesheet" href={FONT_URL} />
      <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111', fontFamily: sans }}>
        <main style={{ maxWidth: 980, margin: '28px auto 60px', padding: '0 20px' }}>

          {/* ── Header ── */}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!authLoading && user && (
                <div style={{ fontSize: 12.5, opacity: 0.62 }}>{user.email || 'Signed in'}</div>
              )}

              {!authLoading && (
                <a
                  href="/history"
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
                    fontFamily: sans,
                  }}
                >
                  Decision History
                </a>
              )}

              {authLoading ? null : user ? (
                <button type="button" onClick={handleSignOut} style={topActionButtonStyle}>
                  Sign Out
                </button>
              ) : (
                <button type="button" onClick={handleSignIn} style={topActionButtonStyle}>
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* ── Auth error ── */}
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

          {/* ── Saved toast ── */}
          {savedToast && (
            <div
              style={{
                maxWidth: 720,
                margin: '14px auto 0',
                borderRadius: 12,
                border: '1px solid rgba(22,101,52,0.18)',
                background: 'rgba(22,101,52,0.05)',
                padding: '10px 12px',
                color: '#166534',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              {savedToast}
            </div>
          )}

          {/* ── Open loops + latest team session ── */}
          {user &&
            (loadingOpenDecisions ||
              openDecisions.length > 0 ||
              openDecisionsError ||
              loadingLatestTeamSession ||
              latestTeamSession ||
              latestTeamSessionError) && (
              <section style={{ maxWidth: 760, margin: '16px auto 0' }}>
                <div
                  style={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.78)',
                    padding: '10px 14px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    {/* Open loops */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: '0.10em',
                          opacity: 0.46,
                        }}
                      >
                        OPEN LOOPS
                      </div>

                      {loadingOpenDecisions ? (
                        <div style={{ marginTop: 3, fontSize: 12.5, opacity: 0.68 }}>
                          Loading...
                        </div>
                      ) : openDecisionsError ? (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12.5,
                            color: '#b91c1c',
                            fontWeight: 700,
                          }}
                        >
                          {openDecisionsError}
                        </div>
                      ) : openDecisions.length === 0 ? (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 15,
                            fontWeight: 800,
                            letterSpacing: -0.03,
                          }}
                        >
                          No unresolved
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 22,
                              fontWeight: 900,
                              letterSpacing: -0.04,
                              lineHeight: 0.98,
                            }}
                          >
                            {openLoopLabel}
                          </div>

                          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <a
                              href="/history"
                              style={{
                                borderRadius: 999,
                                border: 'none',
                                padding: '8px 11px',
                                background: '#111',
                                color: '#fff',
                                fontSize: 11.5,
                                fontWeight: 900,
                                textDecoration: 'none',
                                boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
                              }}
                            >
                              View history
                            </a>

                            <a
                              href="/history"
                              style={{
                                borderRadius: 999,
                                border: '1px solid rgba(0,0,0,0.10)',
                                padding: '8px 11px',
                                background: '#fff',
                                color: '#111',
                                fontSize: 11.5,
                                fontWeight: 800,
                                textDecoration: 'none',
                              }}
                            >
                              Update outcomes
                            </a>
                          </div>

                          {openDecisions.length > 0 && (
                            <div
                              style={{
                                marginTop: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              {openDecisions.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    borderRadius: 10,
                                    background: 'rgba(0,0,0,0.03)',
                                    padding: '7px 8px',
                                  }}
                                >
                                  <div
                                    style={{
                                      minWidth: 0,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      lineHeight: 1.35,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={item.decision}
                                  >
                                    {item.decision}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDismissDecisionFromHome(item.id)}
                                    style={{
                                      borderRadius: 999,
                                      border: '1px solid rgba(0,0,0,0.10)',
                                      background: '#fff',
                                      padding: '6px 9px',
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: '#111',
                                      cursor: 'pointer',
                                      flexShrink: 0,
                                    }}
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Column divider */}
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.06)',
                        opacity: 0.85,
                        alignSelf: 'stretch',
                      }}
                    />

                    {/* Latest team session */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: '0.10em',
                          opacity: 0.46,
                        }}
                      >
                        LATEST TEAM REVIEW
                      </div>

                      {loadingLatestTeamSession ? (
                        <div style={{ marginTop: 3, fontSize: 12.5, opacity: 0.68 }}>
                          Loading...
                        </div>
                      ) : latestTeamSessionError ? (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12.5,
                            color: '#b91c1c',
                            fontWeight: 700,
                          }}
                        >
                          {latestTeamSessionError}
                        </div>
                      ) : !latestTeamSession ? (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 15,
                            fontWeight: 800,
                            letterSpacing: -0.03,
                          }}
                        >
                          No active review
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              marginTop: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 999,
                                border: hasSummaryReady
                                  ? '1px solid rgba(16,185,129,0.16)'
                                  : '1px solid rgba(59,130,246,0.16)',
                                background: hasSummaryReady
                                  ? 'rgba(16,185,129,0.08)'
                                  : 'rgba(59,130,246,0.07)',
                                color: hasSummaryReady ? '#047857' : '#1d4ed8',
                                padding: '4px 7px',
                                fontSize: 9.5,
                                fontWeight: 900,
                                letterSpacing: '0.08em',
                              }}
                            >
                              {hasSummaryReady ? 'READY' : 'OPEN'}
                            </div>

                            <div
                              style={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: 18,
                                fontWeight: 900,
                                letterSpacing: -0.035,
                                lineHeight: 1.05,
                              }}
                            >
                              {latestTeamSession.title}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12.5,
                              lineHeight: 1.35,
                              opacity: 0.62,
                            }}
                          >
                            {latestTeamSession.deadline
                              ? formatDeadline(latestTeamSession.deadline)
                              : 'No deadline set'}
                          </div>

                          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {hasSummaryReady ? (
                              <a
                                href={`/team/${latestTeamSession.id}/summary`}
                                style={{
                                  borderRadius: 999,
                                  border: 'none',
                                  padding: '8px 11px',
                                  background: '#111',
                                  color: '#fff',
                                  fontSize: 11.5,
                                  fontWeight: 900,
                                  textDecoration: 'none',
                                  boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
                                }}
                              >
                                Open
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCloseAndGenerateFromHome(latestTeamSession.id)}
                                disabled={closingSessionId === latestTeamSession.id}
                                style={{
                                  borderRadius: 999,
                                  border: 'none',
                                  padding: '8px 11px',
                                  background: '#111',
                                  color: '#fff',
                                  fontSize: 11.5,
                                  fontWeight: 900,
                                  cursor:
                                    closingSessionId === latestTeamSession.id
                                      ? 'default'
                                      : 'pointer',
                                  opacity: closingSessionId === latestTeamSession.id ? 0.72 : 1,
                                  boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
                                }}
                              >
                                {closingSessionId === latestTeamSession.id
                                  ? 'Closing...'
                                  : 'Close review'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDismissFromHome(latestTeamSession.id)}
                              disabled={dismissingSessionId === latestTeamSession.id}
                              style={{
                                borderRadius: 999,
                                border: '1px solid rgba(0,0,0,0.10)',
                                padding: '8px 11px',
                                background: '#fff',
                                color: '#111',
                                fontSize: 11.5,
                                fontWeight: 800,
                                cursor:
                                  dismissingSessionId === latestTeamSession.id
                                    ? 'default'
                                    : 'pointer',
                                opacity: dismissingSessionId === latestTeamSession.id ? 0.72 : 1,
                              }}
                            >
                              {dismissingSessionId === latestTeamSession.id
                                ? 'Dismissing...'
                                : 'Dismiss'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

          {/* ── Hero ── */}
          <section style={{ textAlign: 'center', marginTop: 38 }}>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 64,
                fontWeight: 400,
                margin: 0,
                letterSpacing: '-0.5px',
                lineHeight: 1.05,
              }}
            >
              Decision Layer
            </h1>
            <div
              style={{
                marginTop: 10,
                fontFamily: serif,
                fontSize: 24,
                fontStyle: 'italic',
                fontWeight: 400,
                letterSpacing: '0.01em',
                opacity: 0.62,
              }}
            >
              The last checkpoint before you commit.
            </div>
          </section>

          {/* ── Mode selector ── */}
          <section style={{ maxWidth: 720, margin: '20px auto 0' }}>
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
                <div style={{ marginTop: 3, fontSize: 12.5, opacity: 0.68, lineHeight: 1.45 }}>
                  Get a verdict before you decide alone.
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
                <div style={{ marginTop: 3, fontSize: 12.5, opacity: 0.68, lineHeight: 1.45 }}>
                  Get alignment before the call gets made.
                </div>
              </button>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════════════
              SOLO MODE
          ══════════════════════════════════════════════════════════════════════ */}
          {mode === 'solo' ? (
            <section style={{ maxWidth: 720, margin: '20px auto 0' }}>

              {/* Input shell */}
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
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: serif,
                      fontSize: 22,
                      fontWeight: 400,
                      lineHeight: 1.2,
                    }}
                  >
                    What decision are you about to make?
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, opacity: 0.68 }}>
                    Get a readiness check, key risks, and a verdict.
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
                    {!hasStarted && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          lineHeight: 1.6,
                          color: 'rgba(0,0,0,0.42)',
                          borderLeft: '2px solid rgba(0,0,0,0.10)',
                          paddingLeft: 9,
                        }}
                      >
                        Gaps in context become gaps in the verdict.
                      </div>
                    )}
                  </div>

                  <details style={detailStyle} open>
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
                      {loading ? 'Running Review...' : 'Run the Review'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading placeholder */}
              {hasStarted && loading && !reviewResult && (
                <div
                  style={{
                    marginTop: 16,
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderRadius: 14,
                    background: '#fff',
                    padding: 16,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Review in progress...</div>
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, opacity: 0.68 }}>
                    Structuring the decision, testing the main assumption, and checking whether this
                    looks ready to commit.
                  </div>
                </div>
              )}

              {/* ── Results: two-zone layout ── */}
              {reviewResult && (
                <div ref={snapshotRef} style={{ marginTop: 16 }}>

                  {/* ── ZONE 1: THE SIGNAL ── */}
                  <div
                    style={{
                      border: '1px solid rgba(0,0,0,0.10)',
                      borderRadius: '16px 16px 0 0',
                      borderBottom: 'none',
                      background: '#fff',
                      padding: '2.5rem 2.5rem 2.75rem',
                    }}
                  >
                    {/* Meta */}
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'rgba(0,0,0,0.32)',
                        marginBottom: '2rem',
                      }}
                    >
                      Solo decision &nbsp;·&nbsp;{' '}
                      {new Date().toLocaleDateString(undefined, {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </div>

                    {/* Decision in italics */}
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 18,
                        fontWeight: 400,
                        fontStyle: 'italic',
                        lineHeight: 1.45,
                        color: 'rgba(0,0,0,0.55)',
                        marginBottom: '3rem',
                      }}
                    >
                      &ldquo;{decision}&rdquo;
                    </div>

                    {/* Score card + verdict headline */}
                    <div style={{ marginBottom: '2.5rem' }}>
                      {/* Readiness Score Card */}
                      <div
                        style={{
                          borderRadius: 14,
                          border: '1px solid rgba(0,0,0,0.12)',
                          background: 'rgba(255,255,255,0.6)',
                          padding: '1.75rem',
                          marginBottom: '2rem',
                        }}
                      >
                        {/* Header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1.2rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: 'rgba(0,0,0,0.42)',
                            }}
                          >
                            Decision Quality
                          </div>
                          <div
                            style={{
                              padding: '8px 11px',
                              borderRadius: 999,
                              background: meta.bg,
                              color: meta.color,
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              border: `1px solid ${meta.borderColor}`,
                            }}
                          >
                            {meta.badge}
                          </div>
                        </div>

                        {/* Hero score */}
                        <div style={{ marginBottom: '1.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                            <span
                              style={{
                                fontSize: 'clamp(3rem, 10vw, 56px)',
                                fontWeight: 700,
                                color: meta.color,
                                lineHeight: 1,
                              }}
                            >
                              {scoreTotal ?? '—'}
                            </span>
                            <span
                              style={{
                                fontSize: 'clamp(1.5rem, 4vw, 28px)',
                                color: 'rgba(0,0,0,0.36)',
                                fontWeight: 400,
                                lineHeight: 1,
                              }}
                            >
                              / 100
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: 'rgba(0,0,0,0.55)',
                              marginTop: '0.6rem',
                            }}
                          >
                            Readiness score
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div
                          style={{
                            height: 3,
                            background: 'rgba(0,0,0,0.08)',
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginBottom: '1.5rem',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${scoreTotal ?? 0}%`,
                              background: meta.color,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        {/* Interpretation text */}
                        <div
                          style={{
                            fontSize: 13.5,
                            lineHeight: 1.6,
                            color: 'rgba(0,0,0,0.72)',
                            marginBottom: '1.5rem',
                          }}
                        >
                          {reviewResult?.readiness?.summary || 'Higher scores indicate a more survivable move. Lower scores signal unclear assumptions, weak evidence, or a step that\'s too large.'}
                        </div>

                        {/* Scoring model dropdown */}
                        <details
                          style={{
                            borderTop: '0.5px solid rgba(0,0,0,0.09)',
                            paddingTop: '1.2rem',
                          }}
                        >
                          <summary
                            style={{
                              cursor: 'pointer',
                              listStyle: 'none',
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: 'rgba(0,0,0,0.72)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            Scoring model
                            <span
                              style={{
                                fontSize: 16,
                                color: 'rgba(0,0,0,0.28)',
                                display: 'inline-block',
                              }}
                            >
                              ▼
                            </span>
                          </summary>

                          {/* Breakdown */}
                          <div style={{ marginTop: '1rem' }}>
                            {[
                              { name: 'Clarity', value: reviewResult?.readiness?.clarity, hint: getFactorHint('Clarity', decision) },
                              { name: 'Assumptions', value: reviewResult?.readiness?.assumptions, hint: getFactorHint('Assumptions', decision) },
                              { name: 'Reversibility', value: reviewResult?.readiness?.reversibility, hint: getFactorHint('Reversibility', decision) },
                              { name: 'Risk', value: reviewResult?.readiness?.risk, hint: getFactorHint('Risk', decision) },
                              { name: 'Exit Logic', value: reviewResult?.readiness?.exitLogic, hint: getFactorHint('Exit Logic', decision) },
                            ].map((factor, i) => (
                              <div key={i}>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 1fr) 52px',
                                    gap: '0.75rem',
                                    alignItems: 'center',
                                    paddingBottom: '0.75rem',
                                    paddingTop: '0.75rem',
                                    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                                  }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(0,0,0,0.72)' }}>
                                      {factor.name}
                                    </div>
                                    <div
                                      style={{
                                        height: 3,
                                        background: 'rgba(0,0,0,0.08)',
                                        borderRadius: 999,
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: '100%',
                                          width: `${((factor.value ?? 0) / 20) * 100}%`,
                                          background: getProgressColor(factor.value),
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(0,0,0,0.55)', textAlign: 'right' }}>
                                    {factor.value ?? '—'}<span style={{ fontSize: 10.5, opacity: 0.6 }}>/20</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.50)', lineHeight: 1.4, marginTop: '0.4rem', marginBottom: '0.3rem', fontStyle: 'italic' }}>
                                  {factor.hint}
                                </div>
                              </div>
                            ))}

                            {/* Total row (bolded and in color) */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) 44px',
                                gap: '0.75rem',
                                alignItems: 'center',
                                paddingTop: '0.75rem',
                                marginTop: '0.5rem',
                                borderTop: '0.5px solid rgba(0,0,0,0.09)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.45rem',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: meta.color,
                                  }}
                                >
                                  Total
                                </div>
                                <div
                                  style={{
                                    height: 4,
                                    background: 'rgba(0,0,0,0.08)',
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${scoreTotal ?? 0}%`,
                                      background: meta.color,
                                    }}
                                  />
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: meta.color,
                                  textAlign: 'right',
                                }}
                              >
                                {scoreTotal ?? '—'}
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>

                    </div>

                    {/* Stage 1+: Break line + Hinge */}
                    {revealStage >= 1 ? (
                      <>
                        <div
                          style={{
                            borderTop: '0.5px solid rgba(0,0,0,0.09)',
                            paddingTop: '1.75rem',
                            fontFamily: sans,
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: 'rgba(0,0,0,0.55)',
                          }}
                        >
                          {buildBreakLine(reviewResult.snapshot.hinge)}{' '}
                          <span style={{ color: 'rgba(0,0,0,0.80)', fontWeight: 500 }}>
                            Until that assumption is tested, committing is speculation — and the downside is irreversible.
                          </span>
                        </div>
                        {/* Hinge highlighted */}
                        <div
                          style={{
                            background: 'rgba(0,0,0,0.025)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 10,
                            padding: '1rem 1.25rem',
                            marginTop: '1.25rem',
                          }}
                        >
                          <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.36)', marginBottom: 8 }}>Hinge</div>
                          <div style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(0,0,0,0.82)', fontWeight: 500 }}>{reviewResult.snapshot.hinge}</div>
                        </div>
                        {/* Stage 1 CTA */}
                        {revealStage === 1 && (
                          <div style={{ marginTop: '1.75rem' }}>
                            <button
                              type="button"
                              onClick={() => { const n = 2; setRevealStage(n); persistSoloReviewLocally({ revealStage: n }); }}
                              style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.07em', background: '#0b0b0b', color: '#fff', border: 'none', padding: '13px 26px', borderRadius: 2, cursor: 'pointer' }}
                            >
                              See the full anatomy →
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Stage 0 CTA */
                      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <button
                          type="button"
                          onClick={() => { const n = 1; setRevealStage(n); persistSoloReviewLocally({ revealStage: n }); }}
                          style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.07em', background: '#0b0b0b', color: '#fff', border: 'none', padding: '13px 26px', borderRadius: 2, cursor: 'pointer' }}
                        >
                          See what&apos;s at stake →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── BRIDGE ── */}
                  {revealStage >= 2 && (
                    <div
                      style={{
                        height: 3,
                        background: meta.color,
                        opacity: 0.12,
                      }}
                    />
                  )}

                  {/* ── ZONE 2: THE EVIDENCE ── */}
                  {revealStage >= 2 && (
                  <div
                    style={{
                      border: '1px solid rgba(0,0,0,0.10)',
                      borderRadius: '0 0 16px 16px',
                      borderTop: 'none',
                      background: 'rgba(0,0,0,0.018)',
                      padding: '0 2.5rem',
                    }}
                  >

                    {/* Decision anatomy */}
                    <div
                      style={{
                        padding: '1.75rem 0',
                        borderBottom: '0.5px solid rgba(0,0,0,0.09)',
                      }}
                    >
                      <Z2Label>Decision anatomy</Z2Label>
                      <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <AnatomyRow label="Door" sublabel="type of decision" value={reviewResult.snapshot.door} />
                        <AnatomyRow label="Locks" sublabel="hard to undo" value={reviewResult.snapshot.lock} />
                        <AnatomyRow label="Trap" sublabel="hidden failure risk" value={reviewResult.snapshot.trap} />
                        <AnatomyRow label="Exit" sublabel="when to stop" value={reviewResult.snapshot.exit} />
                        <div style={{ borderBottom: 'none' }}>
                          <AnatomyRow label="Step" sublabel="next survivable move" value={reviewResult.snapshot.step} />
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div
                      style={{
                        padding: '1.75rem 0',
                        borderBottom: '0.5px solid rgba(0,0,0,0.09)',
                      }}
                    >
                      <Z2Label>Reasoning</Z2Label>
                      {deepLoading ? (
                        <div style={{ fontFamily: sans, fontSize: 13, color: 'rgba(0,0,0,0.42)', padding: '8px 0' }}>
                          Loading deeper review...
                        </div>
                      ) : deepReviewSections.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => void loadDeepReview()}
                          style={{
                            ...lightButtonStyle,
                            fontSize: 12.5,
                            padding: '9px 16px',
                          }}
                        >
                          Unpack the review ↓
                        </button>
                      ) : (
                        <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                          {deepReviewSections.map((section) => (
                            <AccordionRow
                              key={section.heading}
                              heading={section.heading}
                              lines={section.lines}
                              isOpen={openBreakdownSections[section.heading.toLowerCase()] !== false}
                              onToggle={() => toggleBreakdownSection(section.heading)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stage 2 CTA */}
                    {revealStage === 2 && (
                      <div style={{ padding: '1.5rem 0' }}>
                        <button
                          type="button"
                          onClick={() => { const n = 3; setRevealStage(n); persistSoloReviewLocally({ revealStage: n }); }}
                          style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.07em', background: '#0b0b0b', color: '#fff', border: 'none', padding: '13px 26px', borderRadius: 2, cursor: 'pointer' }}
                        >
                          See why →
                        </button>
                      </div>
                    )}

                    {/* Stage 3+: Why this verdict */}
                    {revealStage >= 3 && (
                    <div
                      style={{
                        padding: '1.75rem 0',
                        borderBottom: '0.5px solid rgba(0,0,0,0.09)',
                        borderTop: '0.5px solid rgba(0,0,0,0.09)',
                      }}
                    >
                      <Z2Label>Why this verdict</Z2Label>
                      <FindingRow
                        tag="The threat"
                        text={reviewResult.topline.primaryRisk}
                        variant="threat"
                      />
                      <FindingRow
                        tag="What must hold"
                        text={reviewResult.topline.mustBeTrue}
                        variant="condition"
                      />
                      <div style={{ borderBottom: 'none' }}>
                        <FindingRow
                          tag="The move"
                          text={reviewResult.topline.recommendedMove}
                          variant="directive"
                        />
                      </div>
                    </div>
                    )}

                    {/* Stage 3 CTA */}
                    {revealStage === 3 && (
                      <div style={{ padding: '1.5rem 0' }}>
                        <button
                          type="button"
                          onClick={() => { const n = 4; setRevealStage(n); persistSoloReviewLocally({ revealStage: n }); }}
                          style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.07em', background: '#0b0b0b', color: '#fff', border: 'none', padding: '13px 26px', borderRadius: 2, cursor: 'pointer' }}
                        >
                          Add your notes →
                        </button>
                      </div>
                    )}

                    {/* Your notes + commit gate */}
                    {revealStage >= 4 && (
                    <div style={{ padding: '1.75rem 0' }}>
                      <Z2Label>Your notes</Z2Label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                        {[
                          'What still feels unresolved?',
                          'What would have to be true for you to feel ready?',
                          'What are you avoiding looking at?',
                        ].map((q) => (
                          <div
                            key={q}
                            style={{
                              fontFamily: sans,
                              fontSize: 12,
                              color: 'rgba(0,0,0,0.36)',
                              paddingLeft: 12,
                              borderLeft: '2px solid rgba(0,0,0,0.09)',
                              lineHeight: 1.5,
                            }}
                          >
                            {q}
                          </div>
                        ))}
                      </div>
                      <textarea
                        value={finalThoughts}
                        onChange={(e) => setFinalThoughts(e.target.value)}
                        rows={5}
                        placeholder="Write before you decide…"
                        style={{ ...inputStyle, minHeight: 132, resize: 'vertical', background: '#fff' }}
                      />

                      {/* Commit gate */}
                      <div
                        style={{
                          marginTop: '2.5rem',
                          paddingTop: '2rem',
                          borderTop: '0.5px solid rgba(0,0,0,0.09)',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'rgba(0,0,0,0.30)',
                            marginBottom: 6,
                          }}
                        >
                          Last checkpoint
                        </div>
                        <div
                          style={{
                            fontFamily: serif,
                            fontSize: 20,
                            fontWeight: 400,
                            color: '#111',
                            marginBottom: '1.75rem',
                            lineHeight: 1.3,
                          }}
                        >
                          Before you commit.
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateVerdict}
                          disabled={verdictLoading || !finalThoughts.trim()}
                          style={{
                            fontFamily: sans,
                            fontSize: 12.5,
                            fontWeight: 500,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            background: '#0b0b0b',
                            color: '#fff',
                            border: 'none',
                            padding: '14px 32px',
                            borderRadius: 2,
                            cursor: verdictLoading || !finalThoughts.trim() ? 'default' : 'pointer',
                            opacity: verdictLoading || !finalThoughts.trim() ? 0.42 : 1,
                            transition: 'opacity 0.15s ease',
                          }}
                        >
                          {verdictLoading ? 'Generating...' : 'Generate final verdict'}
                        </button>
                        <div
                          style={{
                            marginTop: 10,
                            fontFamily: sans,
                            fontSize: 11,
                            color: 'rgba(0,0,0,0.30)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          Verdict saves automatically after generation.
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                  )}

                  {/* ── Final verdict card ── */}
                  {verdictRequested && (
                    <div
                      ref={verdictRef}
                      style={{
                        marginTop: 14,
                        border: '1px solid rgba(0,0,0,0.10)',
                        borderRadius: 16,
                        background: '#fff',
                        padding: '26px 26px 32px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'rgba(0,0,0,0.36)',
                          marginBottom: '0.85rem',
                        }}
                      >
                        Final verdict
                      </div>

                      {verdictLoading ? (
                        <div style={{ fontFamily: sans, fontSize: 13.5, opacity: 0.55 }}>
                          Generating final verdict...
                        </div>
                      ) : (
                        <>
                          {/* Verdict text block — distinct from surrounding content */}
                          <div
                            style={{
                              borderLeft: '3px solid #111',
                              paddingLeft: '1.25rem',
                              paddingTop: '0.85rem',
                              paddingBottom: '0.85rem',
                              background: '#f9f9f7',
                              borderRadius: '0 8px 8px 0',
                              marginBottom: verdictReason ? 14 : 0,
                            }}
                          >
                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: sans,
                                fontSize: 15,
                                fontWeight: 400,
                                lineHeight: 1.75,
                                color: '#111',
                              }}
                            >
                              {verdictTitle}
                            </div>
                          </div>

                          {verdictReason && (
                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: sans,
                                fontSize: 13.5,
                                lineHeight: 1.65,
                                color: 'rgba(0,0,0,0.70)',
                                fontWeight: 400,
                              }}
                            >
                              {verdictReason}
                            </div>
                          )}
                        </>
                      )}

                      {verdict && !verdictLoading && (
                        <>
                          <RowDivider />
                          {!decisionId ? (
                            <>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  color: 'rgba(0,0,0,0.36)',
                                  marginBottom: 8,
                                }}
                              >
                                Lock your decision
                              </div>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 13.5,
                                  lineHeight: 1.55,
                                  opacity: 0.65,
                                  marginBottom: 14,
                                }}
                              >
                                {!user
                                  ? 'Sign in to keep this verdict. You’ll also get a full decision brief you can revisit, share, and track over time.'
                                  : 'Signed in. Your decision is ready to lock.'}
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={handleLockVerdict}
                                  disabled={savingVerdict}
                                  style={{
                                    ...ctaButtonStyle,
                                    opacity: savingVerdict ? 0.72 : 1,
                                    cursor: savingVerdict ? 'default' : 'pointer',
                                  }}
                                >
                                  {savingVerdict ? 'Saving...' : user ? 'Lock in verdict' : 'Keep this verdict →'}
                                </button>
                              </div>
                              {signInEmailSent && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    borderRadius: 10,
                                    border: '1px solid rgba(0,0,0,0.10)',
                                    background: 'rgba(0,0,0,0.02)',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                  }}
                                >
                                  <div>
                                    <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 3 }}>
                                      Check your email for the sign-in link.
                                    </div>
                                    <div style={{ fontFamily: sans, fontSize: 12, color: 'rgba(0,0,0,0.50)', lineHeight: 1.5 }}>
                                      Don&apos;t see it? Check your junk or spam folder.
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSignInEmailSent(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,0.30)', padding: 0, flexShrink: 0 }}
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  color: 'rgba(0,0,0,0.36)',
                                  marginBottom: 8,
                                }}
                              >
                                Decision locked
                              </div>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 13.5,
                                  lineHeight: 1.55,
                                  opacity: 0.65,
                                  marginBottom: 14,
                                }}
                              >
                                Your decision is saved. View the full brief to see the verdict, risks, and next move.
                              </div>
                              <a
                                href={`/decision-summary?id=${decisionId}`}
                                style={{
                                  ...ctaButtonStyle,
                                  fontSize: 12,
                                  padding: '10px 18px',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                View Decision Brief →
                              </a>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

          ) : (
            /* ══════════════════════════════════════════════════════════════════════
                TEAM MODE
            ══════════════════════════════════════════════════════════════════════ */
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
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: serif,
                      fontSize: 22,
                      fontWeight: 400,
                      lineHeight: 1.2,
                    }}
                  >
                    Hear from your team before you decide.
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 6,
                        opacity: 0.66,
                      }}
                    >
                      Title
                    </div>
                    <input
                      value={teamTitle}
                      onChange={(e) => setTeamTitle(e.target.value)}
                      placeholder="new hire · raise prices · expand overseas · let someone go"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 6,
                        opacity: 0.66,
                      }}
                    >
                      What decision needs to be made?
                    </div>
                    <textarea
                      value={teamPrompt}
                      onChange={(e) => setTeamPrompt(e.target.value)}
                      rows={5}
                      placeholder="what's at stake · what's blocking it · what you need from the team"
                      style={{ ...inputStyle, minHeight: 132, resize: 'vertical' }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                      alignItems: 'end',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          marginBottom: 6,
                          opacity: 0.66,
                        }}
                      >
                        Deadline
                        <span style={{ opacity: 0.42, marginLeft: 6, fontWeight: 600 }}>
                          optional
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={teamDeadline}
                        onChange={(e) => setTeamDeadline(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          marginBottom: 6,
                          opacity: 0.66,
                        }}
                      >
                        Participants
                        <span style={{ opacity: 0.42, marginLeft: 6, fontWeight: 600 }}>
                          optional
                        </span>
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={expectedParticipants}
                        onChange={(e) => setExpectedParticipants(e.target.value)}
                        placeholder="6"
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

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
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
                      {creatingTeamSession ? 'Creating...' : 'Start Team Review'}
                    </button>
                  </div>
                </div>
              </div>

              {teamSessionPreview && (
                <div
                  ref={teamPreviewRef}
                  style={{
                    marginTop: 16,
                    border: '1px solid rgba(0,0,0,0.10)',
                    borderRadius: 14,
                    background: '#fff',
                    padding: 14,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      opacity: 0.6,
                      marginBottom: 10,
                    }}
                  >
                    Team Review Created
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={detailStyle}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          opacity: 0.5,
                          marginBottom: 6,
                        }}
                      >
                        TITLE
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
                        {teamSessionPreview.title}
                      </div>
                    </div>

                    <div style={detailStyle}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          opacity: 0.5,
                          marginBottom: 6,
                        }}
                      >
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

          {/* ── Footer ── */}
          <footer
            style={{
              marginTop: 60,
              paddingTop: 20,
              paddingBottom: 40,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              textAlign: 'center',
              fontSize: 12,
              color: '#777',
              fontFamily: sans,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontFamily: serif,
                fontSize: 15,
                fontStyle: 'italic',
                fontWeight: 400,
                color: '#111',
                opacity: 0.55,
              }}
            >
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
    </>
  );
}

