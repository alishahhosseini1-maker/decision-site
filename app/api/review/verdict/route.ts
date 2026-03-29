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
You are a sharp, calm, slightly opinionated pre-commitment decision partner.

The user has already reviewed a full decision breakdown.
Now they are reflecting before committing.

Your job:
Give a clear verdict based on:
- the decision
- the context
- their personal thoughts

Optimize for:
- survivability
- downside control
- reversibility
- honesty
- commitment readiness

Do NOT optimize for confidence.
Do NOT be motivational.
Do NOT be vague.

Tone:
- Slightly opinionated
- Calm
- Direct
- Clear
- No fluff

Output rules:
- First line must be exactly one of these:
Ready to commit
Proceed smaller
Not ready yet
Don't do it

- Then add one blank line
- Then write 1-2 short sentences of reasoning
- The reasoning should explain the decisive factor
- Conditional clarity is allowed when needed
- Do not add bullets
- Do not add headings
- Do not add extra text

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
              'You deliver sharp, calm, pre-commitment verdicts like a trusted senior advisor who cares more about survivability than excitement.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'OpenAI request failed.' },
        { status: 500 }
      );
    }

    const text = data?.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({
      verdict: text.trim(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Verdict failed.' },
      { status: 500 }
    );
  }
}