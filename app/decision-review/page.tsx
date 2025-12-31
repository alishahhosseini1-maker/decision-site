import Link from 'next/link';

export default function DecisionReviewPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: '72px auto',
        padding: '0 20px',
        lineHeight: 1.55,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 30,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', fontSize: 14 }}>
          ← Home
        </Link>

        <nav style={{ display: 'flex', gap: 14, fontSize: 14 }}>
          <Link href="/decision-review" style={{ textDecoration: 'none' }}>
            Decision Review
          </Link>
          <Link href="/decision-models" style={{ textDecoration: 'none' }}>
            Decision Models
          </Link>
        </nav>
      </header>

      <h1 style={{ fontSize: 40, margin: '0 0 10px 0', letterSpacing: -0.3 }}>
        Decision Review
      </h1>

      <p style={{ maxWidth: 760, margin: '0 0 22px 0', opacity: 0.85 }}>
        A private working document to pressure-test decisions before committing
        capital. This is about reducing blind spots — not increasing confidence.
      </p>

      <section
        style={{
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 12,
          padding: 18,
          maxWidth: 760,
        }}
      >
        <Block
          n="1"
          title="The Decision (one sentence)"
          q="What decision am I actually making?"
        />
        <Block
          n="2"
          title="What Has to Be True"
          q="What must be true for this decision to work — not what could go right?"
        />
        <Block
          n="3"
          title="Disconfirming Evidence"
          q="What evidence would clearly show this decision is wrong?"
        />
        <Block
          n="4"
          title="Failure Modes (ranked)"
          q="How does this fail even if the thesis is “right”?"
        />
        <Block
          n="5"
          title="Opportunity Cost"
          q="What am I giving up by saying yes to this?"
        />
        <Block
          n="6"
          title="Constraints"
          q="What real-world constraints must be respected?"
        />
        <Block
          n="7"
          title="Size & Timing Rules"
          q="If I proceed, what rules prevent overconfidence?"
        />
        <Block
          n="8"
          title="Final Check"
          q="If this underperforms, will I regret the outcome — or the process?"
          last
        />
      </section>

      <footer style={{ marginTop: 22, maxWidth: 760, opacity: 0.75 }}>
        Clarity is the objective. Confidence often trails bias. Process over
        outcome.
      </footer>
    </main>
  );
}

function Block({
  n,
  title,
  q,
  last,
}: {
  n: string;
  title: string;
  q: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.15)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            opacity: 0.8,
            flexShrink: 0,
          }}
        >
          {n}
        </div>
        <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
      </div>

      <p style={{ margin: '8px 0 0 38px', opacity: 0.85 }}>{q}</p>
      <p style={{ margin: '8px 0 0 38px', fontSize: 14, opacity: 0.6 }}>
        (Write your answer in plain language. Be specific.)
      </p>
    </div>
  );
}
<p style={{ marginTop: '24px' }}>
  <a href="/decision-review/walkthrough">→ Walk through an example</a>
</p>;
<p style={{ marginTop: '12px' }}>
  <a href="/decision-review/walkthrough">→ Decision Review Walkthrough</a>
</p>;
<p style={{ marginTop: 16 }}>
  <a href="/walkthrough">→ Walkthrough (3 minutes)</a>
</p>;
