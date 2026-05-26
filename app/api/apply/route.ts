import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, decision, timeline } = body;

    // Validate required fields
    if (!name || !email || !decision || !timeline) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send notification email
    await resend.emails.send({
      from: 'notifications@decisionlayer.dev',
      to: 'alishahhosseini1@gmail.com',
      subject: `New Private Verdict Application — ${name}`,
      html: `
        <h2>New Private Verdict Application</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Decision:</strong></p>
        <p>${decision.replace(/\n/g, '<br>')}</p>
        <p><strong>Timeline:</strong> ${timeline}</p>
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    console.error('[apply] Error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
