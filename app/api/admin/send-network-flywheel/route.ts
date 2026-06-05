import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNetworkFlywheelEmail } from '@/app/lib/email';

export async function POST(req: Request) {
  try {
    // Initialize Supabase client at runtime
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Simple auth check - require a secret token
    const { token } = await req.json();

    if (token !== process.env.ADMIN_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed network submissions with unique emails
    const { data: submissions, error } = await supabase
      .from('network_submissions')
      .select('customer_email, first_name')
      .not('customer_email', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[send-network-flywheel] Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ message: 'No network report customers found' });
    }

    // Deduplicate by email (keep first occurrence)
    const uniqueCustomers = Array.from(
      new Map(
        submissions.map(s => [s.customer_email, s])
      ).values()
    );

    console.log(`[send-network-flywheel] Sending to ${uniqueCustomers.length} unique customers`);

    // Send emails
    const results = await Promise.allSettled(
      uniqueCustomers.map(customer =>
        sendNetworkFlywheelEmail({
          to: customer.customer_email,
          firstName: customer.first_name || 'there',
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: 'Flywheel emails sent',
      total: uniqueCustomers.length,
      successful,
      failed,
    });
  } catch (err) {
    console.error('[send-network-flywheel] Error:', err);
    return NextResponse.json(
      { error: 'Failed to send emails', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
