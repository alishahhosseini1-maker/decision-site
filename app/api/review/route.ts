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
You are a disciplined executive decision reviewer.

Your job is NOT to give generic advice.
Your job is to assess whether a decision is ready for commitment.

Write in plain English so a smart 15-year-old can understand it.

Optimize for:
- commitment readiness
- survivability
- reversibility
- clarity
- downside awareness

Do not be dramatic.
Do not be motivational.
Do not be vague.
Do not sound like a consultant.

Return ONLY valid JSON.
Do not wrap the JSON in markdown.
Do not include any text before or after the JSON.

Return this exact shape:

{
  "readiness": {
    "clarity": number,
    "assumptions": number,
    "reversibility": number,
    "risk": number,
    "exitLogic": number,
    "total": number,
    "label": string,
    "summary": string
  },
  "topline": {
    "primaryRisk": string,
    "mustBeTrue": string,
    "recommendedMove": string
  },
  "snapshot": {
    "door": string,
    "hinge": string,
    "lock": string,
    "trap": string,
    "exit": string,
    "step": string
  }
}

Rules:
- Each score category must be an integer from 0 to 20.
- total must equal the sum of the 5 category scores.
- label must be exactly one of:
  - "Not ready to commit"
  - "Proceed smaller"
  - "Ready to commit"
- summary must be one short sentence explaining the overall readiness.
- primaryRisk must name the single biggest thing being underestimated.
- mustBeTrue must state the one thing that most needs to be true for this decision to work.
- recommendedMove must be a direct next stance, not a vague suggestion.
- snapshot language should be concise, specific, and easy to scan.
- door should classify the type of decision in plain English.
- hinge should name the main assumption carrying the decision.
- lock should name what becomes harder to undo after committing.
- trap should name the hidden way this could go wrong.
- exit should name an observable signal that should cause pause or reconsideration.
- step should name the smartest next move from here.
- Optimize for clarity and survivability, not confidence.
- Be concise.
- No fluff.
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
        temperature: 0.25,
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
      readiness: {
        clarity: Number.isInteger(parsed?.readiness?.clarity) ? parsed.readiness.clarity : 0,
        assumptions: Number.isInteger(parsed?.readiness?.assumptions)
          ? parsed.readiness.assumptions
          : 0,
        reversibility: Number.isInteger(parsed?.readiness?.reversibility)
          ? parsed.readiness.reversibility
          : 0,
        risk: Number.isInteger(parsed?.readiness?.risk) ? parsed.readiness.risk : 0,
        exitLogic: Number.isInteger(parsed?.readiness?.exitLogic)
          ? parsed.readiness.exitLogic
          : 0,
        total: Number.isInteger(parsed?.readiness?.total) ? parsed.readiness.total : 0,
        label:
          parsed?.readiness?.label === 'Not ready to commit' ||
          parsed?.readiness?.label === 'Proceed smaller' ||
          parsed?.readiness?.label === 'Ready to commit'
            ? parsed.readiness.label
            : 'Proceed smaller',
        summary:
          typeof parsed?.readiness?.summary === 'string'
            ? parsed.readiness.summary
            : 'This decision is not fully ready yet.',
      },
      topline: {
        primaryRisk:
          typeof parsed?.topline?.primaryRisk === 'string'
            ? parsed.topline.primaryRisk
            : 'The downside is not fully understood yet.',
        mustBeTrue:
          typeof parsed?.topline?.mustBeTrue === 'string'
            ? parsed.topline.mustBeTrue
            : 'A key assumption still needs to be tested.',
        recommendedMove:
          typeof parsed?.topline?.recommendedMove === 'string'
            ? parsed.topline.recommendedMove
            : 'Proceed smaller until the main assumption is clearer.',
      },
      snapshot: {
        door: typeof parsed?.snapshot?.door === 'string' ? parsed.snapshot.door : '',
        hinge: typeof parsed?.snapshot?.hinge === 'string' ? parsed.snapshot.hinge : '',
        lock: typeof parsed?.snapshot?.lock === 'string' ? parsed.snapshot.lock : '',
        trap: typeof parsed?.snapshot?.trap === 'string' ? parsed.snapshot.trap : '',
        exit: typeof parsed?.snapshot?.exit === 'string' ? parsed.snapshot.exit : '',
        step: typeof parsed?.snapshot?.step === 'string' ? parsed.snapshot.step : '',
      },
    };

    const calculatedTotal =
      safeResult.readiness.clarity +
      safeResult.readiness.assumptions +
      safeResult.readiness.reversibility +
      safeResult.readiness.risk +
      safeResult.readiness.exitLogic;

    safeResult.readiness.total = calculatedTotal;

    if (calculatedTotal < 60) {
      safeResult.readiness.label = 'Not ready to commit';
    } else if (calculatedTotal < 76) {
      safeResult.readiness.label = 'Proceed smaller';
    } else {
      safeResult.readiness.label = 'Ready to commit';
    }

    return NextResponse.json(safeResult);
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong while generating the review.' },
      { status: 500 }
    );
  }
}