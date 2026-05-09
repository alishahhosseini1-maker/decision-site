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

      {/* Banner */}
      <div style={{
        background: '#0E0C0A',
        color: '#F1EFE8',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 600,
      }}>
        This is what a real paid verdict looks like. Yours gets the same treatment.
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
                50<span style={{ fontSize: 24, opacity: 0.5 }}>/100</span>
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

        {/* Decision Quality Breakdown */}
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
            Decision Quality Breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Clarity */}
            <div style={{
              padding: 16,
              background: '#FAFAFA',
              border: '1px solid #E5E5E5',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#737373',
                }}>
                  Clarity
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#737373',
                }}>
                  12<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            <div style={{
              padding: 16,
              background: '#FAFAFA',
              border: '1px solid #E5E5E5',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#737373',
                }}>
                  Assumptions
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#737373',
                }}>
                  8<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
                </div>
              </div>
            </div>

            {/* Reversibility - highlighted as weak */}
            <div style={{
              padding: 16,
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#991B1B',
                }}>
                  Reversibility
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#DC2626',
                }}>
                  6<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
                </div>
              </div>
            </div>

            {/* Risk */}
            <div style={{
              padding: 16,
              background: '#FAFAFA',
              border: '1px solid #E5E5E5',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#737373',
                }}>
                  Risk
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#737373',
                }}>
                  10<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
                </div>
              </div>
            </div>

            {/* Exit Logic */}
            <div style={{
              padding: 16,
              background: '#FAFAFA',
              border: '1px solid #E5E5E5',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#737373',
                }}>
                  Exit Logic
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#737373',
                }}>
                  14<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Strengthen This Decision */}
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
            marginBottom: 16,
          }}>
            How to Strengthen This Decision
          </div>
          <div style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: '#4B5563',
          }}>
            Before you commit: (1) Get the cap table model showing dilution through Series B. (2) Ask the founder what anti-dilution protection employee equity carries. (3) Model the worst-case scenario where the company acqui-hires at 1.5x current valuation in 18 months — does the equity still justify the base salary cut?
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
            fontSize: 16,
            fontWeight: 700,
            color: '#1E1C1A',
            marginBottom: 20,
          }}>
            Your decision has 5 layers
          </div>

          {/* Door */}
          <div style={{
            padding: 16,
            background: '#FAFAFA',
            border: '1px solid #E5E5E5',
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
                color: '#737373',
              }}>
                Door · Clarity
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#737373',
              }}>
                12<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Hinge */}
          <div style={{
            padding: 16,
            background: '#FAFAFA',
            border: '1px solid #E5E5E5',
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
                color: '#737373',
              }}>
                Hinge · Assumptions
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#737373',
              }}>
                8<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Lock */}
          <div style={{
            padding: 16,
            background: '#FAFAFA',
            border: '1px solid #E5E5E5',
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
                color: '#737373',
              }}>
                Lock · Reversibility
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#737373',
              }}>
                6<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Exit Sign */}
          <div style={{
            padding: 16,
            background: '#FAFAFA',
            border: '1px solid #E5E5E5',
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
                color: '#737373',
              }}>
                Exit Sign · Exit Logic
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#737373',
              }}>
                14<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
          </div>

          {/* Trap - Revealed Layer */}
          <div style={{
            padding: 16,
            background: '#fff',
            border: '2px solid #404040',
            borderRadius: 8,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1E1C1A',
              }}>
                Trap · Risk
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#1E1C1A',
              }}>
                10<span style={{ fontSize: 12, opacity: 0.6 }}>/20</span>
              </div>
            </div>
            <div style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: '#1E1C1A',
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

        {/* Lock the Verdict Box */}
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
            marginBottom: 12,
          }}>
            Lock the Verdict
          </div>
          <div style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: '#4B5563',
            marginBottom: 16,
          }}>
            Once you commit to this decision, you&apos;ll return in 30, 60, and 90 days to track what actually happened. Decision Layer builds pattern recognition from your real outcomes — not hypotheticals.
          </div>
          <div style={{
            padding: 16,
            background: '#FAFAFA',
            border: '1px solid #E5E5E5',
            borderRadius: 8,
            fontSize: 13,
            color: '#6B7280',
            textAlign: 'center',
          }}>
            Commitment period: 48 hours to change your mind, then it&apos;s locked.
          </div>
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
            Every decision has a blind spot. Find yours.
          </div>
          <div style={{
            fontSize: 13,
            fontStyle: 'italic',
            color: '#6B7280',
            marginBottom: 16,
          }}>
            ChatGPT will agree with you. Decision Layer will find what you missed.
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
