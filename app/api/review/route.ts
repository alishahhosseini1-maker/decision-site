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
        { error: 'Missing OPENAI_API_KEY in .env' },
        { status: 500 }
      );
    }

    const systemPrompt = `
You are a disciplined decision partner.

Your job is NOT to provide advice, predictions, or motivational language.
Your job is to assess decision quality and produce a fast, structured snapshot.

Return ONLY valid JSON.
Do not wrap the JSON in markdown.
Do not include any text before or after the JSON.

Return this exact shape:

{
  "score": {
    "clarity": number,
    "assumptions": number,
    "reversibility": number,
    "risk": number,
    "exitLogic": number,
    "total": number,
    "summary": string
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

Rules:
- Each score category must be an integer from 0 to 20.
- total must equal the sum of the 5 category scores.
- summary should be one short sentence.
- snapshot language should be clear, concise, and specific.
- Optimize for clarity and survivability, not certainty.
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
        temperature: 0.3,
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

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          error: 'OpenAI returned invalid JSON.',
          raw: content,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong while generating the review.' },
      { status: 500 }
    );
  }
}