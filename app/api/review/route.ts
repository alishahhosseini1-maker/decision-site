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

Think like a senior engineer reviewing a production change before deployment.

Write in plain English so a smart 15-year-old can understand it.

Optimize for:
- commitment readiness
- survivability
- reversibility
- clarity
- downside awareness

Do NOT:
- be dramatic
- be motivational
- be vague
- sound like a consultant
- use generic filler

Return ONLY valid JSON.
Do not include any text outside JSON.

Return this exact shape:

{
  "pattern": {
    "type": string,
    "rationale": string,
    "reversibility": "low" | "medium" | "high"
  },
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

PATTERN RULES:
- type must be one of:
  - Reversible experiment
  - Capital allocation
  - Identity / career move
  - Strategic lock-in
  - Irreversible commitment
- rationale = one short sentence
- reversibility must be exactly:
  - "low"
  - "medium"
  - "high"

READINESS RULES:
- Each score must be an integer from 0 to 20
- total must equal the sum of the five scores
- label must be exactly one of:
  - "Not ready to commit"
  - "Proceed smaller"
  - "Ready to commit"
- summary must be one short, specific sentence

TOPLINE RULES:

primaryRisk:
- Must describe a real failure outcome
- Must be causal, not generic
- Must say what actually breaks
- Bad: "There is uncertainty"
- Bad: "The downside is not clear"
- Good: "Income may not materialize, creating immediate financial instability"

mustBeTrue:
- Must be one clear, testable condition
- Must be falsifiable
- Must be specific to this decision
- Bad: "Things must go well"
- Good: "A new income source is secured within 30 days"

recommendedMove:
- Must be concrete and executable
- Must reduce risk or test the hinge
- Must be something the user can actually do next
- Bad: "Evaluate options"
- Good: "Secure at least one signed contract before leaving"

SNAPSHOT RULES:

door:
- Short label for the decision type
- 2 to 4 words
- Example: "Career move"

hinge:
- The main assumption
- Shorter version of mustBeTrue
- Must still be testable

lock:
- What becomes hard to undo
- Focus on money, time, reputation, stress, flexibility, or relationships

trap:
- The hidden failure mode
- Not the obvious one
- What someone might miss

exit:
- An observable signal to pause or stop
- Must be measurable or concrete
- Bad: "If it feels wrong"
- Good: "No signed income source within 30 days"

step:
- The smartest immediate move
- Concrete, survivable, and executable

STYLE RULES:
- Plain English
- Short sentences
- No jargon
- No filler
- No generic phrases
- Every field must tie directly to the decision

Be concrete.
Be honest.
Be specific.
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
      return NextResponse.json(
        { error: 'OpenAI returned invalid JSON.', raw: content },
        { status: 500 }
      );
    }

    const safeResult = {
      pattern: {
        type: typeof parsed?.pattern?.type === 'string' ? parsed.pattern.type : '',
        rationale:
          typeof parsed?.pattern?.rationale === 'string'
            ? parsed.pattern.rationale
            : '',
        reversibility:
          parsed?.pattern?.reversibility === 'low' ||
          parsed?.pattern?.reversibility === 'medium' ||
          parsed?.pattern?.reversibility === 'high'
            ? parsed.pattern.reversibility
            : 'medium',
      },
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
            : 'The main constraint is not strong enough yet.',
      },
      topline: {
        primaryRisk:
          typeof parsed?.topline?.primaryRisk === 'string'
            ? parsed.topline.primaryRisk
            : 'The main failure risk is still unresolved.',
        mustBeTrue:
          typeof parsed?.topline?.mustBeTrue === 'string'
            ? parsed.topline.mustBeTrue
            : 'A key condition must be proven before committing.',
        recommendedMove:
          typeof parsed?.topline?.recommendedMove === 'string'
            ? parsed.topline.recommendedMove
            : 'Take one smaller step that tests the main assumption first.',
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
  } catch (_error) {
    return NextResponse.json(
      { error: 'Something went wrong while generating the review.' },
      { status: 500 }
    );
  }
}