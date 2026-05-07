'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import DecisionDoor from './components/DecisionDoor';

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
  pattern: {
    type: string;
    rationale: string;
    reversibility: 'low' | 'medium' | 'high';
  };
  readiness: {
    clarity: number;
    assumptions: number;
    reversibility: number;
    risk: number;
    exitLogic: number;
    total: number;
    label: 'Needs more before you commit' | 'Take a smaller step' | 'Proceed with caution' | 'Strong to commit';
    summary: string;
    rationale?: {
      clarity: string;
      assumptions: string;
      reversibility: string;
      risk: string;
      exitLogic: string;
    };
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
    script: string;
    tripwire: string;
    failure_modes: string[];
    if_delayed: string;
    what_others_miss: string;
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
  requestKey?: string;
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
  if (label === 'Needs more before you commit')
    return { color: '#A32D2D', bg: '#FCEBEB', borderColor: 'rgba(163,45,45,0.20)', badge: 'NOT READY' };
  if (label === 'Take a smaller step')
    return { color: '#854F0B', bg: '#FAEEDA', borderColor: 'rgba(133,79,11,0.20)', badge: 'NOT READY' };
  if (label === 'Proceed with caution')
    return { color: '#5C4B00', bg: '#FBF5DC', borderColor: 'rgba(92,75,0,0.20)', badge: 'CONDITIONAL' };
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
  const textWeight = variant === 'threat' ? 500 : variant === 'condition' ? 500 : 500;
  const textColor = variant === 'directive' ? '#111' : '#111';
  const textFamily = sans;
  const textStyle = 'normal' as const;

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
                <span style={{ paddingLeft: isNumbered ? 2 : 0 }}>
                  {(() => {
                    // Split at first period/exclamation/question that ends a sentence
                    const boldEnd = line.search(/(?<=[^A-Z][.!?])\s/);
                    if (boldEnd > 0 && boldEnd < 120) {
                      const boldPart = line.slice(0, boldEnd + 1);
                      const restPart = line.slice(boldEnd + 1).trim();
                      return (
                        <>
                          <strong style={{ fontWeight: 600, color: 'rgba(0,0,0,0.80)' }}>{renderMarkdownLine(boldPart)}</strong>
                          {restPart && <span style={{ fontWeight: 400 }}>{' '}{renderMarkdownLine(restPart)}</span>}
                        </>
                      );
                    }
                    return renderMarkdownLine(line);
                  })()}
                </span>
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
  const [showThinContextWarning, setShowThinContextWarning] = useState(false);
  const [doorStep, setDoorStep] = useState(-1);

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
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  const [deepLoading, setDeepLoading] = useState(false);
  const [deepReview, setDeepReview] = useState<string | null>(null);
  const [deepError, setDeepError] = useState<string | null>(null);

  const [finalThoughts, setFinalThoughts] = useState('');
  const [verdictRequested, setVerdictRequested] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [commitment, setCommitment] = useState('');
  const [savingVerdict, setSavingVerdict] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [revealStage, setRevealStage] = useState(0);
  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([]);
  // Separate state for unlock flow - completely independent from analysis
  const [unlockInProgress, setUnlockInProgress] = useState(false);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState<string | null>(null);
  const [unlockEmail, setUnlockEmail] = useState('');

  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState<string>(() => crypto.randomUUID());
  const [openBreakdownSections, setOpenBreakdownSections] = useState<Record<string, boolean>>({});

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const decisionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const contextInputRef = useRef<HTMLTextAreaElement | null>(null);
  const contextDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const verdictRef = useRef<HTMLDivElement | null>(null);
  const teamPreviewRef = useRef<HTMLDivElement | null>(null);
  const isSavingRef = useRef(false);

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
        decision: '', // Always save empty string to keep form clear on refresh
        context: '', // Always save empty string to keep form clear on refresh
        reviewResult: payload?.reviewResult ?? reviewResult,
        deepReview: payload?.deepReview ?? deepReview,
        finalThoughts: payload?.finalThoughts ?? finalThoughts,
        verdictRequested: payload?.verdictRequested ?? verdictRequested,
        verdict: payload?.verdict ?? verdict,
        revealStage: payload?.revealStage ?? revealStage,
        reflectionPrompts: payload?.reflectionPrompts ?? reflectionPrompts,
        requestKey: payload?.requestKey ?? requestKey,
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

    // Payment verification and unlock check
    const verifyAndCheckUnlock = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      // Verify payment if session_id present
      if (sessionId) {
        setVerifyingPayment(true);
        try {
          const res = await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          const data = await res.json();

          if (res.ok && data.verified) {
            console.log('[Verification] Payment verified successfully');

            // If we got a decisionId from the verification, add it to the URL
            if (data.decisionId) {
              console.log('[Verification] Got decisionId from payment:', data.decisionId);
              window.history.replaceState({}, '', `${window.location.pathname}?decision_id=${data.decisionId}`);
            } else {
              // Remove session_id from URL
              window.history.replaceState({}, '', window.location.pathname);
            }

            // Restore decision data from localStorage (excluding form inputs)
            try {
              const raw = localStorage.getItem(STORAGE.pendingSoloReview);
              if (raw) {
                const saved = JSON.parse(raw) as PendingSoloReview;
                // Always clear form inputs
                setDecision('');
                setContext('');

                // But restore analysis results and paywall state
                setReviewResult(saved.reviewResult ?? null);
                setDeepReview(saved.deepReview ?? null);
                setFinalThoughts(saved.finalThoughts ?? '');
                setVerdictRequested(Boolean(saved.verdictRequested));
                setVerdict(saved.verdict ?? null);
                setRevealStage(saved.revealStage ?? 0);
                setReflectionPrompts(saved.reflectionPrompts ?? []);
                if (saved.requestKey) setRequestKey(saved.requestKey);
                setHasStarted(true);
              } else {
                console.warn('[Verification] No decision data found in localStorage');
                alert('Decision data not found. Please return to the analysis page and try again.');
              }
            } catch (err) {
              console.error('[Verification] Failed to restore decision data:', err);
            }

            // Show signup prompt if no account exists
            if (!data.hasAccount && data.email) {
              setPaymentEmail(data.email);
              setShowSignupPrompt(true);
            }

            setIsUnlocked(true);

            // Store payment verification flag for future page loads
            localStorage.setItem('payment_verified', 'true');

            // Scroll to unlocked content
            setTimeout(() => {
              snapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          } else {
            console.error('[Verification] Payment verification failed');
          }
        } catch (err) {
          console.error('[Verification] Error verifying payment:', err);
        } finally {
          setVerifyingPayment(false);
        }

        // Skip Supabase check after payment verification
        return;
      } else {
        console.log('[Verification] No session_id in URL, skipping payment verification');
      }

      // Check unlock status from localStorage first
      const paymentVerified = localStorage.getItem('payment_verified');
      if (paymentVerified === 'true') {
        console.log('[Verification] Payment verified from localStorage');
        setIsUnlocked(true);
        return;
      }

      // Check unlock status from Supabase
      const pathParts = window.location.pathname.split('/');
      const decId = pathParts[pathParts.length - 1];
      console.log('[Verification] Checking Supabase unlock status for decId:', decId);
      if (!decId || decId === 'decision') return;

      // Check by decision_id only (no user filter for anonymous payments)
      const { data } = await supabase
        .from('decision_payments')
        .select('id')
        .eq('decision_id', decId)
        .single();

      console.log('[Verification] Supabase payment check result:', !!data);
      setIsUnlocked(!!data);
    };

    verifyAndCheckUnlock();
  }, []);

  // Auto-generate verdict when unlocked
  useEffect(() => {
    if (unlockInProgress) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) return;

    if (isUnlocked && !verdict && !verdictLoading && reviewResult) {
      handleGenerateVerdict();
    }
  }, [isUnlocked, verdict, verdictLoading, reviewResult]);

  useEffect(() => {
    const hydratePendingSoloReview = () => {
      try {
        const raw = localStorage.getItem(STORAGE.pendingSoloReview);
        if (!raw) return;

        const saved = JSON.parse(raw) as PendingSoloReview;

        // Always clear form inputs on page load
        setDecision('');
        setContext('');

        // But restore analysis results and paywall state
        setReviewResult(saved.reviewResult ?? null);
        setDeepReview(saved.deepReview ?? null);
        setFinalThoughts(saved.finalThoughts ?? '');
        setVerdictRequested(Boolean(saved.verdictRequested));
        setVerdict(saved.verdict ?? null);
        setRevealStage(saved.revealStage ?? 0);
        setReflectionPrompts(saved.reflectionPrompts ?? []);
        if (saved.requestKey) setRequestKey(saved.requestKey);
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

          // Always clear form inputs
          setDecision('');
          setContext('');

          // But restore analysis results and paywall state
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
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        const raw = localStorage.getItem(STORAGE.pendingSoloReview);
        if (!raw) return;

        const saved = JSON.parse(raw) as PendingSoloReview;
        if (!saved.reviewResult || !saved.verdict) return;

        // Restore all UI state so the page shows the review correctly
        // Always clear form inputs
        setDecision('');
        setContext('');

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
            lock: saved.reviewResult?.snapshot?.lock ?? null,
            trap: saved.reviewResult?.snapshot?.trap ?? null,
            exit: saved.reviewResult?.snapshot?.exit ?? null,
            step: saved.reviewResult?.snapshot?.step ?? null,
            script: saved.reviewResult?.snapshot?.script ?? null,
            tripwire: saved.reviewResult?.snapshot?.tripwire ?? null,
            failure_modes: saved.reviewResult?.snapshot?.failure_modes ?? null,
            if_delayed: saved.reviewResult?.snapshot?.if_delayed ?? null,
            what_others_miss: saved.reviewResult?.snapshot?.what_others_miss ?? null,
            deep_review: saved.deepReview ?? null,
            final_thoughts: saved.finalThoughts ?? null,
            outcome_status: 'awaiting_outcome',
            userId,
            requestKey: saved.requestKey ?? null,
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
      } finally {
        isSavingRef.current = false;
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
    console.log('[DEBUG] User state changed:', { user, userId: user?.id });
  }, [user]);

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % 4);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [loading]);

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
    // Skip if returning from Stripe payment
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      console.log('[beginReview] Skipping - session_id detected, user returning from payment');
      return;
    }

    // Skip if unlock is in progress
    if (unlockInProgress) {
      console.log('[beginReview] Blocked - unlock in progress');
      return;
    }

    const err = validateDecision();
    if (err) {
      setDecisionError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (context.trim().length < 50) {
      setShowThinContextWarning(true);
      setTimeout(() => setShowThinContextWarning(false), 1500);
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
    isSavingRef.current = false;
    const newRequestKey = crypto.randomUUID();
    setRequestKey(newRequestKey);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, context }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Stream failed');
      }

      // Read the stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }

      if (!content.trim()) {
        throw new Error('No content returned from Claude.');
      }

      // Extract JSON from response (moved from backend)
      const extractJsonObject = (text: string): string => {
        let jsonText = text.trim();

        if (jsonText.includes('```')) {
          jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = jsonText.slice(firstBrace, lastBrace + 1);
        }

        return jsonText;
      };

      const jsonText = extractJsonObject(content);
      let parsed: any;

      try {
        parsed = JSON.parse(jsonText);
      } catch {
        console.error('[review] Claude raw output:', content);
        throw new Error('Claude returned invalid JSON.');
      }

      // Log raw scores for debugging
      console.log('[review] Raw readiness scores from Claude:', parsed?.readiness);

      // Validation helpers (moved from backend)
      const allowedPatternTypes = new Set<string>([
        'Reversible experiment',
        'Capital allocation',
        'Identity / career move',
        'Strategic lock-in',
        'Irreversible commitment',
      ]);

      let hadInvalidScores = false;

      const clampScore = (value: unknown, fieldName: string): number => {
        if (!Number.isInteger(value)) {
          console.warn(`[review] Invalid score for ${fieldName}:`, value, '(defaulting to 0)');
          hadInvalidScores = true;
          return 0;
        }
        return Math.max(0, Math.min(20, value as number));
      };

      const asString = (value: unknown, fallback: string = ''): string => {
        return typeof value === 'string' ? value : fallback;
      };

      const asStringArray = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return value.filter((item) => typeof item === 'string');
        }
        return [];
      };

      const asReversibility = (value: unknown): 'low' | 'medium' | 'high' => {
        return value === 'low' || value === 'medium' || value === 'high'
          ? value
          : 'medium';
      };

      // Build safe result (moved from backend)
      type LabelType = 'Needs more before you commit' | 'Take a smaller step' | 'Proceed with caution' | 'Strong to commit';

      const safeResult: ReviewResult = {
        pattern: {
          type: allowedPatternTypes.has(parsed?.pattern?.type)
            ? parsed.pattern.type
            : 'Reversible experiment',
          rationale: asString(parsed?.pattern?.rationale),
          reversibility: asReversibility(parsed?.pattern?.reversibility),
        },
        readiness: {
          clarity: clampScore(parsed?.readiness?.clarity, 'clarity'),
          assumptions: clampScore(parsed?.readiness?.assumptions, 'assumptions'),
          reversibility: clampScore(parsed?.readiness?.reversibility, 'reversibility'),
          risk: clampScore(parsed?.readiness?.risk, 'risk'),
          exitLogic: clampScore(parsed?.readiness?.exitLogic, 'exitLogic'),
          total: 0,
          label: 'Take a smaller step' as LabelType,
          summary: asString(
            parsed?.readiness?.summary,
            'The main constraint is not strong enough yet.'
          ),
          rationale: {
            clarity: asString(parsed?.readiness?.rationale?.clarity, ''),
            assumptions: asString(parsed?.readiness?.rationale?.assumptions, ''),
            reversibility: asString(parsed?.readiness?.rationale?.reversibility, ''),
            risk: asString(parsed?.readiness?.rationale?.risk, ''),
            exitLogic: asString(parsed?.readiness?.rationale?.exitLogic, ''),
          },
        },
        topline: {
          primaryRisk: asString(
            parsed?.topline?.primaryRisk,
            'The main failure risk is still unresolved.'
          ),
          mustBeTrue: asString(
            parsed?.topline?.mustBeTrue,
            'A key condition must be proven before committing.'
          ),
          recommendedMove: asString(
            parsed?.topline?.recommendedMove,
            'Take one smaller step that tests the main assumption first.'
          ),
        },
        snapshot: {
          door: asString(parsed?.snapshot?.door),
          hinge: asString(parsed?.snapshot?.hinge),
          lock: asString(parsed?.snapshot?.lock),
          trap: asString(parsed?.snapshot?.trap),
          exit: asString(parsed?.snapshot?.exit),
          step: asString(parsed?.snapshot?.step),
          script: asString(parsed?.snapshot?.script),
          tripwire: asString(parsed?.snapshot?.walk_away_if),
          failure_modes: asStringArray(parsed?.snapshot?.failure_modes),
          if_delayed: asString(parsed?.snapshot?.if_delayed),
          what_others_miss: asString(parsed?.snapshot?.what_others_miss),
        },
      };

      const calculatedTotal =
        safeResult.readiness.clarity +
        safeResult.readiness.assumptions +
        safeResult.readiness.reversibility +
        safeResult.readiness.risk +
        safeResult.readiness.exitLogic;

      safeResult.readiness.total = calculatedTotal;

      // Error boundary: detect if all scores are 0 (likely parsing/API failure)
      if (calculatedTotal === 0 && hadInvalidScores) {
        console.error('[review] SCORING ERROR: All readiness scores are 0/invalid');
        console.error('[review] Raw parsed object:', parsed);
        throw new Error('Scoring failed - Claude returned invalid or missing scores. Check console for details.');
      }

      if (calculatedTotal < 50) {
        safeResult.readiness.label = 'Needs more before you commit';
      } else if (calculatedTotal < 65) {
        safeResult.readiness.label = 'Take a smaller step';
      } else if (calculatedTotal < 80) {
        safeResult.readiness.label = 'Proceed with caution';
      } else {
        safeResult.readiness.label = 'Strong to commit';
      }

      const data = safeResult;

      setReviewResult(data);

      // Persist to localStorage immediately BEFORE any async operations
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
        requestKey: newRequestKey,
      });
      console.log('[Save] Decision data saved to localStorage');

      // Save immediately and capture decision ID for checkout
      const saveDecision = async () => {
        try {
          console.log('[Save] Saving decision to Supabase...');
          const res = await fetch('/api/decision/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision,
              context,
              score: data.readiness?.total ?? null,
              clarity: data.readiness?.clarity ?? null,
              assumptions: data.readiness?.assumptions ?? null,
              reversibility: data.readiness?.reversibility ?? null,
              risk: data.readiness?.risk ?? null,
              exitLogic: data.readiness?.exitLogic ?? null,
              door: data.snapshot?.door ?? null,
              hinge: data.snapshot?.hinge ?? null,
              lock: data.snapshot?.lock ?? null,
              trap: data.snapshot?.trap ?? null,
              exit: data.snapshot?.exit ?? null,
              step: data.snapshot?.step ?? null,
              script: data.snapshot?.script ?? null,
              tripwire: data.snapshot?.tripwire ?? null,
              failure_modes: data.snapshot?.failure_modes ?? null,
              if_delayed: data.snapshot?.if_delayed ?? null,
              what_others_miss: data.snapshot?.what_others_miss ?? null,
              verdict: null,
              deep_review: null,
              final_thoughts: null,
              userId: user?.id ?? null,
              requestKey: newRequestKey,
            }),
          });

          if (res.ok) {
            const saveData = await res.json();
            if (saveData?.id) {
              console.log('[Save] Decision saved with ID:', saveData.id);
              setDecisionId(saveData.id);
            } else {
              console.warn('[Save] No ID returned from save');
            }
          } else {
            console.error('[Save] Save request failed with status:', res.status);
          }
        } catch (err) {
          console.error('Failed to save decision:', err);
          // Non-blocking - user can still unlock even if save fails
        }
      };

      // Don't await - let it run in background, but localStorage is already saved
      saveDecision().catch(console.error);

      const iso = new Date().toISOString();
      setLastUsedAt(iso);

      try {
        localStorage.setItem(STORAGE.lastUsed, iso);
      } catch {
        // ignore
      }
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
    setDeepError(null);

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
      setDeepError(err?.message || 'Failed to load. Tap to retry.');
      setDeepReview(null);
    } finally {
      setDeepLoading(false);
    }
  };

  const handleUnlock = async () => {
    setUnlockInProgress(true);

    if (!decisionId) {
      console.warn('[Unlock] Decision ID not available, using requestKey');
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId: decisionId || requestKey
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('[Unlock] No checkout URL returned');
        setUnlockInProgress(false);
        alert('Failed to create checkout session.');
      }
    } catch (err) {
      console.error('[Unlock] Checkout failed:', err);
      setUnlockInProgress(false);
      alert('Checkout failed. Please try again.');
    }
  };

  const handleGenerateVerdict = async () => {
    if (verdictLoading) return;

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
    if (!reviewResult || !verdict || savingVerdict || isSavingRef.current || decisionId) return;
    isSavingRef.current = true;

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
      isSavingRef.current = false;
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
          rationale_clarity: reviewResult?.readiness?.rationale?.clarity ?? null,
          rationale_assumptions: reviewResult?.readiness?.rationale?.assumptions ?? null,
          rationale_reversibility: reviewResult?.readiness?.rationale?.reversibility ?? null,
          rationale_risk: reviewResult?.readiness?.rationale?.risk ?? null,
          rationale_exit_logic: reviewResult?.readiness?.rationale?.exitLogic ?? null,
          verdict,
          door: reviewResult?.snapshot?.door ?? null,
          hinge: reviewResult?.snapshot?.hinge ?? null,
          lock: reviewResult?.snapshot?.lock ?? null,
          trap: reviewResult?.snapshot?.trap ?? null,
          exit: reviewResult?.snapshot?.exit ?? null,
          step: reviewResult?.snapshot?.step ?? null,
          script: reviewResult?.snapshot?.script ?? null,
          tripwire: reviewResult?.snapshot?.tripwire ?? null,
          failure_modes: reviewResult?.snapshot?.failure_modes ?? null,
          if_delayed: reviewResult?.snapshot?.if_delayed ?? null,
          what_others_miss: reviewResult?.snapshot?.what_others_miss ?? null,
          deep_review: deepReview ?? null,
          final_thoughts: finalThoughts ?? null,
          commitment: commitment.trim() || null,
          outcome_status: 'awaiting_outcome',
          userId: user.id,
          requestKey,
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
      isSavingRef.current = false;
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
    reviewResult?.readiness?.label === 'Needs more before you commit'
      ? 'Do not commit'
      : reviewResult?.readiness?.label === 'Take a smaller step'
        ? 'Take a smaller step'
        : reviewResult?.readiness?.label === 'Proceed with caution'
          ? 'Proceed with caution'
          : 'Proceed';

  const meta = getScoreMeta(reviewResult?.readiness?.label);

  const lastUsedLabel = formatShort(lastUsedAt);
  const visibleDeepReview = cleanDeepReview(deepReview);
  const deepReviewSections = parseDeepReviewSections(visibleDeepReview);

  const stripMarkdownBold = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');

  const parseVerdict = (text: string | null) => {
    if (!text) return { ruling: '', whenThisChanges: '' };
    const parts = text.split('WHEN_THIS_CHANGES:');
    const rulingText = parts[0].trim();
    let whenThisChanges = '';
    if (parts[1]) {
      const lines = parts[1].trim().split('\n');
      whenThisChanges = lines[0].trim();
    }
    return { ruling: rulingText, whenThisChanges: whenThisChanges };
  };

  const { ruling, whenThisChanges } = parseVerdict(verdict);
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
              Every decision has a blind spot. Find it before you commit.
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
                    Decision Layer is built for decisions with real consequences. If you&apos;re deciding where to eat, this isn&apos;t for you.
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

                  <details ref={contextDetailsRef} style={detailStyle} open>
                    <summary style={summaryStyle}>{optionalDetailsLabel}</summary>
                    <div style={{ paddingTop: 12 }}>
                      <textarea
                        ref={contextInputRef}
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        rows={4}
                        placeholder={contextPlaceholder}
                        style={{ ...inputStyle, minHeight: 112, resize: 'vertical' }}
                      />
                      {context.length > 0 && context.length <= 50 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(0,0,0,0.38)' }}>
                          Vague context = vague verdict. Add what&apos;s actually at stake.
                        </div>
                      )}
                      {context.length > 50 && context.length <= 150 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(0,0,0,0.38)' }}>
                          Getting there. Add a number, a deadline, or who else is affected.
                        </div>
                      )}
                      {context.length > 150 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(0,0,0,0.38)' }}>
                          This is enough to work with.
                        </div>
                      )}
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

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
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
                    {showThinContextWarning && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.42)' }}>
                        Your verdict will be sharper with more context — but running anyway.
                      </div>
                    )}
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
                  <div style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.55,
                    opacity: 0.68,
                    transition: 'opacity 0.5s ease-in-out'
                  }}>
                    {loadingMessageIndex === 0 && 'Structuring the decision, testing the main assumption, and checking whether this looks ready to commit.'}
                    {loadingMessageIndex === 1 && 'Stress-testing the irreversibility and sizing the downside.'}
                    {loadingMessageIndex === 2 && 'Identifying the trap — the thing most people miss before they commit.'}
                    {loadingMessageIndex === 3 && 'Finalizing the verdict.'}
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
                      borderRadius: 16,
                      background: '#fff',
                      padding: '2.5rem 2.5rem 0',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
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

                    {/* Score card + verdict headline */}
                    <div style={{ marginBottom: '0' }}>

                      {/* Verdict block — the finding, stated plainly */}
                      <div
                        style={{
                          marginBottom: '2rem',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'rgba(0,0,0,0.36)',
                            marginBottom: '0.85rem',
                          }}
                        >
                          The verdict
                        </div>
                        <div
                          style={{
                            fontFamily: sans,
                            fontSize: 18,
                            fontWeight: 400,
                            lineHeight: 1.55,
                            color: '#0b0b0b',
                            marginBottom: '0.85rem',
                          }}
                        >
                          {reviewResult.topline.recommendedMove}
                        </div>
                        {reviewResult?.readiness?.summary && (
                          <div
                            style={{
                              fontFamily: sans,
                              fontSize: 13.5,
                              lineHeight: 1.65,
                              color: 'rgba(0,0,0,0.55)',
                              fontWeight: 400,
                            }}
                          >
                            {reviewResult.readiness.summary}
                          </div>
                        )}
                      </div>

                      {/* Pre-commit Score Card */}
                      <div
                        style={{
                          background: 'var(--color-background-primary)',
                          borderRadius: 16,
                          padding: '24px',
                          marginBottom: 0,
                        }}
                      >
                        {/* Header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '2rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: '#888780',
                              whiteSpace: 'nowrap',
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
                        <div style={{ marginBottom: '2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                            <span
                              style={{
                                fontSize: 'clamp(2.25rem, 8vw, 44px)',
                                fontWeight: 600,
                                color: meta.color,
                                lineHeight: 1,
                                opacity: 0.82,
                              }}
                            >
                              {scoreTotal ?? '—'}
                            </span>
                            <span
                              style={{
                                fontSize: 'clamp(1.5rem, 4vw, 28px)',
                                color: '#888780',
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
                              color: 'var(--color-text-secondary)',
                              marginTop: '0.6rem',
                            }}
                          >
                            Pre-commit score
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* The threat — separate standalone card */}
                  <div
                    id="threat-card"
                    className="card-padding"
                    style={{
                      marginTop: '2rem',
                      marginBottom: '2rem',
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid #A32D2D',
                      borderRadius: 'var(--border-radius-lg)',
                    }}
                  >
                    <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#A32D2D', marginBottom: 10 }}>THE THREAT</div>
                    <div style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-primary)', fontWeight: 500 }}>{reviewResult.topline.primaryRisk}</div>
                  </div>

                  {/* ── LAST CHECKPOINT / PAYWALL ── show only when locked */}
                  {/* CRITICAL: Only show if NOT unlocked - isUnlocked is the single source of truth */}
                  {!isUnlocked && reviewResult && (
                  <div
                    className="card-padding-compact"
                    style={{
                      marginTop: 12,
                      background: '#0E0C0A',
                      borderRadius: 'var(--border-radius-lg)',
                    }}
                  >
                      <div style={{ padding: '2.5rem 0 3rem' }}>
                        {/* Commit gate */}
                        <div
                          style={{
                            marginTop: '0',
                            paddingTop: '0',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: sans,
                              fontSize: 26,
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              color: '#F1EFE8',
                              marginBottom: '1.5rem',
                              lineHeight: 1.2,
                            }}
                          >
                            Don&apos;t guess.
                          </div>
                          <div
                            style={{
                              fontFamily: sans,
                              fontSize: 15,
                              fontWeight: 400,
                              color: '#D3D1C7',
                              marginBottom: '2rem',
                              lineHeight: 1.6,
                            }}
                          >
                            Not advice. Not a template. Not someone else&apos;s playbook. The exact move, the precise condition, and the single assumption that determines whether this decision works or becomes your most expensive lesson.
                          </div>
                          <button
                            type="button"
                            onClick={handleUnlock}
                            disabled={unlockInProgress || verifyingPayment}
                            style={{
                              width: '100%',
                              fontFamily: sans,
                              fontSize: 14,
                              fontWeight: 600,
                              background: '#F1EFE8',
                              color: '#1E1C1A',
                              border: 'none',
                              padding: '18px 24px',
                              borderRadius: 8,
                              cursor: (unlockInProgress || verifyingPayment) ? 'default' : 'pointer',
                              opacity: (unlockInProgress || verifyingPayment) ? 0.42 : 1,
                              transition: 'opacity 0.15s ease',
                            }}
                          >
                            {/* CRITICAL: Never show analysis loading states here */}
                            {unlockInProgress ? 'Redirecting to checkout...' : verifyingPayment ? 'Verifying payment...' : 'UNLOCK THIS DECISION → $99'}
                          </button>
                          <div
                            style={{
                              height: '1px',
                              background: 'rgba(255,255,255,0.15)',
                              margin: '1.5rem 0',
                            }}
                          />
                          <div
                            style={{
                              fontFamily: sans,
                              fontSize: 12,
                              fontStyle: 'italic',
                              color: '#888780',
                              textAlign: 'center',
                              lineHeight: 1.5,
                            }}
                          >
                            If this isn&apos;t more specific than anything else you&apos;ve tried, we&apos;ll refund every dollar. No questions asked.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isUnlocked && (
                  <div
                    style={{
                      border: '1px solid rgba(0,0,0,0.10)',
                      borderRadius: 16,
                      background: '#fff',
                      padding: '2.5rem 2.5rem 2.5rem',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                      marginTop: '2rem',
                    }}
                  >
                    {/* Door walkthrough intro */}
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                          <div style={{
                            fontFamily: sans,
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            marginBottom: 8,
                          }}>
                            Your decision has 5 layers.
                          </div>
                          <div style={{
                            fontFamily: sans,
                            fontSize: 12,
                            color: '#9A9890',
                            lineHeight: 1.4,
                          }}>
                            Door · Hinge · Lock · Exit · Trap — tap to walk through each one.
                          </div>
                        </div>

                        {/* Decision Door visualization */}
                        <div className="door-container-mobile-full-width" style={{ marginTop: '1rem' }}>
                          <DecisionDoor
                            reviewResult={reviewResult}
                            onStepChange={setDoorStep}
                            decisionText={decision}
                            verdictLine={(() => {
                              if (!verdict) return '';
                              const rulingPart = verdict.split('WHEN_THIS_CHANGES:')[0].trim();
                              const firstSentence = rulingPart.split(/\.\s+/)[0] + '.';
                              return firstSentence.length <= 80
                                ? firstSentence
                                : firstSentence.substring(0, 80).substring(0, firstSentence.substring(0, 80).lastIndexOf(' ')) + '...';
                            })()}
                            hingeScore={reviewResult.readiness?.assumptions || 0}
                          />
                        </div>

                      </div>
                  )}

                  {/* ── STEP ── appears after walkthrough is complete */}
                  {isUnlocked && (
                    <div
                      id="step-card"
                      className="card-padding"
                      style={{
                        marginTop: 12,
                        marginBottom: 12,
                        background: 'var(--color-background-primary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 'var(--border-radius-lg)',
                      }}
                    >
                      <div style={{ fontFamily: sans, marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--color-text-tertiary)' }}>STEP</span>
                        <span style={{ marginLeft: 8, background: '#0F6E56', color: '#9FE1CB', fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>NEXT MOVE</span>
                      </div>
                      <div style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-primary)', fontWeight: 500 }}>{reviewResult.snapshot.step}</div>
                    </div>
                  )}

                  {/* ── HOW TO STRENGTHEN ── appears after walkthrough is complete */}
                  {isUnlocked && (
                    <details className="card-padding-compact" style={{ marginTop: 12, marginBottom: 12, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)' }}>
                      <summary style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--color-text-primary)', cursor: 'pointer', userSelect: 'none', padding: '4px 0' }}>
                        How to strengthen this decision
                      </summary>
                      <div style={{ marginTop: 16, fontFamily: sans }}>
                        {(() => {
                          const items = Object.entries({
                            clarity: { label: 'Clarity', score: reviewResult.readiness.clarity, rationale: reviewResult.readiness.rationale?.clarity },
                            assumptions: { label: 'Assumptions', score: reviewResult.readiness.assumptions, rationale: reviewResult.readiness.rationale?.assumptions },
                            reversibility: { label: 'Reversibility', score: reviewResult.readiness.reversibility, rationale: reviewResult.readiness.rationale?.reversibility },
                            risk: { label: 'Risk', score: reviewResult.readiness.risk, rationale: reviewResult.readiness.rationale?.risk },
                            exitLogic: { label: 'Exit Logic', score: reviewResult.readiness.exitLogic, rationale: reviewResult.readiness.rationale?.exitLogic },
                          });

                          const lowestThree = items
                            .sort(([, a], [, b]) => a.score - b.score)
                            .slice(0, 3);

                          return lowestThree.map(([key, { label, score, rationale }], index) => {
                            // Extract first sentence from rationale
                            const firstSentence = rationale?.split(/\.\s+/)[0] + '.' || '';
                            const scoreColor = score <= 10 ? '#C0392B' : score <= 14 ? '#C8860A' : '#27500A';

                            return (
                              <div
                                key={key}
                                style={{
                                  paddingBottom: index < 2 ? 12 : 0,
                                  marginBottom: index < 2 ? 12 : 0,
                                  borderBottom: index < 2 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                                <span style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}> · </span>
                                <span style={{ color: scoreColor, fontWeight: 500 }}>{score}/20</span>
                                <span style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}> — </span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{firstSentence}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </details>
                  )}

                  {/* ── Final verdict card ── */}
                  {isUnlocked && (
                    <div
                      ref={verdictRef}
                      className="verdict-section-padding"
                      style={{
                        marginTop: 14,
                        border: '1px solid rgba(0,0,0,0.10)',
                        borderRadius: 16,
                        background: '#fff',
                      }}
                    >
                      {verdictLoading ? (
                        <div style={{ fontFamily: sans, fontSize: 13.5, opacity: 0.55 }}>
                          Generating final verdict...
                        </div>
                      ) : (
                        <>
                          {/* 1. FINAL VERDICT card */}
                          <div
                            className="card-padding"
                            style={{
                              border: '1px solid rgba(0,0,0,0.10)',
                              borderRadius: 12,
                              background: '#111110',
                              marginBottom: 16,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.40)',
                                marginBottom: 12,
                              }}
                            >
                              Final Verdict
                            </div>
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 15,
                                fontWeight: 400,
                                lineHeight: 1.75,
                                color: '#fff',
                              }}
                              dangerouslySetInnerHTML={{
                                __html: ruling.replace(
                                  /(This decision is not ready to commit\.)/g,
                                  '<span style="color: #dc2626; font-size: 17px; font-weight: 500;">$1</span>'
                                ),
                              }}
                            />
                          </div>

                          {/* 2. WHEN THIS CHANGES card */}
                          {whenThisChanges && (
                            <div
                              className="card-padding"
                              style={{
                                border: '0.5px solid rgba(255,255,255,0.1)',
                                borderRadius: 12,
                                background: '#1A1A18',
                                marginBottom: 16,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  letterSpacing: '0.14em',
                                  textTransform: 'uppercase',
                                  color: '#888780',
                                  marginBottom: 12,
                                }}
                              >
                                When This Changes
                              </div>
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 14,
                                  fontWeight: 400,
                                  lineHeight: 1.6,
                                  color: '#F1EFE8',
                                }}
                              >
                                {whenThisChanges}
                              </div>
                            </div>
                          )}

                          {/* 3. Commitment card */}
                          <div
                            className="card-padding"
                            style={{
                              border: '1px solid #444441',
                              borderRadius: 12,
                              background: '#1A1A18',
                              marginBottom: 16,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: '#888780',
                                marginBottom: 8,
                              }}
                            >
                              What are you doing in the next 48 hours?
                            </div>
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 12,
                                color: '#9A9890',
                                fontStyle: 'italic',
                                marginBottom: 12,
                              }}
                            >
                              People who write down their next step are 3x more likely to follow through.
                            </div>
                            <textarea
                              value={commitment}
                              onChange={(e) => setCommitment(e.target.value)}
                              placeholder="This week I will specifically..."
                              rows={4}
                              style={{
                                width: '100%',
                                fontFamily: sans,
                                fontSize: 14,
                                lineHeight: 1.6,
                                padding: '12px 14px',
                                border: '1px solid #444441',
                                borderRadius: 8,
                                resize: 'vertical',
                                outline: 'none',
                                marginBottom: 8,
                                background: '#2A2A28',
                                color: '#FFFFFF',
                              }}
                            />
                            <div
                              style={{
                                fontFamily: sans,
                                fontSize: 11,
                                color: '#888780',
                                marginBottom: 16,
                              }}
                            >
                              {commitment.trim().length} characters
                            </div>
                            <button
                              type="button"
                              onClick={handleLockVerdict}
                              disabled={savingVerdict || commitment.trim().length === 0 || decisionId !== null}
                              style={{
                                fontFamily: sans,
                                fontSize: 13,
                                fontWeight: 500,
                                padding: '11px 18px',
                                borderRadius: 10,
                                border: 'none',
                                background: decisionId ? '#16a34a' : (Boolean(user) && commitment.trim().length > 0) ? '#16a34a' : commitment.trim().length === 0 ? '#2A2826' : '#0E0C0A',
                                color: decisionId ? '#fff' : commitment.trim().length === 0 ? '#888780' : '#FFFFFF',
                                cursor: (savingVerdict || commitment.trim().length === 0 || decisionId) ? 'not-allowed' : 'pointer',
                                width: '100%',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                              }}
                            >
                              {decisionId ? (
                                <>
                                  <span style={{ fontSize: 16 }}>✓</span>
                                  <span>Verdict locked</span>
                                </>
                              ) : savingVerdict ? (
                                'Saving...'
                              ) : (
                                'Lock this verdict'
                              )}
                            </button>
                            {signInEmailSent && (
                              <div
                                style={{
                                  marginTop: 12,
                                  borderRadius: 8,
                                  border: '1px solid #444441',
                                  background: '#2A2A28',
                                  padding: '10px 12px',
                                  color: '#FFFFFF',
                                  fontSize: 12,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                }}
                              >
                                <span>Check your inbox. If it&apos;s not there, check your junk or spam folder.</span>
                                <button
                                  onClick={() => setSignInEmailSent(false)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    fontSize: 16,
                                    padding: 0,
                                    lineHeight: 1,
                                    opacity: 0.6,
                                  }}
                                  aria-label="Dismiss"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                            {decisionId && (
                              <a
                                href={`/decision-summary?id=${decisionId}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginTop: 16,
                                  background: '#1A3A2A',
                                  borderRadius: 12,
                                  padding: '16px 20px',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  animation: 'fadeInUp 300ms ease-out forwards',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontFamily: sans,
                                      fontSize: 15,
                                      fontWeight: 700,
                                      color: '#ffffff',
                                      marginBottom: 4,
                                    }}
                                  >
                                    Your Decision Brief is ready.
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: sans,
                                      fontSize: 12,
                                      color: '#86EFAC',
                                    }}
                                  >
                                    View your full breakdown, next move, and what to say.
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontFamily: sans,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#0E0C0A',
                                    background: '#ffffff',
                                    padding: '8px 16px',
                                    borderRadius: 20,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Open Brief →
                                </div>
                              </a>
                            )}
                          </div>

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

        {/* Post-payment signup prompt */}
        {showSignupPrompt && paymentEmail && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '2rem',
                maxWidth: 480,
                margin: '0 20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ fontFamily: serif, fontSize: 24, marginBottom: 12 }}>
                Payment successful
              </div>
              <div style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: '#666', marginBottom: 20 }}>
                Create an account to save and access your unlocked decision anytime.
              </div>
              <input
                type="email"
                value={unlockEmail || paymentEmail}
                onChange={(e) => setUnlockEmail(e.target.value)}
                placeholder="Your email"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontFamily: sans,
                  fontSize: 14,
                  marginBottom: 12,
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={async () => {
                  const emailToUse = unlockEmail || paymentEmail;
                  const { error } = await supabase.auth.signInWithOtp({
                    email: emailToUse,
                    options: {
                      emailRedirectTo: window.location.href,
                    },
                  });
                  if (!error) {
                    alert(`Check ${emailToUse} for your sign-in link`);
                    setShowSignupPrompt(false);

                    // Wait for auth state change, then link decision
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                      if (event === 'SIGNED_IN' && session?.user && decisionId) {
                        try {
                          await fetch('/api/decision/link-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              decisionId,
                              userId: session.user.id
                            }),
                          });
                        } catch (err) {
                          console.error('Failed to link decision:', err);
                        }
                        subscription.unsubscribe();
                      }
                    });
                  }
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: '#0E0C0A',
                  color: '#fff',
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 8,
                }}
              >
                Create account
              </button>
              <button
                onClick={() => setShowSignupPrompt(false)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: '#666',
                  fontFamily: sans,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

