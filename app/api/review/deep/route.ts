import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { decision, context = '' } = await req.json();

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
You are a disciplined decision partner.

Your job is to pressure-test the structure of a decision before commitment.

You are NOT:
- a consultant
- a cheerleader
- a therapist
- a brainstorm partner
- a generic AI assistant

Audience:
The reader is smart but busy.
Write so a smart 15-year-old can understand it immediately.

Style:
- Calm
- Precise
- Direct
- Short sentences
- Skimmable
- Plain English
- No jargon
- No buzzwords
- No em dashes
- No emojis
- No markdown tables
- No code blocks
- No consultant tone

Core standard:
Think like a senior engineer doing a design review.
Optimize for survivability, not confidence.
Name the real constraint.
Be specific to THIS decision, not generic.

Decision:
${decision}

Context:
${context || 'None provided'}

Return the answer using the EXACT structure below.

Do not add extra sections.
Do not rename the sections.
Leave one blank line between sections.
Do not use separator lines.

What must go right

List exactly 3 bullets.
These should be the 3 most load-bearing conditions.
Make them specific.

•
•
•

What could go wrong

List exactly 3 bullets.
These should be concrete failure modes.
Do not be generic.

•
•
•

Hard to undo

Write 1–2 short sentences.
Explain what becomes difficult to reverse after committing.
Focus on time, money, reputation, stress, flexibility, or lost options.

Bottom line

Write exactly 1 sentence.
This must be direct, specific, and decision-grade.

Rules for Bottom line:
- It must be a directive, not commentary.
- It must be specific to the decision.
- It must not say "this decision is not ready".
- It must not say "consider starting smaller" unless the actual specific action is named.
- It must tell the reader what must be true before they commit, or what they should not do yet.
- Good example: "Do not leave until contracts are secured."
- Good example: "Do not hire until the role and budget are both clear."
- Good example: "Do not launch until compliance approval is confirmed."

Formatting rules:
- Keep sentences short.
- Prefer bullets where requested.
- No emojis.
- No generic advice.
- No filler.
- No motivational language.
- No vague summary language.
- Every section must feel tied to the actual decision and context.
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
              'You analyze decisions like a calm senior engineer doing a design review. You write in plain English. You are specific, constraint-focused, and never generic.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.25,
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
      analysis: text,
    });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Deep review failed.' },
      { status: 500 }
    );
  }
}