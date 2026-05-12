import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Decision ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('[load-shared] Error loading decision:', error);
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // Return the full decision data for public share
    return NextResponse.json(data);
  } catch (err) {
    console.error('[load-shared] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load decision' },
      { status: 500 }
    );
  }
}
