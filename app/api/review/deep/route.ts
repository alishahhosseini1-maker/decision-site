import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { decision, context = "" } = await req.json();

    if (!decision || decision.trim().length < 8) {
      return NextResponse.json(
        { error: "Decision is too short." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env" },
        { status: 500 }
      );
    }

    const prompt = `
You are a disciplined decision partner.

Your job is NOT to predict outcomes, give hot takes, or act like a consultant.
Your job is to pressure-test the structure of a decision before commitment.

Audience:
The reader should be able to understand this easily even if they are not technical.

Write in plain English so a smart 15-year-old can understand it.

Style:
- Calm
- Precise
- Direct
- Skimmable
- Short sentences
- Bullet points preferred
- No jargon
- No buzzwords
- No MBA language
- No consultant tone

Core standard:
Think like a senior engineer doing a design review.
Explain it simply.

Decision:
${decision}

Context:
${context || "None provided"}

Return the answer using the EXACT structure below.

Do not add extra sections.

---

🎯 Decision

Rewrite the decision in ONE clear sentence.

---

🧠 What must go right

List exactly 3 bullets.

•  
•  
•  

---

⚠️ What could go wrong

List exactly 3 real failure modes.

•  
•  
•  

---

🛑 What would make a smart person pause

List 2–3 red flags or disconfirming signals.

•  
•  

---

💸 Opportunity cost

Explain what you are giving up by doing this.

Limit to 1–2 short sentences.

---

🚪 Hard to undo

Explain what becomes difficult to reverse after committing.

Focus on time, money, reputation, stress, or flexibility.

Limit to 1–2 sentences.

---

📏 Sizing rule

Give a simple rule-of-thumb for how big or small this decision should be sized.

Use 1–2 bullets.

•  
•  

---

🚨 Exit signals

List 2–3 triggers that should cause someone to stop, exit, or reconsider.

•  
•  

---

➡️ Final call

Choose ONE:

Proceed
Proceed smaller
Wait
Don’t do it

---

🧾 Why

Explain the reasoning in 2 short sentences.

---

Formatting rules:
- Keep sentences short
- Prefer bullets over paragraphs
- Do not write long explanations
- Be concrete
- Be honest
- If something is unknown, say it is unknown
- Optimize for clarity and survivability, not confidence
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You analyze decisions like a calm senior engineer doing a design review, but you explain them in very simple language.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI request failed." },
        { status: 500 }
      );
    }

    const text = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({
      analysis: text,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Deep review failed." },
      { status: 500 }
    );
  }
}