import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPaymentRequestEmail } from '@/lib/email-service';
import { resolveAppUrl } from '@/lib/app-url';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requesterId, debtorId, amount, groupId, groupName } = await request.json();

    console.log('📧 PAYMENT REQUEST API CALLED', { requesterId, debtorId, amount, groupName });

    if (!debtorId || !amount || !groupId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get requester's display name (best-effort)
    const { data: requester } = await supabase
      .from('group_members')
      .select('display_name')
      .eq('user_id', requesterId)
      .eq('group_id', groupId)
      .single();

    const requesterName = requester?.display_name || 'Someone';

    // Get debtor's display name (best-effort)
    const { data: debtorMember } = await supabase
      .from('group_members')
      .select('display_name')
      .eq('user_id', debtorId)
      .eq('group_id', groupId)
      .single();

    const debtorName = debtorMember?.display_name || 'User';

    // Get debtor's email using admin client
    const { data: { user: debtorUser }, error: debtorError } = await adminClient.auth.admin.getUserById(debtorId);

    if (debtorError) {
      console.error('❌ Error fetching debtor user:', debtorError);
      return NextResponse.json({ error: 'Failed to fetch debtor details' }, { status: 500 });
    }

    const debtorEmail = debtorUser?.email || '';

    if (!debtorEmail) {
      console.error('❌ No email found for debtor:', debtorId);
      return NextResponse.json({ error: 'Debtor email not found' }, { status: 404 });
    }

    console.log('📧 Sending payment request to', debtorEmail);

    // Send email notification and report the REAL result back to the client
    const appUrl = resolveAppUrl(request);

    let emailSent = false;
    let emailError: string | null = null;
    try {
      emailSent = await sendPaymentRequestEmail(
        requesterName,
        debtorEmail,
        debtorName,
        amount,
        groupName,
        appUrl
      );
    } catch (err: any) {
      emailError = err?.message || 'Unknown email error';
      console.error('❌ Email exception:', err);
    }

    if (!emailSent) {
      // Distinguish a misconfigured server from a transient failure
      const configured = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          error: configured
            ? (emailError || 'Email failed to send. Please try again.')
            : 'Email is not configured on the server (missing SMTP credentials).',
        },
        { status: 502 }
      );
    }

    console.log('✅ Payment request email sent to', debtorEmail);
    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `Payment request email sent to ${debtorName}`,
    });
  } catch (error) {
    console.error('❌ Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
