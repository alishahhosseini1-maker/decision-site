// @ts-nocheck
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getRoundColor, getRoundLabel, getRoundStageOrder } from '@/app/lib/roundParser';

type FundingRound = {
  id: string;
  date: string;
  value: number; // Valuation in billions
  round_type: string | null;
  funding_amount: string | null;
  source_label: string;
  description: string;
};

type Props = {
  rounds: FundingRound[];
  companyName: string;
};

export function FundingRoundsChart({ rounds, companyName }: Props) {
  // Minimum 2 rounds required
  if (!rounds || rounds.length < 2) {
    if (rounds?.length === 1) {
      return (
        <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #1F2833', borderRadius: '6px', background: '#0A0F14' }}>
          <div style={{ fontSize: '13px', color: '#8B95A1', textAlign: 'center' }}>
            1 funding round on record — not enough for a timeline view
          </div>
        </div>
      );
    }
    return null; // 0 rounds = no component at all
  }

  // Sort by date
  const sortedRounds = [...rounds].sort((a, b) => a.date.localeCompare(b.date));

  // Prepare data for chart with growth deltas
  const chartData = sortedRounds.map((round, idx) => {
    let delta = null;
    if (idx > 0 && sortedRounds[idx - 1].value > 0 && round.value > 0) {
      const prevValue = sortedRounds[idx - 1].value;
      delta = ((round.value - prevValue) / prevValue) * 100;
    }

    return {
      ...round,
      displayLabel: getRoundLabel(round.round_type, round.funding_amount),
      dateLabel: new Date(round.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      color: getRoundColor(round.round_type),
      valueBillions: round.value,
      growthPct: delta,
    };
  });

  return (
    <div style={{ marginTop: '16px', border: '1px solid #1F2833', borderRadius: '6px', padding: '20px', background: '#0A0F14' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 className="display" style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', color: '#E8EAED' }}>
          Funding History
        </h3>
        <div style={{ fontSize: '11px', color: '#8B95A1' }}>
          Based on {rounds.length} known funding {rounds.length === 1 ? 'round' : 'rounds'}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
          <XAxis
            dataKey="dateLabel"
            stroke="#5A6470"
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#5A6470"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) => `$${value}B`}
            label={{
              value: 'Valuation',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '11px', fill: '#8B95A1' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F1419',
              border: '1px solid #1F2833',
              borderRadius: '4px',
              fontSize: '12px',
              padding: '12px',
            }}
            labelStyle={{ color: '#E8EAED', marginBottom: '8px', fontWeight: 600 }}
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const data = payload[0].payload;
              return (
                <div style={{
                  backgroundColor: '#0F1419',
                  border: '1px solid #1F2833',
                  borderRadius: '4px',
                  padding: '12px',
                  fontSize: '12px',
                }}>
                  <div style={{ color: '#E8EAED', fontWeight: 600, marginBottom: '8px' }}>
                    {new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ color: '#B5BDC6', marginBottom: '4px' }}>
                    <strong>Valuation:</strong> ${data.valueBillions}B
                  </div>
                  {data.round_type && (
                    <div style={{ color: '#B5BDC6', marginBottom: '4px' }}>
                      <strong>Round:</strong> {data.round_type}
                    </div>
                  )}
                  {data.funding_amount && (
                    <div style={{ color: '#B5BDC6', marginBottom: '4px' }}>
                      <strong>Amount Raised:</strong> {data.funding_amount}
                    </div>
                  )}
                  <div style={{ color: '#8B95A1', fontSize: '11px', marginTop: '6px', borderTop: '1px solid #1F2833', paddingTop: '6px' }}>
                    Source: {data.source_label}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="valueBillions" radius={[4, 4, 0, 0]} label={(props: any) => {
            const { x, y, width, index } = props;
            const data = chartData[index];
            if (!data.growthPct) return null;

            const isPositive = data.growthPct > 0;
            return (
              <text
                x={x + width / 2}
                y={y - 8}
                fill={isPositive ? '#3FBF7F' : '#E5484D'}
                textAnchor="middle"
                fontSize="11px"
                fontWeight="600"
              >
                {isPositive ? '+' : ''}{data.growthPct.toFixed(0)}%
              </text>
            );
          }}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px' }}>
        {chartData.map((round, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: round.color }} />
            <span style={{ color: '#B5BDC6' }}>{round.displayLabel}</span>
          </div>
        ))}
      </div>

      {/* Data quality note */}
      {rounds.length < 5 && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#5A6470', fontStyle: 'italic' }}>
          Limited funding data available. Some rounds may be undisclosed.
        </div>
      )}
    </div>
  );
}
