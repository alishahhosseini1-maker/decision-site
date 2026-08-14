import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, CONFIDENCE_MAP } from '@/app/lib/lumen';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const category = CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0];
    const description = (body.description || '').trim();
    const value = (body.value || '').trim() || null;
    const sourceType = Object.keys(CONFIDENCE_MAP).includes(body.sourceType) ? body.sourceType : Object.keys(CONFIDENCE_MAP)[0];
    const sourceLabel = (body.sourceLabel || '').trim();
    const date = (body.date || '').trim();
    const contributor = (body.contributor || 'anonymous').trim();

    if (!description || !sourceLabel || !date) {
      return NextResponse.json({ error: 'Description, source, and date are required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('lumen_evidence')
      .insert({
        company_id: params.id,
        category,
        description,
        value,
        source_type: sourceType,
        source_label: sourceLabel,
        date,
        contributor,
        status: 'pending',
        verified_by: [],
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ evidence: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit evidence.' }, { status: 500 });
  }
}
