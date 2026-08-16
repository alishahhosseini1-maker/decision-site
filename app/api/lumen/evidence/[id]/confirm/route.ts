import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { confirmationsNeededFor } from '@/app/lib/lumen';
import { applyConfirmedFigure } from '@/app/lib/valuation';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const contributor = (body.contributor || '').trim();
    const affiliationDisclosed = Boolean(body.affiliationDisclosed);

    if (!contributor) {
      return NextResponse.json({ error: 'Missing contributor identity.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ev, error: fetchError } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (ev.status !== 'pending') {
      return NextResponse.json({ evidence: ev });
    }
    if (ev.contributor === contributor) {
      return NextResponse.json({ error: "You can't confirm your own submission." }, { status: 400 });
    }

    // verified_by is now an array of {name, affiliation_disclosed}
    // For backward compatibility, handle legacy string[] format
    const already: Array<string | { name: string; affiliation_disclosed: boolean }> = ev.verified_by || [];
    const alreadyNames = already.map((v) => (typeof v === 'string' ? v : v.name));

    if (alreadyNames.includes(contributor)) {
      return NextResponse.json({ evidence: ev });
    }

    const verifiedBy = [...already, { name: contributor, affiliation_disclosed: affiliationDisclosed }];

    // For affiliated evidence: count only non-affiliated verifiers
    // For non-affiliated evidence: count all verifiers (standard threshold)
    let independentVerifierCount = 0;
    if (ev.affiliation_disclosed === true) {
      // CRITICAL: For affiliated evidence, only count non-affiliated verifiers
      independentVerifierCount = verifiedBy.filter((v) => {
        if (typeof v === 'string') return true; // Legacy verifiers assumed independent
        return v.affiliation_disclosed === false;
      }).length;
    } else {
      // Non-affiliated evidence: standard threshold
      independentVerifierCount = verifiedBy.length;
    }

    const requiredConfirmations = ev.affiliation_disclosed === true
      ? 2 // ALWAYS require 2 independent verifiers for affiliated evidence
      : confirmationsNeededFor(ev.contributor); // Standard threshold for non-affiliated

    const status = independentVerifierCount >= requiredConfirmations ? 'verified' : 'pending';

    const { data: updated, error: updateError } = await supabase
      .from('lumen_evidence')
      .update({ verified_by: verifiedBy, status })
      .eq('id', params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    if (updated.status === 'verified') {
      await applyConfirmedFigure(supabase, updated.company_id, updated);
    }

    return NextResponse.json({ evidence: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to confirm evidence.' }, { status: 500 });
  }
}
