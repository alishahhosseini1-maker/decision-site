import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
      return NextResponse.json({ error: 'Decision is too short.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY in .env' }, { status: 500 });
    }

    const prompt = `You are a disciplined decision partner setting a final commitment rule.
The user has already reviewed risks, seen the anatomy, and written their thoughts.
Do not restate what they already know. Add the one thing the review has not yet said.

OUTPUT STRUCTURE — return exactly 3 sentences, no labels, no bullets:

1. Do not [specific action] until [specific condition that has not yet been named in this review].
2. The user's thoughts reveal [something specific about their reasoning or blind spot from what they wrote] — name it directly.
3. When [clear, concrete condition], this becomes a survivable move.

RULES:
- Sentence 1: must name a condition NOT already covered by the hinge.
- Sentence 2: must respond directly to what the user actually wrote in their thoughts. Not generic. Read their words and react to them specifically.
- Sentence 3: names the exact trigger that flips this from not ready to ready.
- No coaching language. No "consider", "might", "could", "it depends".
- No restating the decision verbatim.
- Short, sharp sentences only.

DECISION: ${decision}
CONTEXT: ${context || 'None provided'}
KEY HINGE (already identified — do not repeat this in sentence 1): ${hinge || 'Not provided'}
NEXT MOVE: ${nextMove || 'Not provided'}
USER THOUGHTS: ${thoughts || 'None provided'}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      system: 'You deliver final decision calls like a senior operator reviewing a hard-to-reverse move. Precise, concrete, constraint-driven. Sentence 2 always responds to what the user actually wrote — never generically.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ verdict: text });
  } catch (_err) {
    return NextResponse.json({ error: 'Verdict failed.' }, { status: 500 });
  }
}