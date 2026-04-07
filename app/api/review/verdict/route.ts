import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const decision = cleanText(body?.decision);
    const context = cleanText(body?.context);
    const thoughts = cleanText(body?.thoughts);
    const hinge = cleanText(body?.hinge);
    const nextMove = cleanText(body?.next_move || body?.nextMove);

    if (!decision || decision.length < 8) {
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

    const prompt = `You are a disciplined decision partner.

Your job is to generate a FINAL VERDICT that sets a clear commitment rule.

The user has already reviewed the decision, seen the risks, and reflected.
You are not brainstorming.
You are not coaching.
You are not summarizing.
You are setting the condition for commitment.

OUTPUT STRUCTURE (STRICT)

Return EXACTLY 3 sentences in this structure:

1. Do not [specific action] until [specific condition].
2. Your plan depends on [key assumption / hinge], which is currently unproven or weak.
3. When [clear condition is met], this becomes a survivable move.

RULES
- Tie the verdict directly to the user's specific decision.
- The first sentence must begin with: Do not
- Be concrete and specific.
- Use real-world constraints like contracts, revenue, time, runway, approvals, hires, or thresholds when possible.
- Name the actual missing condition.
- Keep each sentence short and sharp.
- No bullet points.
- No labels.
- No extra text before or after.
- No generic phrases like "move forward carefully", "it depends", "consider", "might", or "could".
- Do not repeat the decision word for word unless needed for clarity.
- If hinge or next move is missing, infer the most important one from the decision, context, and thoughts.

DECISION
${decision}

CONTEXT
${context || 'None provided'}

USER THOUGHTS
${thoughts || 'None provided'}

KEY HINGE
${hinge || 'Not provided'}

MISSING CONDITION / NEXT MOVE
${nextMove || 'Not provided'}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      system:
        'You deliver final decision calls like a senior operator reviewing a hard-to-reverse move. You are precise, concrete, constraint-driven, and never generic.',
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

    return NextResponse.json({ verdict: text });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Verdict failed.' },
      { status: 500 }
    );
  }
}