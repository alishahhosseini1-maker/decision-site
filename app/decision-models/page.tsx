import Link from 'next/link';

const MODELS = [
  'Decision vs Outcome',
  'What Has to Be True',
  'Disconfirming Evidence',
  'Failure Modes',
  'Base Rates',
  'Second-Order Effects',
  'Concentration Risk',
  'Optionality',
];

export default function DecisionModelsPage() {
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
        Decision Models
      </h1>

      <p style={{ maxWidth: 760, margin: '0 0 22px 0', opacity: 0.85 }}>
        Simple mental models used to reason about capital allocation under
        uncertainty. These are not forecasts. They are lenses for thinking
        clearly when decisions feel noisy.
      </p>

      <section
        style={{
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 12,
          padding: 18,
          maxWidth: 760,
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 12px 0' }}>Core Models</h2>

        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {MODELS.map((m) => (
            <li key={m} style={{ margin: '6px 0' }}>
              {m}
            </li>
          ))}
        </ul>
      </section>

      <footer
        style={{
          marginTop: 22,
          maxWidth: 760,
          fontStyle: 'italic',
          opacity: 0.7,
        }}
      >
        Models are tools. Misused models create false confidence.
      </footer>
    </main>
  );
}
