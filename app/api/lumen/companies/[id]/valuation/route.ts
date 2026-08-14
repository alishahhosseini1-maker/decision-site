import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { CONFIDENCE_MAP, fmtB } from '@/app/lib/lumen';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY.' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: company, error: companyError } = await supabase
      .from('lumen_companies')
      .select('*')
      .eq('id', params.id)
      .single();

    if (companyError) throw companyError;

    const { data: evidence, error: evidenceError } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', params.id)
      .eq('status', 'verified');

    if (evidenceError) throw evidenceError;

    const evidenceLines = (evidence || [])
      .map((e) => {
        const conf = CONFIDENCE_MAP[e.source_type] ?? 50;
        return `- [${e.category}] ${e.description}${e.value ? ` (${e.value})` : ''} — source: ${e.source_type} (confidence ${conf}), dated ${e.date}`;
      })
      .join('\n');

    const prompt = `You are a private-market valuation analyst. Based only on the verified evidence below about ${company.name} (${company.sector || 'unknown sector'}), produce a valuation analysis.

Last primary financing round: ${fmtB(company.last_round_value)} (${company.last_round_date || 'unknown'})
Secondary market implied valuation: ${fmtB(company.secondary_value)} (${company.secondary_date || 'unknown'})

Verified evidence:
${evidenceLines || '(none)'}

Respond with ONLY valid JSON, no markdown code fences, no preamble or trailing text, matching exactly this schema:
{"bearCase": number, "baseCase": number, "bullCase": number, "confidenceScore": number, "keyDrivers": [{"label": string, "impact": "+" or "-", "note": string}], "explanation": string}

All valuation numbers are in billions of USD as plain numbers (e.g. 20.7). confidenceScore is 0-100. keyDrivers should have 3 to 5 items. explanation should be 2 to 3 sentences describing how the evidence was weighted to reach the base case.`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) throw new Error('No response text from model.');

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const { data: saved, error: saveError } = await supabase
      .from('lumen_valuations')
      .upsert(
        {
          company_id: params.id,
          bear_case: parsed.bearCase,
          base_case: parsed.baseCase,
          bull_case: parsed.bullCase,
          confidence_score: parsed.confidenceScore,
          key_drivers: parsed.keyDrivers,
          explanation: parsed.explanation,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      )
      .select('*')
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({ valuation: saved });
  } catch (err: any) {
    console.error('[lumen/valuation] error:', err);
    return NextResponse.json({ error: "Couldn't generate a valuation. Try again." }, { status: 500 });
  }
}
