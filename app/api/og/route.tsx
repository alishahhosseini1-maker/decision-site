import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#F7F6F3',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px 90px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Top: wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '18px',
              fontWeight: 400,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.40)',
            }}
          >
            Decision Layer
          </div>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '64px',
              fontWeight: 400,
              lineHeight: 1.1,
              color: '#0b0b0b',
              letterSpacing: '-0.02em',
            }}
          >
            Find what everything else missed
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '22px',
              fontWeight: 400,
              color: 'rgba(0,0,0,0.50)',
              lineHeight: 1.5,
              maxWidth: '800px',
            }}
          >
            A clear verdict for high-stakes decisions.
          </div>
        </div>

        {/* Bottom: status line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#16a34a',
            }}
          />
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              color: 'rgba(0,0,0,0.36)',
              letterSpacing: '0.04em',
            }}
          >
            decisionlayer.dev
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
