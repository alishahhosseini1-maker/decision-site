import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');

    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Missing CRON_SECRET' }, { status: 500 });
    }

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();

    const { data: sessions, error } = await supabase
      .from('team_sessions')
      .select('id, deadline, summary_generated_at, summary_json, deleted_at')
      .not('deadline', 'is', null)
      .lte('deadline', nowIso)
      .is('deleted_at', null)
      .or('summary_generated_at.is.null,summary_json.is.null');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(req.url).origin;

    const results: Array<{ sessionId: string; ok: boolean; error?: string }> = [];

    for (const session of sessions || []) {
      try {
        const res = await fetch(`${baseUrl}/api/team/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session.id }),
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text();
          results.push({
            sessionId: session.id,
            ok: false,
            error: text || `HTTP ${res.status}`,
          });
          continue;
        }

        results.push({ sessionId: session.id, ok: true });
      } catch (err: any) {
        results.push({
          sessionId: session.id,
          ok: false,
          error: err?.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: nowIso,
      found: sessions?.length || 0,
      finalized: results.filter((r) => r.ok).length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}