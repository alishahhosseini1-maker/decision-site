'use client';

import React from 'react';

type ResultsPageProps = {
  reviewResult: any;
  isPaidUser: boolean;
  scoreTotal: number;
  meta: {
    color: string;
    bg: string;
    badge: string;
    borderColor: string;
  };
  sans: string;
  commitment: string;
  setCommitment: (value: string) => void;
  handleLockVerdict: () => void;
  savingVerdict: boolean;
  decisionId: string | null;
  verdict: string;
  ruling: string;
  whenThisChanges: string;
};

export default function ResultsPage({
  reviewResult,
  isPaidUser,
  scoreTotal,
  meta,
  sans,
  commitment,
  setCommitment,
  handleLockVerdict,
  savingVerdict,
  decisionId,
  verdict,
  ruling,
  whenThisChanges,
}: ResultsPageProps) {

  // Fixed amber/gold color - warm brownish-gold tone
  const amberColor = '#C8860A';

  return (
    <div style={{ marginTop: 16 }}>

      {!isPaidUser ? (
        /* ═══════════════════════════════════════════════════════════════
           FREE TIER
           ═══════════════════════════════════════════════════════════════ */
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 16,
            background: '#fff',
            padding: '2.5rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* 1. Header */}
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

          {/* 2. THE VERDICT label */}
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

          {/* 3. Status pill */}
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#dc2626',
                }}
              />
              <span
                style={{
                  fontFamily: sans,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#dc2626',
                  letterSpacing: '0.02em',
                }}
              >
                Not ready to commit
              </span>
            </div>
          </div>

          {/* 4. Verdict headline */}
          <div
            style={{
              fontFamily: sans,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.4,
              color: '#0b0b0b',
              marginBottom: '2rem',
            }}
          >
            {reviewResult.topline.recommendedMove}
          </div>

          {/* 5. Score row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: '2rem',
            }}
          >
            <span
              style={{
                fontFamily: sans,
                fontSize: 48,
                fontWeight: 700,
                color: amberColor,
                lineHeight: 1,
              }}
            >
              {scoreTotal}
            </span>
            <span
              style={{
                fontFamily: sans,
                fontSize: 14,
                color: 'rgba(0,0,0,0.45)',
                fontWeight: 400,
              }}
            >
              / 100 pre-commit score
            </span>
          </div>

          {/* 6. Hinge box */}
          <div
            style={{
              background: '#1A1A18',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#888780',
                marginBottom: 12,
              }}
            >
              The hinge — what this decision hangs on
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.6,
                color: '#F1EFE8',
              }}
            >
              {reviewResult.snapshot?.hinge || 'Hinge analysis pending'}
            </div>
          </div>

          {/* 7. Threat box */}
          <div
            style={{
              background: '#1A1A18',
              borderLeft: '3px solid #dc2626',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#dc2626',
                marginBottom: 12,
              }}
            >
              The threat
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.6,
                color: '#F1EFE8',
              }}
            >
              {reviewResult.topline?.primaryRisk || 'Risk assessment pending'}
            </div>
          </div>

          {/* 8. Hard stop line */}
          <div
            style={{
              fontFamily: sans,
              fontSize: 13,
              fontStyle: 'italic',
              color: 'rgba(0,0,0,0.50)',
              textAlign: 'center',
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            You are about to make a decision that depends on one unproven condition.
          </div>

          {/* 9. Paywall card */}
          <div
            style={{
              border: `2px solid ${amberColor}`,
              borderRadius: 16,
              background: '#1A1A18',
              padding: 32,
            }}
          >
            {/* Amber label */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: amberColor,
                marginBottom: 20,
              }}
            >
              You're not missing information. You're missing a move.
            </div>

            {/* Large headline */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.35,
                color: '#F1EFE8',
                marginBottom: 20,
              }}
            >
              This decision fails on one condition. Here's exactly how to fix it.
            </div>

            {/* Body paragraph */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 14,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.75)',
                marginBottom: 32,
              }}
            >
              Right now you have a diagnosis. What's locked is the prescription — the ranked gaps, the exact move, and the condition that flips this from risky to executable.
            </div>

            {/* Locked items */}
            <div style={{ marginBottom: 32 }}>
              {[
                'The move — exact next action with specific contacts and deadline',
                '3 ranked gaps dragging your score down — with what to do about each',
                'Flip condition — the exact moment this becomes safe to execute',
                'Full decision anatomy — Door, Hinge, Lock, Exit, Trap walkthrough',
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: amberColor,
                      fontSize: 14,
                    }}
                  >
                    🔒
                  </div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>

            {/* $99 button */}
            <button
              type="button"
              style={{
                width: '100%',
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 600,
                padding: '16px 24px',
                borderRadius: 12,
                border: 'none',
                background: '#0E0C0A',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#1A1816';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#0E0C0A';
              }}
            >
              Unlock the move — $99
            </button>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           PAID TIER
           ═══════════════════════════════════════════════════════════════ */
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 16,
            background: '#fff',
            padding: '2.5rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* 1. Header */}
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

          {/* 2. Final verdict card */}
          <div
            style={{
              background: '#1A1A18',
              borderRadius: 12,
              padding: 24,
              marginBottom: 20,
            }}
          >
            {/* Label */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.40)',
                marginBottom: 16,
              }}
            >
              Final verdict
            </div>

            {/* Headline */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 20,
                fontWeight: 700,
                lineHeight: 1.4,
                color: '#F1EFE8',
                marginBottom: 16,
              }}
            >
              {reviewResult.topline.recommendedMove}
            </div>

            {/* Body paragraph */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 400,
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.85)',
                marginBottom: 24,
              }}
              dangerouslySetInnerHTML={{
                __html: ruling.replace(
                  /(This decision is not ready to commit\.)/g,
                  '<span style="color: #dc2626; font-size: 17px; font-weight: 500;">$1</span>'
                ),
              }}
            />

            {/* Rows table */}
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* Row 1 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: 16,
                  padding: 16,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: amberColor,
                  }}
                >
                  The move
                </div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {reviewResult.snapshot?.step || 'Move analysis pending'}
                </div>
              </div>

              {/* Row 2 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: 16,
                  padding: 16,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: amberColor,
                  }}
                >
                  Gap 1 · Exit logic
                </div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {reviewResult.readiness?.rationale?.exitLogic || 'Exit logic assessment pending'}
                </div>
              </div>

              {/* Row 3 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: 16,
                  padding: 16,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: amberColor,
                  }}
                >
                  Gap 2 · Assumptions
                </div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {reviewResult.readiness?.rationale?.assumptions || 'Assumptions assessment pending'}
                </div>
              </div>

              {/* Row 4 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: amberColor,
                  }}
                >
                  Flip condition
                </div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {whenThisChanges || 'Flip condition pending'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Commit box */}
          <div
            style={{
              background: '#1A1A18',
              borderRadius: 12,
              padding: 24,
            }}
          >
            {/* Heading */}
            <div
              style={{
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                color: '#F1EFE8',
                marginBottom: 16,
              }}
            >
              Commit this decision before you act.
            </div>

            {/* Textarea */}
            <textarea
              value={commitment}
              onChange={(e) => setCommitment(e.target.value)}
              placeholder="I will / I won't / I will wait until..."
              rows={4}
              style={{
                width: '100%',
                fontFamily: sans,
                fontSize: 14,
                lineHeight: 1.6,
                padding: '14px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                resize: 'vertical',
                outline: 'none',
                marginBottom: 16,
                background: '#2A2A28',
                color: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />

            {/* Two buttons side by side */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              {/* Left button: Commit this decision */}
              <button
                type="button"
                onClick={handleLockVerdict}
                disabled={savingVerdict || commitment.trim().length === 0 || decisionId !== null}
                style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: decisionId ? '#16a34a' : commitment.trim().length === 0 ? 'rgba(255,255,255,0.1)' : '#F1EFE8',
                  color: decisionId ? '#fff' : commitment.trim().length === 0 ? 'rgba(255,255,255,0.3)' : '#0E0C0A',
                  cursor: (savingVerdict || commitment.trim().length === 0 || decisionId) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {decisionId ? (
                  <>✓ Decision committed</>
                ) : savingVerdict ? (
                  'Saving...'
                ) : (
                  'Commit this decision'
                )}
              </button>

              {/* Right button: I'm not ready yet */}
              <button
                type="button"
                style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 500,
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                I'm not ready yet
              </button>
            </div>

            {decisionId && (
              <div
                style={{
                  marginTop: 16,
                  fontFamily: sans,
                  fontSize: 13,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                Your brief is ready.{' '}
                <a
                  href={`/decision-summary?id=${decisionId}`}
                  style={{
                    color: '#F1EFE8',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  View Decision Brief →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
