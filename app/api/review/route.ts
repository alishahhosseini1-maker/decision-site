import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type ReviewResult = {
  pattern: {
    type: string;
    rationale: string;
    reversibility: 'low' | 'medium' | 'high';
  };
  readiness: {
    clarity: number;
    assumptions: number;
    reversibility: number;
    risk: number;
    exitLogic: number;
    total: number;
    label: 'Not ready to commit' | 'Proceed smaller' | 'Ready to commit';
    summary: string;
  };
  topline: {
    primaryRisk: string;
    mustBeTrue: string;
    recommendedMove: string;
  };
  snapshot: {
    door: string;
    hinge: string;
    lock: string;
    trap: string;
    exit: string;
    step: string;
  };
};

const allowedPatternTypes = new Set([
  'Reversible experiment',
  'Capital allocation',
  'Identity / career move',
  'Strategic lock-in',
  'Irreversible commitment',
]);

function clampScore(value: unknown): number {
  if (!Number.isInteger(value)) return 0;
  return Math.max(0, Math.min(20, value as number));
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asReversibility(value: unknown): 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high'
    ? value
    : 'medium';
}

export async function GET() {
  return NextResponse.json({
    message: 'review route is working',
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
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

    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log('[review] ANTHROPIC_API_KEY present:', Boolean(apiKey));

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Missing ANTHROPIC_API_KEY. Add it to your StackBlitz env file, save it, then fully restart the dev server.',
        },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

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
Do not include markdown.
Do not wrap the JSON in code fences.
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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textBlock = response.content.find((item) => item.type === 'text');

    if (!textBlock || textBlock.type !== 'text') {
      console.error('[review] No valid text block returned from Claude.', response);
      return NextResponse.json(
        { error: 'No valid response returned from Claude.' },
        { status: 500 }
      );
    }

    const content = textBlock.text?.trim();

    if (!content) {
      return NextResponse.json(
        { error: 'No content returned from Claude.' },
        { status: 500 }
      );
    }

    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error('[review] Claude returned invalid JSON:', content);
      return NextResponse.json(
        {
          error: 'Claude returned invalid JSON.',
          raw: content,
        },
        { status: 500 }
      );
    }

    const safeResult: ReviewResult = {
      pattern: {
        type: allowedPatternTypes.has(parsed?.pattern?.type)
          ? parsed.pattern.type
          : 'Reversible experiment',
        rationale: asString(parsed?.pattern?.rationale),
        reversibility: asReversibility(parsed?.pattern?.reversibility),
      },
      readiness: {
        clarity: clampScore(parsed?.readiness?.clarity),
        assumptions: clampScore(parsed?.readiness?.assumptions),
        reversibility: clampScore(parsed?.readiness?.reversibility),
        risk: clampScore(parsed?.readiness?.risk),
        exitLogic: clampScore(parsed?.readiness?.exitLogic),
        total: 0,
        label: 'Proceed smaller',
        summary: asString(
          parsed?.readiness?.summary,
          'The main constraint is not strong enough yet.'
        ) as ReviewResult['readiness']['summary'],
      },
      topline: {
        primaryRisk: asString(
          parsed?.topline?.primaryRisk,
          'The main failure risk is still unresolved.'
        ),
        mustBeTrue: asString(
          parsed?.topline?.mustBeTrue,
          'A key condition must be proven before committing.'
        ),
        recommendedMove: asString(
          parsed?.topline?.recommendedMove,
          'Take one smaller step that tests the main assumption first.'
        ),
      },
      snapshot: {
        door: asString(parsed?.snapshot?.door),
        hinge: asString(parsed?.snapshot?.hinge),
        lock: asString(parsed?.snapshot?.lock),
        trap: asString(parsed?.snapshot?.trap),
        exit: asString(parsed?.snapshot?.exit),
        step: asString(parsed?.snapshot?.step),
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
    console.error('[review] Route error:', error);

    const message =
      error instanceof Error ? error.message : 'Something went wrong while generating the review.';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}