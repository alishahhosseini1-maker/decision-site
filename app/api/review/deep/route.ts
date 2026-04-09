import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { decision, context = '', hinge = '', trap = '' } = await req.json();

    if (!decision || decision.trim().length < 8) {
      return NextResponse.json({ error: 'Decision is too short.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY in .env' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are a senior operator doing a pre-commitment review.
You have seen this decision fail before. You know exactly what kills it.
Your job is not to encourage. Your job is to name what most people miss.
Be specific to THIS decision. Every sentence must only make sense for this exact situation.

Decision: ${decision}
Context: ${context || 'None provided'}
Key hinge: ${hinge || 'Not provided'}
Hidden trap: ${trap || 'Not provided'}

STRICT RULES:
- Each section covers a DIFFERENT angle. Do not repeat the same underlying risk across sections.
- If one risk dominates (e.g. a single customer, a cash constraint), name it once in the most relevant section only.
- No generic observations. Every line must be specific to this decision.

Return EXACTLY this structure. No extra sections. No renamed headings.

What must go right
2 bullets. The two non-obvious conditions that must hold. Not the obvious ones.
Name specific mechanisms: which relationship, which number, which timeline.
- •

What could go wrong
2 bullets. Two distinct failure modes — one the person is probably thinking about, one they are probably not.
Name the actual mechanism. Not "things could go wrong." Exactly how.
- •

Hard to undo
1 sentence only. The single most locked-in consequence of committing.
Name what specifically becomes harder: which option closes, which position weakens.

Bottom line
1 sentence. Format: "Do not [action] until [specific condition]."
Must name the actual missing condition. Must be different from the hinge already identified.

Reflection prompts
3 questions. These are for the decision-maker to answer before committing.
Each question must be specific to this decision — not generic coaching questions.
Make them hard. They should surface what the person is avoiding.
Do not use: "Have you considered", "What are your thoughts", "How do you feel".
Format each as a direct question that starts with What, Who, When, or Why.
1.
2.
3.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      system: 'You analyze decisions like a calm senior operator who has seen things fail. Specific, constraint-focused, never generic. No section repeats the same underlying risk as another section.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ analysis: text });
  } catch (_err) {
    return NextResponse.json({ error: 'Deep review failed.' }, { status: 500 });
  }
}