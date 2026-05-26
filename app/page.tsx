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

  // Private Verdict application form state
  const [applicationFormVisible, setApplicationFormVisible] = useState(false);
  const [applicationName, setApplicationName] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [applicationDecision, setApplicationDecision] = useState('');
  const [applicationTimeline, setApplicationTimeline] = useState('');
  const [applicationAgreed, setApplicationAgreed] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const [showCheckboxError, setShowCheckboxError] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState<string | null>(null);
  const [unlockEmail, setUnlockEmail] = useState('');

  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState<string>(() => crypto.randomUUID());
  const [openBreakdownSections, setOpenBreakdownSections] = useState<Record<string, boolean>>({});

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const decisionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const contextInputRef = useRef<HTMLTextAreaElement | null>(null);
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
        decision: payload?.decision ?? decision,
        context: payload?.context ?? context,
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
    // FIRST: Clear ALL data from localStorage on regular page loads
    // BUT skip if returning from payment (session_id in URL)
    const params = new URLSearchParams(window.location.search);
    const hasSessionId = params.get('session_id');

    if (!hasSessionId) {
      try {
        // Remove all decision data for a completely fresh start
        localStorage.removeItem(STORAGE.pendingSoloReview);
        localStorage.removeItem(STORAGE.pendingLockVerdict);
        localStorage.removeItem('payment_verified'); // Clear payment flag too
      } catch {
        // ignore
      }
    }

    setTimeout(() => {
      decisionInputRef.current?.focus();
    }, 50);

    // Payment verification and unlock check
    const verifyAndCheckUnlock = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      console.log('[Verification] verifyAndCheckUnlock called');
      console.log('[Verification] URL params:', {
        fullURL: window.location.href,
        search: window.location.search,
        hasSessionId: !!sessionId,
        sessionId: sessionId,
      });

      // Verify payment if session_id present
      if (sessionId) {
        console.log('[Verification] Session ID found, starting payment verification...');
        setVerifyingPayment(true);
        try {
          console.log('[Verification] Calling /api/checkout/verify with sessionId:', sessionId);
          const res = await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          const data = await res.json();

          console.log('[Verification] Verify response received:', {
            verified: data.verified,
            hasSession: !!data.session,
            sessionHasPassword: !!data.session?.password,
            sessionHasEmail: !!data.session?.email,
            email: data.session?.email,
            hasAccount: data.hasAccount,
          });

          if (res.ok && data.verified) {
            console.log('[Verification] Payment verified successfully');

            // Auto-sign-in user if credentials are provided
            if (data.session && data.session.password && data.session.email) {
              console.log('[Verification] Auto-signing in user with temporary credentials');

              try {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                  email: data.session.email,
                  password: data.session.password,
                });

                if (authError) {
                  console.error('[Verification] Failed to sign in:', authError);
                  console.error('[Verification] Sign-in error details:', {
                    message: authError.message,
                    status: authError.status,
                    name: authError.name,
                  });
                } else {
                  console.log('[Verification] User automatically signed in');
                  console.log('[Verification] Auth data:', {
                    hasUser: !!authData?.user,
                    userId: authData?.user?.id,
                    userEmail: authData?.user?.email,
                  });
                }
              } catch (authErr) {
                console.error('[Verification] Error signing in:', authErr);
              }
            } else {
              console.warn('[Verification] No session credentials provided for auto-sign-in');
              console.warn('[Verification] Session object:', data.session);
            }

            // If we got a decisionId from the verification, add it to the URL
            if (data.decisionId) {
              console.log('[Verification] Got decisionId from payment:', data.decisionId);
              window.history.replaceState({}, '', `${window.location.pathname}?decision_id=${data.decisionId}`);
            } else {
              // Remove session_id from URL
              window.history.replaceState({}, '', window.location.pathname);
            }

            // Restore decision data from localStorage (excluding form inputs)
            // Or load from database if localStorage is empty (private mode issue)
            try {
              const raw = localStorage.getItem(STORAGE.pendingSoloReview);
              if (raw) {
                const saved = JSON.parse(raw) as PendingSoloReview;
                // Restore everything including decision/context so user can see what they unlocked
                setDecision(saved.decision ?? '');
                setContext(saved.context ?? '');
                setReviewResult(saved.reviewResult ?? null);
                setDeepReview(saved.deepReview ?? null);
                setFinalThoughts(saved.finalThoughts ?? '');
                setVerdictRequested(Boolean(saved.verdictRequested));
                setVerdict(saved.verdict ?? null);
                setRevealStage(saved.revealStage ?? 0);
                setReflectionPrompts(saved.reflectionPrompts ?? []);
                if (saved.requestKey) setRequestKey(saved.requestKey);
                setHasStarted(true);
              } else if (data.decisionId) {
                // localStorage empty (private mode) - load from database
                console.log('[Verification] Loading from database, decisionId:', data.decisionId);
                const loadRes = await fetch(`/api/decision/load?id=${data.decisionId}`);
                if (loadRes.ok) {
                  const dbData = await loadRes.json();
                  // Restore decision/context so user can see what they unlocked
                  setDecision(dbData.decision ?? '');
                  setContext(dbData.context ?? '');
                  setReviewResult(dbData.reviewResult ?? null);
                  setDeepReview(dbData.deepReview ?? null);
                  setVerdict(dbData.verdict ?? null);
                  setHasStarted(true);
                  console.log('[Verification] Loaded from database successfully');
                } else {
                  console.warn('[Verification] Failed to load from database');
                  alert('Decision data not found. Please return to the analysis page and try again.');
                }
              } else {
                console.warn('[Verification] No decision data in localStorage or database');
                alert('Decision data not found. Please return to the analysis page and try again.');
              }
            } catch (err) {
              console.error('[Verification] Failed to restore decision data:', err);
            }

            // Show signup prompt only if session creation failed and no account exists
            if (!data.session && !data.hasAccount && data.email) {
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
        // Check if returning from payment
        const params = new URLSearchParams(window.location.search);
        const hasSessionId = params.get('session_id');

        // On regular page loads, restore draft from localStorage or clear for fresh start
        if (!hasSessionId) {
          // Try to restore draft
          try {
            const draftDecision = localStorage.getItem('dl_draft_decision');
            const draftContext = localStorage.getItem('dl_draft_context');

            if (draftDecision || draftContext) {
              setDecision(draftDecision || '');
              setContext(draftContext || '');
              console.log('[Draft] Restored draft from localStorage');
            } else {
              setDecision('');
              setContext('');
            }
          } catch {
            setDecision('');
            setContext('');
          }

          setReviewResult(null);
          setDeepReview(null);
          setFinalThoughts('');
          setVerdictRequested(false);
          setVerdict(null);
          setRevealStage(0);
          setReflectionPrompts([]);
          setHasStarted(false);
          return;
        }

        // Only restore data when returning from payment
        const raw = localStorage.getItem(STORAGE.pendingSoloReview);
        if (!raw) return;

        const saved = JSON.parse(raw) as PendingSoloReview;

        // Restore everything on payment return
        setDecision(saved.decision ?? '');
        setContext(saved.context ?? '');
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
        // Check if returning from payment
        const params = new URLSearchParams(window.location.search);
        const hasSessionId = params.get('session_id');

        // If returning from payment, restore from localStorage
        if (hasSessionId) {
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
          return;
        }

        // On regular page loads, do nothing here - restore logic moved to separate useEffect
        // that watches user state (see below)
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
            commitment: null, // null means unlocked/not committed
            outcome_status: 'awaiting_outcome',
            userId,
            requestKey: saved.requestKey ?? null,
          }),
        });

        if (saveRes.ok) {
          // DO NOT set decisionId - only set when user actually locks the verdict
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

  // ─── Restore unlocked verdict on page load ────────────────────────────────────
  // Runs after user authentication is confirmed
  useEffect(() => {
    // Skip if user not authenticated
    if (!user?.id) return;

    // Skip if returning from payment (handled by onAuthStateChange)
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) return;

    // Skip if already has verdict loaded
    if (verdict || reviewResult) {
      console.log('[Restore] Skipping - verdict already loaded');
      return;
    }

    console.log('[Restore] 🔍 User authenticated, checking for unlocked verdict');
    console.log('[Restore] User ID:', user.id);

    fetch(`/api/decision/load-recent?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        console.log('[Restore] 📦 Query result:', data);
        console.log('[Restore] Checking conditions:');
        console.log('[Restore]   - data exists?:', !!data);
        console.log('[Restore]   - data.id exists?:', !!data?.id);
        console.log('[Restore]   - data.verdict exists?:', !!data?.verdict);

        if (data && data.id && data.verdict) {
          console.log('[Restore] ✅ Found unlocked verdict, restoring...');
          console.log('[Restore] Decision ID:', data.id);
          console.log('[Restore] Decision:', data.decision?.slice(0, 50) + '...');

          // Restore full verdict state
          setDecisionId(data.id);
          setDecision(data.decision ?? '');
          setContext(data.context ?? '');
          setReviewResult(data.reviewResult);
          setDeepReview(data.deepReview ?? null);
          setFinalThoughts(data.finalThoughts ?? '');
          setVerdictRequested(true);
          setVerdict(data.verdict ?? null);
          setHasStarted(true);
          setRequestKey(data.requestKey ?? null);
          setSavedToast('✓ Your verdict is saved. Lock it below to commit to your next step.');
        } else {
          console.log('[Restore] ℹ️ No unlocked verdict found');
        }
      })
      .catch((err) => {
        console.error('[Restore] ⚠️ Error fetching recent decision:', err);
      });
  }, [user?.id]); // Re-run when user changes

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

      // Clear draft from localStorage since review is now complete
      try {
        localStorage.removeItem('dl_draft_decision');
        localStorage.removeItem('dl_draft_context');
        console.log('[Draft] Cleared draft from localStorage after review');
      } catch {
        // Ignore localStorage errors
      }

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

    try {
      // FIRST: Save decision to database so we can load it back after payment
      // (localStorage gets cleared in private mode when navigating to Stripe)
      let savedDecisionId = decisionId;

      if (!savedDecisionId && reviewResult) {
        console.log('[Unlock] Saving decision to database before checkout...');
        const saveRes = await fetch('/api/decision/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            context,
            review_result: reviewResult, // Save full review result for post-payment loading
            score: reviewResult.readiness?.total ?? null,
            clarity: reviewResult.readiness?.clarity ?? null,
            assumptions: reviewResult.readiness?.assumptions ?? null,
            reversibility: reviewResult.readiness?.reversibility ?? null,
            risk: reviewResult.readiness?.risk ?? null,
            exitLogic: reviewResult.readiness?.exitLogic ?? null,
            hinge: reviewResult.snapshot?.hinge ?? null,
            step: reviewResult.snapshot?.step ?? null,
            deepReview: deepReview ?? null,
            verdict: verdict ?? null,
          }),
        });

        if (saveRes.ok) {
          const saveData = await saveRes.json();
          if (saveData?.id) {
            savedDecisionId = saveData.id;
            setDecisionId(savedDecisionId);
            console.log('[Unlock] Decision saved with ID:', savedDecisionId);
          }
        }
      }

      // THEN: Create checkout session
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId: savedDecisionId || requestKey
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

      // Auto-save to database if user is authenticated and has paid
      if (user && isUnlocked && reviewResult) {
        console.log('[Auto-save] Saving paid verdict to database...');
        try {
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
              verdict: nextVerdict,
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
              commitment: null, // Not committed yet - null means unlocked
              outcome_status: 'awaiting_outcome',
              userId: user.id,
              requestKey,
            }),
          });

          const saveData = await saveRes.json();

          if (saveRes.ok && saveData?.id) {
            // DO NOT set decisionId here - that would make the lock button appear locked
            // decisionId should only be set when user actually locks/commits the verdict
            console.log('[Auto-save] ✅ Verdict saved successfully');
            console.log('[Auto-save] Decision ID:', saveData.id);
            console.log('[Auto-save] Verdict is saved but NOT locked - user can still lock it');
          } else {
            console.error('[Auto-save] ❌ Failed to save verdict:', saveData?.error);
          }
        } catch (saveErr) {
          console.error('[Auto-save] Error saving verdict:', saveErr);
          // Don't show error to user - this is background save
        }
      }
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
          review_result: reviewResult,
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
          commitment: commitment.trim() || null, // Having a commitment means locked/committed
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

  const handleApplyPrivately = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setApplicationFormVisible(true);
    // Smooth scroll to the form section
    setTimeout(() => {
      const formSection = document.getElementById('apply-form');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicationAgreed) {
      setShowCheckboxError(true);
      return;
    }

    setApplicationSubmitting(true);
    setShowCheckboxError(false);

    try {
      // Here you would typically send the application to your backend
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      setApplicationSubmitted(true);
    } catch (err) {
      console.error('Application submission failed:', err);
    } finally {
      setApplicationSubmitting(false);
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
    borderRadius: 6,
    border: '1.5px solid #e0e0dc',
    padding: '12px 13px',
    fontSize: 14,
    lineHeight: 1.55,
    background: '#f2f2ef',
    outline: 'none',
    fontFamily: sans,
    color: '#111',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, background 0.15s',
  };

  const detailStyle: React.CSSProperties = {
    border,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.55)',
    padding: '10px 12px',
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
    borderRadius: 100,
    border: 'none',
    padding: '13px 28px',
    background: '#111',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: sans,
    letterSpacing: '0.01em',
    width: '100%',
    marginTop: 4,
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

  const decisionPlaceholder = '';
  const contextPlaceholder = '';

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <link rel="stylesheet" href={FONT_URL} />
      <div style={{ minHeight: '100vh', background: '#f2f2ef', color: '#111', fontFamily: sans }}>
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 40px',
          position: 'sticky',
          top: 0,
          background: '#f2f2ef',
          zIndex: 100,
          borderBottom: '1px solid #e0e0dc',
        }}>
          <a href="/" style={{
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#111',
            textDecoration: 'none',
          }}>
            Decision Layer
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!authLoading && (
              <a
                href="/history"
                style={{
                  background: 'none',
                  border: '1.5px solid #c4c4c0',
                  color: '#111',
                  padding: '8px 18px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontFamily: sans,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Decision History
              </a>
            )}

            {authLoading ? null : user ? (
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontFamily: sans,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                style={{
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontFamily: sans,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </nav>

        <main style={{ padding: 0 }}>

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

          <style>{`
            @media (min-width: 901px) {
              .hero-grid-wrapper {
                max-width: 1200px;
                margin: 0 auto;
                padding: 64px 40px;
                display: grid;
                grid-template-columns: 1.1fr 0.9fr;
                gap: 80px;
                align-items: start;
              }
              .hero-section {
                max-width: none !important;
                margin: 0 !important;
                text-align: left !important;
                padding: 8px 0 0 0 !important;
              }
              .form-section {
                max-width: none !important;
                margin: 0 !important;
              }
            }
            @media (max-width: 900px) {
              .brief-preview-grid {
                grid-template-columns: 1fr !important;
              }
              .brief-preview-card {
                border-right: none !important;
                border-bottom: 1px solid #e0e0dc !important;
              }
              .brief-preview-card:last-of-type {
                border-bottom: none !important;
              }
              .pricing-grid {
                grid-template-columns: 1fr !important;
                gap: 16px !important;
              }
            }
            @media (max-width: 640px) {
              #apply-form {
                padding: 40px 16px !important;
              }
            }
          `}</style>

          <div className="hero-grid-wrapper">

          {/* ── Hero ── */}
          <section className="hero-section" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: 'clamp(32px, 6vw, 64px) 24px clamp(24px, 4vw, 40px)' }}>
            <div style={{
              fontFamily: sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#aaa',
              marginBottom: 28,
            }}>
              Decision Layer
            </div>

            <h1 style={{
              fontFamily: serif,
              fontSize: 'clamp(22px, 3vw, 36px)',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.45,
              letterSpacing: '-0.01em',
              color: '#111',
              marginBottom: 22,
            }}>
              You&apos;ve already thought about it.<br />
              You&apos;ve probably already asked AI.<br />
              <em style={{ fontStyle: 'normal', fontWeight: 700 }}>You&apos;re still not sure.</em>
            </h1>

            <p style={{
              fontFamily: sans,
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              color: '#333',
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: 28,
            }}>
              Make sense of everything <strong>before you commit.</strong>
            </p>

            {/* Social proof */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: sans,
              fontSize: 12.5,
              color: '#aaa',
              marginBottom: 28,
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#2d6a20',
                flexShrink: 0,
              }} />
              Built from years of observing high-stakes decisions
            </div>

            {/* Sample verdict link */}
            <a
              href="/sample-decision"
              style={{
                fontFamily: sans,
                fontSize: 13,
                color: '#6b6b6b',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              See a sample verdict →
            </a>
          </section>

          {/* ══════════════════════════════════════════════════════════════════════
              SOLO MODE
          ══════════════════════════════════════════════════════════════════════ */}
          {mode === 'solo' ? (
            <>
            <section className="form-section" style={{
              maxWidth: 720,
              margin: '20px auto 0',
              background: '#ffffff',
              border: '1.5px solid #e0e0dc',
              borderRadius: 10,
              padding: '32px 28px',
            }}>
              <div style={{
                marginBottom: 22,
                paddingBottom: 18,
                borderBottom: '1px solid #e0e0dc',
              }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  marginBottom: 5,
                }}>
                  What are you still deciding?
                </h2>
                <p style={{
                  fontFamily: sans,
                  fontSize: 13,
                  color: '#6b6b6b',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  Built for decisions with real consequences. Not for where to eat.
                </p>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.09em',
                    color: '#6b6b6b',
                    marginBottom: 7,
                  }}>
                    Your Decision
                  </label>
                    <textarea
                      ref={decisionInputRef}
                      value={decision}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDecision(value);
                        // Auto-save draft to localStorage
                        try {
                          localStorage.setItem('dl_draft_decision', value);
                        } catch (err) {
                          // Ignore localStorage errors (incognito mode, quota exceeded)
                        }
                      }}
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

                  <div>
                    <label style={{
                      display: 'block',
                      fontFamily: sans,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      color: '#6b6b6b',
                      marginBottom: 7,
                    }}>
                      Context
                    </label>
                    <textarea
                      ref={contextInputRef}
                      value={context}
                      onChange={(e) => {
                        const value = e.target.value;
                        setContext(value);
                        // Auto-save draft to localStorage
                        try {
                          localStorage.setItem('dl_draft_context', value);
                        } catch (err) {
                          // Ignore localStorage errors (incognito mode, quota exceeded)
                        }
                      }}
                      rows={4}
                      placeholder={contextPlaceholder}
                      style={{ ...inputStyle, minHeight: 124, resize: 'vertical' }}
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

                  <p style={{
                    fontFamily: serif,
                    fontSize: 'clamp(16px, 2vw, 19px)',
                    color: '#0E0C0A',
                    textAlign: 'center',
                    marginBottom: 16,
                    lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}>
                    A verdict on the decision you&apos;ve been sitting on for three months.
                  </p>

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

                  <p style={{
                    fontFamily: sans,
                    fontSize: 12,
                    color: '#aaa',
                    textAlign: 'center',
                    marginTop: 12,
                    lineHeight: 1.5,
                  }}>
                    See the first layer free. <strong>Unlock the full verdict for $99.</strong>
                  </p>

                  {showThinContextWarning && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.42)', textAlign: 'center' }}>
                      Your verdict will be sharper with more context — but running anyway.
                    </div>
                  )}
                </div>
            </section>

            {/* Loading placeholder */}
            {hasStarted && loading && !reviewResult && (
              <div style={{ maxWidth: 960, margin: '20px auto 0', padding: '0 24px', gridColumn: '1 / -1' }}>
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
              </div>
            )}

              {/* ── Results: two-zone layout ── */}
              {reviewResult && (
                <div style={{ maxWidth: 960, margin: '20px auto 0', padding: '0 24px', gridColumn: '1 / -1' }}>
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
                    <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#A32D2D', marginBottom: 10 }}>WHAT THIS DECISION IS MISSING</div>
                    <div style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-primary)', fontWeight: 500 }}>{reviewResult.topline.primaryRisk}</div>
                    <div style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.5, color: '#6B7280', marginTop: 12, fontStyle: 'italic' }}>
                      Your score reflects how ready this decision is to commit — not how good the idea is.
                    </div>
                  </div>

                  {/* Free layer preview - show Door layer unlocked */}
                  {!isUnlocked && reviewResult && (
                  <div
                    className="card-padding"
                    style={{
                      marginTop: '2rem',
                      marginBottom: '2rem',
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid rgba(0,0,0,0.1)',
                      borderRadius: 'var(--border-radius-lg)',
                    }}
                  >
                    <div style={{
                      fontFamily: sans,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#6B7280',
                      marginBottom: 16,
                    }}>
                      DECISION QUALITY BREAKDOWN
                    </div>

                    {(() => {
                      // Find the dimension with the lowest score
                      const dimensions = [
                        { name: 'Clarity', score: reviewResult.readiness.clarity, rationale: reviewResult.readiness.rationale?.clarity },
                        { name: 'Assumptions', score: reviewResult.readiness.assumptions, rationale: reviewResult.readiness.rationale?.assumptions },
                        { name: 'Reversibility', score: reviewResult.readiness.reversibility, rationale: reviewResult.readiness.rationale?.reversibility },
                        { name: 'Risk', score: reviewResult.readiness.risk, rationale: reviewResult.readiness.rationale?.risk },
                        { name: 'Exit Logic', score: reviewResult.readiness.exitLogic, rationale: reviewResult.readiness.rationale?.exitLogic },
                      ];

                      const lowestScore = Math.min(...dimensions.map(d => d.score));
                      const lowestDimension = dimensions.find(d => d.score === lowestScore);

                      return dimensions.map((dimension, i) => {
                        const isLowest = dimension.name === lowestDimension?.name;

                        return (
                          <div key={i} style={{
                            padding: 16,
                            background: isLowest ? '#FEF2F2' : '#fff',
                            border: isLowest ? '1px solid #FCA5A5' : '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 8,
                            marginBottom: i < 4 ? 12 : 0,
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: isLowest && dimension.rationale ? 12 : 0,
                            }}>
                              <div style={{
                                fontFamily: sans,
                                fontSize: 13,
                                fontWeight: 700,
                                color: isLowest ? '#991B1B' : '#1E1C1A',
                              }}>
                                {dimension.name}
                              </div>
                              <div style={{
                                fontFamily: sans,
                                fontSize: 18,
                                fontWeight: 900,
                                color: isLowest ? '#DC2626' : '#1E1C1A',
                              }}>
                                {dimension.score}<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
                              </div>
                            </div>
                            {isLowest && dimension.rationale && (
                              <div style={{
                                fontFamily: sans,
                                fontSize: 13,
                                lineHeight: 1.6,
                                color: '#7F1D1D',
                              }}>
                                {dimension.rationale}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  )}

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
                            See exactly what&apos;s missing.
                          </div>

                          {/* Value props row */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 8,
                            marginBottom: '2rem',
                            flexWrap: 'wrap',
                          }}>
                            <span style={{
                              fontFamily: sans,
                              fontSize: 13,
                              color: '#9CA3AF',
                              fontWeight: 500,
                            }}>The exact move</span>
                            <span style={{ color: '#4B5563' }}>·</span>
                            <span style={{
                              fontFamily: sans,
                              fontSize: 13,
                              color: '#9CA3AF',
                              fontWeight: 500,
                            }}>The safe condition</span>
                            <span style={{ color: '#4B5563' }}>·</span>
                            <span style={{
                              fontFamily: sans,
                              fontSize: 13,
                              color: '#9CA3AF',
                              fontWeight: 500,
                            }}>The hidden assumption</span>
                          </div>

                          {/* Trust row */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 8,
                            marginBottom: '1.5rem',
                            flexWrap: 'wrap',
                            fontSize: 12,
                            color: '#6B7280',
                          }}>
                            <span>Built from years of observing high-stakes decisions</span>
                            <span>·</span>
                            <span>Avg score improvement: +18 pts</span>
                            <span>·</span>
                            <span>48hr refund, no questions</span>
                          </div>

                          <div style={{
                            fontSize: 13,
                            fontStyle: 'italic',
                            color: '#6B7280',
                            textAlign: 'center',
                            marginTop: 16,
                            marginBottom: 12,
                          }}>
                            ChatGPT will agree with you. Decision Layer will find what you missed.
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
                              fontFamily: sans,
                              fontSize: 12,
                              fontStyle: 'italic',
                              color: '#888780',
                              textAlign: 'center',
                              lineHeight: 1.5,
                              marginTop: '1rem',
                            }}
                          >
                            If this isn&apos;t more specific than anything you&apos;ve tried, full refund. No questions asked.
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
                    <>
                      {/* Action buttons row */}
                      {decisionId && (
                        <div style={{
                          display: 'flex',
                          gap: 12,
                          marginTop: 20,
                          marginBottom: 16,
                        }}>
                          <button
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/brief/${decisionId}?ref=share`;
                              navigator.clipboard.writeText(shareUrl);
                              alert('Share link copied to clipboard!');
                            }}
                            style={{
                              flex: 1,
                              fontFamily: sans,
                              fontSize: 14,
                              fontWeight: 600,
                              background: '#1E1C1A',
                              color: '#fff',
                              border: 'none',
                              padding: '12px 20px',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            Share Brief
                          </button>
                          <button
                            onClick={() => {
                              setMode('solo');
                              setDecision('');
                              setContext('');
                              setReviewResult(null);
                              setDeepReview(null);
                              setVerdict(null);
                              setIsUnlocked(false);
                              setHasStarted(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{
                              flex: 1,
                              fontFamily: sans,
                              fontSize: 14,
                              fontWeight: 600,
                              background: '#fff',
                              color: '#1E1C1A',
                              border: '1px solid rgba(0,0,0,0.1)',
                              padding: '12px 20px',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            New Decision
                          </button>
                        </div>
                      )}
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
                            {/* Saved banner */}
                            {decisionId && (
                              <div
                                style={{
                                  fontFamily: sans,
                                  fontSize: 13,
                                  color: '#86EFAC',
                                  marginBottom: 16,
                                  padding: '10px 12px',
                                  background: 'rgba(134, 239, 172, 0.1)',
                                  border: '1px solid rgba(134, 239, 172, 0.2)',
                                  borderRadius: 8,
                                }}
                              >
                                ✓ Your verdict is saved. Lock it below to commit to your next step.
                              </div>
                            )}

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
                    </>
                  )}
                </div>
                </div>
              )}
            </>
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
          </div>

          {/* ── Marketing Sections ── */}
          <hr style={{ border: 'none', borderTop: '1px solid #e0e0dc', margin: '80px auto', maxWidth: 1200 }} />

          {/* DECISIONS SECTION */}
          <section style={{
            padding: '0 40px 80px',
            background: '#EDECEA',
            maxWidth: '720px',
            margin: '0 auto'
          }}>
            <p style={{
              fontFamily: sans,
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#aaa',
              marginBottom: '20px'
            }}>
              Before you commit.
            </p>
            <h2 style={{
              fontFamily: serif,
              fontSize: '36px',
              fontWeight: 700,
              color: '#111',
              marginBottom: '16px',
              lineHeight: 1.15
            }}>
              For founders, engineers, executives,<br />and operators. Decisions people bring here.
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: '14px',
              color: '#888',
              fontStyle: 'italic',
              marginBottom: '48px'
            }}>
              For decisions where the downside of being wrong is measured in years.
            </p>
            <ul style={{
              listStyle: 'none',
              maxWidth: '560px',
              margin: 0,
              padding: 0
            }}>
              {[
                'Whether to leave a stable company.',
                'Whether to join a startup.',
                'Whether to start a company.',
                'Whether to raise capital.',
                'Whether to make a major hire.',
                'Whether to open another location.',
                'Whether to scale aggressively.',
                'Whether to sell — or wait.',
                'Whether to relocate your family.',
                'Whether to make a concentrated investment.'
              ].map((item, idx, arr) => (
                <li
                  key={idx}
                  style={{
                    fontFamily: sans,
                    fontSize: '16px',
                    color: '#333',
                    padding: '16px 0',
                    borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #dddad6',
                    lineHeight: 1.4
                  }}
                >
                  <span style={{ color: '#bbb', marginRight: '14px' }}>—</span>{item}
                </li>
              ))}
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0dc', margin: '80px auto', maxWidth: 1200 }} />

          {/* THE PROBLEM */}
          <section style={{ textAlign: 'center', padding: '0 24px 72px', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              <p style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: '#6b6b6b', lineHeight: 1.75, fontFamily: sans }}>
                Every book explains what happened.
              </p>
              <p style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: '#6b6b6b', lineHeight: 1.75, fontFamily: sans }}>
                ChatGPT gives you more to think about.
              </p>
              <p style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: '#6b6b6b', lineHeight: 1.75, fontFamily: sans }}>
                Your friends tell you what you want to hear.
              </p>
              <p style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', color: '#6b6b6b', lineHeight: 1.75, fontFamily: sans }}>
                Your advisors have their own agenda.
              </p>
            </div>
            <p style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 700, color: '#111', lineHeight: 1.3, letterSpacing: '-0.01em', fontStyle: 'italic', fontFamily: serif }}>
              None of them give you a verdict.
            </p>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0dc', margin: '0 auto 80px', maxWidth: 1200 }} />

          {/* HOW IT WORKS */}
          <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 72px' }}>
            <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>
              How it works
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 400, lineHeight: 1.3, marginBottom: 40, letterSpacing: '-0.01em' }}>
              Five things Decision Layer looks for.<br />Most decisions only name one.
            </h2>

            <div style={{ position: 'relative', display: 'grid', gap: 0, border: '1.5px solid #e0e0dc', borderRadius: 10, overflow: 'hidden', background: '#ffffff' }}>
              {/* Continuous vertical divider */}
              <div style={{
                position: 'absolute',
                left: '160px',
                top: 0,
                bottom: 0,
                width: '1px',
                background: '#e0e0dc',
                zIndex: 1,
              }} />

              {[
                { num: 1, title: 'The Door', body: "What you're actually deciding. Not what you think you're deciding. Most people name the surface question. The Door is the real one underneath it." },
                { num: 2, title: 'The Hinge', body: "What the whole thing is hanging on. Usually one thing. Usually not the thing you named. Finding it changes everything that follows." },
                { num: 3, title: 'The Lock', body: "What can't be undone. Most people skip this until it's too late. A decision with no reversibility is a different kind of decision." },
                { num: 4, title: 'The Exit Sign', body: "How you get out if you're wrong. If you haven't thought about this, you're not ready to decide. This is the layer most people skip when they're confident." },
                { num: 5, title: 'The Trap', body: "The thing everyone misses. The assumption you didn't test. The question you didn't ask. This is where bad decisions hide." }
              ].map((layer, idx) => (
                <div key={layer.num} style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  borderTop: idx > 0 ? '1px solid #e0e0dc' : 'none',
                }}>
                  <div style={{
                    padding: '20px 18px',
                    background: '#fafaf9',
                  }}>
                    <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#aaa', marginBottom: 4 }}>
                      Layer {layer.num}
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 600 }}>
                      {layer.title}
                    </div>
                  </div>
                  <div style={{ padding: '20px 18px', fontSize: 14, lineHeight: 1.6, color: '#4a4a4a', fontFamily: sans }}>
                    {layer.body}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0dc', margin: '80px auto', maxWidth: 1200 }} />

          {/* TWO REAL OUTCOMES */}
          <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 72px' }}>
            <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>
              Similar Situations
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 400, lineHeight: 1.3, marginBottom: 40, letterSpacing: '-0.01em' }}>
              Two real outcomes.
            </h2>

            <div style={{ marginBottom: 32, background: '#fff', border: '1.5px solid #e0e0dc', borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6a20' }} />
                Career decision · 6 months ago · Anonymized with permission
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: '#4a4a4a', fontFamily: sans }}>
                Someone brought us a career decision six months ago. They thought they were deciding whether to take a new job.
                <br /><br />
                The verdict said they were actually deciding <strong>whether they trusted themselves to find another opportunity if it didn&apos;t work out.</strong>
                <br /><br />
                They stayed. Three months later they got a promotion they&apos;d stopped expecting.
              </div>
            </div>

            <div style={{ marginBottom: 48, background: '#fff', border: '1.5px solid #e0e0dc', borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6a20' }} />
                Hiring decision · 3 months ago · Anonymized with permission
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: '#4a4a4a', fontFamily: sans }}>
                A founder came in deciding whether to hire their first head of sales. They had a candidate, a number, and a deadline.
                <br /><br />
                The verdict found the real question: <strong>whether their sales results were repeatable by anyone other than themselves.</strong>
                <br /><br />
                They didn&apos;t hire. They ran a 90-day co-sell test instead. The candidate proved it out — and joined with both sides confident.
              </div>
            </div>

            {/* Brief preview */}
            <div style={{ marginTop: 48 }}>
              <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16, fontFamily: sans }}>What you get — a sample from the decision brief</p>
              <div style={{ border: '1.5px solid #e0e0dc', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <div className="brief-preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 0 }}>
                  <div className="brief-preview-card" style={{ padding: 20, borderRight: '1px solid #e0e0dc', background: '#fffbf5' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#aaa', marginBottom: 10, fontFamily: sans }}>WHAT TO SAY TO THEM</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: '#333', fontFamily: sans }}>
                      &quot;I&apos;m testing our sales process scalability before committing to a head of sales role — are you interested in a 90-day senior AE position with potential to grow into the leadership role?&quot;
                    </div>
                  </div>
                  <div className="brief-preview-card" style={{ padding: 20, background: '#fff' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#aaa', marginBottom: 10, fontFamily: sans }}>WALK AWAY IF</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: '#333', fontFamily: sans }}>
                      <strong>If the candidate cannot close at least 2 deals in 90 days using your documented process, do not proceed with the head of sales hire.</strong>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 20, background: '#fafaf9', borderTop: '1px solid #e0e0dc', filter: 'blur(3px)', opacity: 0.6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#aaa', marginBottom: 10, fontFamily: sans }}>WHAT OTHERS MISS</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#333', fontFamily: sans }}>
                    The real test isn&apos;t whether they can sell — it&apos;s whether your customers will buy the same way from someone who isn&apos;t the founder.
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                  <span style={{ background: '#111', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: sans }}>
                    Unlock the full brief for $99 →
                  </span>
                </div>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0dc', margin: '80px auto', maxWidth: 1200 }} />

          {/* WE'VE HEARD IT */}
          <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 72px' }}>
            <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>
              The obvious question
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 400, lineHeight: 1.3, marginBottom: 40, letterSpacing: '-0.01em' }}>
              We&apos;ve heard it.
            </h2>

            <div style={{ background: '#fafaf9', border: '1.5px solid #e0e0dc', borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, fontFamily: serif }}>
                Can&apos;t I just ask ChatGPT?
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: '#4a4a4a', fontFamily: sans }}>
                <p style={{ marginBottom: 14 }}>You can. And you probably already have.</p>
                <p style={{ marginBottom: 14 }}>ChatGPT answers the question you asked. Decision Layer finds the question underneath.</p>
                <p style={{ fontStyle: 'italic', fontWeight: 600 }}>That&apos;s a different product.</p>
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid #e0e0dc', margin: '80px auto', maxWidth: 1200 }} />

          {/* PRICING */}
          <section style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 72px', textAlign: 'center' }}>
            <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>
              Pricing
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 400, lineHeight: 1.3, marginBottom: 24, letterSpacing: '-0.01em' }}>
              One clearer decision is worth more<br />than a year of indecision.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#4a4a4a', marginBottom: 48, fontFamily: sans }}>
              Most people spend more on dinner than on the thing they&apos;ve been stuck on for three months.{' '}
              <strong>The $99 verdict tells you what your decision is actually about — not what you think it&apos;s about.</strong>
            </p>

            <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 900, margin: '0 auto 2rem', alignItems: 'start' }}>

              {/* FREE */}
              <div style={{ background: '#fff', border: '0.5px solid #dddad6', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: 12, fontWeight: 500 }}>Instant review</p>
                <p style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#111' }}>Free</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: '#bbb', marginTop: 4, marginBottom: 20 }}>No payment required</p>
                <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: '#777', marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px solid #e8e6e4' }}>&quot;I see something deeper here.&quot;</p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', flex: 1 }}>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#666', padding: '8px 0', borderBottom: '0.5px solid #f0eeec', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc', flexShrink: 0, marginTop: 6 }} />
                    The real question underneath yours
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#666', padding: '8px 0', borderBottom: '0.5px solid #f0eeec', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc', flexShrink: 0, marginTop: 6 }} />
                    Pre-commit readiness score
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#666', padding: '8px 0', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc', flexShrink: 0, marginTop: 6 }} />
                    One hidden risk
                  </li>
                </ul>
                <a href="#" style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, padding: '11px 18px', borderRadius: 8, background: '#f0eeec', color: '#111', textDecoration: 'none', display: 'inline-block', alignSelf: 'flex-start' }}>Run the review →</a>
              </div>

              {/* $99 */}
              <div style={{ background: '#18181B', border: '0.5px solid #2a2a2d', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 12, fontWeight: 500 }}>Full verdict</p>
                <p style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#fff' }}>$99</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: '#444', marginTop: 4, marginBottom: 20 }}>One decision</p>
                <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: '#666', marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px solid #2a2a2d' }}>&quot;I finally understand the decision.&quot;</p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', flex: 1 }}>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#888', padding: '8px 0', borderBottom: '0.5px solid #222', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444', flexShrink: 0, marginTop: 6 }} />
                    Your next move
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#888', padding: '8px 0', borderBottom: '0.5px solid #222', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444', flexShrink: 0, marginTop: 6 }} />
                    What to say to them
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#888', padding: '8px 0', borderBottom: '0.5px solid #222', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444', flexShrink: 0, marginTop: 6 }} />
                    When to walk away
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#888', padding: '8px 0', borderBottom: '0.5px solid #222', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444', flexShrink: 0, marginTop: 6 }} />
                    What you haven&apos;t named yet
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#888', padding: '8px 0', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#444', flexShrink: 0, marginTop: 6 }} />
                    What gets worse if you wait
                  </li>
                </ul>
                <a href="#" style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, padding: '11px 18px', borderRadius: 8, background: '#fff', color: '#111', textDecoration: 'none', display: 'inline-block', alignSelf: 'flex-start' }}>Get the verdict →</a>
              </div>

              {/* $10,000 */}
              <div style={{ background: '#0e0b06', border: '1px solid #2d1f08', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bf8c18', marginBottom: 12, fontWeight: 500 }}>Private verdict</p>
                <p style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#fff' }}>$10,000</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: '#6b4f18', marginTop: 4, marginBottom: 12 }}>One decision · application only</p>
                <div style={{ background: '#120d04', border: '0.5px solid #2d1f08', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: '#e0bc6a', marginBottom: 6, lineHeight: 1.4 }}>$5,000 today · $5,000 at six months</p>
                  <hr style={{ border: 'none', borderTop: '0.5px solid #2d1f08', margin: '8px 0' }} />
                  <p style={{ fontFamily: sans, fontSize: 11, color: '#6b4f18', lineHeight: 1.6, fontStyle: 'italic' }}>The second half is paid only if you&apos;d make the same decision again — knowing what you know then.</p>
                </div>
                <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: '#7a5f28', marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px solid #2d1f08' }}>&quot;I cannot afford to get this wrong.&quot;</p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', flex: 1 }}>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#8a6d30', padding: '8px 0', borderBottom: '0.5px solid #1f1508', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bf8c18', flexShrink: 0, marginTop: 6 }} />
                    Live structured review
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#8a6d30', padding: '8px 0', borderBottom: '0.5px solid #1f1508', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bf8c18', flexShrink: 0, marginTop: 6 }} />
                    Reversibility analysis
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#8a6d30', padding: '8px 0', borderBottom: '0.5px solid #1f1508', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bf8c18', flexShrink: 0, marginTop: 6 }} />
                    Assumption stress-testing
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#8a6d30', padding: '8px 0', borderBottom: '0.5px solid #1f1508', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bf8c18', flexShrink: 0, marginTop: 6 }} />
                    Written decision brief
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#8a6d30', padding: '8px 0', borderBottom: '0.5px solid #1f1508', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bf8c18', flexShrink: 0, marginTop: 6 }} />
                    Async support during decision window
                  </li>
                  <li style={{ fontFamily: sans, fontSize: 12, color: '#8a6d30', padding: '8px 0', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bf8c18', flexShrink: 0, marginTop: 6 }} />
                    Six-month follow-up review
                  </li>
                </ul>
                <hr style={{ border: 'none', borderTop: '0.5px solid #2d1f08', margin: '0 0 12px' }} />
                <p style={{ fontFamily: sans, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a3010', marginBottom: 8 }}>Included</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: '#7a5f28', padding: '3px 0', lineHeight: 1.5 }}>LinkedIn Network Intelligence Report</p>
                <p style={{ fontFamily: sans, fontSize: 11, color: '#4a3818', padding: '3px 0', marginBottom: 16, lineHeight: 1.5, fontStyle: 'italic' }}>For decisions where the downside of being wrong is measured in years.</p>
                <a href="#apply-form" onClick={handleApplyPrivately} style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, padding: '11px 18px', borderRadius: 8, background: '#bf8c18', color: '#1a1208', textDecoration: 'none', display: 'inline-block', alignSelf: 'flex-start' }}>Apply privately →</a>
                <p style={{ fontFamily: sans, fontSize: 10, color: '#3a2a10', fontStyle: 'italic', marginTop: 8 }}>We review every application within 48 hours.</p>
              </div>

            </div>

            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 14, color: '#999', textAlign: 'center', paddingTop: '1.5rem', borderTop: '0.5px solid #dddad6' }}>
              Every week you stay stuck on this is a week the decision is making itself.
            </p>
          </section>

          {/* APPLICATION FORM */}
          {applicationFormVisible && (
            <section
              id="apply-form"
              style={{
                background: '#EDECEA',
                padding: '60px 20px',
                maxWidth: 1200,
                margin: '0 auto'
              }}
            >
              <div style={{
                background: '#fff',
                border: '0.5px solid #dddad6',
                borderRadius: 12,
                padding: '1.5rem',
                maxWidth: 560,
                margin: '0 auto'
              }}>
                {!applicationSubmitted ? (
                  <>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#aaa',
                      marginBottom: 12,
                      fontWeight: 500
                    }}>
                      Private Verdict · Application
                    </p>
                    <h2 style={{
                      fontFamily: serif,
                      fontSize: 28,
                      fontWeight: 700,
                      color: '#111',
                      marginBottom: 16,
                      lineHeight: 1.2
                    }}>
                      Tell us about your decision.
                    </h2>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 14,
                      color: '#666',
                      lineHeight: 1.6,
                      marginBottom: 32
                    }}>
                      We review every application personally and respond within 48 hours — whether it&apos;s a fit or not. Not every decision qualifies.
                    </p>

                    <form onSubmit={handleApplicationSubmit}>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{
                          fontFamily: sans,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#333',
                          display: 'block',
                          marginBottom: 8
                        }}>
                          Your name
                        </label>
                        <input
                          type="text"
                          value={applicationName}
                          onChange={(e) => setApplicationName(e.target.value)}
                          required
                          style={{
                            fontFamily: sans,
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: 14,
                            border: '1px solid #dddad6',
                            borderRadius: 8,
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label style={{
                          fontFamily: sans,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#333',
                          display: 'block',
                          marginBottom: 8
                        }}>
                          Your email
                        </label>
                        <input
                          type="email"
                          value={applicationEmail}
                          onChange={(e) => setApplicationEmail(e.target.value)}
                          required
                          style={{
                            fontFamily: sans,
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: 14,
                            border: '1px solid #dddad6',
                            borderRadius: 8,
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label style={{
                          fontFamily: sans,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#333',
                          display: 'block',
                          marginBottom: 4
                        }}>
                          What&apos;s the decision?
                        </label>
                        <p style={{
                          fontFamily: sans,
                          fontSize: 11,
                          color: '#888',
                          marginBottom: 8
                        }}>
                          What are you deciding, and what makes it consequential?
                        </p>
                        <textarea
                          value={applicationDecision}
                          onChange={(e) => setApplicationDecision(e.target.value)}
                          required
                          rows={5}
                          style={{
                            fontFamily: sans,
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: 14,
                            border: '1px solid #dddad6',
                            borderRadius: 8,
                            outline: 'none',
                            minHeight: 120,
                            resize: 'vertical',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <label style={{
                          fontFamily: sans,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#333',
                          display: 'block',
                          marginBottom: 8
                        }}>
                          What&apos;s your timeline?
                        </label>
                        <input
                          type="text"
                          value={applicationTimeline}
                          onChange={(e) => setApplicationTimeline(e.target.value)}
                          required
                          style={{
                            fontFamily: sans,
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: 14,
                            border: '1px solid #dddad6',
                            borderRadius: 8,
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <label style={{
                          fontFamily: sans,
                          fontSize: 13,
                          color: '#444',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          cursor: 'pointer',
                          lineHeight: 1.5
                        }}>
                          <input
                            type="checkbox"
                            checked={applicationAgreed}
                            onChange={(e) => {
                              setApplicationAgreed(e.target.checked);
                              setShowCheckboxError(false);
                            }}
                            style={{
                              marginTop: 2,
                              width: 16,
                              height: 16,
                              cursor: 'pointer',
                              border: showCheckboxError ? '2px solid #dc2626' : '1px solid #dddad6',
                              flexShrink: 0
                            }}
                          />
                          <span>
                            I understand that $5,000 is due at booking. The second $5,000 is paid six months later — only if I&apos;d make the same decision again, knowing what I know then.
                          </span>
                        </label>
                        {showCheckboxError && (
                          <p style={{
                            fontFamily: sans,
                            fontSize: 11,
                            color: '#dc2626',
                            marginTop: 8,
                            marginLeft: 26
                          }}>
                            Please confirm that you understand the payment terms.
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={applicationSubmitting}
                        style={{
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 500,
                          padding: '13px 20px',
                          borderRadius: 8,
                          background: '#111',
                          color: '#fff',
                          border: 'none',
                          cursor: applicationSubmitting ? 'not-allowed' : 'pointer',
                          width: '100%',
                          opacity: applicationSubmitting ? 0.6 : 1
                        }}
                      >
                        {applicationSubmitting ? 'Submitting...' : 'Submit application'}
                      </button>

                      <p style={{
                        fontFamily: sans,
                        fontSize: 11,
                        color: '#888',
                        fontStyle: 'italic',
                        marginTop: 12,
                        lineHeight: 1.5
                      }}>
                        We read every application personally. Not every decision qualifies for the Private Verdict.
                      </p>
                    </form>
                  </>
                ) : (
                  <div>
                    <h2 style={{
                      fontFamily: serif,
                      fontSize: 22,
                      fontWeight: 400,
                      color: '#111',
                      marginBottom: 16,
                      lineHeight: 1.3
                    }}>
                      Application received.
                    </h2>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 14,
                      color: '#666',
                      lineHeight: 1.6
                    }}>
                      We&apos;ll read it carefully and respond within 48 hours — whether it&apos;s a fit or not. Check your inbox.
                    </p>
                  </div>
                )}
              </div>
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

