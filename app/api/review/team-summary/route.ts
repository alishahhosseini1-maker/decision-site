import { NextResponse } from 'next/server';

type TeamInput = {
  id?: string;
  name?: string | null;
  department?: string;
  moved_forward?: string;
  not_working?: string;
  risk?: string;
  needs?: string;
  next_action?: string | null;
};

export async function POST(req: Request) {
  try {
    const { inputs } = await req.json();

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json({ error: 'Inputs are required.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const safeInputs: TeamInput[] = inputs.map((input: TeamInput) => ({
      name: input?.name ?? null,
      department: input?.department ?? '',
      moved_forward: input?.moved_forward ?? '',
      not_working: input?.not_working ?? '',
      risk: input?.risk ?? '',
      needs: input?.needs ?? '',
      next_action: input?.next_action ?? null,
    }));

    const systemPrompt = `
You are a sharp executive operator reviewing a weekly team decision report.

Your job is not to summarize line by line.
Your job is to surface the primary risk signal, what leadership is about to miss, what happens if this is ignored, and what decision should happen now.

Write in plain English so a smart 15-year-old can understand it.

Return only valid JSON with this exact shape:

{
  "topSignal": string,
  "decision": string,
  "tradeoff": string,
  "recommendation": string,
  "priority": string[],
  "owners": string[],
  "timeline": string[],
  "overallSummary": string,
  "working": string[],
  "breaking": string[],
  "risks": string[],
  "actions": string[],
  "contradiction": string,
  "hiddenRisk": string
}

Rules:
- topSignal: one sharp sentence describing the primary risk signal leadership should see first. It should feel urgent and concrete, not generic.
- decision: answer "what should leadership decide right now?" in one concise sentence. If no major decision is required, return the clearest next call.
- tradeoff: explain the core tradeoff in one concise sentence.
- recommendation: give the clearest recommended move in one concise sentence.
- priority: rank the most important issues in order, highest first.
- owners: assign likely owners by function or role, not person names unless obvious from the input.
- timeline: break action into near-term timing such as "Today:", "This week:", "Next 2 weeks:".
- overallSummary: 2-3 sentences explaining what leadership is about to miss if they only skim this. It should feel sharper than a recap.
- working: only include positive signals that matter.
- breaking: include real breakdowns or friction points.
- risks: include forward-looking risks. These should answer what gets worse if nothing changes.
- actions: include specific and realistic next moves, not generic management advice.
- contradiction: identify something that does not add up across inputs. If there is no clear contradiction, return exactly: "Inputs appear aligned. Risk of blind agreement if no dissenting signal is surfacing."
- hiddenRisk: identify the subtle but important risk leadership is most likely to underestimate if this issue is ignored. This should feel like the sentence under "If not addressed."
- The field "next_action" may actually represent optional extra notes or "anything else to share."
- Compress and interpret.
- Prioritize signal over completeness.
- Be concise.
- No fluff.
- No motivational language.
- No consultant filler.
- Do not repeat the same sentence across multiple fields.
- Do not just restate the inputs. Interpret them.
- Make the output feel like a decision review, not a report.
`;

    const userPrompt = `
Here are the team inputs:

${JSON.stringify(safeInputs, null, 2)}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenAI request failed: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No content returned from OpenAI.' },
        { status: 500 }
      );
    }

    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'OpenAI returned invalid JSON.' },
        { status: 500 }
      );
    }

    const safeTopSignal =
      typeof parsed?.topSignal === 'string' && parsed.topSignal.trim()
        ? parsed.topSignal.trim()
        : 'No primary risk signal identified yet.';

    const safeDecision =
      typeof parsed?.decision === 'string' && parsed.decision.trim()
        ? parsed.decision.trim()
        : 'No immediate decision identified yet.';

    const safeTradeoff =
      typeof parsed?.tradeoff === 'string' && parsed.tradeoff.trim()
        ? parsed.tradeoff.trim()
        : '';

    const safeRecommendation =
      typeof parsed?.recommendation === 'string' && parsed.recommendation.trim()
        ? parsed.recommendation.trim()
        : '';

    const safeOverallSummary =
      typeof parsed?.overallSummary === 'string' && parsed.overallSummary.trim()
        ? parsed.overallSummary.trim()
        : 'No leadership summary returned.';

    const safeContradiction =
      typeof parsed?.contradiction === 'string' && parsed.contradiction.trim()
        ? parsed.contradiction.trim()
        : 'Inputs appear aligned. Risk of blind agreement if no dissenting signal is surfacing.';

    const safeHiddenRisk =
      typeof parsed?.hiddenRisk === 'string' && parsed.hiddenRisk.trim()
        ? parsed.hiddenRisk.trim()
        : 'If ignored, this issue will likely stay hidden until it starts affecting outcomes more visibly.';

    return NextResponse.json({
      topSignal: safeTopSignal,
      decision: safeDecision,
      tradeoff: safeTradeoff,
      recommendation: safeRecommendation,
      priority: Array.isArray(parsed?.priority) ? parsed.priority : [],
      owners: Array.isArray(parsed?.owners) ? parsed.owners : [],
      timeline: Array.isArray(parsed?.timeline) ? parsed.timeline : [],
      overallSummary: safeOverallSummary,
      working: Array.isArray(parsed?.working) ? parsed.working : [],
      breaking: Array.isArray(parsed?.breaking) ? parsed.breaking : [],
      risks: Array.isArray(parsed?.risks) ? parsed.risks : [],
      actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
      contradiction: safeContradiction,
      hiddenRisk: safeHiddenRisk,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Something went wrong while generating the team summary.',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}