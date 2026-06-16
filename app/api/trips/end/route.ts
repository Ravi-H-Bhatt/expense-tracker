import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendTripEndedEmail } from '@/lib/email-service';
import { resolveAppUrl } from '@/lib/app-url';
import { NextRequest, NextResponse } from 'next/server';

// Only this owner may end a trip and email everyone.
const OWNER_EMAIL = 'ravibhatt946@gmail.com';

// Sending many emails sequentially (with retries + a PDF attachment) can take
// a while; allow up to 60s so every member is reached before the function ends.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Owner-only gate.
    if ((user.email || '').toLowerCase() !== OWNER_EMAIL) {
      return NextResponse.json(
        { error: 'Only the trip owner can end the trip and email everyone.' },
        { status: 403 }
      );
    }

    const {
      groupId,
      groupName,
      pdfBase64,
      filename,
      totalSpent,
      groupFundSpent,
      groupFundRemaining,
    } = await request.json();

    if (!groupId || !pdfBase64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Pull all members of the group.
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id, display_name')
      .eq('group_id', groupId);

    if (membersError || !members || members.length === 0) {
      return NextResponse.json({ error: 'No members found for this group' }, { status: 404 });
    }

    const memberCount = members.length;
    const total = Number(totalSpent) || 0;
    const fundSpent = Number(groupFundSpent) || 0;
    const fundRemaining = Number(groupFundRemaining) || 0;
    // Per-person equal share of the pooled group fund (collected + spent).
    // Example: a 55,000 fund across 11 members = 5,000 each. If there's no
    // pooled fund, fall back to an even split of the whole trip spend.
    const pool = fundRemaining + fundSpent;
    const perHeadShare = memberCount > 0
      ? (pool > 0 ? pool / memberCount : total / memberCount)
      : 0;

    const reportBuffer = Buffer.from(pdfBase64, 'base64');
    const reportFilename = filename || `${(groupName || 'group').replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
    const appUrl = resolveAppUrl(request);

    // Resolve each member's email (admin) and send the wrap-up email.
    // Sent SEQUENTIALLY (not in parallel) because Gmail SMTP rate-limits
    // concurrent connections — parallel sends cause some to silently drop.
    const settled: { sent: boolean; name: string; email?: string; reason: string }[] = [];

    for (const m of members) {
      if (!m.user_id) {
        settled.push({ sent: false, name: m.display_name, reason: 'no-account' });
        continue;
      }

      let email: string | undefined;
      try {
        const { data, error } = await adminClient.auth.admin.getUserById(m.user_id);
        if (error) {
          console.error(`❌ getUserById failed for ${m.display_name}:`, error.message);
          settled.push({ sent: false, name: m.display_name, reason: 'lookup-failed' });
          continue;
        }
        email = data?.user?.email || undefined;
      } catch (e: any) {
        console.error(`❌ getUserById threw for ${m.display_name}:`, e?.message);
        settled.push({ sent: false, name: m.display_name, reason: 'lookup-error' });
        continue;
      }

      if (!email) {
        settled.push({ sent: false, name: m.display_name, reason: 'no-email' });
        continue;
      }

      const sent = await sendTripEndedEmail({
        to: email,
        recipientName: m.display_name || 'there',
        groupName: groupName || 'your group',
        totalSpent: total,
        memberCount,
        perHeadShare,
        reportFilename,
        reportBuffer,
        appUrl,
      });

      settled.push({ sent, name: m.display_name, email, reason: sent ? 'ok' : 'send-failed' });
    }

    const sentCount = settled.filter((r) => r.sent).length;

    // Aggregate reasons so the UI/logs can explain the 0/N case.
    const reasons: Record<string, number> = {};
    settled.forEach((r) => {
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    });
    console.log('📊 End trip results:', { sentCount, memberCount, reasons });
    // Log the names that didn't get an email so failures are traceable.
    const failedNames = settled.filter((r) => !r.sent).map((r) => `${r.name}(${r.reason})`);
    if (failedNames.length) console.warn('⚠️ Not emailed:', failedNames.join(', '));

    const withEmail = settled.filter(
      (r) => r.reason === 'ok' || r.reason === 'send-failed'
    ).length;

    let message: string;
    if (sentCount === memberCount) {
      message = `Trip ended. Report emailed to all ${memberCount} members. 🎉`;
    } else if (sentCount > 0) {
      message = `Trip ended. Report emailed to ${sentCount} of ${memberCount} members.`;
    } else if (withEmail === 0) {
      message = `No emails sent: none of the ${memberCount} members have a registered email address.`;
    } else {
      message = `Could not send emails (${withEmail} had addresses). Check SMTP configuration.`;
    }

    return NextResponse.json({
      success: sentCount > 0,
      sentCount,
      totalMembers: memberCount,
      membersWithEmail: withEmail,
      reasons,
      perHeadShare,
      message,
    });
  } catch (error: any) {
    console.error('❌ End trip error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to end trip' },
      { status: 500 }
    );
  }
}
