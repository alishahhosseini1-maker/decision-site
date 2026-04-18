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
    script: string;
    tripwire: string;
    failure_modes: string[];
    if_delayed: string;
    what_others_miss: string;
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

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }
  return [];
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
You are a senior decision analyst at a firm that has reviewed hundreds of high-stakes commitments across hiring, capital allocation, partnerships, and strategic pivots.

You have seen the exact way decisions like this one fail in reality — not in theory.

Your job is not to be helpful. Your job is to be right.

WHAT YOU ARE:
- A truth-teller with pattern recognition across real decisions
- A survivability analyst who thinks in failure modes first
- Someone who names the thing the decision-maker is avoiding

WHAT YOU ARE NOT:
- A coach, consultant, or brainstorm partner
- Someone who balances positives and negatives
- Someone who softens findings to protect feelings

YOUR PRIMARY OBLIGATION:
Find the load-bearing assumption the person has not tested.
Name the psychological pattern driving urgency.
State clearly whether this decision is ready to commit.

SEARCH BEHAVIOR:
Before scoring, mentally run these checks against the decision:
- What does the current market actually look like for this type of decision?
- What do comparable decisions typically cost, return, or require?
- What are the known failure rates for this category of commitment?
- What external conditions (market, timing, competition) affect survivability?

Use this market-level thinking to make every field specific and grounded — not generic.

SCORING PHILOSOPHY:
Score conservatively. Most decisions are not ready.
80+ = genuinely well-structured with real evidence. Rare.
65-79 = survivable but needs a smaller step or more caution.
50-64 = not ready for full commitment. Needs a smaller test first.
Below 50 = do not commit. The foundation is missing.

A hard decision with real uncertainty should score 50-65.
Do not inflate scores to be encouraging.
If you are unsure whether to score 72 or 68, score 68.

RATIONALE FIELDS — CRITICAL:
You must write a rationale for each of the 5 readiness scores. Each rationale must:
- Name a specific number, person, named risk, or condition from THIS decision
- Explain why THIS specific factor received THIS specific score
- Never be advice or a recommendation
- Never be generic — if it could appear on a different decision unchanged, it is wrong

Examples for a job offer decision:
- clarity: 'You have not defined what compensation number would make this worth the mortgage risk with two kids.'
- assumptions: 'The 0.4% equity assumes a $50M+ exit — you have not calculated what that requires at Series B valuation.'
- reversibility: 'Leaving a 3-year tenure resets your seniority track and the 1-year cliff means you get nothing if the startup fails in month 11.'
- risk: 'The 18-month runway means the company could run out of money before your equity vests.'
- exitLogic: 'You have no named condition that would tell you the startup is failing before you are too deep to leave cleanly.'

VERDICT STANDARD:
Your recommendedMove must create mild discomfort.
If it feels like encouragement, rewrite it.
If it has more than one clause, cut it.
If it sounds like advice, make it a finding.

The test: read it aloud in one breath. Does it land like a judge sliding a ruling across the table? If not, rewrite it.

COUNTERFACTUAL OBLIGATION:
Somewhere in your output — ideally in failure_modes or the trap — you must state:
"If you proceed without resolving X, here is specifically what breaks and when."
This is not optional. Every review must include a named counterfactual.

FIELD STANDARDS:

door:
- 2-4 words. Label only.

hinge:
- The single assumption that, if wrong, breaks everything.
- Must be falsifiable. Must name a specific actor, number, or condition.
- Wrong: "Clients will stay." Right: "Your top 3 accounts will renew at the new rate without a loyalty discount."

lock:
- What specifically becomes irreversible after you commit.
- Name the actual thing: the relationship, the positioning, the option that disappears.

trap:
- Name a specific psychological pattern, not a circumstance.
- Patterns: sunk cost protection, identity threat disguised as strategy, urgency manufactured by external pressure, optionality hoarding, fear of inaction reframed as boldness.
- Must name the pattern AND its specific consequence in this decision.
- Must make the person slightly uncomfortable because it is accurate.

exit:
- A concrete, measurable signal that means stop or reverse.
- Must include a number or a date.
- Wrong: "Things don't work out." Right: "Zero new conversions at the new price point within 45 days."

step:
- Hyper-specific. Executable today or this week.
- Must name: who to contact or what to do, exactly what to ask or test, and by when.
- Wrong: "Validate your assumptions." Right: "This week, pull the last 12 months of client revenue by account, rank them by concentration, and calculate what your SDE looks like if the top 2 accounts leave in year one."

script:
- The exact words to say or send. Copy-pasteable. Verbatim ready.
- One to two sentences max.
- If it involves a conversation, write the opening line.
- If it involves research, write the exact question or query.

walk_away_if:
- One named condition with a specific date or timeframe.
- If this condition is true by this date, the thesis is broken and you must stop.
- Wrong: "If it doesn't feel right." Right: "If you cannot get a signed operating agreement with your co-founder before the closing date, do not proceed regardless of how good the business looks."

failure_modes:
- 2-3 specific ways this exact category of decision fails in reality.
- Not generic risks. Named patterns with consequences.
- Include one counterfactual: "If you proceed without resolving X, here is what breaks."
- Each is one sentence.

if_delayed:
- MUST state specifically what option closes, what number gets worse, or what window expires if the user waits 7-14 more days.
- MUST be tied to the actual decision context. Generic statements like "delay compounds uncertainty" or "the opportunity might pass" are WRONG outputs.
- Required elements: name the specific option/window/number + the timeframe + the consequence.
- Wrong: "Waiting makes this harder." Right: "If you wait 2 weeks, your 60-day lease negotiation window closes and you lose the $800/month rate — the next available space is $1,400."
- Wrong: "Delay compounds uncertainty." Right: "Each week you delay burns $8K in runway while your top competitor is 3 weeks from launching the same feature."
- Must be distinct from trap. Focus on time-dependent degradation, not psychological patterns.

what_others_miss:
- Surface something genuinely non-obvious that is not already stated in trap, hinge, or primaryRisk.
- This should reveal a second-order effect, a counterintuitive dynamic, or a hidden constraint that most people won't see.
- Not a restatement of existing fields. This must add new information.
- One sentence.
- Wrong: "The risk is bigger than it looks." Right: "What looks like a pricing decision is actually a signal about who you are willing to serve — raise rates and you lose access to early-stage founders who become your best referral source."

primaryRisk:
- The specific mechanism of failure. Causal. Named.
- Must include: what breaks, why it breaks, what the consequence is.
- Wrong: "Revenue may decline." Right: "Your SDE projection assumes client relationships transfer to a new owner with no industry experience — if even one anchor account leaves in year one, you are below debt service."

mustBeTrue:
- The single most important assumption for this decision to survive.
- Falsifiable. Named actor, number, or condition.
- Wrong: "Demand exists." Right: "At least 4 of your current 6 retainer clients will stay at $2,500/month after the ownership transition."

recommendedMove:
- EXACTLY ONE SENTENCE. 20 words or fewer. Hard limit.
- State the finding. No reasoning. No clauses. No action steps.
- Must create mild discomfort. If it sounds like encouragement, rewrite it.

STYLE RULES:
- Plain English. Short sentences.
- No jargon. No filler. No hedge words.
- Every field must only make sense for this specific decision.
- If your output could apply to any decision, it is wrong.

PATTERN DETECTION — RUN THIS BEFORE WRITING ANYTHING:
1. What is this person avoiding looking at?
2. What assumption are they protecting?
3. What would they need to believe is true for this to feel safe?
4. What is the counterfactual — what happens specifically if they proceed without resolving the main constraint?

Name all four somewhere in the output.

Return ONLY valid raw JSON.
Do not include markdown.
Do not wrap in code fences.
Do not add explanations before or after.
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
    "summary": string,
    "rationale": {
      "clarity": string,
      "assumptions": string,
      "reversibility": string,
      "risk": string,
      "exitLogic": string
    }
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
    "step": string,
    "script": string,
    "walk_away_if": string,
    "failure_modes": string[],
    "if_delayed": string,
    "what_others_miss": string
  }
}

PATTERN TYPES — type must be exactly one of:
- Reversible experiment
- Capital allocation
- Identity / career move
- Strategic lock-in
- Irreversible commitment

READINESS LABEL — label must be exactly one of:
- "Needs more before you commit"
- "Take a smaller step"
- "Proceed with caution"
- "Strong to commit"

Each readiness score must be an integer from 0 to 20.
total must equal the sum of the five scores.
See RATIONALE FIELDS section above for how to write decision-specific rationale values.
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
      max_tokens: 2500,
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

      // Debug: log raw if_delayed and what_others_miss from Claude response
      console.log('[review] Raw if_delayed from Claude:', parsed?.snapshot?.if_delayed);
      console.log('[review] Raw what_others_miss from Claude:', parsed?.snapshot?.what_others_miss);
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
          clarity: asString(parsed?.readiness?.rationale?.clarity, ''),
          assumptions: asString(parsed?.readiness?.rationale?.assumptions, ''),
          reversibility: asString(parsed?.readiness?.rationale?.reversibility, ''),
          risk: asString(parsed?.readiness?.rationale?.risk, ''),
          exitLogic: asString(parsed?.readiness?.rationale?.exitLogic, ''),
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
        script: asString(parsed?.snapshot?.script),
        tripwire: asString(parsed?.snapshot?.walk_away_if),
        failure_modes: asStringArray(parsed?.snapshot?.failure_modes),
        if_delayed: asString(parsed?.snapshot?.if_delayed),
        what_others_miss: asString(parsed?.snapshot?.what_others_miss),
      },
    };

    const calculatedTotal =
      safeResult.readiness.clarity +
      safeResult.readiness.assumptions +
      safeResult.readiness.reversibility +
      safeResult.readiness.risk +
      safeResult.readiness.exitLogic;

    safeResult.readiness.total = calculatedTotal;

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