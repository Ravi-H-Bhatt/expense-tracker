import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payerId, payeeId, amount, groupId, action } = await request.json();

    if (!payerId || !payeeId || !amount || !groupId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is either payer or payee
    if (user.id !== payerId && user.id !== payeeId) {
      return NextResponse.json(
        { error: 'You cannot settle this payment' },
        { status: 403 }
      );
    }

    if (action === 'initiate') {
      // Payer initiates settlement - creates pending_confirmation status
      const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .insert({
          payer_id: payerId,
          payee_id: payeeId,
          amount: amount,
          group_id: groupId,
          status: 'pending_confirmation',
          payer_confirmed: user.id === payerId,
          payee_confirmed: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (settlementError) {
        console.error('Settlement error:', settlementError);
        return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
      }

      // Notify payee of pending settlement confirmation
      const { data: payer } = await supabase
        .from('group_members')
        .select('display_name')
        .eq('user_id', payerId)
        .eq('group_id', groupId)
        .single();

      const payerName = payer?.display_name || 'Someone';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: payeeId,
          type: 'settlement_pending',
          title: `Settlement confirmation needed`,
          message: `${payerName} says they have paid ₹${amount.toLocaleString('en-IN')}. Please confirm receipt.`,
          group_id: groupId,
          from_user_id: payerId,
          amount: amount,
          status: 'unread',
          metadata: {
            settlementId: settlement.id,
            action: 'confirm_settlement'
          }
        });

      if (notifError) {
        console.error('Notification error:', notifError);
      }

      return NextResponse.json({
        success: true,
        settlement,
        message: `Settlement initiated. Awaiting ${payerName}'s confirmation.`
      });
    } else if (action === 'confirm') {
      // Payee confirms settlement
      const { data: settlement, error: updateError } = await supabase
        .from('settlements')
        .update({
          payee_confirmed: true,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('payer_id', payerId)
        .eq('payee_id', payeeId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (updateError) {
        console.error('Settlement confirmation error:', updateError);
        return NextResponse.json({ error: 'Failed to confirm settlement' }, { status: 500 });
      }

      // Mark related payment splits as settled
      const { data: unresolvedSplits } = await supabase
        .from('expense_splits')
        .select('id, expense_id')
        .eq('user_id', payeeId)
        .eq('is_settled', false);

      if (unresolvedSplits && unresolvedSplits.length > 0) {
        await supabase
          .from('expense_splits')
          .update({
            is_settled: true,
            settled_at: new Date().toISOString(),
            settled_with_user_id: payerId
          })
          .in('id', unresolvedSplits.map(s => s.id));
      }

      // Notify payer of confirmation
      const { data: payee } = await supabase
        .from('group_members')
        .select('display_name')
        .eq('user_id', payeeId)
        .eq('group_id', groupId)
        .single();

      const payeeName = payee?.display_name || 'Someone';

      await supabase
        .from('notifications')
        .insert({
          user_id: payerId,
          type: 'settlement_confirmed',
          title: `Settlement confirmed`,
          message: `${payeeName} confirmed receipt of ₹${amount.toLocaleString('en-IN')}. Settlement complete.`,
          group_id: groupId,
          from_user_id: payeeId,
          amount: amount,
          status: 'unread'
        });

      return NextResponse.json({
        success: true,
        settlement,
        message: `Settlement confirmed with ${payeeName}. ✓`
      });
    } else if (action === 'reject') {
      // Payee rejects settlement
      const { data: settlement, error: updateError } = await supabase
        .from('settlements')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('payer_id', payerId)
        .eq('payee_id', payeeId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (updateError) {
        console.error('Settlement rejection error:', updateError);
        return NextResponse.json({ error: 'Failed to reject settlement' }, { status: 500 });
      }

      // Notify payer of rejection
      const { data: payee } = await supabase
        .from('group_members')
        .select('display_name')
        .eq('user_id', payeeId)
        .eq('group_id', groupId)
        .single();

      const payeeName = payee?.display_name || 'Someone';

      await supabase
        .from('notifications')
        .insert({
          user_id: payerId,
          type: 'settlement_rejected',
          title: `Settlement rejected`,
          message: `${payeeName} rejected the settlement. Please contact them to arrange payment.`,
          group_id: groupId,
          from_user_id: payeeId,
          amount: amount,
          status: 'unread'
        });

      return NextResponse.json({
        success: true,
        settlement,
        message: `Settlement rejected. Payer has been notified.`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Settlement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
