import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Metadata } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;

  // Load decision from database
  const { data: decision } = await supabase
    .from('decisions')
    .select('decision, score, review_result')
    .eq('id', id)
    .single();

  if (!decision) {
    return {
      title: 'Decision not found — Decision Layer',
    };
  }

  const score = decision.score || 0;
  const hingeOneLiner = decision.review_result?.snapshot?.hinge
    ? decision.review_result.snapshot.hinge.split('.')[0] + '.'
    : 'Decision analysis';

  const title = `${decision.decision || 'Decision'} — Decision Layer`;
  const description = `Score: ${score}/100 · ${hingeOneLiner}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SharedBriefPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Load decision from database
  const { data: decision, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !decision) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Decision not found</h1>
          <Link href="/" style={{ color: '#2563EB' }}>Go to homepage</Link>
        </div>
      </div>
    );
  }

  const serif = "'Spectral', Georgia, serif";
  const sans = "'Inter', system-ui, -apple-system, sans-serif";

  const reviewResult = decision.review_result;
  const score = decision.score || 0;

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
          background: '#DBEAFE',
          border: '1px solid #3B82F6',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: '#1E40AF',
          marginBottom: 16,
        }}>
          Shared Decision
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
          {decision.decision || 'Untitled Decision'}
        </h1>

        {/* Score */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
          marginTop: 32,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 48,
            fontWeight: 900,
            color: score < 50 ? '#DC2626' : score < 65 ? '#F59E0B' : score < 80 ? '#EAB308' : '#16A34A',
            lineHeight: 1,
            marginBottom: 8,
          }}>
            {score}<span style={{ fontSize: 24, opacity: 0.5 }}>/100</span>
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#6B7280',
          }}>
            Pre-commit score
          </div>
        </div>

        {/* Hinge Assumption */}
        {reviewResult?.snapshot?.hinge && (
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
              🔑 Hinge Assumption
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: '#1E1C1A',
            }}>
              {reviewResult.snapshot.hinge}
            </div>
          </div>
        )}

        {/* Exit Condition */}
        {reviewResult?.snapshot?.step && (
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
              🚪 Exit Condition
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: '#1E1C1A',
            }}>
              {reviewResult.snapshot.step}
            </div>
          </div>
        )}

        {/* IF YOU WAIT */}
        {decision.if_delayed && (
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
              If You Wait
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: '#1E1C1A',
            }}>
              {decision.if_delayed}
            </div>
          </div>
        )}

        {/* WHAT OTHERS MAY MISS */}
        {decision.what_others_miss && (
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
              What Others May Miss
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.7,
              fontStyle: 'italic',
              fontWeight: 500,
            }}>
              {decision.what_others_miss}
            </div>
          </div>
        )}

        {/* WHAT TO SAY */}
        {decision.script && (
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
              What to Say
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: '#1E1C1A',
              fontStyle: 'italic',
            }}>
              {decision.script}
            </div>
          </div>
        )}

        {/* WALK AWAY IF */}
        {decision.tripwire && (
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
              Walk Away If
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: '#1E1C1A',
              fontWeight: 600,
            }}>
              {decision.tripwire}
            </div>
          </div>
        )}

        {/* EVIDENCE */}
        {(decision.door || decision.hinge || decision.lock || decision.trap || decision.exit) && (
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
              Evidence
            </div>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {decision.door && (
                <div style={{
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  padding: '16px 0',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.36)',
                    marginBottom: 6,
                  }}>
                    The Decision
                  </div>
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(0,0,0,0.75)',
                  }}>
                    {decision.door}
                  </div>
                </div>
              )}
              {decision.hinge && (
                <div style={{
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  padding: '16px 0',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: '#A32D2D',
                    marginBottom: 6,
                  }}>
                    The Hinge
                  </div>
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#1E1C1A',
                    fontWeight: 500,
                  }}>
                    {decision.hinge}
                  </div>
                </div>
              )}
              {decision.lock && (
                <div style={{
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  padding: '16px 0',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.36)',
                    marginBottom: 6,
                  }}>
                    What Can&apos;t Be Undone
                  </div>
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(0,0,0,0.75)',
                  }}>
                    {decision.lock}
                  </div>
                </div>
              )}
              {decision.exit && (
                <div style={{
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  padding: '16px 0',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.36)',
                    marginBottom: 6,
                  }}>
                    Exit Condition
                  </div>
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(0,0,0,0.75)',
                  }}>
                    {decision.exit}
                  </div>
                </div>
              )}
              {decision.trap && (
                <div style={{
                  padding: '16px 0',
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.36)',
                    marginBottom: 6,
                  }}>
                    Hidden Trap
                  </div>
                  <div style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(0,0,0,0.75)',
                  }}>
                    {decision.trap}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Final Verdict */}
        {decision.verdict && (
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
              whiteSpace: 'pre-wrap',
            }}>
              {decision.verdict}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: 40,
          paddingTop: 40,
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}>
          <a
            href="/?ref=share"
            style={{
              fontFamily: sans,
              fontSize: 13,
              color: '#6B7280',
              textDecoration: 'none',
            }}
          >
            Reviewed with Decision Layer
          </a>
        </div>
      </div>
    </div>
  );
}
