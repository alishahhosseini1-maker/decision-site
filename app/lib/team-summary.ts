type TeamInput = {
  id?: string;
  name?: string | null;
  department?: string;
  moved_forward?: string;
  not_working?: string;
  needs?: string;
  next_action?: string | null;
};

type TeamSummary = {
  executive_signal: string;
  decision: string;
  tension: string;
  recommended_move: string;
  tradeoff: string;
  confidence_score: number;
  confidence_reason: string;
  projection_14d: string;
  contradictions: string | null;
  operating: {
    working: string[];
    breaking: string[];
    top_risk: string;
  };
  leadership_edge: string;
};

function normalizeSummary(raw: any): TeamSummary {
  return {
    executive_signal:
      typeof raw?.executive_signal === 'string' && raw.executive_signal.trim()
        ? raw.executive_signal.trim()
        : 'The team is making progress, but leadership attention is needed to remove friction and keep momentum intact.',

    decision:
      typeof raw?.decision === 'string' && raw.decision.trim()
        ? raw.decision.trim()
        : 'Clarify the highest-priority leadership decision and assign ownership now.',

    tension:
      typeof raw?.tension === 'string' && raw.tension.trim()
        ? raw.tension.trim()
        : 'If the current blocker is not resolved, execution slows and avoidable drag compounds across the team.',

    recommended_move:
      typeof raw?.recommended_move === 'string' && raw.recommended_move.trim()
        ? raw.recommended_move.trim()
        : 'Remove the primary blocker, assign a clear owner, and confirm the next action immediately.',

    tradeoff:
      typeof raw?.tradeoff === 'string' && raw.tradeoff.trim()
        ? raw.tradeoff.trim()
        : 'Addressing this now may require time, budget, or attention that would otherwise remain allocated elsewhere.',

    confidence_score:
      typeof raw?.confidence_score === 'number'
        ? Math.max(0, Math.min(100, raw.confidence_score))
        : 72,

    confidence_reason:
      typeof raw?.confidence_reason === 'string' && raw.confidence_reason.trim()
        ? raw.confidence_reason.trim()
        : 'The signal is directionally clear, though some inputs may still lack full detail.',

    projection_14d:
      typeof raw?.projection_14d === 'string' && raw.projection_14d.trim()
        ? raw.projection_14d.trim()
        : 'If nothing changes in the next 14 days, current friction will likely continue to slow execution and reduce operating momentum.',

    contradictions:
      typeof raw?.contradictions === 'string' && raw.contradictions.trim()
        ? raw.contradictions.trim()
        : null,

    operating: {
      working: Array.isArray(raw?.operating?.working)
        ? raw.operating.working
            .filter((item: unknown) => typeof item === 'string')
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [],

      breaking: Array.isArray(raw?.operating?.breaking)
        ? raw.operating.breaking
            .filter((item: unknown) => typeof item === 'string')
            .map((item: string) => item.trim())
            .filter(Boolean)
        : [],

      top_risk:
        typeof raw?.operating?.top_risk === 'string' && raw.operating.top_risk.trim()
          ? raw.operating.top_risk.trim()
          : 'Unresolved friction weakens momentum and creates preventable execution drag.',
    },

    leadership_edge:
      typeof raw?.leadership_edge === 'string' && raw.leadership_edge.trim()
        ? raw.leadership_edge.trim()
        : 'The real constraint is often not effort. It is friction. Strong leaders gain leverage faster by removing recurring blockers than by demanding more activity.',
  };
}

export async function generateTeamSummary(inputs: TeamInput[]): Promise<TeamSummary> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('Inputs are required.');
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment.');
  }

  const safeInputs: TeamInput[] = inputs.map((input: TeamInput) => ({
    name: input?.name ?? null,
    department: input?.department ?? '',
    moved_forward: input?.moved_forward ?? '',
    not_working: input?.not_working ?? '',
    needs: input?.needs ?? '',
    next_action: input?.next_action ?? null,
  }));

  const systemPrompt = `
You are a senior operator preparing a private decision briefing for a manager.

Your job is NOT to summarize everything.
Your job is to identify what actually matters, surface the real decision, highlight execution friction, and make the next move clear.

Write like a calm, elite operator.
Not corporate. Not verbose. Not generic.

Every sentence should feel sharp and earned.

The output should:
- be easy to scan
- feel slightly opinionated
- increase the manager's confidence immediately
- make the manager feel ahead of the situation
- turn raw team inputs into a leadership-quality briefing

Prioritize:
- the signal beneath the noise
- the operational tension
- the decision leadership needs to make
- what likely happens if nothing changes
- contradictions or misalignment across inputs
- one non-obvious insight that makes the manager sharper

Do not write like a generic meeting summary.
Do not repeat raw inputs word-for-word unless necessary.
Infer patterns intelligently, but stay grounded in the data.

Return valid JSON only with this exact shape:

{
  "executive_signal": "string",
  "decision": "string",
  "tension": "string",
  "recommended_move": "string",
  "tradeoff": "string",
  "confidence_score": 0,
  "confidence_reason": "string",
  "projection_14d": "string",
  "contradictions": "string or null",
  "operating": {
    "working": ["string"],
    "breaking": ["string"],
    "top_risk": "string"
  },
  "leadership_edge": "string"
}

Rules:
- No markdown
- No backticks
- Raw JSON only
- Keep each field concise but strong
- working and breaking should usually have 1 to 3 items max
- recommended_move should be decisive, not a menu of options
- leadership_edge should feel like a sharp insight, not a cliché

You must calculate confidence_score using a structured scoring system.

Break the score into 4 components (0–25 each):

1. Alignment (0–25)
- Are team inputs consistent or conflicting?
- High alignment = higher score

2. Clarity (0–25)
- Is the decision clearly defined or vague?
- Clear decision = higher score

3. Risk visibility (0–25)
- Are risks explicitly identified or unclear?
- Clear risks = higher score

4. Actionability (0–25)
- Is there a clear, decisive next move?
- Strong action = higher score

Add the four components to produce the final confidence_score (0–100).

Additional scoring rules:
- Do NOT default to common numbers like 80 or 85
- Scores must vary meaningfully based on input quality
- If inputs are weak, unclear, or conflicting, the score should drop significantly into a lower range such as 40–60
- If inputs are strong, aligned, and actionable, the score can be high such as 75–95
- Use the full range when justified
- Confidence must reflect the quality of the inputs, not optimism

Also reflect this scoring in confidence_reason:
- Briefly explain why the score is high or low
- Mention alignment, clarity, risk visibility, or action strength
`;

  const userPrompt = `
Team inputs:
${JSON.stringify(safeInputs, null, 2)}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No summary content returned from OpenAI.');
  }

  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse OpenAI summary JSON.');
  }

  return normalizeSummary(parsed);
}