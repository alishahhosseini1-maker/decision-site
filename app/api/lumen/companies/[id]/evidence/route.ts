import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, MANUAL_SOURCE_TYPES } from '@/app/lib/lumen';
import { parseValuationFromText, parseRoundTypeFromText } from '@/app/lib/valuationParser';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const category = CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0];
    const description = (body.description || '').trim();
    let value = (body.value || '').trim() || null;
    const sourceType = MANUAL_SOURCE_TYPES.includes(body.sourceType) ? body.sourceType : MANUAL_SOURCE_TYPES[0];
    const sourceLabel = (body.sourceLabel || '').trim();
    const date = (body.date || '').trim();
    const contributor = (body.contributor || 'anonymous').trim();
    const affiliationDisclosed = Boolean(body.affiliationDisclosed);
    const affiliationType = affiliationDisclosed ? (body.affiliationType || '').trim() || null : null;

    // Auto-extract valuation for Funding evidence if not provided
    let roundType = body.roundType || null;
    if (category === 'Funding') {
      if (!value) {
        const parsedValue = parseValuationFromText(description);
        if (parsedValue !== null) {
          value = parsedValue.toString();
        }
      }
      if (!roundType) {
        roundType = parseRoundTypeFromText(description);
      }
    }

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
        round_type: roundType, // Auto-extracted for Funding evidence
        source_type: sourceType,
        source_label: sourceLabel,
        date,
        contributor,
        status: 'pending',
        verified_by: [],
        affiliation_disclosed: affiliationDisclosed,
        affiliation_type: affiliationType,
        citation_url: null, // Human submissions don't require citation URLs (only AI research does)
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ evidence: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit evidence.' }, { status: 500 });
  }
}
