'use client';

import React, { useState } from 'react';

export default function NetworkPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [outcome, setOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validation
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !outcome.trim()) {
        throw new Error('Please fill in all fields');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Create Stripe checkout session
      const checkoutRes = await fetch('/api/network/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          outcome: outcome.trim(),
        }),
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || 'Checkout failed');
      }

      // Redirect to Stripe checkout
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setIsSubmitting(false);
    }
    // Don't reset isSubmitting here - let the redirect happen
  };

  return (
    <div style={{
      background: '#0f0f0d',
      color: '#e8e8df',
      fontFamily: "'DM Mono', monospace",
      minHeight: '100vh',
      padding: '48px 24px 80px',
      display: 'flex',
      justifyContent: 'center',
    }}>

      {/* Top dots menu */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        background: '#1a1a17',
        border: '1px solid #2e2e28',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        cursor: 'pointer',
      }}>
        <span style={{ width: 3, height: 3, background: '#888880', borderRadius: '50%' }} />
        <span style={{ width: 3, height: 3, background: '#888880', borderRadius: '50%' }} />
        <span style={{ width: 3, height: 3, background: '#888880', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 480 }}>

        {!success ? (
          /* Form View */
          <>
            <p style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#0a66c2',
              marginBottom: 14,
            }}>
              Network Intelligence
            </p>

            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 32,
              lineHeight: 1.2,
              color: '#e8e8df',
              marginBottom: 16,
              fontWeight: 400,
            }}>
              Turn your LinkedIn network into <em style={{ fontStyle: 'italic', color: '#0a66c2' }}>paid opportunities.</em>
            </h1>

            <p style={{
              fontSize: 13,
              color: '#888880',
              lineHeight: 1.65,
              marginBottom: 16,
            }}>
              Upload your connections file and answer one question. You&apos;ll receive a prioritized analysis of your top opportunities in 24 hours.
            </p>

            <p style={{
              fontSize: 12,
              marginBottom: 40,
            }}>
              <a
                href="/sample"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#4FC3F7',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(79, 195, 247, 0.3)',
                }}
              >
                Not sure what you&apos;re getting? See a real sample report →
              </a>
            </p>

            {error && (
              <div style={{
                marginBottom: 24,
                padding: '12px 16px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: 4,
                color: '#fca5a5',
                fontSize: 12,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Name fields */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 20,
              }}>
                <div>
                  <label style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#888880',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 7,
                  }}>
                    First Name <span style={{ color: '#0a66c2', fontSize: 13 }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    required
                    style={{
                      background: '#1a1a17',
                      border: '1px solid #2e2e28',
                      borderRadius: 4,
                      color: '#e8e8df',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13,
                      padding: '11px 14px',
                      outline: 'none',
                      width: '100%',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0a66c2'}
                    onBlur={(e) => e.target.style.borderColor = '#2e2e28'}
                  />
                </div>
                <div>
                  <label style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#888880',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 7,
                  }}>
                    Last Name <span style={{ color: '#0a66c2', fontSize: 13 }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Morgan"
                    required
                    style={{
                      background: '#1a1a17',
                      border: '1px solid #2e2e28',
                      borderRadius: 4,
                      color: '#e8e8df',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13,
                      padding: '11px 14px',
                      outline: 'none',
                      width: '100%',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0a66c2'}
                    onBlur={(e) => e.target.style.borderColor = '#2e2e28'}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#888880',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 7,
                }}>
                  Email <span style={{ color: '#0a66c2', fontSize: 13 }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  required
                  style={{
                    background: '#1a1a17',
                    border: '1px solid #2e2e28',
                    borderRadius: 4,
                    color: '#e8e8df',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    padding: '11px 14px',
                    outline: 'none',
                    width: '100%',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0a66c2'}
                  onBlur={(e) => e.target.style.borderColor = '#2e2e28'}
                />
              </div>

              {/* Outcome question */}
              <div style={{
                border: '1px solid #2e2e28',
                borderRadius: 6,
                padding: 18,
                marginBottom: 32,
                background: '#1a1a17',
              }}>
                <div style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 15,
                  fontWeight: 400,
                  color: '#e8e8df',
                  lineHeight: 1.45,
                  marginBottom: 14,
                }}>
                  What&apos;s the one business outcome you&apos;re trying to drive through your network in the <em style={{ fontStyle: 'italic', color: '#0a66c2' }}>next 90 days?</em>
                </div>
                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Close 3 enterprise pilots, get intro to Microsoft procurement, find a co-founder in AI infrastructure..."
                  rows={4}
                  required
                  style={{
                    background: '#0f0f0d',
                    border: '1px solid #2e2e28',
                    borderRadius: 4,
                    color: '#e8e8df',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    padding: '12px 14px',
                    outline: 'none',
                    width: '100%',
                    resize: 'vertical',
                    minHeight: 90,
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#0a66c2'}
                  onBlur={(e) => e.target.style.borderColor = '#2e2e28'}
                />
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 20,
              }}>
                <p style={{
                  fontSize: 12,
                  color: '#888880',
                  lineHeight: 1.65,
                  maxWidth: 240,
                }}>
                  Your analysis will be delivered within 24 hours. Your data is never shared or used for any other purpose.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'transparent',
                    border: '1.5px solid #e8e8df',
                    borderRadius: 4,
                    color: '#e8e8df',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '13px 24px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = '#e8e8df';
                      e.currentTarget.style.color = '#0f0f0d';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#e8e8df';
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit →'}
                </button>
              </div>

            </form>
          </>
        ) : (
          /* Success View */
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <span style={{
              fontSize: 32,
              color: '#0a66c2',
              marginBottom: 20,
              display: 'block',
            }}>
              ✦
            </span>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 28,
              fontWeight: 400,
              color: '#e8e8df',
              marginBottom: 12,
            }}>
              You&apos;re in the queue.
            </h2>
            <p style={{
              fontSize: 13,
              color: '#888880',
              lineHeight: 1.65,
            }}>
              Your network analysis will be ready within 24 hours.<br />
              Check your inbox — we&apos;ll send it directly.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
