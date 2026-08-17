'use client';

type Props = {
  value: number | null;
  pricePerShare?: number | null;
  source: 'ai' | 'secondary' | 'last_round';
  confidence?: number | null;
  date?: string | null;
  onMethodologyClick?: () => void;
};

export function SimpleValuation({ value, pricePerShare, source, confidence, date, onMethodologyClick }: Props) {
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

  // Confidence-aware styling for AI valuations
  const getConfidenceStyle = () => {
    if (source !== 'ai' || !confidence) {
      // Non-AI sources: full prominence (primary round, secondary market are authoritative)
      return {
        fontSize: '56px',
        color: '#C9A227',
        opacity: 1,
      };
    }

    // AI valuations: temper prominence based on confidence
    if (confidence >= 70) {
      // High confidence (70+): full prominence
      return { fontSize: '56px', color: '#C9A227', opacity: 1 };
    } else if (confidence >= 50) {
      // Medium confidence (50-69): slightly muted
      return { fontSize: '56px', color: '#C9A227', opacity: 0.85 };
    } else if (confidence >= 30) {
      // Low confidence (30-49): muted color, slightly smaller
      return { fontSize: '48px', color: '#A38420', opacity: 0.75 };
    } else {
      // Very low confidence (<30): heavily muted, smaller
      return { fontSize: '42px', color: '#8B7020', opacity: 0.65 };
    }
  };

  const getConfidenceBadge = () => {
    if (source !== 'ai' || !confidence) return null;

    if (confidence < 30) {
      return (
        <div
          style={{
            display: 'inline-block',
            marginLeft: '12px',
            padding: '4px 10px',
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#DC2626',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            verticalAlign: 'middle',
          }}
        >
          Low Confidence
        </div>
      );
    } else if (confidence < 50) {
      return (
        <div
          style={{
            display: 'inline-block',
            marginLeft: '12px',
            padding: '4px 10px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#D97706',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            verticalAlign: 'middle',
          }}
        >
          Uncertain
        </div>
      );
    }
    return null;
  };

  const confidenceStyle = getConfidenceStyle();
  const confidenceBadge = getConfidenceBadge();

  // Adjust container styling based on confidence for AI valuations
  const getContainerStyle = () => {
    const baseStyle = {
      borderRadius: '8px',
      padding: '32px 24px',
      textAlign: 'center' as const,
    };

    if (source !== 'ai' || !confidence) {
      // Non-AI sources: full prominence
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(201,162,39,0.03) 100%)',
        border: '2px solid rgba(201,162,39,0.3)',
      };
    }

    // AI valuations: adjust prominence based on confidence
    if (confidence >= 50) {
      // Medium-high confidence (50+): full prominence
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(201,162,39,0.03) 100%)',
        border: '2px solid rgba(201,162,39,0.3)',
      };
    } else {
      // Low confidence (<50): muted container
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(139,149,161,0.08) 0%, rgba(139,149,161,0.02) 100%)',
        border: '2px solid rgba(139,149,161,0.2)',
      };
    }
  };

  const containerStyle = getContainerStyle();

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={containerStyle}>
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
        <div style={{ marginBottom: pricePerShare ? '8px' : '12px' }}>
          <div
            style={{
              fontSize: confidenceStyle.fontSize,
              fontWeight: 700,
              color: confidenceStyle.color,
              opacity: confidenceStyle.opacity,
              fontFamily: 'monospace',
              lineHeight: 1,
              display: 'inline-block',
            }}
          >
            {formatBillions(value)}
          </div>
          {confidenceBadge}
        </div>

        {pricePerShare && (
          <div style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#8B95A1',
            fontFamily: 'monospace',
            marginBottom: '12px'
          }}>
            ${pricePerShare.toFixed(2)}/share
          </div>
        )}

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
