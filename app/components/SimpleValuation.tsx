'use client';

type Props = {
  value: number | null;
  source: 'ai' | 'secondary' | 'last_round';
  confidence?: number | null;
  date?: string | null;
  onMethodologyClick?: () => void;
};

export function SimpleValuation({ value, source, confidence, date, onMethodologyClick }: Props) {
  if (!value) {
    return (
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#5A6470', fontSize: '13px' }}>
        No valuation data available
      </div>
    );
  }

  const formatBillions = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}T`;
    if (val >= 1) return `$${val.toFixed(1)}B`;
    return `$${(val * 1000).toFixed(0)}M`;
  };

  const getSourceLabel = () => {
    switch (source) {
      case 'ai':
        return `AI fair value${confidence ? ` · ${confidence}/100 confidence` : ''}`;
      case 'secondary':
        return `Secondary implied${date ? ` · ${date}` : ''}`;
      case 'last_round':
        return `Last funding round${date ? ` · ${date}` : ''}`;
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(201,162,39,0.03) 100%)',
          border: '2px solid rgba(201,162,39,0.3)',
          borderRadius: '8px',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: '#8B95A1',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          Current Valuation
        </div>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 700,
            color: '#C9A227',
            fontFamily: 'monospace',
            lineHeight: 1,
            marginBottom: '12px',
          }}
        >
          {formatBillions(value)}
        </div>
        <div style={{ fontSize: '11px', color: '#5A6470' }}>{getSourceLabel()}</div>
      </div>

      {source === 'ai' && onMethodologyClick && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#5A6470',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          Derived from crowdsourced evidence and AI inference. Not investment advice.{' '}
          <button
            onClick={onMethodologyClick}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B95A1',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: '11px',
              fontStyle: 'italic',
            }}
          >
            See methodology
          </button>
        </div>
      )}
    </div>
  );
}
