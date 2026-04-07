import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY in .env' },
        { status: 500 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `You are a senior operator doing a pre-commitment review.

You have seen this decision fail before. You know exactly what kills it.
Your job is not to encourage. Your job is to name what most people miss.

Be specific to THIS decision. Not generic. Not applicable to any decision.
Every sentence must only make sense for this exact situation.

Decision:
${decision}

Context:
${context || 'None provided'}

Return EXACTLY this structure. No extra sections. No renamed sections.

What must go right

3 bullets. Each one is a specific condition that must hold for this decision to survive.
Do not write obvious conditions. Write the non-obvious ones.
If the context reveals a specific constraint (network, clients, pricing, timing), name it directly.

•
•
•

What could go wrong

3 bullets. Each one is a concrete failure mode specific to this decision.
At least one bullet must name a failure mode the decision-maker is probably not thinking about.
Do not write vague failure modes. Name the actual mechanism of failure.

•
•
•

Hard to undo

1-2 sentences. Name the specific thing that becomes locked in after commitment.
Focus on what specifically gets harder: which relationship, which reputation, which option, which resource.

Bottom line

1 sentence. A directive. Tells the reader exactly what must be true before they commit.
Must be specific to this decision. Must name the actual condition.
Format: "Do not [action] until [specific condition]."`;

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system:
        'You analyze decisions like a calm senior operator who has seen things fail. You are specific, constraint-focused, and never generic. Every insight must be tied to the actual decision and context provided.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text =
      message.content[0].type === 'text'
        ? message.content[0].text.trim()
        : '';

    return NextResponse.json({ analysis: text });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Deep review failed.' },
      { status: 500 }
    );
  }
}