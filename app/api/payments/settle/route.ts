import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendSettlementPendingEmail, sendSettlementConfirmationEmail } from '@/lib/email-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
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
      console.log('🔵 INITIATE SETTLEMENT CALLED');
      console.log('🔵 Payer:', payerId);
      console.log('🔵 Payee:', payeeId);
      console.log('🔵 Amount:', amount);
      console.log('🔵 Group:', groupId);
      
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
        console.error('❌ Settlement creation error:', settlementError);
        return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
      }

      console.log('✅ Settlement created successfully:', settlement.id);

      // Notify payee of pending settlement confirmation
      const { data: payer } = await supabase
        .from('group_members')
        .select('display_name')
        .eq('user_id', payerId)
        .eq('group_id', groupId)
        .single();

      const payerName = payer?.display_name || 'Someone';

      // Get payee's email for notification
      const { data: { user: payeeUser }, error: payeeError } = await adminClient.auth.admin.getUserById(payeeId);
      if (payeeError) {
        console.error('Error fetching payee user:', payeeError);
      }
      const payeeEmail = payeeUser?.email || '';

      // Get group name
      const { data: group } = await supabase
        .from('split_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      const groupName = group?.name || 'Your group';

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

      // Send email notification to payee
      if (payeeEmail) {
        console.log('📧 ========================================');
        console.log('📧 PREPARING TO SEND SETTLEMENT PENDING EMAIL');
        console.log('📧 Payee Email:', payeeEmail);
        console.log('📧 Payer Name:', payerName);
        console.log('📧 Amount:', amount);
        console.log('📧 Group:', groupName);
        console.log('📧 ========================================');
        
        const { data: payeeMember } = await supabase
          .from('group_members')
          .select('display_name')
          .eq('user_id', payeeId)
          .eq('group_id', groupId)
          .single();

        const payeeName = payeeMember?.display_name || 'User';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        console.log('📧 Payee Name:', payeeName);
        console.log('📧 App URL:', appUrl);
        console.log('📧 Calling sendSettlementPendingEmail now...');
        
        try {
          const emailSent = await sendSettlementPendingEmail(
            payerName,
            payeeEmail,
            payeeName,
            amount,
            groupName,
            appUrl
          );
          
          if (emailSent) {
            console.log('✅✅✅ Settlement pending email sent successfully to', payeeEmail);
          } else {
            console.error('❌❌❌ Email failed to send to', payeeEmail);
          }
        } catch (emailError) {
          console.error('❌❌❌ Email exception:', emailError);
        }
      } else {
        console.error('❌ No email found for payee:', payeeId);
      }

      return NextResponse.json({
        success: true,
        settlement,
        message: `Settlement initiated. Awaiting ${payerName}'s confirmation.`
      });
    } else if (action === 'confirm') {
      console.log('🔵 CONFIRM SETTLEMENT CALLED');
      console.log('🔵 Payer:', payerId);
      console.log('🔵 Payee:', payeeId);
      console.log('🔵 Amount:', amount);
      console.log('🔵 Group:', groupId);
      
      // Payee confirms settlement - find the most recent pending settlement
      const { data: settlements, error: fetchError } = await supabase
        .from('settlements')
        .select('*')
        .eq('payer_id', payerId)
        .eq('payee_id', payeeId)
        .eq('group_id', groupId)
        .eq('status', 'pending_confirmation')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching settlements:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch settlement' }, { status: 500 });
      }

      if (!settlements || settlements.length === 0) {
        console.error('❌ No pending settlement found');
        return NextResponse.json({ error: 'No pending settlement found' }, { status: 404 });
      }

      const settlement = settlements[0]; // Get the most recent one
      console.log('✅ Found settlement to confirm:', settlement.id);

      // Update the settlement
      const { data: updatedSettlement, error: updateError } = await supabase
        .from('settlements')
        .update({
          payee_confirmed: true,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', settlement.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Settlement confirmation error:', updateError);
        return NextResponse.json({ error: 'Failed to confirm settlement' }, { status: 500 });
      }

      console.log('✅ Settlement confirmed successfully:', updatedSettlement.id);

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

      // Get payer's email for confirmation notification
      const { data: { user: payerUser }, error: payerError } = await adminClient.auth.admin.getUserById(payerId);
      if (payerError) {
        console.error('Error fetching payer user:', payerError);
      }
      const payerEmail = payerUser?.email || '';

      // Get group name
      const { data: group } = await supabase
        .from('split_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      const groupName = group?.name || 'Your group';

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

      // Send confirmation email to payer
      if (payerEmail) {
        console.log('📧 ========================================');
        console.log('📧 PREPARING TO SEND SETTLEMENT CONFIRMATION EMAIL');
        console.log('📧 Payer Email:', payerEmail);
        console.log('📧 Payee Name:', payeeName);
        console.log('📧 Amount:', amount);
        console.log('📧 Group:', groupName);
        console.log('📧 ========================================');
        
        const { data: payerMember } = await supabase
          .from('group_members')
          .select('display_name')
          .eq('user_id', payerId)
          .eq('group_id', groupId)
          .single();

        const payerName = payerMember?.display_name || 'User';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        console.log('📧 Payer Name:', payerName);
        console.log('📧 App URL:', appUrl);
        console.log('📧 Calling sendSettlementConfirmationEmail now...');
        
        try {
          const emailSent = await sendSettlementConfirmationEmail(
            payeeName,
            payerEmail,
            payerName,
            amount,
            groupName,
            appUrl
          );
          
          if (emailSent) {
            console.log('✅✅✅ Settlement confirmation email sent successfully to', payerEmail);
          } else {
            console.error('❌❌❌ Email failed to send to', payerEmail);
          }
        } catch (emailError) {
          console.error('❌❌❌ Email exception:', emailError);
        }
      } else {
        console.error('❌ No email found for payer:', payerId);
      }

      return NextResponse.json({
        success: true,
        settlement: updatedSettlement,
        message: `Settlement confirmed with ${payeeName}. ✓`
      });
    } else if (action === 'reject') {
      console.log('🔵 REJECT SETTLEMENT CALLED');
      console.log('🔵 Payer:', payerId);
      console.log('🔵 Payee:', payeeId);
      
      // Payee rejects settlement - find the most recent pending settlement
      const { data: settlements, error: fetchError } = await supabase
        .from('settlements')
        .select('*')
        .eq('payer_id', payerId)
        .eq('payee_id', payeeId)
        .eq('group_id', groupId)
        .eq('status', 'pending_confirmation')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching settlements:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch settlement' }, { status: 500 });
      }

      if (!settlements || settlements.length === 0) {
        console.error('❌ No pending settlement found');
        return NextResponse.json({ error: 'No pending settlement found' }, { status: 404 });
      }

      const settlement = settlements[0]; // Get the most recent one
      console.log('✅ Found settlement to reject:', settlement.id);

      // Update the settlement
      const { data: updatedSettlement, error: updateError } = await supabase
        .from('settlements')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', settlement.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Settlement rejection error:', updateError);
        return NextResponse.json({ error: 'Failed to reject settlement' }, { status: 500 });
      }

      console.log('✅ Settlement rejected successfully:', updatedSettlement.id);

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
        settlement: updatedSettlement,
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
