import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'review route is working',
  });
}

export async function POST(req: Request) {
  try {
    const { decision, context = '' } = await req.json();

    if (!decision || decision.trim().length < 3) {
      return NextResponse.json(
        { error: 'Decision is required.' },
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
You are a disciplined executive decision analyst.

You are given a decision and optional context.

Your job is to assess decision quality and produce a fast, structured executive snapshot.

Write in plain English so a smart 15-year-old can understand it.

Return ONLY valid JSON.
Do not wrap the JSON in markdown.
Do not include any text before or after the JSON.

Return this exact shape:

{
  "score": {
    "clarity": number,
    "assumptions": number,
    "reversibility": number,
    "risk": number,
    "exitLogic": number,
    "total": number,
    "summary": string
  },
  "snapshot": {
    "door": string,
    "hinge": string,
    "lock": string,
    "trap": string,
    "exit": string,
    "step": string
  },
  "keyThing": string
}

Rules:
- Each score category must be an integer from 0 to 20.
- total must equal the sum of the 5 category scores.
- summary should be one short sentence.
- snapshot language should be clear, concise, and specific.
- Each snapshot field should be easy to understand and short enough to scan quickly.
- keyThing should be ONE short insight sentence.
- keyThing should feel helpful, calm, and thoughtful — not scary or dramatic.
- keyThing should highlight the one thing the person should think about most after reading Door / Hinge / Locks / Trap / Exit / Step.
- Optimize for clarity and survivability, not certainty.
- Be concise.
- No fluff.
- No motivational language.
- No consultant-style filler.
- Identify the most important pattern or contradiction in the decision.
`;

    const userPrompt = `
Decision:
${decision}

Context:
${context || 'None provided'}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
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
        {
          error: 'OpenAI returned invalid JSON.',
          raw: content,
        },
        { status: 500 }
      );
    }

    const safeResult = {
      score: {
        clarity: Number.isInteger(parsed?.score?.clarity) ? parsed.score.clarity : 0,
        assumptions: Number.isInteger(parsed?.score?.assumptions) ? parsed.score.assumptions : 0,
        reversibility: Number.isInteger(parsed?.score?.reversibility)
          ? parsed.score.reversibility
          : 0,
        risk: Number.isInteger(parsed?.score?.risk) ? parsed.score.risk : 0,
        exitLogic: Number.isInteger(parsed?.score?.exitLogic) ? parsed.score.exitLogic : 0,
        total: Number.isInteger(parsed?.score?.total) ? parsed.score.total : 0,
        summary:
          typeof parsed?.score?.summary === 'string'
            ? parsed.score.summary
            : 'Decision reviewed.',
      },
      snapshot: {
        door: typeof parsed?.snapshot?.door === 'string' ? parsed.snapshot.door : '',
        hinge: typeof parsed?.snapshot?.hinge === 'string' ? parsed.snapshot.hinge : '',
        lock: typeof parsed?.snapshot?.lock === 'string' ? parsed.snapshot.lock : '',
        trap: typeof parsed?.snapshot?.trap === 'string' ? parsed.snapshot.trap : '',
        exit: typeof parsed?.snapshot?.exit === 'string' ? parsed.snapshot.exit : '',
        step: typeof parsed?.snapshot?.step === 'string' ? parsed.snapshot.step : '',
      },
      keyThing:
        typeof parsed?.keyThing === 'string'
          ? parsed.keyThing
          : 'The main thing to think about is whether the downside is small enough if this goes wrong.',
    };

    const calculatedTotal =
      safeResult.score.clarity +
      safeResult.score.assumptions +
      safeResult.score.reversibility +
      safeResult.score.risk +
      safeResult.score.exitLogic;

    safeResult.score.total = calculatedTotal;

    return NextResponse.json(safeResult);
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong while generating the review.' },
      { status: 500 }
    );
  }
}