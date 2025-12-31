import Link from 'next/link';

export default function WalkthroughPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: '72px auto',
        padding: '0 20px',
        lineHeight: 1.55,
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, opacity: 0.75 }}>
          <strong>Decision Layer</strong> · walkthrough
        </div>
        <div style={{ marginTop: 10 }}>
          <Link href="/" style={{ textDecoration: 'none', fontSize: 14 }}>
            ← Home
          </Link>
        </div>
      </header>

      <h1 style={{ fontSize: 40, margin: '0 0 12px 0', letterSpacing: -0.4 }}>
        Decision Review Walkthrough
      </h1>

      <p style={{ fontSize: 18, maxWidth: 760, margin: '0 0 24px 0' }}>
        Use this in under 3 minutes. Keep it uncomfortable. Keep it honest.
      </p>

      <section style={{ display: 'grid', gap: 18, maxWidth: 760 }}>
        <Block
          n="1"
          title="The Decision"
          body="Write the decision in one sentence. If you can’t, you’re not ready to act."
        />
        <Block
          n="2"
          title="What Has to Be True"
          body="List 3–5 load-bearing assumptions. If one breaks, the decision weakens."
        />
        <Block
          n="3"
          title="Disconfirming Evidence"
          body="Name what would prove you wrong. If nothing can falsify it, it’s a story."
        />
        <Block
          n="4"
          title="Failure Modes"
          body="Most damage comes from sizing, timing, and concentration — not ideas."
        />
        <Block
          n="5"
          title="Opportunity Cost"
          body="What are you giving up by allocating here instead of elsewhere?"
        />
        <Block
          n="6"
          title="Constraints"
          body="Liquidity, career risk, existing concentration, and emotional bandwidth."
        />
        <Block
          n="7"
          title="Size & Timing Rules"
          body="Pre-commit rules that prevent overconfidence. Rules beat willpower."
        />
        <Block
          n="8"
          title="Final Check"
          body="If this underperforms, will you regret the outcome — or the process?"
        />
      </section>

      <div
        style={{ marginTop: 34, display: 'flex', gap: 14, flexWrap: 'wrap' }}
      >
        <Link
          href="/decision-review"
          style={{
            display: 'inline-block',
            padding: '12px 14px',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          ← Back to Decision Review
        </Link>

        <Link
          href="/decision-models"
          style={{
            display: 'inline-block',
            padding: '12px 14px',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          → Explore Decision Models
        </Link>
      </div>

      <footer style={{ marginTop: 42, fontStyle: 'italic', opacity: 0.7 }}>
        The goal is not certainty. The goal is fewer unforced errors.
      </footer>
    </main>
  );
}

function Block({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>
        Step {n}
      </div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ opacity: 0.9 }}>{body}</div>
    </div>
  );
}
