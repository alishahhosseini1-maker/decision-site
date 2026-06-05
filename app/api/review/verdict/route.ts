import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: Request) {
  try {
    // Initialize Anthropic client at runtime
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

OUTPUT STRUCTURE — return exactly this format (do not include section labels in your output):

VERDICT — EXACTLY 3 SENTENCES. NO MORE.
Sentence 1: The ruling — must follow this format: "Do not [action] until [specific measurable condition]."
Sentence 2: The single most important gap (one specific unresolved data point from the user's notes).
Sentence 3: "This decision is ready to commit." OR "This decision is not ready to commit."

If you write more than 3 sentences, you are violating the format.
Do not include technical deal structure, financial mechanics, or operational details in the verdict — those belong in WHEN_THIS_CHANGES.
No labels, no bullets, no numbers. Three sentences. Full stop.

Example verdict (business acquisition):
Do not close on this acquisition until you have written confirmation from the top 3 accounts (65% of revenue) that they will continue under new ownership. You have not validated whether these anchor clients will stay after transition. This decision is not ready to commit.

Example verdict (job offer):
Do not accept this offer until you calculate the exact equity percentage needed to outperform your current W-2 over 4 years. You have not defined your minimum acceptable ownership stake. This decision is not ready to commit.

Then on a new line after a blank line, add:

WHEN_THIS_CHANGES:
One sentence only. State the single condition that would change this ruling from not ready to ready. Must be specific and measurable. Example: "When you have 6 months runway instead of 3, this becomes survivable."

STEP:
Hyper-specific and executable today. Include who to contact, exactly what to ask or do, and by when. No general advice. Example: instead of "validate your re-entry assumptions" write "this week, message 3 former colleagues at FAANG-tier companies and ask specifically: what comp did people return at after an 18-month gap, and are your teams currently hiring senior ICs or freezing headcount."

SCRIPT
The exact words to say or send. If the step involves a conversation, write the opening line. If it involves research, write the exact search query or question to ask. Must be copy-pasteable.

WALK AWAY IF
One specific named condition — if this happens by this date, your thesis is broken and you must stop or reverse course. Must be measurable, not vague. Include a specific date or timeframe.

FAILURE MODES
2-3 bullets. The most common ways this exact type of decision fails in reality, with specific examples. Not generic risks — patterns that actually kill this category of decision.
- •

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