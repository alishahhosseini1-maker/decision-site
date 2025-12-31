import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: '72px auto',
        padding: '0 20px',
        lineHeight: 1.55,
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 40,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.75 }}>
          <strong>Decision Layer</strong> · working reference
        </div>

        <nav style={{ display: 'flex', gap: 14, fontSize: 14 }}>
          <Link href="/decision-review" style={{ textDecoration: 'none' }}>
            Decision Review
          </Link>
          <Link href="/decision-models" style={{ textDecoration: 'none' }}>
            Decision Models
          </Link>
          <Link href="/walkthrough" style={{ textDecoration: 'none' }}>
            Walkthrough
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <h1 style={{ fontSize: 48, margin: '0 0 16px 0', letterSpacing: -0.5 }}>
        Decision Thinking for <br /> Capital Allocation
      </h1>

      <p style={{ fontSize: 18, maxWidth: 760, margin: '0 0 12px 0' }}>
        A working reference for technically-minded professionals who don’t need
        more information — they need clearer decisions.
      </p>

      <p style={{ fontSize: 18, maxWidth: 760, margin: '0 0 22px 0' }}>
        Designed for people who understand complex systems, but find that
        markets and capital allocation feel noisy, emotional, or poorly
        constrained.
      </p>

      <div
        style={{
          borderLeft: '3px solid rgba(0,0,0,0.12)',
          paddingLeft: 14,
          margin: '26px 0 34px 0',
          maxWidth: 760,
        }}
      >
        <p style={{ margin: 0, opacity: 0.85 }}>
          This is not investment advice. It is not a product. It is a way of
          thinking.
        </p>
      </div>

      {/* Primary actions */}
      <section style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
        <Link
          href="/decision-review"
          style={{
            display: 'block',
            padding: '14px 16px',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          <div style={{ fontWeight: 600 }}>→ Decision Review</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>
            Pressure-test a decision before committing capital.
          </div>
        </Link>

        <Link
          href="/decision-review/walkthrough"
          style={{
            display: 'block',
            padding: '14px 16px',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          <div style={{ fontWeight: 600 }}>→ Decision Review Walkthrough</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>
            A 3-minute guide to using the Decision Review correctly.
          </div>
        </Link>

        <Link
          href="/decision-models"
          style={{
            display: 'block',
            padding: '14px 16px',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          <div style={{ fontWeight: 600 }}>→ Decision Models</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>
            Core mental models for reasoning under uncertainty.
          </div>
        </Link>
      </section>

      <footer style={{ marginTop: 52, fontStyle: 'italic', opacity: 0.7 }}>
        If this feels slow, that’s intentional.
      </footer>
    </main>
  );
}
