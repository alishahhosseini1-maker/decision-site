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
2. [Read the user's notes and name the specific gap, assumption, or missing data point they have not resolved — one declarative sentence, no hedging, no psychology].
3. When [clear, concrete condition], this becomes a survivable move.

RULES:
- Sentence 1: must name a condition NOT already covered by the hinge.
- Sentence 2: must respond directly to what the user actually wrote. Name the specific unresolved dependency, missing number, or untested assumption their notes reveal — not their mindset or emotional state. Operational only.
- Sentence 3: names the exact trigger that flips this from not ready to ready.
- No coaching language. No "consider", "might", "could", "it depends".
- No psychology. No "reveals", "suggests", "indicates you feel", "your instinct", "gut", "discomfort".
- No restating the decision verbatim.
- Short, sharp sentences only.

DECISION: ${decision}
CONTEXT: ${context || 'None provided'}
KEY HINGE (already identified — do not repeat this in sentence 1): ${hinge || 'Not provided'}
NEXT MOVE: ${nextMove || 'Not provided'}
USER NOTES: ${thoughts || 'None provided'}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: 'You deliver final decision calls like a disciplined senior operator. Every sentence is a specific constraint or condition — never a psychological observation. Sentence 2 must name an unresolved operational dependency from the user\'s notes, not their mindset. If sentence 2 could apply to any decision, it is wrong. Rewrite it until it could only apply to this specific decision with these specific numbers, people, or conditions.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ verdict: text });
  } catch (_err) {
    return NextResponse.json({ error: 'Verdict failed.' }, { status: 500 });
  }
}