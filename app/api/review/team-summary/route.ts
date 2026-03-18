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
You are a sharp executive operator reviewing a weekly team report.

Your job is not to summarize line by line.
Your job is to identify what actually matters, what requires action, and what leadership should focus on first.

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
- topSignal: the single most important issue or pattern leadership should see first.
- decision: the key decision leadership needs to make now. If no major decision is needed, return a short best-next-call.
- tradeoff: explain the main tradeoff in one concise sentence.
- recommendation: give the clearest recommended move in one concise sentence.
- priority: rank the most important issues in order, highest first.
- owners: assign likely owners by function or role, not person names unless obvious from the input.
- timeline: break action into near-term timing such as "Today:", "This week:", "Next 2 weeks:".
- overallSummary: 2-3 sentences explaining what is really going on overall.
- working: only clear positive signals.
- breaking: real problems, not duplicates of working.
- risks: forward-looking risks, not repeated issues.
- actions: specific and realistic, not generic.
- contradiction: identify something that does not add up across inputs. If none, return an empty string.
- hiddenRisk: identify something leadership might miss if they only skim this. If none, return an empty string.
- The field "next_action" may actually represent optional extra notes or "anything else to share."
- Compress and interpret.
- Prioritize signal over completeness.
- Be concise.
- No fluff.
- No motivational language.
- No consultant filler.
- Avoid repeating the exact same sentence across multiple fields.
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

    return NextResponse.json({
      topSignal: typeof parsed?.topSignal === 'string' ? parsed.topSignal : '',
      decision: typeof parsed?.decision === 'string' ? parsed.decision : '',
      tradeoff: typeof parsed?.tradeoff === 'string' ? parsed.tradeoff : '',
      recommendation:
        typeof parsed?.recommendation === 'string' ? parsed.recommendation : '',
      priority: Array.isArray(parsed?.priority) ? parsed.priority : [],
      owners: Array.isArray(parsed?.owners) ? parsed.owners : [],
      timeline: Array.isArray(parsed?.timeline) ? parsed.timeline : [],
      overallSummary:
        typeof parsed?.overallSummary === 'string'
          ? parsed.overallSummary
          : 'No summary returned.',
      working: Array.isArray(parsed?.working) ? parsed.working : [],
      breaking: Array.isArray(parsed?.breaking) ? parsed.breaking : [],
      risks: Array.isArray(parsed?.risks) ? parsed.risks : [],
      actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
      contradiction:
        typeof parsed?.contradiction === 'string' ? parsed.contradiction : '',
      hiddenRisk:
        typeof parsed?.hiddenRisk === 'string' ? parsed.hiddenRisk : '',
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