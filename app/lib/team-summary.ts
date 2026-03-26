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
  topSignal: string;
  decision: string;
  tradeoff: string;
  recommendation: string;
  priority: string[];
  owners: string[];
  timeline: string[];
  overallSummary: string;
  working: string[];
  breaking: string[];
  risks: string[];
  actions: string[];
  contradiction: string;
  hiddenRisk: string;
};

function normalizeSummary(raw: any): TeamSummary {
  return {
    topSignal: typeof raw?.topSignal === 'string' ? raw.topSignal : '',
    decision: typeof raw?.decision === 'string' ? raw.decision : '',
    tradeoff: typeof raw?.tradeoff === 'string' ? raw.tradeoff : '',
    recommendation: typeof raw?.recommendation === 'string' ? raw.recommendation : '',
    priority: Array.isArray(raw?.priority) ? raw.priority.filter(Boolean) : [],
    owners: Array.isArray(raw?.owners) ? raw.owners.filter(Boolean) : [],
    timeline: Array.isArray(raw?.timeline) ? raw.timeline.filter(Boolean) : [],
    overallSummary: typeof raw?.overallSummary === 'string' ? raw.overallSummary : '',
    working: Array.isArray(raw?.working) ? raw.working.filter(Boolean) : [],
    breaking: Array.isArray(raw?.breaking) ? raw.breaking.filter(Boolean) : [],
    risks: Array.isArray(raw?.risks) ? raw.risks.filter(Boolean) : [],
    actions: Array.isArray(raw?.actions) ? raw.actions.filter(Boolean) : [],
    contradiction: typeof raw?.contradiction === 'string' ? raw.contradiction : '',
    hiddenRisk: typeof raw?.hiddenRisk === 'string' ? raw.hiddenRisk : '',
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

  const prompt = `
You are a disciplined operating reviewer helping a leadership team quickly understand what matters most across team inputs.

You will receive an array of team responses. Each response may contain:
- name
- department
- moved_forward: what actually moved the needle
- not_working: what is slowing things down or off track
- needs: where a decision is needed from leadership
- next_action: what should happen next

Your job is to synthesize the responses into a concise executive-level summary.

Focus on:
- what is actually working
- what is slowing things down
- where leadership decisions are needed
- what actions should happen next
- contradictions across participants
- hidden risks inferred from what is slowing things down or where decisions are blocked

Do not treat this like a generic status recap.
Write like an operator preparing leadership for a sharper meeting.

Return valid JSON only with this exact shape:

{
  "topSignal": "string",
  "decision": "string",
  "tradeoff": "string",
  "recommendation": "string",
  "priority": ["string"],
  "owners": ["string"],
  "timeline": ["string"],
  "overallSummary": "string",
  "working": ["string"],
  "breaking": ["string"],
  "risks": ["string"],
  "actions": ["string"],
  "contradiction": "string",
  "hiddenRisk": "string"
}

Rules:
- Do not include markdown
- Do not wrap in backticks
- Return raw JSON only
- Be specific, direct, and useful
- Infer patterns from the responses
- Keep outputs concise but meaningful
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: JSON.stringify(safeInputs),
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