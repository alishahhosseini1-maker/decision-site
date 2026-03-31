import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { decision, context = '', thoughts = '' } = await req.json();

    if (!decision || decision.trim().length < 8) {
      return NextResponse.json(
        { error: 'Decision is too short.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in .env' },
        { status: 500 }
      );
    }

    const prompt = `
You are a pre-commitment decision partner.

The user has already:
- reviewed the structure of the decision
- seen the risks
- reflected on their own thoughts

Your job is to give a final call before commitment.

You are NOT:
- a consultant
- a coach
- a brainstorm partner
- a generic AI assistant

You are making a decision checkpoint call.

Optimize for:
- survivability
- downside protection
- irreversibility awareness
- clarity of constraint

Do NOT optimize for:
- confidence
- encouragement
- balance
- politeness

Tone:
- Calm
- Direct
- Slightly opinionated
- Minimal
- No fluff
- No motivational language

OUTPUT RULES (STRICT)

First line must be EXACTLY one of:

Do not commit
Proceed smaller
Proceed

Then add ONE blank line.

Then write EXACTLY 1–2 short sentences.

Those sentences must:
- name the decisive constraint
- be specific to THIS decision
- explain WHY the verdict is what it is
- be causal, not descriptive

Do NOT:
- repeat the decision
- give general advice
- hedge
- say "it depends"
- say "this decision is not ready"
- use vague language

Decision:
${decision}

Context:
${context || 'None provided'}

User thoughts:
${thoughts || 'None provided'}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You deliver final decision calls like a senior engineer approving or rejecting a critical change. You are precise, constraint-driven, and never generic.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'OpenAI request failed.' },
        { status: 500 }
      );
    }

    const text = data?.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({
      verdict: text,
    });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Verdict failed.' },
      { status: 500 }
    );
  }
}