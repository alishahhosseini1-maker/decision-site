'use client';

import React from 'react';

export default function NetworkSuccessPage() {
  return (
    <div style={{
      background: '#0f0f0d',
      color: '#e8e8df',
      fontFamily: "'DM Mono', monospace",
      minHeight: '100vh',
      padding: '48px 24px 80px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <span style={{
          fontSize: 48,
          color: '#0a66c2',
          marginBottom: 24,
          display: 'block',
        }}>
          ✦
        </span>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 32,
          fontWeight: 400,
          color: '#e8e8df',
          marginBottom: 16,
          lineHeight: 1.3,
        }}>
          You&apos;re in. One last step — email your LinkedIn connections CSV to <a href="mailto:info@decisionlayer.dev" style={{ color: '#4FC3F7', textDecoration: 'none', borderBottom: '1px solid rgba(79, 195, 247, 0.3)' }}>info@decisionlayer.dev</a> to get started.
        </h1>
        <p style={{
          fontSize: 14,
          color: '#888880',
          lineHeight: 1.75,
          marginBottom: 32,
          textAlign: 'left',
        }}>
          Here&apos;s how to get it: Go to <a href="https://www.linkedin.com/mypreferences/d/download-my-data" target="_blank" rel="noopener noreferrer" style={{ color: '#4FC3F7', textDecoration: 'none', borderBottom: '1px solid rgba(79, 195, 247, 0.3)' }}>https://www.linkedin.com/mypreferences/d/download-my-data</a> and request your data archive. LinkedIn will send you two emails — ignore the first one. The second email contains your Connections.csv file and arrives within 24 hours. Forward that file to <a href="mailto:info@decisionlayer.dev" style={{ color: '#4FC3F7', textDecoration: 'none', borderBottom: '1px solid rgba(79, 195, 247, 0.3)' }}>info@decisionlayer.dev</a> and we&apos;ll get started.
        </p>

        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '12px 24px',
            border: '1.5px solid #2e2e28',
            borderRadius: 4,
            color: '#888880',
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#e8e8df';
            e.currentTarget.style.color = '#e8e8df';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2e2e28';
            e.currentTarget.style.color = '#888880';
          }}
        >
          ← Back to Decision Layer
        </a>
      </div>
    </div>
  );
}
