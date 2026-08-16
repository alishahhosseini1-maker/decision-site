// @ts-nocheck
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function ValuationChart({ data }: { data: any[] }) {
  console.log('ValuationChart received data:', data, 'length:', data?.length);
  if (!data || data.length === 0) {
    console.log('ValuationChart: No data, not rendering');
    return null;
  }
  console.log('ValuationChart: Rendering with', data.length, 'data points');

  return (
    <div style={{ marginTop: '16px', border: '1px solid #1F2833', borderRadius: '6px', padding: '16px' }}>
      <h3 className="display" style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>
        Valuation History
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="date"
            stroke="#5A6470"
            style={{ fontSize: '11px' }}
            tickFormatter={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }}
          />
          <YAxis
            stroke="#5A6470"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) => `$${value}B`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F1419',
              border: '1px solid #1F2833',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#E8EAED', marginBottom: '4px' }}
            itemStyle={{ color: '#B5BDC6' }}
            formatter={(value: any) => [`$${value}B`, '']}
            labelFormatter={(date) => {
              const d = new Date(date as string);
              return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            iconType="line"
          />
          {/* Last Round valuations */}
          <Line
            type="monotone"
            dataKey="last_round"
            stroke="#C9A227"
            strokeWidth={2}
            dot={{ fill: '#C9A227', r: 3 }}
            name="Last Round"
            connectNulls
          />
          {/* Secondary Market valuations */}
          <Line
            type="monotone"
            dataKey="secondary"
            stroke="#3FBF7F"
            strokeWidth={2}
            dot={{ fill: '#3FBF7F', r: 3 }}
            name="Secondary Market"
            connectNulls
          />
          {/* AI Estimated valuations */}
          <Line
            type="monotone"
            dataKey="ai_estimated"
            stroke="#8B95A1"
            strokeWidth={2}
            dot={{ fill: '#8B95A1', r: 3 }}
            strokeDasharray="5 5"
            name="AI Estimate"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
