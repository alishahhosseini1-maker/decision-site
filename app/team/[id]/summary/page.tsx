'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type TeamSummary = {
  executive_signal?: string;
  decision?: string;
  tension?: string;
  recommended_move?: string;
  tradeoff?: string;
  confidence_score?: number;
  confidence_reason?: string;
  projection_14d?: string;
  contradictions?: string | null;
  operating?: {
    working?: string[];
    breaking?: string[];
    top_risk?: string;
  };
  leadership_edge?: string;
  raw_inputs?: any[];
};

type TeamSession = {
  id: string;
  title: string;
  prompt: string;
  deadline: string | null;
  status: string | null;
  created_by: string | null;
  closed_at: string | null;
  summary_json: TeamSummary | null;
  summary_generated_at: string | null;
  summary_emailed_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
};

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<TeamSession | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');

        const { data } = await supabase
          .from('team_sessions')
          .select('*')
          .eq('id', id)
          .single();

        if (!data) throw new Error('Session not found');

        setSession(data);
        setSummary(data.summary_json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <div className="p-10">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!summary || !session) return <div className="p-10">No summary</div>;

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* HEADER */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-black/40">
            Prepared for: Decision, not review
          </p>

          <h1 className="text-3xl font-semibold">
            {session.title}
          </h1>
        </div>

        {/* EXECUTIVE SIGNAL (HERO) */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-black/5">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Executive Signal
          </p>

          <h2 className="mt-4 text-2xl font-semibold leading-snug">
            {summary.executive_signal}
          </h2>
        </div>

        {/* DECISION BLOCK */}
        <div className="grid gap-6 md:grid-cols-2">

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">The Decision</p>
            <p className="mt-3 text-lg font-medium">
              {summary.decision}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Why It Matters</p>
            <p className="mt-3 text-sm text-black/70">
              {summary.tension}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Recommended Move</p>
            <p className="mt-3 text-sm font-medium">
              {summary.recommended_move}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Tradeoff</p>
            <p className="mt-3 text-sm text-black/70">
              {summary.tradeoff}
            </p>
          </div>

        </div>

        {/* CONFIDENCE + PROJECTION */}
        <div className="grid gap-6 md:grid-cols-2">

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Confidence</p>
            <p className="mt-2 text-3xl font-semibold">
              {summary.confidence_score}
            </p>
            <p className="mt-2 text-sm text-black/60">
              {summary.confidence_reason}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">If Nothing Changes (14 Days)</p>
            <p className="mt-3 text-sm text-black/70">
              {summary.projection_14d}
            </p>
          </div>

        </div>

        {/* CONTRADICTIONS */}
        {summary.contradictions && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
            <p className="text-xs uppercase text-amber-700">
              Misalignment Detected
            </p>
            <p className="mt-2 text-sm text-amber-800">
              {summary.contradictions}
            </p>
          </div>
        )}

        {/* OPERATING SNAPSHOT */}
        <div className="grid gap-6 md:grid-cols-3">

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Working</p>
            <ul className="mt-3 text-sm space-y-2">
              {summary.operating?.working?.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Breaking</p>
            <ul className="mt-3 text-sm space-y-2">
              {summary.operating?.breaking?.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <p className="text-xs uppercase text-black/40">Top Risk</p>
            <p className="mt-3 text-sm text-black/70">
              {summary.operating?.top_risk}
            </p>
          </div>

        </div>

        {/* LEADERSHIP EDGE */}
        <div className="bg-black text-white p-6 rounded-2xl">
          <p className="text-xs uppercase text-white/60">
            Leadership Edge
          </p>
          <p className="mt-3 text-lg leading-relaxed">
            {summary.leadership_edge}
          </p>
        </div>

      </div>
    </main>
  );
}