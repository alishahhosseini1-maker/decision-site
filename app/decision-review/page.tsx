'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

export default function DecisionReviewPage() {
  const border = '1px solid rgba(0,0,0,0.08)';
  const shellBg = 'rgba(255,255,255,0.75)';
  const softShadow = '0 8px 24px rgba(0,0,0,0.04)';

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navLinkStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
  };

  const backBtnStyle: React.CSSProperties = {
    textDecoration: 'none',
    color: 'inherit',
    fontWeight: 600,
    fontSize: 13,
    opacity: 0.7,
    border: border,
    borderRadius: 999,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.7)',
    whiteSpace: 'nowrap',
  };

  const bodyText: React.CSSProperties = {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 1.8,
  };

  const exampleDecision =
    "I’m considering increasing my NVIDIA exposure by ~5% of liquid net worth, but I’m already concentrated via RSUs and don’t want a single-name drawdown to force a bad sale.";

  const exampleContext = `Role: Senior engineer
Existing exposure: ~18% of liquid net worth (incl. RSUs)
Constraint: 30% drawdown tolerance
Horizon: 24–48 months
Goal: Increase exposure only if sizing + triggers are defined`;

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f6', color: '#111' }}>
      <main style={{ maxWidth: 980, margin: '28px auto 70px', padding: '0 20px' }}>
        {/* Top nav */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
          }}
        >
          <Link href="/" style={backBtnStyle}>
            ← Back to homepage
          </Link>

          <nav
            style={{
              display: 'flex',
              gap: 18,
              fontSize: 13,
              opacity: 0.6,
              fontWeight: 400,
              whiteSpace: 'nowrap',
            }}
          >
            <Link href="/decision-review" style={navLinkStyle}>
              Decision Review
            </Link>
            <Link href="/decision-notes" style={navLinkStyle}>
              Decision Notes
            </Link>
            <Link href="/decision-library" style={navLinkStyle}>
              Decision Library
            </Link>

            {!isMobile && (
              <>
                <span style={{ opacity: 0.4 }}>•</span>
                <span style={{ fontSize: 12, opacity: 0.5 }}>
                  Quick primer → then act
                </span>
              </>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginTop: 56 }}>
          <h1 style={{ fontSize: 48, margin: 0, letterSpacing: -0.8 }}>
            Decision Review
          </h1>

          <p style={{ marginTop: 10, fontSize: 17, opacity: 0.85 }}>
            A structured pause before you commit.
          </p>

          <p style={{ marginTop: 6, fontSize: 14, opacity: 0.6 }}>
            Assumptions → disconfirming evidence → risks → sizing → triggers.
          </p>
        </section>

        {/* Sections */}
        <section
          style={{
            marginTop: 28,
            maxWidth: 760,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <DetailsSection title="When to run one (rule-of-thumb)">
            <ul style={{ paddingLeft: 18, ...bodyText }}>
              <li>The decision is costly or irreversible.</li>
              <li>Being wrong would matter.</li>
              <li>You’re relying on assumptions.</li>
              <li>You feel urgency or narrative pull.</li>
            </ul>
          </DetailsSection>

          <DetailsSection title="What it forces (the checklist)">
            <ol style={{ paddingLeft: 18, ...bodyText }}>
              <li>Clarify the decision.</li>
              <li>List assumptions.</li>
              <li>Define disconfirming evidence.</li>
              <li>Rank risks.</li>
              <li>Set sizing and triggers.</li>
            </ol>
          </DetailsSection>

          <DetailsSection title="A realistic example">
            <div style={{ ...bodyText, fontWeight: 500 }}>{exampleDecision}</div>

            <pre
              style={{
                marginTop: 12,
                borderRadius: 12,
                border,
                background: '#fff',
                padding: 14,
                fontSize: 13,
                lineHeight: 1.6,
                opacity: 0.9,
                whiteSpace: 'pre-wrap',
              }}
            >
              {exampleContext}
            </pre>
          </DetailsSection>

          <DetailsSection title="What it is not">
            <ul style={{ paddingLeft: 18, ...bodyText }}>
              <li>Stock picks.</li>
              <li>Predictions.</li>
              <li>Post-hoc justification.</li>
              <li>A daily ritual.</li>
            </ul>
          </DetailsSection>

          <div
            style={{
              marginTop: 18,
              border,
              borderRadius: 18,
              background: shellBg,
              padding: 18,
              boxShadow: softShadow,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>
              After you commit
            </div>

            <p style={{ marginTop: 6, ...bodyText }}>
              Once you act, use a Decision Note to preserve judgment at the moment
              of commitment — outcomes excluded.
            </p>

            <Link
              href="/decision-notes"
              style={{
                marginTop: 10,
                display: 'inline-block',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                color: '#111',
              }}
            >
              Go to Decision Notes →
            </Link>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
              Notes are the record. Drafts are ephemeral.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 22, textAlign: 'center' }}>
          <div style={{ fontSize: 13, opacity: 0.5 }}>
            Clarity before commitment. Nothing more.
          </div>
        </footer>
      </main>
    </div>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details
      style={{
        marginBottom: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.8)',
        padding: 16,
        boxShadow: '0 6px 18px rgba(0,0,0,0.03)',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13.5,
          fontWeight: 700,
          opacity: 0.88,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, opacity: 0.45 }}>expand</span>
      </summary>

      <div style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}
