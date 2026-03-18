import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { inputs } = await req.json();

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: 'Inputs are required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are a sharp executive operator reviewing a weekly team report.

Your job is NOT to summarize line by line.
Your job is to identify what actually matters.

Write in plain English so a smart 15-year-old can understand it.

Return ONLY valid JSON.
Do not wrap the JSON in markdown.
Do not include any text before or after the JSON.

Return this exact shape:

{
  "overallSummary": string,
  "working": string[],
  "breaking": string[],
  "risks": string[],
  "actions": string[],
  "contradiction": string,
  "hiddenRisk": string
}

Rules:
- overallSummary: 2–3 sentences explaining what is really going on.
- working: only include things that are clearly positive signals.
- breaking: include real problems, not duplicates of working.
- risks: include forward-looking risks, not just repeated issues.
- actions: must be specific and realistic, not generic.
- contradiction: identify something that does not add up across inputs.
- hiddenRisk: identify something leadership might miss if they only skim this.
- Do not copy inputs directly unless absolutely necessary.
- Compress and interpret.
- Prioritize signal over completeness.
- Be concise.
- No fluff.
- No motivational language.
- No consultant filler.
`;

    const userPrompt = `
Here are the team inputs:

${JSON.stringify(inputs, null, 2)}
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
      return NextResponse.json({
        overallSummary: 'Could not parse summary, but inputs were received.',
        working: [],
        breaking: [],
        risks: [],
        actions: [],
        contradiction: 'Could not identify a contradiction.',
        hiddenRisk: 'Could not identify a hidden risk.',
      });
    }

    return NextResponse.json({
      overallSummary:
        typeof parsed?.overallSummary === 'string'
          ? parsed.overallSummary
          : 'No summary returned.',
      working: Array.isArray(parsed?.working) ? parsed.working : [],
      breaking: Array.isArray(parsed?.breaking) ? parsed.breaking : [],
      risks: Array.isArray(parsed?.risks) ? parsed.risks : [],
      actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
      contradiction:
        typeof parsed?.contradiction === 'string'
          ? parsed.contradiction
          : 'No contradiction identified.',
      hiddenRisk:
        typeof parsed?.hiddenRisk === 'string'
          ? parsed.hiddenRisk
          : 'No hidden risk identified.',
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