import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { researchCompanyEvidence } from '@/app/lib/perplexity';
import { generateValuation } from '@/app/lib/valuation';
import { computeComparables } from '@/app/lib/comps';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max (Vercel limit)

const BATCH_SIZE = 10; // Process 10 companies per run to avoid rate limits

export async function GET(req: Request) {
  try {
    // Verify this is a cron request (Vercel sets this header)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.PERPLEXITY_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing API keys' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch companies that need refresh (oldest-first, nulls first)
    const { data: companies, error: fetchError } = await supabase
      .from('lumen_companies')
      .select('*')
      .order('last_researched_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: 'No companies to refresh', processed: 0 });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each company
    for (const company of companies) {
      try {
        // Run research (Perplexity)
        const evidence = await researchCompanyEvidence(supabase, company);

        // Update last_researched_at
        await supabase
          .from('lumen_companies')
          .update({ last_researched_at: new Date().toISOString() })
          .eq('id', company.id);

        // Run valuation (Claude) - only if we have evidence
        if (evidence && evidence.length > 0) {
          const valuation = await generateValuation(supabase, company);

          if (valuation) {
            await supabase
              .from('lumen_companies')
              .update({ last_valuation_at: new Date().toISOString() })
              .eq('id', company.id);
          }
        }

        // Compute comparable companies (both private and public)
        const { private: privateComps } = await computeComparables(supabase, company);

        // Decide whether to refresh public comps:
        // - If <3 private peers: compute daily (necessary for coverage)
        // - If ≥3 private peers: compute weekly (quota savings)
        const shouldRefreshPublicComps = privateComps.length < 3;

        if (!shouldRefreshPublicComps) {
          // Check if public comps are stale (>7 days old)
          const { data: existingPublicComps } = await supabase
            .from('lumen_comps')
            .select('computed_at')
            .eq('company_id', company.id)
            .eq('comp_type', 'public')
            .order('computed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const isStale = !existingPublicComps || new Date(existingPublicComps.computed_at) < weekAgo;

          if (isStale) {
            // Refresh public comps (weekly cadence for well-covered companies)
            await computeComparables(supabase, company);
          }
        } else {
          // Sparse coverage: always refresh public comps (daily cadence)
          await computeComparables(supabase, company);
        }

        // Snapshot current valuation for historical tracking
        const currentVal = company.secondary_value || company.last_round_value;
        if (currentVal) {
          const valuationType = company.secondary_value ? 'secondary' : 'last_round';
          const date = company.secondary_value
            ? company.secondary_date
            : company.last_round_date;

          if (date) {
            await supabase.from('lumen_valuation_history').insert({
              company_id: company.id,
              valuation_type: valuationType,
              value: currentVal,
              date,
              source: 'cron_refresh',
            });
          }
        }

        successCount++;
        results.push({
          company: company.name,
          status: 'success',
          evidenceCount: evidence?.length || 0,
        });

      } catch (err: any) {
        errorCount++;
        results.push({
          company: company.name,
          status: 'error',
          error: err.message,
        });
        console.error(`[cron] Failed to refresh ${company.name}:`, err);
      }

      // Add small delay between companies to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      message: 'Cron job completed',
      processed: companies.length,
      successful: successCount,
      errors: errorCount,
      results,
    });

  } catch (err: any) {
    console.error('[cron/refresh-companies] error:', err);
    return NextResponse.json(
      { error: 'Cron job failed', details: err.message },
      { status: 500 }
    );
  }
}
