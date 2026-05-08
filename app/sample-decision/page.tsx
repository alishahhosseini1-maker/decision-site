'use client';

import Link from 'next/link';

export default function SampleDecisionPage() {
  const serif = "'Spectral', Georgia, serif";
  const sans = "'Inter', system-ui, -apple-system, sans-serif";

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FDFCFA',
      fontFamily: sans,
      color: '#1E1C1A',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '16px 20px',
        background: '#fff',
      }}>
        <Link href="/" style={{
          fontFamily: serif,
          fontSize: 20,
          fontWeight: 700,
          color: '#1E1C1A',
          textDecoration: 'none',
        }}>
          Decision Layer
        </Link>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 20px 80px',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#92400E',
          marginBottom: 16,
        }}>
          Sample Decision
        </div>

        {/* Decision Title */}
        <h1 style={{
          fontFamily: serif,
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 12,
          color: '#1E1C1A',
        }}>
          Leave $180k Series B role for early-stage startup as employee #4 with 2% equity
        </h1>

        {/* Score Card */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
          marginTop: 32,
          marginBottom: 24,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 16,
          }}>
            <div>
              <div style={{
                fontSize: 48,
                fontWeight: 900,
                color: '#DC2626',
                lineHeight: 1,
              }}>
                44<span style={{ fontSize: 24, opacity: 0.5 }}>/100</span>
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#6B7280',
                marginTop: 4,
              }}>
                Pre-commit score
              </div>
            </div>
            <div style={{
              flex: 1,
              height: 1,
              background: 'rgba(0,0,0,0.1)',
            }} />
            <div style={{
              padding: '6px 12px',
              background: '#FEE2E2',
              border: '1px solid #DC2626',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#7F1D1D',
            }}>
              NOT READY
            </div>
          </div>

          {/* Threat */}
          <div style={{
            padding: 16,
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#991B1B',
              marginBottom: 8,
            }}>
              WHAT THIS DECISION IS MISSING
            </div>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#7F1D1D',
            }}>
              You are pricing 2% equity using the company&apos;s current valuation, not the diluted value you&apos;ll actually hold at exit after two more funding rounds.
            </div>
          </div>
        </div>

        {/* 5 Layers */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 20,
          }}>
            5 Layers
          </div>

          {/* Door */}
          <div style={{
            padding: 16,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#DC2626',
              }}>
                Door · Clarity
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#DC2626',
              }}>
                10<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Hinge */}
          <div style={{
            padding: 16,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#DC2626',
              }}>
                Hinge · Assumptions
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#DC2626',
              }}>
                7<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Lock */}
          <div style={{
            padding: 16,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#DC2626',
              }}>
                Lock · Reversibility
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#DC2626',
              }}>
                5<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Exit Sign */}
          <div style={{
            padding: 16,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#DC2626',
              }}>
                Exit Sign · Exit Logic
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#DC2626',
              }}>
                12<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Trap - FREE LAYER */}
          <div style={{
            padding: 16,
            background: '#F0FDF4',
            border: '2px solid #86EFAC',
            borderRadius: 8,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '2px 8px',
              background: '#16A34A',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.05em',
              borderRadius: 4,
            }}>
              FREE
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#166534',
              }}>
                Trap · Risk
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#166534',
              }}>
                10<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
            <div style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: '#14532D',
            }}>
              Prestige of escape disguised as opportunity — you are leaving because the current role feels stale, not because this opportunity is objectively exceptional. Boredom is not a thesis.
            </div>
          </div>
        </div>

        {/* Final Verdict */}
        <div style={{
          background: '#0E0C0A',
          color: '#F1EFE8',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            marginBottom: 12,
          }}>
            Final Verdict
          </div>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: 24,
          }}>
            Do not commit until you have a fully executed offer letter with a vesting cliff date, anti-dilution clause, and a written answer to: what does the cap table look like after the next two rounds? This decision is not ready to commit.
          </div>

          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            marginBottom: 8,
            marginTop: 24,
          }}>
            When This Changes
          </div>
          <div style={{
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 24,
            color: '#D3D1C7',
          }}>
            When you have the cap table model showing your exit value at three scenarios (acqui-hire / Series C / IPO) and the number is still worth the risk at the worst case.
          </div>

          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9CA3AF',
            marginBottom: 8,
            marginTop: 24,
          }}>
            Next Move
          </div>
          <div style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: '#D3D1C7',
          }}>
            Send one email to the founder this week asking for the cap table and dilution model before your next conversation.
          </div>
        </div>

        {/* Decision Brief */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: 20,
          }}>
            Decision Brief
          </div>

          {/* Hinge */}
          <details open style={{ marginBottom: 20 }}>
            <summary style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#6B7280',
              cursor: 'pointer',
              marginBottom: 12,
            }}>
              🔑 Hinge
            </summary>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#4B5563',
              paddingLeft: 20,
            }}>
              Your 2% will not be diluted below 0.8% before a liquidity event. Without the cap table model, you&apos;re betting on a number that doesn&apos;t exist yet.
            </div>
          </details>

          {/* What Can't Be Undone */}
          <details open style={{ marginBottom: 20 }}>
            <summary style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#6B7280',
              cursor: 'pointer',
              marginBottom: 12,
            }}>
              🔒 What Can&apos;t Be Undone
            </summary>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#4B5563',
              paddingLeft: 20,
            }}>
              You permanently exit the Series B career track. Returning to a similar role after 18 months at a failed startup resets your trajectory. The market reads &quot;early-stage gamble&quot; not &quot;product leadership.&quot;
            </div>
          </details>

          {/* Exit Condition */}
          <details open style={{ marginBottom: 20 }}>
            <summary style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#6B7280',
              cursor: 'pointer',
              marginBottom: 12,
            }}>
              🚪 Exit Condition
            </summary>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#4B5563',
              paddingLeft: 20,
            }}>
              If the startup has not hit Series A within 18 months or your equity is diluted below 1.2%, return to market immediately. Set a calendar reminder for month 17.
            </div>
          </details>

          {/* Hidden Trap */}
          <details open>
            <summary style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#6B7280',
              cursor: 'pointer',
              marginBottom: 12,
            }}>
              ⚠️ Hidden Trap
            </summary>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: '#4B5563',
              paddingLeft: 20,
            }}>
              Prestige of escape disguised as opportunity. You&apos;re leaving because the current role feels stale, not because this opportunity is exceptional. The startup story is compelling, but the math isn&apos;t there yet.
            </div>
          </details>
        </div>

        {/* Footer CTA */}
        <div style={{
          marginTop: 40,
          padding: 24,
          background: '#F9FAFB',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
          }}>
            Get your own decision verdict
          </div>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#1E1C1A',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Start Solo Decision → free preview, $99 to unlock
          </Link>
        </div>
      </div>
    </div>
  );
}
