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
    label: 'Needs more before you commit' | 'Take a smaller step' | 'Proceed with caution' | 'Strong to commit';
    summary: string;
    rationale: {
      clarity: string;
      assumptions: string;
      reversibility: string;
      risk: string;
      exitLogic: string;
    };
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

Your single most important job is to name the thing the decision-maker is avoiding looking at. Not the obvious risk. The one they already know but haven't said out loud.

Standard:
Think like a senior engineer reviewing a production deployment.
Every field must be specific to THIS decision and context.
If your output could apply to any decision, it is wrong.
Name real constraints: network, clients, pricing, timing, runway, reputation, relationships.

Scoring philosophy:
Score conservatively. Most decisions are not ready.
A score of 80+ means the decision is genuinely well-structured with real evidence.
A score of 65-79 means the move is survivable but needs a smaller step or more caution.
A score of 50-64 means the decision needs a smaller first step before fuller commitment.
A score below 50 means the decision is not ready to commit.
Do not inflate scores. A hard decision with real uncertainty should score 50-65.

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
  - "Needs more before you commit"
  - "Take a smaller step"
  - "Proceed with caution"
  - "Strong to commit"
- summary must be one short, specific sentence — name the actual constraint

rationale (inside readiness):
- Add a "rationale" object with keys: clarity, assumptions, reversibility, risk, exitLogic
- Each value is one short sentence (max 12 words) explaining why that factor received its specific score
- Must reference the actual decision context — never generic
- Example: clarity: "You haven't named the specific outcome that would make this a success."
- Example: assumptions: "Two pricing assumptions are untested and could invalidate the model."
- Example: reversibility: "Signing the lease makes the commitment hard to exit before 12 months."
- Example: risk: "The downside exposure is bounded — you cap losses at the deposit."
- Example: exitLogic: "No concrete signal defined for when to stop or pivot."

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
- EXACTLY ONE SENTENCE. 20 words or fewer. Hard limit — no exceptions.
- This is the verdict a judge slides across the table. It must land in one breath.
- State only the finding. No reasoning, no clauses, no action steps.
- The test: can you read it in one breath and does it make the user slightly uncomfortable? If not, cut it again.
- Wrong: "Before looking at listings, calculate your take-home, savings, debt, and baby costs and run them through a mortgage calculator."
- Right: "You don't have the financial picture to make this decision."
- The recommended move should create mild discomfort. If it feels like encouragement, rewrite it. A good recommended move names what the person needs to do before they're allowed to commit — not what they want to do next.

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
- This must name a specific psychological pattern, not just a circumstance
- Examples of patterns: sunk cost protection, identity threat disguised as strategy, fear of rejection disguised as product work, urgency manufactured by external pressure, optionality hoarding
- The trap should make the person slightly uncomfortable because it's accurate
- One sentence. Must name the pattern AND its specific consequence in this decision.

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

PATTERN DETECTION RULE:
Before writing any field, ask: what is this person avoiding? What assumption are they protecting? What would they need to believe is true for this decision to feel safe? Name that thing somewhere in the output — ideally in the TRAP or the readiness summary.
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
        label: 'Take a smaller step',
        summary: asString(
          parsed?.readiness?.summary,
          'The main constraint is not strong enough yet.'
        ),
        rationale: {
          clarity: asString(parsed?.readiness?.rationale?.clarity, 'Clarity of the outcome needs more definition.'),
          assumptions: asString(parsed?.readiness?.rationale?.assumptions, 'Key assumptions are not yet verified.'),
          reversibility: asString(parsed?.readiness?.rationale?.reversibility, 'The cost of reversing this decision is significant.'),
          risk: asString(parsed?.readiness?.rationale?.risk, 'The downside has not been fully mapped.'),
          exitLogic: asString(parsed?.readiness?.rationale?.exitLogic, 'No clear signal defined for when to stop.'),
        },
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

    // Thresholds: <50 not ready, 50-64 smaller, 65-79 caution, 80+ strong
    if (calculatedTotal < 50) {
      safeResult.readiness.label = 'Needs more before you commit';
    } else if (calculatedTotal < 65) {
      safeResult.readiness.label = 'Take a smaller step';
    } else if (calculatedTotal < 80) {
      safeResult.readiness.label = 'Proceed with caution';
    } else {
      safeResult.readiness.label = 'Strong to commit';
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