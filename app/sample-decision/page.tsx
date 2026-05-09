'use client';

import Link from 'next/link';
import DecisionDoor from '../components/DecisionDoor';

export default function SampleDecisionPage() {
  const serif = "'Spectral', Georgia, serif";
  const sans = "'Inter', system-ui, -apple-system, sans-serif";

  // Mock reviewResult data for sample page
  const sampleReviewResult = {
    readiness: {
      total: 50,
      label: 'Needs more before you commit',
      clarity: 12,
      assumptions: 8,
      reversibility: 6,
      risk: 10,
      exitLogic: 14,
      rationale: {
        clarity: 'The decision is framed as a binary choice but the real question is whether equity value justifies the salary cut and career risk.',
        assumptions: 'Without the cap table model, you\'re betting on a number that doesn\'t exist yet.',
        reversibility: 'Leaving resets your Series B trajectory. The market reads "early-stage gamble" not "product leadership."',
        risk: 'You are leaving because the current role feels stale, not because this opportunity is objectively exceptional.',
        exitLogic: 'If the startup hasn\'t hit Series A in 18 months or equity dilutes below 1.2%, you know when to exit.',
      },
    },
    snapshot: {
      door: 'What exactly are you deciding? Does the equity value justify the salary cut and career risk?',
      hinge: 'Your 2% will not be diluted below 0.8% before a liquidity event.',
      lock: 'You permanently exit the Series B career track. Returning to a similar role after 18 months at a failed startup resets your trajectory.',
      exit: 'If the startup has not hit Series A within 18 months or your equity is diluted below 1.2%, return to market immediately.',
      trap: 'Prestige of escape disguised as opportunity — you are leaving because the current role feels stale, not because this opportunity is objectively exceptional.',
      step: 'Send one email to the founder this week asking for the cap table and dilution model.',
      script: 'Ask for the cap table model showing dilution through Series B, anti-dilution protection details, and worst-case acqui-hire scenario modeling.',
    },
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FDFCFA',
      fontFamily: sans,
      color: '#1E1C1A',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(30,28,26,0.08)',
        padding: '20px 24px',
        background: '#fff',
      }}>
        <Link href="/" style={{
          fontFamily: serif,
          fontSize: 22,
          fontWeight: 700,
          color: '#1E1C1A',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}>
          Decision Layer
        </Link>
      </div>

      {/* Premium Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0E0C0A 0%, #1E1C1A 100%)',
        color: '#F1EFE8',
        padding: '32px 24px',
        textAlign: 'center',
        borderBottom: '2px solid #DC2626',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.01em',
          lineHeight: 1.4,
        }}>
          This is what a real paid verdict looks like.<br />
          Yours gets the same treatment.
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '56px 24px 96px',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-block',
          padding: '6px 12px',
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#92400E',
          marginBottom: 20,
        }}>
          Sample Decision
        </div>

        {/* Decision Title */}
        <h1 style={{
          fontFamily: serif,
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.25,
          marginBottom: 48,
          color: '#1E1C1A',
          letterSpacing: '-0.02em',
        }}>
          Leave $180k Series B role for early-stage startup as employee #4 with 2% equity
        </h1>

        {/* Premium Score + Verdict Card */}
        <div style={{
          background: '#0E0C0A',
          color: '#F1EFE8',
          borderRadius: 16,
          padding: 40,
          marginBottom: 40,
          border: '2px solid #DC2626',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div>
              <div style={{
                fontSize: 64,
                fontWeight: 900,
                color: '#DC2626',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                50<span style={{ fontSize: 32, opacity: 0.5, color: '#9CA3AF' }}>/100</span>
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#9CA3AF',
                marginTop: 8,
              }}>
                Decision Readiness
              </div>
            </div>
            <div style={{
              flex: 1,
              height: 2,
              background: 'linear-gradient(90deg, rgba(220,38,38,0.4) 0%, rgba(255,255,255,0.05) 100%)',
            }} />
            <div style={{
              padding: '10px 16px',
              background: '#FEE2E2',
              border: '1px solid #DC2626',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.03em',
              color: '#7F1D1D',
            }}>
              NOT READY
            </div>
          </div>

          <div style={{
            fontSize: 17,
            lineHeight: 1.65,
            fontWeight: 500,
            color: '#F1EFE8',
          }}>
            Do not commit until you have a fully executed offer letter with a vesting cliff date, anti-dilution clause, and a written answer to: what does the cap table look like after the next two rounds?
          </div>
        </div>

        {/* What This Decision Is Missing - Refined */}
        <div style={{
          padding: 28,
          background: '#FEF2F2',
          border: '2px solid #FCA5A5',
          borderRadius: 12,
          marginBottom: 48,
          boxShadow: '0 2px 8px rgba(252,165,165,0.15)',
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#991B1B',
            marginBottom: 12,
          }}>
            What This Decision Is Missing
          </div>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: '#7F1D1D',
            fontWeight: 500,
          }}>
            You are pricing 2% equity using the company&apos;s current valuation, not the diluted value you&apos;ll actually hold at exit after two more funding rounds.
          </div>
        </div>

        {/* CTA - Paywall Position */}
        <div style={{
          marginBottom: 56,
          padding: 40,
          background: 'linear-gradient(135deg, #1E1C1A 0%, #0E0C0A 100%)',
          borderRadius: 16,
          textAlign: 'center',
          border: '2px solid #1E1C1A',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <div style={{
            fontSize: 15,
            color: '#9CA3AF',
            marginBottom: 28,
            lineHeight: 1.6,
          }}>
            ChatGPT will agree with you. Decision Layer will find what you missed — the assumption you didn&apos;t test, the exit you didn&apos;t plan, the risk you didn&apos;t see.
          </div>
          <Link href="/" style={{
            display: 'block',
            padding: '18px 40px',
            background: '#1E1C1A',
            color: '#fff',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(30,28,26,0.5)',
            transition: 'all 0.2s',
            border: '2px solid #fff',
            letterSpacing: '0.01em',
            marginBottom: 28,
          }}>
            Get Your Verdict → Free preview, $99 to unlock
          </Link>
          <div style={{
            fontSize: 13,
            color: '#6B7280',
            letterSpacing: '0.01em',
          }}>
            48-hour money-back guarantee · Your decision stays private
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
          marginBottom: 56,
        }} />

        {/* Label: Everything Below Is What You're Unlocking */}
        <div style={{
          textAlign: 'center',
          marginBottom: 48,
          opacity: 0.6,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6B7280',
          }}>
            ↓ Everything below is what you&apos;re unlocking ↓
          </div>
        </div>

        {/* 5-Layer Door Animation */}
        <DecisionDoor
          reviewResult={sampleReviewResult}
          onStepChange={() => {}}
          decisionText="Should I leave my stable Series B company for a founding product role at a pre-seed startup?"
          verdictLine="Your equity bet hinges on dilution math you don't have yet"
          hingeScore={8}
        />

        {/* Next Move */}
        <div style={{
          background: '#fff',
          border: '2px solid rgba(30,28,26,0.08)',
          borderRadius: 12,
          padding: 28,
          marginBottom: 32,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 14,
          }}>
            Next Move
          </div>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: '#4B5563',
          }}>
            Send one email to the founder this week asking for the cap table and dilution model before your next conversation.
          </div>
        </div>

        {/* How to Strengthen This Decision */}
        <div style={{
          background: '#fff',
          border: '2px solid rgba(30,28,26,0.08)',
          borderRadius: 12,
          padding: 28,
          marginBottom: 40,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 14,
          }}>
            How to Strengthen This Decision
          </div>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: '#4B5563',
          }}>
            Before you commit: (1) Get the cap table model showing dilution through Series B. (2) Ask the founder what anti-dilution protection employee equity carries. (3) Model the worst-case scenario where the company acqui-hires at 1.5x current valuation in 18 months — does the equity still justify the base salary cut?
          </div>
        </div>

        {/* Final Verdict */}
        <div style={{
          background: '#0E0C0A',
          color: '#F1EFE8',
          borderRadius: 12,
          padding: 32,
          marginBottom: 32,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            marginBottom: 14,
          }}>
            Final Verdict
          </div>
          <div style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: '#F1EFE8',
          }}>
            Do not commit until you have a fully executed offer letter with a vesting cliff date, anti-dilution clause, and a written answer to: what does the cap table look like after the next two rounds? This decision is not ready to commit.
          </div>
        </div>

        {/* When This Changes */}
        <div style={{
          background: '#fff',
          border: '2px solid rgba(30,28,26,0.08)',
          borderRadius: 12,
          padding: 28,
          marginBottom: 40,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 14,
          }}>
            When This Changes
          </div>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: '#4B5563',
          }}>
            When you have the cap table model showing your exit value at three scenarios (acqui-hire / Series C / IPO) and the number is still worth the risk at the worst case.
          </div>
        </div>

        {/* What Are You Doing In The Next 48 Hours */}
        <div style={{
          background: '#fff',
          border: '3px solid #1E1C1A',
          borderRadius: 12,
          padding: 32,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 14,
          }}>
            What Are You Doing In The Next 48 Hours?
          </div>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: '#4B5563',
            marginBottom: 20,
          }}>
            Once you commit to this decision, you have 48 hours to change your mind. After that, the verdict locks and you&apos;ll return in 30, 60, and 90 days to track what actually happened.
          </div>
          <div style={{
            padding: 20,
            background: '#FAFAFA',
            border: '1px solid #E5E5E5',
            borderRadius: 8,
            fontSize: 14,
            color: '#6B7280',
            textAlign: 'center',
            fontWeight: 600,
          }}>
            Decision Layer builds pattern recognition from your real outcomes — not hypotheticals.
          </div>
        </div>
      </div>
    </div>
  );
}
