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
          fontSize: 36,
          fontWeight: 400,
          color: '#e8e8df',
          marginBottom: 16,
          lineHeight: 1.2,
        }}>
          You&apos;re in the queue.
        </h1>
        <p style={{
          fontSize: 15,
          color: '#888880',
          lineHeight: 1.65,
          marginBottom: 32,
        }}>
          Your network analysis will be ready within 48 hours.<br />
          Check your inbox — we&apos;ll send it directly.
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
