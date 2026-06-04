import { createClient } from '@/lib/supabase/server';
import { sendPaymentRequestEmail } from '@/lib/email-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toUserId, amount, groupId, message } = await request.json();

    if (!toUserId || !amount || !groupId) {
      return NextResponse.json(
        { error: 'Missing required fields: toUserId, amount, groupId' },
        { status: 400 }
      );
    }

    // Create payment request
    const { data: paymentRequest, error: requestError } = await supabase
      .from('payment_requests')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        amount: amount,
        group_id: groupId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (requestError) {
      console.error('Payment request error:', requestError);
      return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
    }

    // Get user details for notification
    const { data: requester } = await supabase
      .from('group_members')
      .select('display_name')
      .eq('user_id', user.id)
      .eq('group_id', groupId)
      .single();

    const { data: group } = await supabase
      .from('split_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    const requesterName = requester?.display_name || user.email?.split('@')[0] || 'Someone';
    const groupName = group?.name || 'Your group';

    // Get debtor's email
    const { data: debtor } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('user_id', toUserId)
      .eq('group_id', groupId)
      .single();

    let debtorEmail = '';
    if (debtor?.user_id) {
      const { data: { user: debtorUser } } = await supabase.auth.admin.getUserById(debtor.user_id);
      debtorEmail = debtorUser?.email || '';
    }

    // Create notification for debtor
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: toUserId,
        type: 'payment_request',
        title: `Payment request from ${requesterName}`,
        message: `${requesterName} is requesting ₹${amount.toLocaleString('en-IN')} in ${groupName}`,
        group_id: groupId,
        from_user_id: user.id,
        amount: amount,
        status: 'unread',
        metadata: {
          paymentRequestId: paymentRequest.id,
          customMessage: message
        }
      });

    if (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notification fails
    }

    // Send email notification
    if (debtorEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rfin.app';
      await sendPaymentRequestEmail(
        requesterName,
        debtorEmail,
        requester?.display_name || 'User',
        amount,
        groupName,
        appUrl
      );
    }

    return NextResponse.json({
      success: true,
      paymentRequest,
      message: `Payment request sent to ${requesterName}`
    });
  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
