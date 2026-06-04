import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPaymentRequestEmail } from '@/lib/email-service';
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

    console.log('📧 ========================================');
    console.log('📧 PAYMENT REQUEST API CALLED');
    console.log('📧 Requester:', requesterId);
    console.log('📧 Debtor:', debtorId);
    console.log('📧 Amount:', amount);
    console.log('📧 Group:', groupName);
    console.log('📧 ========================================');

    if (!debtorId || !amount || !groupId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get requester's details
    const { data: requester } = await supabase
      .from('group_members')
      .select('display_name')
      .eq('user_id', requesterId)
      .eq('group_id', groupId)
      .single();

    const requesterName = requester?.display_name || 'Someone';

    // Get debtor's details and email
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

    console.log('📧 Debtor email:', debtorEmail);
    console.log('📧 Debtor name:', debtorName);
    console.log('📧 Requester name:', requesterName);

    // Send email notification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const emailSent = await sendPaymentRequestEmail(
        requesterName,
        debtorEmail,
        debtorName,
        amount,
        groupName,
        appUrl
      );

      if (emailSent) {
        console.log('✅✅✅ Payment request email sent successfully to', debtorEmail);
      } else {
        console.error('❌❌❌ Email failed to send to', debtorEmail);
      }
    } catch (emailError) {
      console.error('❌❌❌ Email exception:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: `Payment request email sent to ${debtorName}`
    });
  } catch (error) {
    console.error('❌ Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
