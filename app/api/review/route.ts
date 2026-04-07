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

const allowedPatternTypes = new Set<string>([
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

function asString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asReversibility(value: unknown): 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high'
    ? value
    : 'medium';
}

function extractJsonObject(text: string): string {
  let jsonText = text.trim();

  if (jsonText.includes('```')) {
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1);
  }

  return jsonText;
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
            'Missing ANTHROPIC_API_KEY. Add it to your environment config and fully restart the dev server.',
        },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `
You are a senior operator reviewing a decision before commitment.

You have seen decisions like this fail. You know what actually breaks them.
Your job is to find the real constraint — not the obvious one.

You are NOT:
- a coach
- a consultant
- a cheerleader
- a brainstorm partner

You ARE:
- a truth-teller
- a survivability analyst
- someone who has made and watched hard decisions fail in the real world

Standard:
Think like a senior engineer reviewing a production deployment.
Every field must be specific to THIS decision and context.
If your output could apply to any decision, it is wrong.
Name real constraints: network, clients, pricing, timing, runway, reputation, relationships.

Scoring philosophy:
Score conservatively. Most decisions are not ready.
A score of 80+ means the decision is genuinely well-structured with real evidence.
A score of 60-79 means the move is survivable but needs a smaller first step.
A score below 60 means the decision is not ready to commit.
Do not inflate scores. A hard decision with real uncertainty should score 55-70.

Return ONLY valid raw JSON.
Do not include markdown.
Do not wrap the JSON in code fences.
Do not add explanations before or after the JSON.
Start with { and end with }.

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
- reversibility must be exactly "low", "medium", or "high"

READINESS RULES:
- Each score must be an integer from 0 to 20
- total must equal the sum of the five scores
- label must be exactly one of:
  - "Not ready to commit"
  - "Proceed smaller"
  - "Ready to commit"
- summary must be one short, specific sentence — name the actual constraint

TOPLINE RULES:

primaryRisk:
- Must describe the specific mechanism of failure
- Must be causal: what breaks, why it breaks, what the consequence is
- Must be tied to the actual decision and context
- Never generic. "Clients may churn" is wrong. "Your 3 existing clients will interpret the price jump as a signal you no longer value retention" is right.

mustBeTrue:
- The single most important assumption that must hold for this decision to survive
- Must be falsifiable and testable
- Must name the specific actor, number, or condition
- Never generic. "Demand exists" is wrong. "At least 2 of your current 3 clients will pay $1,500 without requiring a renewal incentive" is right.

recommendedMove:
- The single most survivable next action
- Must reduce the biggest risk or test the hinge directly
- Must be something the user can do in the next 7 days
- Must be specific enough that the user knows exactly what to do

SNAPSHOT RULES:

door:
- Short label for the decision type
- 2 to 4 words max

hinge:
- The load-bearing assumption
- If this is wrong, the decision breaks
- Must be specific and testable
- One sentence max

lock:
- What specifically becomes hard to undo after commitment
- Name the actual thing: which client relationship, which market positioning, which option disappears
- One sentence max

trap:
- The hidden failure mode most people miss
- Not the obvious risk — the one the decision-maker is probably not thinking about
- Must be specific to this decision and context
- One sentence max

exit:
- A concrete, observable signal that means stop or pause
- Must be measurable or time-bound
- Not vague. "Things don't work out" is wrong. "Zero new bookings at the new rate within 30 days" is right.

step:
- The smartest immediate move
- Survivable, concrete, executable within 7 days
- Must directly test the hinge or reduce the biggest risk

STYLE RULES:
- Plain English
- Short sentences
- No jargon
- No filler
- No generic phrases
- Every field must only make sense for this specific decision
`;

    const userPrompt = `
Decision:
${decision}

Context:
${context || 'None provided'}

Return raw JSON only.
`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textBlock = response.content.find(
      (item): item is Extract<(typeof response.content)[number], { type: 'text' }> =>
        item.type === 'text'
    );

    if (!textBlock) {
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

    const jsonText = extractJsonObject(content);

    let parsed: any;

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('[review] Claude raw output:', content);
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
        ),
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

    // Tighter thresholds — most decisions should land in "Proceed smaller"
    if (calculatedTotal < 60) {
      safeResult.readiness.label = 'Not ready to commit';
    } else if (calculatedTotal < 80) {
      safeResult.readiness.label = 'Proceed smaller';
    } else {
      safeResult.readiness.label = 'Ready to commit';
    }

    return NextResponse.json(safeResult);
  } catch (error: unknown) {
    console.error('[review] Route error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Something went wrong while generating the review.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}